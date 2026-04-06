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
import {
  getStoreBySlug,
  getStoreById,
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
// ─────────────────────────────────────────────────────────────────────────────

/** Converte reais → centavos */
const toCents = (v) => (v == null ? null : Math.round(Number(v) * 100));

/** Mapeia tipo DB → niche legível */
const TYPE_TO_NICHE = { food: 'Alimentação', pharmacy: 'Farmácia' };

/** Mapeia nome de categoria do template → nome público */
const CATEGORY_DISPLAY = {
  // farmácia
  dor_febre:  'Medicamentos', vitaminas: 'Vitaminas',
  higiene:    'Higiene',      bebe:      'Bebê',
  beleza:     'Beleza',       genericos: 'Medicamentos',
  // food — pass-through
};

function mapStore(store) {
  return {
    id:                store.id,
    name:              store.name,
    business_name:     store.name,
    niche:             TYPE_TO_NICHE[store.type] ?? store.type,
    phone:             store.phone             ?? null,
    description:       store.description       ?? null,
    address:           store.address           ?? null,
    cover_url:         store.cover_url         ?? null,
    logo_url:          store.logo_url          ?? null,
    is_open:           store.is_open           ?? true,
    delivery_time_min: store.delivery_time_min ?? store.average_delivery_minutes ?? 30,
    delivery_time_max: store.delivery_time_max ?? (store.average_delivery_minutes ? store.average_delivery_minutes + 20 : 60),
    delivery_fee:      toCents(store.delivery_fee) ?? 0,
    min_order:         store.min_order         ?? 0,
    rating:            store.rating            ?? 0,
    rating_count:      store.rating_count      ?? 0,
  };
}

function mapProduct(p) {
  const categoryName = p.store_categories?.name ?? null;
  const display = categoryName
    ? (CATEGORY_DISPLAY[categoryName?.toLowerCase().replace(/\s+/g, '_')] ?? categoryName)
    : null;
  return {
    id:                    p.id,
    name:                  p.name,
    price:                 toCents(p.price),
    original_price:        toCents(p.original_price),
    imageUrl:              p.image_url ?? null,
    description:           p.description ?? null,
    category:              display,
    requires_prescription: p.requires_prescription ?? false,
    is_available:          p.is_active ?? true,
    badge:                 p.metadata?.badge ?? null,
  };
}

/**
 * GET /public/store/:id
 * Store info for the public frontend (pharmacy / food app).
 */
router.get('/public/store/:id', asyncHandler(async (req, res) => {
  const result = await getStoreById(req.params.id);
  if (!result) {
    return res.status(404).json({ success: false, error: 'Loja não encontrada', timestamp: new Date().toISOString() });
  }
  send(res, {
    store:      mapStore(result.store),
    categories: result.categories,
  });
}));

/**
 * GET /public/store/:id/products
 * Product list for the public frontend.
 */
router.get('/public/store/:id/products', asyncHandler(async (req, res) => {
  const result = await getStoreById(req.params.id);
  if (!result) {
    return res.status(404).json({ success: false, error: 'Loja não encontrada', timestamp: new Date().toISOString() });
  }
  const raw = await getStoreProducts(result.store.id);
  send(res, raw.map(mapProduct));
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
 * GET /orders/store/:storeId
 * List orders for a store. Admin only.
 *
 * Query params: ?status=pending&limit=50&offset=0
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
