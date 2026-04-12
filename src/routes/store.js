/**
 * store.js — Public customer-facing routes for the SiteFlow order system.
 *
 * No authentication required (customers don't log in).
 *
 * GET  /store/:slug             — Store info + categories
 * GET  /store/:slug/products    — Product list for a store
 * GET  /products/:storeId       — Alias: product list by storeId (as specified)
 * POST /orders                  — Place an order
 * GET  /orders/:id              — Order confirmation / status
 * PATCH /orders/:id/status      — Update order status (store operator use)
 */

import { Router } from 'express';
import Joi        from 'joi';

import { asyncHandler, send } from '../utils/asyncHandler.js';
import { requireAuth }        from '../middleware/auth.js';
import { requireAdmin }       from '../middleware/adminGuard.js';
import { getAdminClient }     from '../saas/db.js';
import { emitToStore, emitToTenant } from '../saas/socketService.js';
import {
  getStoreBySlug,
  getStoreProducts,
  createOrder,
  updateOrderStatus,
  getOrder,
  listOrders,
  ORDER_STATUSES,
} from '../saas/storeService.js';

const router = Router();

// ── Validation helpers ────────────────────────────────────────────────────────

function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({
        success: false,
        error:   'Dados inválidos',
        details: error.details.map((d) => d.message),
        timestamp: new Date().toISOString(),
      });
    }
    req.body = value;
    next();
  };
}

const orderSchema = Joi.object({
  storeId:               Joi.string().uuid().required(),
  customerName:          Joi.string().min(2).max(120).required(),
  customerPhone:         Joi.string().min(8).max(30).required(),
  customerAddress:       Joi.string().min(5).max(300).required(),
  customerNeighborhood:  Joi.string().max(100).optional(),
  items: Joi.array().items(
    Joi.object({
      productId: Joi.string().uuid().required(),
      quantity:  Joi.number().integer().min(1).max(99).required(),
      notes:     Joi.string().max(200).optional(),
    })
  ).min(1).max(50).required(),
  prescriptionUrl: Joi.string().uri().optional(),
});

const statusSchema = Joi.object({
  status: Joi.string().valid(...ORDER_STATUSES).required(),
});

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC — /public/store/:id  (frontend pharmacy/food app)
// Consulta tabela `sites` + `products`
// ─────────────────────────────────────────────────────────────────────────────

async function fetchPublicStore(id) {
  const db = getAdminClient();
  const { data, error } = await db
    .from('sites')
    .select('id, business_name, niche, phone, city, address, delivery_fee_fixed, content, config, status')
    .eq('id', id)
    .eq('status', 'published')
    .single();
  console.log('[fetchPublicStore] id:', id, '| found:', !!data, '| error:', error?.message ?? null);
  if (error || !data) return null;

  const content = data.content ?? {};
  return {
    id:                data.id,
    name:              data.business_name,
    business_name:     data.business_name,
    niche:             data.niche,
    phone:             data.phone    ?? null,
    city:              data.city     ?? null,
    address:           data.address  ?? null,
    delivery_fee:      data.delivery_fee_fixed ?? 0,
    description:       content.description ?? null,
    cover_url:         content.cover_url   ?? content.hero_image ?? null,
    logo_url:          content.logo_url    ?? content.logo       ?? null,
    is_open:           true,
    delivery_time_min: 30,
    delivery_time_max: 60,
    min_order:         0,
    rating:            0,
    rating_count:      0,
  };
}

async function fetchPublicProducts(siteId) {
  const db = getAdminClient();
  const { data, error } = await db
    .from('products')
    .select('id, name, price, image_url, description, is_active, sort_order')
    .eq('site_id', siteId)
    .eq('is_active', true);
  if (error) throw new Error(`fetchPublicProducts: ${error.message}`);
  return (data ?? []).map((p) => ({
    id:                    p.id,
    name:                  p.name,
    price:                 p.price,
    original_price:        null,
    imageUrl:              p.image_url ?? null,
    description:           p.description ?? null,
    category:              null,
    requires_prescription: false,
    is_available:          p.is_active ?? true,
    badge:                 null,
  }));
}

/**
 * GET /public/store/:id
 */
