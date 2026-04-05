/**
 * storeOwnerService.js — Lógica de negócio do painel do lojista.
 *
 * Todas as funções recebem `userId` e verificam ownership via stores.owner_id.
 * Nunca expõe dados de lojas de outros usuários.
 */

import { getAdminClient } from './db.js';

const PRODUCT_BUCKET = 'site-images'; // reusa bucket existente
const MAX_FILE_SIZE  = 5 * 1024 * 1024;
const ALLOWED_TYPES  = new Set(['image/jpeg', 'image/png', 'image/webp']);

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Retorna a loja do lojista. Lança 404 se não encontrada.
 * @param {string} userId
 * @returns {Promise<object>} store row
 */
export async function getMerchantStore(userId) {
  const db = getAdminClient();
  const { data, error } = await db
    .from('stores')
    .select('*')
    .eq('owner_id', userId)
    .single();

  if (error || !data) {
    throw Object.assign(new Error('Loja não encontrada para este usuário'), { statusCode: 404 });
  }
  return data;
}

/**
 * Garante que `storeId` pertence ao `userId`. Lança 403 se não.
 */
async function assertOwnership(userId, storeId) {
  const db = getAdminClient();
  const { count } = await db
    .from('stores')
    .select('id', { count: 'exact', head: true })
    .eq('id', storeId)
    .eq('owner_id', userId);

  if (!count) throw Object.assign(new Error('Acesso negado a esta loja'), { statusCode: 403 });
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

/**
 * Estatísticas do painel: pedidos de hoje, receita, breakdown por status.
 */
export async function getDashboardStats(userId) {
  const store = await getMerchantStore(userId);
  const db    = getAdminClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Todos os pedidos da loja de hoje em diante (para contagem de hoje)
  // + todos os pedidos por status (sem filtro de data) para o dashboard geral
  const [{ data: todayOrders }, { data: allByStatus }] = await Promise.all([
    db
      .from('store_orders')
      .select('id, total_price, delivery_fee, status')
      .eq('store_id', store.id)
      .gte('created_at', todayStart.toISOString()),
    db
      .from('store_orders')
      .select('status')
      .eq('store_id', store.id),
  ]);

  // Receita de hoje (soma de pedidos completed ou delivering de hoje)
  const todayRevenue = (todayOrders ?? [])
    .filter((o) => ['completed', 'delivering'].includes(o.status))
    .reduce((sum, o) => sum + Number(o.total_price), 0);

  // Contagem por status (total histórico)
  const statusCounts = {};
  for (const o of allByStatus ?? []) {
    statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
  }

  // Últimos 10 pedidos (para lista rápida)
  const { data: recentOrders } = await db
    .from('store_orders')
    .select('id, customer_name, customer_phone, total_price, status, created_at')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })
    .limit(10);

  return {
    store: { id: store.id, name: store.name, type: store.type },
    today: {
      orderCount: todayOrders?.length ?? 0,
      revenue:    todayRevenue,
    },
    statusCounts,
    recentOrders: recentOrders ?? [],
  };
}

// ── Pedidos ───────────────────────────────────────────────────────────────────

/**
 * Lista pedidos da loja com filtros opcionais.
 */
export async function getMerchantOrders(userId, { status, limit = 50, offset = 0 } = {}) {
  const store = await getMerchantStore(userId);
  const db    = getAdminClient();

  let query = db
    .from('store_orders')
    .select('id, customer_name, customer_phone, customer_address, customer_neighborhood, total_price, delivery_fee, status, created_at')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw new Error(`getMerchantOrders: ${error.message}`);
  return { storeId: store.id, orders: data ?? [] };
}

/**
 * Detalhe completo de um pedido (itens + produtos + receita).
 */
export async function getMerchantOrderDetail(userId, orderId) {
  const store = await getMerchantStore(userId);
  const db    = getAdminClient();

  const { data: order, error } = await db
    .from('store_orders')
    .select('*')
    .eq('id', orderId)
    .eq('store_id', store.id)
    .single();

  if (error || !order) {
    throw Object.assign(new Error('Pedido não encontrado'), { statusCode: 404 });
  }

  const [{ data: items }, { data: prescriptions }] = await Promise.all([
    db
      .from('store_order_items')
      .select(`
        id, quantity, price, notes,
        store_products ( id, name, image_url, requires_prescription )
      `)
      .eq('order_id', orderId),
    db
      .from('store_prescriptions')
      .select('id, image_url, created_at')
      .eq('order_id', orderId),
  ]);

  return { ...order, items: items ?? [], prescriptions: prescriptions ?? [] };
}

/**
 * Aceitar pedido (pending → confirmed).
 */
