/**
 * merchant.js — Painel do lojista.
 *
 * Todas as rotas requerem autenticação (JWT). O usuário logado deve ser
 * o owner_id da loja (verificado internamente em storeOwnerService).
 *
 * Dashboard:
 *   GET  /merchant/dashboard              — stats + pedidos recentes
 *
 * Pedidos:
 *   GET  /merchant/orders                 — lista (?status, ?limit, ?offset)
 *   GET  /merchant/orders/:id             — detalhe completo
 *   POST /merchant/orders/:id/accept      — aceitar (pending → confirmed)
 *   PATCH /merchant/orders/:id/status     — mudar status
 *
 * Receitas (farmácia):
 *   GET  /merchant/prescriptions          — pedidos com receita médica
 *
 * Produtos:
 *   GET    /merchant/products             — listar todos
 *   POST   /merchant/products             — criar
 *   PATCH  /merchant/products/:id         — editar
 *   DELETE /merchant/products/:id         — excluir
 *   POST   /merchant/products/:id/image   — upload de imagem (base64)
 *
 * Categorias:
 *   GET    /merchant/categories           — listar
 *   POST   /merchant/categories           — criar
 *   DELETE /merchant/categories/:id       — excluir
 *
 * Configurações:
 *   GET   /merchant/settings              — taxa, horário, tempo médio
 *   PATCH /merchant/settings              — atualizar
 *
 * Automações:
 *   GET  /merchant/automation             — follow-ups pendentes + reativação
 *   POST /merchant/automation/followup    — marcar follow-up como enviado
 */

import { Router } from 'express';
import Joi        from 'joi';

import { asyncHandler, send } from '../utils/asyncHandler.js';
import { requireAuth }        from '../middleware/auth.js';
import { requireType }        from '../middleware/requireProductType.js';
import { ORDER_STATUSES }     from '../saas/storeService.js';
import {
  getMerchantStore,
  getDashboardStats,
  getMerchantOrders,
  getMerchantOrderDetail,
  acceptOrder,
  setOrderStatus,
  getPrescriptionOrders,
  getMerchantProducts,
  createMerchantProduct,
  updateMerchantProduct,
  deleteMerchantProduct,
  uploadProductImage,
  getStoreSettings,
  updateStoreSettings,
  getMerchantCategories,
  createMerchantCategory,
  deleteMerchantCategory,
} from '../saas/storeOwnerService.js';
import {
  runAutomationCheck,
  markFollowupSent,
} from '../saas/storeAutomation.js';

const router = Router();
router.use(requireAuth);

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

const dayHours = Joi.object({
  open:  Joi.string().pattern(/^\d{2}:\d{2}$/).allow(null).optional(),
  close: Joi.string().pattern(/^\d{2}:\d{2}$/).allow(null).optional(),
});

const productSchema = Joi.object({
  name:                  Joi.string().min(1).max(200).required(),
  price:                 Joi.number().positive().required(),
  categoryId:            Joi.string().uuid().optional().allow(null),
  imageUrl:              Joi.string().uri().optional().allow(null),
  description:           Joi.string().max(1000).optional().allow(null),
  metadata:              Joi.object().default({}),
  requiresPrescription:  Joi.boolean().default(false),
});

const productUpdateSchema = Joi.object({
  name:                  Joi.string().min(1).max(200),
  price:                 Joi.number().positive(),
  categoryId:            Joi.string().uuid().optional().allow(null),
  imageUrl:              Joi.string().uri().optional().allow(null),
  description:           Joi.string().max(1000).optional().allow(null),
  metadata:              Joi.object(),
  requiresPrescription:  Joi.boolean(),
  isActive:              Joi.boolean(),
});

const settingsSchema = Joi.object({
  deliveryFee:            Joi.number().min(0),
  deliveryNeighborhoods:  Joi.array().items(neighborhoodEntry),
  averageDeliveryMinutes: Joi.number().integer().min(1).max(300),
  businessHours: Joi.object({
    mon: dayHours, tue: dayHours, wed: dayHours, thu: dayHours,
    fri: dayHours, sat: dayHours, sun: dayHours,
  }),
  isActive: Joi.boolean(),
});

const categorySchema = Joi.object({
  name:  Joi.string().min(1).max(80).required(),
  order: Joi.number().integer().min(0).default(0),
});

// ── Dashboard ─────────────────────────────────────────────────────────────────

router.get('/dashboard', asyncHandler(async (req, res) => {
  const stats = await getDashboardStats(req.userId);
  send(res, stats);
}));

// ── Pedidos ───────────────────────────────────────────────────────────────────

