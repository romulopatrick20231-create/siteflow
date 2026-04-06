/**
 * storeAdmin.js — Admin routes for managing stores, categories and products.
 *
 * All routes require authentication + admin role.
 *
 * Stores:
 *   GET    /store-admin/stores              — List all stores
 *   POST   /store-admin/stores              — Create store
 *   PATCH  /store-admin/stores/:id          — Update store
 *
 * Categories:
 *   POST   /store-admin/stores/:id/categories — Create category
 *
 * Products:
 *   POST   /store-admin/stores/:id/products   — Create product
 *   PATCH  /store-admin/products/:id          — Update product (body: storeId)
 *   DELETE /store-admin/products/:id          — Delete product (body: storeId)
 *
 * Factory (geração automática):
 *   POST   /store-admin/create-with-template  — Cria loja completa por nicho
 */

import { Router } from 'express';
import Joi        from 'joi';

import { asyncHandler, send } from '../utils/asyncHandler.js';
import { requireAuth }        from '../middleware/auth.js';
import { requireAdmin }       from '../middleware/adminGuard.js';
import {
  createStore,
  updateStore,
  listStores,
  createCategory,
  createStoreProduct,
  updateStoreProduct,
  deleteStoreProduct,
} from '../saas/storeService.js';
import { createStoreWithTemplate }           from '../saas/storeFactory.js';
import { SUPPORTED_NICHES, NICHES_BY_TYPE }  from '../saas/storeTemplates.js';

const router = Router();
router.use(requireAuth, requireAdmin);

// ── Validation ────────────────────────────────────────────────────────────────

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

const neighborhoodEntry = Joi.object({
  neighborhood: Joi.string().required(),
  fee:          Joi.number().min(0).required(),
});

const storeCreateSchema = Joi.object({
  name:                   Joi.string().min(2).max(120).required(),
  slug:                   Joi.string().alphanum().min(2).max(80).required(),
  type:                   Joi.string().valid('food', 'pharmacy').required(),
  deliveryFee:            Joi.number().min(0).default(0),
  deliveryNeighborhoods:  Joi.array().items(neighborhoodEntry).default([]),
});

const storeUpdateSchema = Joi.object({
  name:                   Joi.string().min(2).max(120),
  type:                   Joi.string().valid('food', 'pharmacy'),
  deliveryFee:            Joi.number().min(0),
  deliveryNeighborhoods:  Joi.array().items(neighborhoodEntry),
  isActive:               Joi.boolean(),
});

const categorySchema = Joi.object({
  name:  Joi.string().min(1).max(80).required(),
  order: Joi.number().integer().min(0).default(0),
});

const productCreateSchema = Joi.object({
  name:                  Joi.string().min(1).max(200).required(),
  price:                 Joi.number().positive().required(),
  categoryId:            Joi.string().uuid().optional(),
  imageUrl:              Joi.string().uri().optional(),
  description:           Joi.string().max(1000).optional(),
  metadata:              Joi.object().default({}),
  requiresPrescription:  Joi.boolean().default(false),
});

const productUpdateSchema = Joi.object({
  storeId:               Joi.string().uuid().required(),
  name:                  Joi.string().min(1).max(200),
  price:                 Joi.number().positive(),
  categoryId:            Joi.string().uuid().optional().allow(null),
  imageUrl:              Joi.string().uri().optional().allow(null),
  description:           Joi.string().max(1000).optional().allow(null),
  metadata:              Joi.object(),
  requiresPrescription:  Joi.boolean(),
  isActive:              Joi.boolean(),
});

// ── Store routes ──────────────────────────────────────────────────────────────

router.get('/stores', asyncHandler(async (_req, res) => {
  const stores = await listStores();
  send(res, stores);
}));

router.post('/stores', validate(storeCreateSchema), asyncHandler(async (req, res) => {
  const store = await createStore(req.body);
  send(res, store, 201);
}));

router.patch('/stores/:id', validate(storeUpdateSchema), asyncHandler(async (req, res) => {
  const store = await updateStore(req.params.id, req.body);
  send(res, store);
}));

// ── Category routes ───────────────────────────────────────────────────────────

router.post(
  '/stores/:id/categories',
  validate(categorySchema),
  asyncHandler(async (req, res) => {
    const category = await createCategory(req.params.id, req.body);
    send(res, category, 201);
  })
);

// ── Product routes ────────────────────────────────────────────────────────────

router.post(
  '/stores/:id/products',
  validate(productCreateSchema),
  asyncHandler(async (req, res) => {
    const product = await createStoreProduct(req.params.id, req.body);
    send(res, product, 201);
  })
);

router.patch(
  '/products/:id',
  validate(productUpdateSchema),
  asyncHandler(async (req, res) => {
    const { storeId, ...fields } = req.body;
    const product = await updateStoreProduct(req.params.id, storeId, fields);
    send(res, product);
  })
);

router.delete('/products/:id', asyncHandler(async (req, res) => {
  const storeId = req.query.storeId;
  if (!storeId) {
    return res.status(400).json({ success: false, error: 'storeId é obrigatório', timestamp: new Date().toISOString() });
  }
  const result = await deleteStoreProduct(req.params.id, storeId);
  send(res, result);
}));

// ── Factory: criação automática de loja completa ──────────────────────────────

/**
 * POST /store-admin/create-with-template
 *
 * Cria loja + usuário + categorias + produtos (com imagens Pexels) em um único call.
 *
 * Body:
 *   { name, niche, email, deliveryFee? }
 *
 * Nichos suportados: pizzaria | hamburgueria | acai | farmacia
 *
 * Retorna:
 *   { store_url, login, password, store, summary }
 *
 * Tempo estimado: 10–30s dependendo do Pexels (20–30 imagens em paralelo)
 */
router.post(
  '/create-with-template',
  validate(Joi.object({
    name:        Joi.string().min(2).max(120).required(),
    niche:       Joi.string().valid(...SUPPORTED_NICHES).required(),
    email:       Joi.string().email().required(),
    type:        Joi.string().valid('pedezap', 'farmazap').required(),
    deliveryFee: Joi.number().min(0).default(5.00),
  })),
  asyncHandler(async (req, res) => {
    const result = await createStoreWithTemplate(req.body);
    // 201 Created — retorna credenciais + URL da loja vinculada ao produto
    send(res, result, 201);
  })
);

/**
 * GET /store-admin/niches
 * Lista os nichos suportados pelo factory, agrupados por produto.
 */
router.get('/niches', (_req, res) => {
  send(res, {
    niches:        SUPPORTED_NICHES,
    nichesByType:  NICHES_BY_TYPE,
  });
});

export default router;