export async function acceptOrder(userId, orderId) {
  const store = await getMerchantStore(userId);
  const db    = getAdminClient();

  const { data, error } = await db
    .from('store_orders')
    .update({ status: 'confirmed', updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('store_id', store.id)
    .eq('status', 'pending') // só aceita se ainda estiver pending
    .select('id, status')
    .single();

  if (error || !data) {
    throw Object.assign(
      new Error('Pedido não encontrado ou já foi processado'),
      { statusCode: 409 }
    );
  }
  return data;
}

/**
 * Muda status de um pedido (qualquer transição válida).
 */
export async function setOrderStatus(userId, orderId, newStatus) {
  const store = await getMerchantStore(userId);
  const db    = getAdminClient();

  const { data, error } = await db
    .from('store_orders')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('store_id', store.id)
    .select('id, status')
    .single();

  if (error || !data) {
    throw Object.assign(new Error('Pedido não encontrado'), { statusCode: 404 });
  }
  return data;
}

// ── Pedidos com receita (farmácia) ────────────────────────────────────────────

/**
 * Lista pedidos que possuem receita médica (uso farmácia).
 */
export async function getPrescriptionOrders(userId, { limit = 50, offset = 0 } = {}) {
  const store = await getMerchantStore(userId);
  const db    = getAdminClient();

  // Pedidos que têm ao menos uma receita
  const { data: prescriptions, error } = await db
    .from('store_prescriptions')
    .select(`
      id, image_url, created_at,
      store_orders!inner ( id, customer_name, customer_phone, status, created_at, store_id )
    `)
    .eq('store_orders.store_id', store.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(`getPrescriptionOrders: ${error.message}`);
  return prescriptions ?? [];
}

// ── Produtos (CRUD) ───────────────────────────────────────────────────────────

/**
 * Lista todos os produtos da loja (ativos e inativos).
 */
export async function getMerchantProducts(userId) {
  const store = await getMerchantStore(userId);
  const db    = getAdminClient();

  const { data, error } = await db
    .from('store_products')
    .select(`
      id, name, price, image_url, description, category_id, metadata,
      requires_prescription, is_active, created_at,
      store_categories ( id, name )
    `)
    .eq('store_id', store.id)
    .order('name', { ascending: true });

  if (error) throw new Error(`getMerchantProducts: ${error.message}`);
  return { storeId: store.id, products: data ?? [] };
}

/**
 * Cria produto.
 */
export async function createMerchantProduct(userId, fields) {
  const store = await getMerchantStore(userId);
  const db    = getAdminClient();

  const { data, error } = await db
    .from('store_products')
    .insert({
      store_id:              store.id,
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

  if (error) throw new Error(`createMerchantProduct: ${error.message}`);
  return data;
}

/**
 * Atualiza produto (verifica ownership via store).
 */
export async function updateMerchantProduct(userId, productId, fields) {
  const store = await getMerchantStore(userId);
  const db    = getAdminClient();

  const allowed = {};
  if (fields.name                !== undefined) allowed.name                  = fields.name;
  if (fields.price               !== undefined) allowed.price                 = fields.price;
  if (fields.imageUrl            !== undefined) allowed.image_url             = fields.imageUrl;
  if (fields.description         !== undefined) allowed.description           = fields.description;
  if (fields.categoryId          !== undefined) allowed.category_id           = fields.categoryId;
  if (fields.metadata            !== undefined) allowed.metadata              = fields.metadata;
  if (fields.requiresPrescription !== undefined) allowed.requires_prescription = fields.requiresPrescription;
  if (fields.isActive            !== undefined) allowed.is_active             = fields.isActive;

  const { data, error } = await db
    .from('store_products')
    .update(allowed)
    .eq('id', productId)
    .eq('store_id', store.id)
    .select()
    .single();

  if (error || !data) throw Object.assign(new Error('Produto não encontrado'), { statusCode: 404 });
  return data;
}

/**
 * Exclui produto.
 */
export async function deleteMerchantProduct(userId, productId) {
  const store = await getMerchantStore(userId);
  const db    = getAdminClient();

  const { error } = await db
    .from('store_products')
    .delete()
    .eq('id', productId)
    .eq('store_id', store.id);

  if (error) throw new Error(`deleteMerchantProduct: ${error.message}`);
  return { deleted: true };
}

/**
 * Upload de imagem do produto via base64.
 * Armazena no bucket Supabase e atualiza image_url do produto.
 *
 * @param {string} userId
 * @param {string} productId
 * @param {object} params - { file: "data:image/...;base64,...", fileName, mimeType }
 */
export async function uploadProductImage(userId, productId, { file, fileName, mimeType }) {
  if (!ALLOWED_TYPES.has(mimeType)) {
    throw Object.assign(new Error('Tipo de arquivo inválido. Use: JPEG, PNG ou WebP'), { statusCode: 400 });
  }

  const store = await getMerchantStore(userId);
  const db    = getAdminClient();

  // Verify product belongs to store
  const { count } = await db
    .from('store_products')
    .select('id', { count: 'exact', head: true })
    .eq('id', productId)
    .eq('store_id', store.id);

  if (!count) throw Object.assign(new Error('Produto não encontrado'), { statusCode: 404 });

  // Decode base64
  const base64Data = file.replace(/^data:[^;]+;base64,/, '');
  const buffer     = Buffer.from(base64Data, 'base64');

  if (buffer.length > MAX_FILE_SIZE) {
    throw Object.assign(new Error('Arquivo muito grande. Máximo 5 MB'), { statusCode: 400 });
  }

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
  const path     = `store-products/${store.id}/${productId}-${Date.now()}-${safeName}`;

  const { error: uploadErr } = await db.storage
    .from(PRODUCT_BUCKET)
    .upload(path, buffer, { contentType: mimeType, upsert: true });

  if (uploadErr) throw new Error(`Falha no upload: ${uploadErr.message}`);

  const { data: { publicUrl } } = db.storage.from(PRODUCT_BUCKET).getPublicUrl(path);

  // Update product
  const { data, error: updateErr } = await db
    .from('store_products')
    .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', productId)
    .select('id, image_url')
    .single();

  if (updateErr) throw new Error(`updateProductImage: ${updateErr.message}`);
  return data;
}

// ── Configurações da loja ─────────────────────────────────────────────────────

/**
 * Retorna configurações editáveis da loja.
 */
export async function getStoreSettings(userId) {
  const store = await getMerchantStore(userId);
  return {
    id:                     store.id,
    name:                   store.name,
    slug:                   store.slug,
    type:                   store.type,
    deliveryFee:            store.delivery_fee,
    deliveryNeighborhoods:  store.delivery_neighborhoods,
    averageDeliveryMinutes: store.average_delivery_minutes,
    businessHours:          store.business_hours,
    isActive:               store.is_active,
  };
}

/**
 * Salva configurações da loja.
 * Campos editáveis pelo lojista:
 *   deliveryFee, deliveryNeighborhoods, averageDeliveryMinutes, businessHours
 * (slug e type são alterados apenas pelo super admin)
 */
export async function updateStoreSettings(userId, fields) {
  const store = await getMerchantStore(userId);
  const db    = getAdminClient();

  const allowed = {};
  if (fields.deliveryFee            !== undefined) allowed.delivery_fee             = fields.deliveryFee;
  if (fields.deliveryNeighborhoods  !== undefined) allowed.delivery_neighborhoods   = fields.deliveryNeighborhoods;
  if (fields.averageDeliveryMinutes !== undefined) allowed.average_delivery_minutes = fields.averageDeliveryMinutes;
  if (fields.businessHours          !== undefined) allowed.business_hours           = fields.businessHours;
  // Lojista pode desativar/ativar a própria loja
  if (fields.isActive               !== undefined) allowed.is_active               = fields.isActive;

  if (Object.keys(allowed).length === 0) {
    throw Object.assign(new Error('Nenhum campo para atualizar'), { statusCode: 400 });
  }

  const { data, error } = await db
    .from('stores')
    .update(allowed)
    .eq('id', store.id)
    .select()
    .single();

  if (error) throw new Error(`updateStoreSettings: ${error.message}`);
  return data;
}

// ── Categorias ────────────────────────────────────────────────────────────────

export async function getMerchantCategories(userId) {
  const store = await getMerchantStore(userId);
  const db    = getAdminClient();

  const { data, error } = await db
    .from('store_categories')
    .select('id, name, order')
    .eq('store_id', store.id)
    .order('order', { ascending: true });

  if (error) throw new Error(`getMerchantCategories: ${error.message}`);
  return data ?? [];
}

export async function createMerchantCategory(userId, { name, order = 0 }) {
  const store = await getMerchantStore(userId);
  const db    = getAdminClient();

  const { data, error } = await db
    .from('store_categories')
    .insert({ store_id: store.id, name, order })
    .select()
    .single();

  if (error) throw new Error(`createMerchantCategory: ${error.message}`);
  return data;
}

export async function deleteMerchantCategory(userId, categoryId) {
  const store = await getMerchantStore(userId);
  const db    = getAdminClient();

  const { error } = await db
    .from('store_categories')
    .delete()
    .eq('id', categoryId)
    .eq('store_id', store.id);

  if (error) throw new Error(`deleteMerchantCategory: ${error.message}`);
  return { deleted: true };
}
