/**
 * storeService.js — Business logic for the SiteFlow order system.
 *
 * Covers:
 *   - Store lookup by slug
 *   - Product listing with categories
 *   - Order creation (with prescription guard for pharmacy)
 *   - Delivery fee calculation (flat rate or per-neighborhood)
 *   - Order status transitions with event messages
 */

import { getAdminClient }       from "./db.js";
import { emitToStore, emitToTenant } from "./socketService.js";
import {
  sendOrderConfirmation,
  sendOrderStatus,
} from "../services/whatsappService.js";

// ── Constants ─────────────────────────────────────────────────────────────────

export const ORDER_STATUSES = ['pending', 'confirmed', 'preparing', 'delivering', 'completed'];

/** Status-change notification messages indexed by [store_type][status] */
const STATUS_MESSAGES = {
  food: {
    delivering: 'Sua entrega está a caminho 🍕',
  },
  pharmacy: {
    delivering: 'Seu pedido está a caminho 💊',
  },
};

// ── Store ─────────────────────────────────────────────────────────────────────

/**
 * Get a store by slug (public).
 * Returns { store, categories } or null if not found / inactive.
 */
export async function getStoreBySlug(slug) {
  const db = getAdminClient();

  const { data: store, error } = await db
    .from('stores')
    .select('id, name, slug, type, delivery_fee, delivery_neighborhoods')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error || !store) return null;

  const { data: categories } = await db
    .from('store_categories')
    .select('id, name, order')
    .eq('store_id', store.id)
    .order('order', { ascending: true });

  return { store, categories: categories ?? [] };
}

/**
 * Get all active products for a store (with category name joined).
 */
export async function getStoreProducts(storeId) {
  const db = getAdminClient();

  const { data, error } = await db
    .from('store_products')
    .select('id, name, price, original_price, image_url, description, category_id, metadata, requires_prescription, is_active, store_categories(name)')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) throw new Error(`getStoreProducts: ${error.message}`);
  return data ?? [];
}

/**
 * Get store by ID — for public frontend endpoint.
 * Returns all fields needed by the pharmacy/food frontend.
 */
export async function getStoreById(id) {
  const db = getAdminClient();

  const { data: store, error } = await db
    .from('stores')
    .select(`
      id, name, slug, type,
      phone, description, address,
      cover_url, logo_url,
      is_open,
      delivery_time_min, delivery_time_max,
      delivery_fee, min_order,
      rating, rating_count,
      average_delivery_minutes
    `)
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (error || !store) return null;

  const { data: categories } = await db
    .from('store_categories')
    .select('id, name, order')
    .eq('store_id', id)
    .order('order', { ascending: true });

  return { store, categories: categories ?? [] };
}

// ── Delivery fee ──────────────────────────────────────────────────────────────

/**
 * Calculate delivery fee for an order.
 *
 * Logic:
 *   1. If the store has per-neighborhood fees configured, look up the customer's neighborhood.
 *   2. If found in the list, use that fee.
 *   3. Otherwise fall back to the store's flat delivery_fee.
 *
 * @param {object} store — row from `stores` table
 * @param {string|undefined} neighborhood — customer_neighborhood from order body
 * @returns {number}
 */
export function calcDeliveryFee(store, neighborhood) {
  const neighborhoods = store.delivery_neighborhoods ?? [];

  if (neighborhood && neighborhoods.length > 0) {
    const match = neighborhoods.find(
      (n) => n.neighborhood?.toLowerCase() === neighborhood.toLowerCase()
    );
    if (match != null) return Number(match.fee ?? 0);
  }

  return Number(store.delivery_fee ?? 0);
}

// ── Orders ────────────────────────────────────────────────────────────────────

/**
 * Create an order.
 *
 * Validates:
 *   - Store exists and is active
 *   - All products belong to the store and are active
 *   - Prescription upload required if any item has requires_prescription = true
 *
 * @param {object} body
 * @param {string} body.storeId
 * @param {string} body.customerName
 * @param {string} body.customerPhone
 * @param {string} body.customerAddress
 * @param {string} [body.customerNeighborhood]
 * @param {Array<{productId, quantity, notes}>} body.items
 * @param {string} [body.prescriptionUrl] — required for pharmacy prescription products
 * @returns {object} created order with items
 */