router.get('/orders', asyncHandler(async (req, res) => {
  const { status, limit, offset } = req.query;
  const result = await getMerchantOrders(req.userId, {
    status,
    limit:  limit  ? parseInt(limit,  10) : 50,
    offset: offset ? parseInt(offset, 10) : 0,
  });
  send(res, result);
}));

router.get('/orders/:id', asyncHandler(async (req, res) => {
  const order = await getMerchantOrderDetail(req.userId, req.params.id);
  send(res, order);
}));

router.post('/orders/:id/accept', asyncHandler(async (req, res) => {
  const order = await acceptOrder(req.userId, req.params.id);
  send(res, order);
}));

router.patch(
  '/orders/:id/status',
  validate(Joi.object({ status: Joi.string().valid(...ORDER_STATUSES).required() })),
  asyncHandler(async (req, res) => {
    const order = await setOrderStatus(req.userId, req.params.id, req.body.status);
    send(res, order);
  })
);

// ── Receitas (farmácia) — exclusivo FarmaZap ──────────────────────────────────

router.get('/prescriptions', requireType('farmazap'), asyncHandler(async (req, res) => {
  const { limit, offset } = req.query;
  const prescriptions = await getPrescriptionOrders(req.userId, {
    limit:  limit  ? parseInt(limit,  10) : 50,
    offset: offset ? parseInt(offset, 10) : 0,
  });
  send(res, prescriptions);
}));

// ── Produtos ──────────────────────────────────────────────────────────────────

router.get('/products', asyncHandler(async (req, res) => {
  const result = await getMerchantProducts(req.userId);
  send(res, result);
}));

router.post('/products', validate(productSchema), asyncHandler(async (req, res) => {
  const product = await createMerchantProduct(req.userId, req.body);
  send(res, product, 201);
}));

router.patch(
  '/products/:id',
  validate(productUpdateSchema),
  asyncHandler(async (req, res) => {
    const product = await updateMerchantProduct(req.userId, req.params.id, req.body);
    send(res, product);
  })
);

router.delete('/products/:id', asyncHandler(async (req, res) => {
  const result = await deleteMerchantProduct(req.userId, req.params.id);
  send(res, result);
}));

/**
 * POST /merchant/products/:id/image
 * Body: { file: "data:image/jpeg;base64,...", fileName: "foto.jpg", mimeType: "image/jpeg" }
 */
router.post(
  '/products/:id/image',
  validate(Joi.object({
    file:     Joi.string().required(),
    fileName: Joi.string().min(1).max(200).required(),
    mimeType: Joi.string().valid('image/jpeg', 'image/png', 'image/webp').required(),
  })),
  asyncHandler(async (req, res) => {
    const result = await uploadProductImage(req.userId, req.params.id, req.body);
    send(res, result);
  })
);

// ── Categorias ────────────────────────────────────────────────────────────────

router.get('/categories', asyncHandler(async (req, res) => {
  const categories = await getMerchantCategories(req.userId);
  send(res, categories);
}));

router.post('/categories', validate(categorySchema), asyncHandler(async (req, res) => {
  const category = await createMerchantCategory(req.userId, req.body);
  send(res, category, 201);
}));

router.delete('/categories/:id', asyncHandler(async (req, res) => {
  const result = await deleteMerchantCategory(req.userId, req.params.id);
  send(res, result);
}));

// ── Configurações ─────────────────────────────────────────────────────────────

router.get('/settings', asyncHandler(async (req, res) => {
  const settings = await getStoreSettings(req.userId);
  send(res, settings);
}));

router.patch('/settings', validate(settingsSchema), asyncHandler(async (req, res) => {
  const store = await updateStoreSettings(req.userId, req.body);
  send(res, store);
}));

// ── Automações ────────────────────────────────────────────────────────────────

/**
 * GET /merchant/automation
 * Retorna follow-ups pendentes (>30min sem confirmação) + candidatos de reativação.
 * O lojista vê no painel e aciona manualmente (WhatsApp, ligação etc).
 */
router.get('/automation', asyncHandler(async (req, res) => {
  const store  = await getMerchantStore(req.userId);
  const result = await runAutomationCheck(store.id);
  send(res, result);
}));

/**
 * POST /merchant/automation/followup
 * Body: { orderId, type: "pending_30min" | "reactivation" }
 * Marca que o lojista já entrou em contato — evita reexibição.
 */
router.post(
  '/automation/followup',
  validate(Joi.object({
    orderId: Joi.string().uuid().required(),
    type:    Joi.string().valid('pending_30min', 'reactivation').required(),
  })),
  asyncHandler(async (req, res) => {
    const store  = await getMerchantStore(req.userId);
    const result = await markFollowupSent(req.body.orderId, store.id, req.body.type);
    send(res, result);
  })
);

export default router;