router.get('/public/store/:id', asyncHandler(async (req, res) => {
  const store = await fetchPublicStore(req.params.id);
  if (!store) {
    return res.status(404).json({ success: false, error: 'Loja não encontrada', timestamp: new Date().toISOString() });
  }
  const products = await fetchPublicProducts(store.id);
  res.json({ success: true, data: { ...store, products } });
}));

/**
 * GET /public/store/:id/products
 */
router.get('/public/store/:id/products', asyncHandler(async (req, res) => {
  const store = await fetchPublicStore(req.params.id);
  if (!store) {
    return res.status(404).json({ success: false, error: 'Loja não encontrada', timestamp: new Date().toISOString() });
  }
  const products = await fetchPublicProducts(store.id);
  res.json({ success: true, data: products });
}));

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC — no auth
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /store/:slug
 * Returns store metadata and its category list.
 */
router.get('/store/:slug', asyncHandler(async (req, res) => {
  const result = await getStoreBySlug(req.params.slug);
  if (!result) {
    return res.status(404).json({
      success: false,
      error: 'Loja não encontrada',
      timestamp: new Date().toISOString(),
    });
  }
  send(res, result);
}));

/**
 * GET /store/:slug/products
 * Returns all active products for the store (with category info).
 */
router.get('/store/:slug/products', asyncHandler(async (req, res) => {
  const result = await getStoreBySlug(req.params.slug);
  if (!result) {
    return res.status(404).json({
      success: false,
      error: 'Loja não encontrada',
      timestamp: new Date().toISOString(),
    });
  }
  const products = await getStoreProducts(result.store.id);
  send(res, products);
}));

/**
 * GET /products/:storeId
 * Alternative endpoint: product list by storeId directly.
 */
router.get('/products/:storeId', asyncHandler(async (req, res) => {
  const products = await getStoreProducts(req.params.storeId);
  send(res, products);
}));

/**
 * POST /orders
 * Place a new order. No auth required (public customers).
 */
router.post('/orders', validate(orderSchema), asyncHandler(async (req, res) => {
  const order = await createOrder(req.body);
  send(res, order, 201);
}));

/**
 * GET /orders/:id
 * Retrieve an order (confirmation page / status polling).
 */
router.get('/orders/:id', asyncHandler(async (req, res) => {
  const order = await getOrder(req.params.id);
  if (!order) {
    return res.status(404).json({
      success: false,
      error: 'Pedido não encontrado',
      timestamp: new Date().toISOString(),
    });
  }
  send(res, order);
}));

// ─────────────────────────────────────────────────────────────────────────────
// OPERATOR — requires auth (store operators / admin)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PATCH /orders/:id/status
 * Update order status. Triggers event message on 'delivering'.
 *
 * Body: { status: 'confirmed' | 'preparing' | 'delivering' | 'completed' }
 * Optionally pass storeId in body to scope the update to a specific store.
 */
router.patch(
  '/orders/:id/status',
  requireAuth,
  validate(Joi.object({
    status:  Joi.string().valid(...ORDER_STATUSES).required(),
    storeId: Joi.string().uuid().optional(), // scope guard
  })),
  asyncHandler(async (req, res) => {
    const { status, storeId } = req.body;
    const result = await updateOrderStatus(req.params.id, status, storeId);
    send(res, result);
  })
);

/**
 * PATCH /orders/:id/paid
 * Mark an order as paid. Sets status to 'paid' and records paid_at timestamp.
 */
router.patch(
  '/orders/:id/paid',
  requireAuth,
  asyncHandler(async (req, res) => {
    const db = getAdminClient();
    const { storeId } = req.body;

    let query = db
      .from('store_orders')
      .update({ status: 'paid', paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', req.params.id);
    if (storeId) query = query.eq('store_id', storeId);

    const { data: order, error } = await query.select('id, store_id, status').single();

    if (error || !order) {
      return res.status(404).json({ success: false, error: 'Pedido nao encontrado' });
    }

    emitToStore(order.store_id, 'order_update', { order, message: null });
    emitToTenant(order.store_id, 'order_updated', { order_id: order.id, status: 'paid' });

    send(res, { order });
  })
);

/**
 * GET /orders/store/:storeId
 */
router.get(
  '/orders/store/:storeId',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { status, limit, offset } = req.query;
    const orders = await listOrders(req.params.storeId, {
      status,
      limit:  limit  ? parseInt(limit,  10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    send(res, orders);
  })
);

export default router;