export async function createOrder(body) {
  const db = getAdminClient();
  const {
    storeId,
    customerName,
    customerPhone,
    customerAddress,
    customerNeighborhood,
    items,
    prescriptionUrl,
  } = body;

  // ── 1. Load store ────────────────────────────────────────────────────────────
  const { data: store, error: storeErr } = await db
    .from('stores')
    .select('id, type, delivery_fee, delivery_neighborhoods')
    .eq('id', storeId)
    .eq('is_active', true)
    .single();

  if (storeErr || !store) throw Object.assign(new Error('Loja não encontrada ou inativa'), { statusCode: 404 });

  // ── 2. Load products ─────────────────────────────────────────────────────────
  const productIds = items.map((i) => i.productId);

  const { data: products, error: prodErr } = await db
    .from('store_products')
    .select('id, price, requires_prescription, is_active')
    .in('id', productIds)
    .eq('store_id', storeId);

  if (prodErr) throw new Error(`loadProducts: ${prodErr.message}`);

  const productMap = Object.fromEntries((products ?? []).map((p) => [p.id, p]));

  // Validate all products exist, belong to store, and are active
  for (const item of items) {
    const p = productMap[item.productId];
    if (!p) throw Object.assign(new Error(`Produto não encontrado: ${item.productId}`), { statusCode: 400 });
    if (!p.is_active) throw Object.assign(new Error(`Produto indisponível: ${item.productId}`), { statusCode: 400 });
  }

  // ── 3. Prescription guard ────────────────────────────────────────────────────
  const needsPrescription = items.some((i) => productMap[i.productId]?.requires_prescription);
  if (needsPrescription && !prescriptionUrl) {
    throw Object.assign(
      new Error('É obrigatório enviar receita médica para um ou mais itens do pedido'),
      { statusCode: 422 }
    );
  }

  // ── 4. Calculate totals ──────────────────────────────────────────────────────
  let subtotal = 0;
  const resolvedItems = items.map((item) => {
    const price = Number(productMap[item.productId].price);
    subtotal += price * item.quantity;
    return { ...item, price };
  });

  const deliveryFee = calcDeliveryFee(store, customerNeighborhood);
  const totalPrice  = subtotal + deliveryFee;

  // ── 5. Insert order ──────────────────────────────────────────────────────────
  const { data: order, error: orderErr } = await db
    .from('store_orders')
    .insert({
      store_id:              storeId,
      customer_name:         customerName,
      customer_phone:        customerPhone,
      customer_address:      customerAddress,
      customer_neighborhood: customerNeighborhood ?? null,
      total_price:           totalPrice,
      delivery_fee:          deliveryFee,
      status:                'pending',
    })
    .select()
    .single();

  if (orderErr) throw new Error(`createOrder: ${orderErr.message}`);

  // ── 6. Insert order items ────────────────────────────────────────────────────
  const orderItems = resolvedItems.map((item) => ({
    order_id:   order.id,
    product_id: item.productId,
    quantity:   item.quantity,
    price:      item.price,
    notes:      item.notes ?? null,
  }));

  const { error: itemsErr } = await db.from('store_order_items').insert(orderItems);
  if (itemsErr) throw new Error(`createOrderItems: ${itemsErr.message}`);

  // ── 7. Save prescription if provided ────────────────────────────────────────
  if (needsPrescription && prescriptionUrl) {
    const { error: rxErr } = await db
      .from('store_prescriptions')
      .insert({ order_id: order.id, image_url: prescriptionUrl });
    if (rxErr) throw new Error(`savePrescription: ${rxErr.message}`);
  }

  const fullOrder = { ...order, items: orderItems };

  // ── Tempo real: notifica lojistas na room da loja ────────────────────────────
  emitToStore(storeId, 'new_order', fullOrder);
  emitToTenant(storeId, 'new_order', { order_id: fullOrder.id });

  // ── WhatsApp: confirmação para o cliente (não trava o pedido se falhar) ──────
  sendOrderConfirmation(fullOrder).catch(() => {});

  return fullOrder;
}

/**
 * Update order status.
 *
 * @param {string} orderId
 * @param {string} newStatus — one of ORDER_STATUSES
 * @param {string} [requestedByStoreId] — if set, validates order belongs to this store
 * @returns {{ order, message: string|null }}
 */
export async function updateOrderStatus(orderId, newStatus, requestedByStoreId) {
  if (!ORDER_STATUSES.includes(newStatus)) {
    throw Object.assign(new Error(`Status inválido: ${newStatus}`), { statusCode: 400 });
  }

  const db = getAdminClient();

  // Build query — optionally scope to store
  let query = db
    .from('store_orders')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', orderId);

  if (requestedByStoreId) query = query.eq('store_id', requestedByStoreId);

  const { data: order, error } = await query.select('id, store_id, status').single();

  if (error || !order) {
    throw Object.assign(new Error('Pedido não encontrado'), { statusCode: 404 });
  }

  // ── Event message ────────────────────────────────────────────────────────────
  let message    = null;
  let storeType  = null;

  if (newStatus === 'delivering') {
    // Load store type (necessário para mensagem de evento + WhatsApp)
    const { data: store } = await db
      .from('stores')
      .select('type')
      .eq('id', order.store_id)
      .single();

    storeType = store?.type ?? null;
    message   = STATUS_MESSAGES[storeType]?.delivering ?? null;
  }

  // ── Tempo real: notifica lojistas e clientes na room da loja ─────────────────
  emitToStore(order.store_id, 'order_update', { order, message });
  emitToTenant(order.store_id, 'order_updated', { order_id: order.id, status: newStatus });

  // ── WhatsApp: avisa cliente que saiu para entrega (não trava se falhar) ───────
  if (newStatus === 'delivering' && order.customer_phone) {
    sendOrderStatus(order, storeType).catch(() => {});
  }

  return { order, message };
}

/**
 * Get a single order with its items.
 */
export async function getOrder(orderId) {
  const db = getAdminClient();

  const { data: order, error } = await db
    .from('store_orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (error || !order) return null;

  const { data: items } = await db
    .from('store_order_items')
    .select('id, product_id, quantity, price, notes')
    .eq('order_id', orderId);

  const { data: prescriptions } = await db
    .from('store_prescriptions')
    .select('id, image_url, created_at')
    .eq('order_id', orderId);

  return { ...order, items: items ?? [], prescriptions: prescriptions ?? [] };
}

/**
 * List orders for a store (admin use).
 *
 * @param {string} storeId
 * @param {object} opts
 * @param {string} [opts.status] — filter by status
 * @param {number} [opts.limit=50]
 * @param {number} [opts.offset=0]
 */
export async function listOrders(storeId, { status, limit = 50, offset = 0 } = {}) {
  const db = getAdminClient();

  let query = db
    .from('store_orders')
    .select('id, customer_name, customer_phone, customer_address, total_price, delivery_fee, status, created_at')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw new Error(`listOrders: ${error.message}`);
  return data ?? [];
}

// ── Admin: Store CRUD ─────────────────────────────────────────────────────────

export async function createStore({ name, slug, type, deliveryFee = 0, deliveryNeighborhoods = [] }) {
  const db = getAdminClient();
  const { data, error } = await db
    .from('stores')
    .insert({
      name,
      slug,
      type,
      delivery_fee:           deliveryFee,
      delivery_neighborhoods: deliveryNeighborhoods,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw Object.assign(new Error('Slug já em uso'), { statusCode: 409 });
    throw new Error(`createStore: ${error.message}`);
  }
  return data;
}

export async function updateStore(storeId, fields) {
  const db = getAdminClient();
  const allowed = {};
  if (fields.name !== undefined)                  allowed.name = fields.name;
  if (fields.type !== undefined)                  allowed.type = fields.type;
  if (fields.deliveryFee !== undefined)           allowed.delivery_fee = fields.deliveryFee;
  if (fields.deliveryNeighborhoods !== undefined) allowed.delivery_neighborhoods = fields.deliveryNeighborhoods;
  if (fields.isActive !== undefined)              allowed.is_active = fields.isActive;

  const { data, error } = await db
    .from('stores')
    .update(allowed)
    .eq('id', storeId)
    .select()
    .single();

  if (error || !data) throw Object.assign(new Error('Loja não encontrada'), { statusCode: 404 });
  return data;
}

export async function listStores() {
  const db = getAdminClient();
  const { data, error } = await db
    .from('stores')
    .select('id, name, slug, type, delivery_fee, is_active, created_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`listStores: ${error.message}`);
  return data ?? [];
}

// ── Admin: Category CRUD ──────────────────────────────────────────────────────

export async function createCategory(storeId, { name, order = 0 }) {
  const db = getAdminClient();
  const { data, error } = await db
    .from('store_categories')
    .insert({ store_id: storeId, name, order })
    .select()
    .single();
  if (error) throw new Error(`createCategory: ${error.message}`);
  return data;
}

// ── Admin: Product CRUD ───────────────────────────────────────────────────────

export async function createStoreProduct(storeId, fields) {
  const db = getAdminClient();
  const { data, error } = await db
    .from('store_products')
    .insert({
      store_id:              storeId,
      category_id:           fields.categoryId ?? null,
      name:                  fields.name,
      price:                 fields.price,
      image_url:             fields.imageUrl ?? null,
      description:           fields.description ?? null,
      metadata:              fields.metadata ?? {},
      requires_prescription: fields.requiresPrescription ?? false,
    })
    .select()
    .single();
  if (error) throw new Error(`createStoreProduct: ${error.message}`);
  return data;
}

export async function updateStoreProduct(productId, storeId, fields) {
  const db = getAdminClient();
  const allowed = {};
  if (fields.name !== undefined)                  allowed.name = fields.name;
  if (fields.price !== undefined)                 allowed.price = fields.price;
  if (fields.imageUrl !== undefined)              allowed.image_url = fields.imageUrl;
  if (fields.description !== undefined)           allowed.description = fields.description;
  if (fields.categoryId !== undefined)            allowed.category_id = fields.categoryId;
  if (fields.metadata !== undefined)              allowed.metadata = fields.metadata;
  if (fields.requiresPrescription !== undefined)  allowed.requires_prescription = fields.requiresPrescription;
  if (fields.isActive !== undefined)              allowed.is_active = fields.isActive;

  const { data, error } = await db
    .from('store_products')
    .update(allowed)
    .eq('id', productId)
    .eq('store_id', storeId)
    .select()
    .single();

  if (error || !data) throw Object.assign(new Error('Produto não encontrado'), { statusCode: 404 });
  return data;
}

export async function deleteStoreProduct(productId, storeId) {
  const db = getAdminClient();
  const { error } = await db
    .from('store_products')
    .delete()
    .eq('id', productId)
    .eq('store_id', storeId);
  if (error) throw Object.assign(new Error('Erro ao deletar produto'), { statusCode: 500 });
}
