/**
 * /admin routes — Platform administration.
 *
 * All routes require: JWT (requireAuth) + is_admin flag (requireAdmin).
 * All mutating actions are logged with the acting admin's userId.
 *
 * ── Users ──────────────────────────────────────────────────────────────────
 * GET   /admin/users                  — list users  (?search, ?plan, ?active)
 * POST  /admin/set-plan               — change plan (body: { userId, plan })
 * POST  /admin/set-credits            — set credits (body: { userId, amount })
 * POST  /admin/disable-user           — deactivate  (body: { userId })
 * POST  /admin/enable-user            — reactivate  (body: { userId })
 *
 * PATCH /admin/users/:id/ban          — ban or unban  { banned, reason? }
 * PATCH /admin/users/:id/plan         — set plan      { plan }
 * PATCH /admin/users/:id/credits      — set credits   { amount }
 *
 * ── Sites ──────────────────────────────────────────────────────────────────
 * GET   /admin/sites                  — list all sites (?search, ?status)
 * POST  /admin/disable-site           — disable site (body: { siteId, reason? })
 * POST  /admin/enable-site            — enable  site (body: { siteId })
 *
 * PATCH /admin/sites/:id/status       — force-set any status { status }
 *
 * ── Generation ─────────────────────────────────────────────────────────────
 * POST  /admin/generate-batch         — generate sites in bulk { leads[], generateImages? }
 */

import { Router }        from "express";
import Joi               from "joi";
import { requireAuth }   from "../middleware/auth.js";
import { requireAdmin }  from "../middleware/adminGuard.js";
import { validate }      from "../middleware/validate.js";
import { asyncHandler, send } from "../utils/asyncHandler.js";
import {
  listUsers,
  getUser,
  setUserPlan,
  setUserCredits,
  disableUser,
  enableUser,
  listAllSites,
  setSiteStatus,
  adminDisableSite,
  adminEnableSite,
} from "../saas/admin.js";
import { buildSitesV2 } from "../saas/siteBuilderV2.js";
import { NotFoundError, ValidationError, BusinessError } from "../utils/errors.js";
import logger from "../utils/logger.js";

const router = Router();
router.use(requireAuth);
router.use(requireAdmin);

// ── Inline schemas ────────────────────────────────────────────────────────────

const uuid = () => Joi.string().uuid({ version: "uuidv4" }).required();

// Legacy body-based schemas (kept for backward compat)
const setPlanSchema     = Joi.object({ userId: uuid(), plan:   Joi.string().valid("basic", "pro", "admin").required() });
const setCreditsSchema  = Joi.object({ userId: uuid(), amount: Joi.number().integer().min(0).max(99999).required() });
const userIdSchema      = Joi.object({ userId: uuid() });
const disableSiteSchema = Joi.object({ siteId: uuid(), reason: Joi.string().max(500).trim().allow("", null) });
const siteIdSchema      = Joi.object({ siteId: uuid() });

// RESTful param schemas
const banSchema     = Joi.object({ banned: Joi.boolean().required(), reason: Joi.string().max(500).trim().allow("", null) });
const planSchema    = Joi.object({ plan: Joi.string().valid("basic", "pro", "admin").required() });
const creditsSchema = Joi.object({ amount: Joi.number().integer().min(0).max(99999).required() });
const statusSchema  = Joi.object({ status: Joi.string().valid("draft", "ready", "published", "archived", "disabled").required() });

// Batch generation schema
const VALID_NICHES = [
  "Clínica Odontológica", "Clínica Médica", "Clínica de Fisioterapia",
  "Consultório de Nutrição", "Clínica Veterinária", "Farmácia",
  "Salão de Beleza", "Barbearia", "Clínica de Estética",
  "Restaurante", "Pizzaria", "Padaria", "Hamburgueria",
  "Escritório de Advocacia", "Escritório de Contabilidade", "Imobiliária",
  "Academia / Studio Fitness", "Escola / Curso", "Oficina Mecânica",
  "Negócio Local",
];
const leadSchema = Joi.object({
  businessName:   Joi.string().max(150).trim().required(),
  niche:          Joi.string().valid(...VALID_NICHES).default("Negócio Local"),
  city:           Joi.string().max(100).trim().allow("", null),
  phone:          Joi.string().max(20).trim().allow("", null),
  address:        Joi.string().max(300).trim().allow("", null),
  neighborhood:   Joi.string().max(100).trim().allow("", null),
  email:          Joi.string().email().max(200).allow("", null),
  skipAI:         Joi.boolean().default(false),
  generateImages: Joi.boolean().default(false),
});
const batchSchema = Joi.object({
  leads:          Joi.array().items(leadSchema).min(1).max(50).required(),
  generateImages: Joi.boolean().default(false),
});

// ── GET /admin/users ──────────────────────────────────────────────────────────
// Query params: ?limit, ?offset, ?search (email), ?plan, ?active (true/false)
router.get("/users", asyncHandler(async (req, res) => {
  console.log("REQ USER:", req.user);

  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!req.userProfile?.is_admin) {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const limit  = Math.min(Math.max(parseInt(req.query.limit)  || 100, 1), 500);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    const search = req.query.search?.trim() || undefined;
    const plan   = req.query.plan   || undefined;
    const active = req.query.active !== undefined
      ? req.query.active === "true"
      : undefined;

    const users = await listUsers({ limit, offset, search, plan, active });
    logger.info("Admin listed users", { adminId: req.userId, count: users.length, search, plan });
    return res.json(users);
  } catch (error) {
    console.error("ADMIN ERROR:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}));

// ── POST /admin/set-plan ──────────────────────────────────────────────────────
router.post("/set-plan", validate(setPlanSchema), asyncHandler(async (req, res) => {
  const { userId, plan } = req.body;
  await setUserPlan(userId, plan);
  logger.info("Admin set user plan", { adminId: req.userId, targetUser: userId, plan });
  send(res, { updated: true, userId, plan });
}));

// ── POST /admin/set-credits ───────────────────────────────────────────────────
router.post("/set-credits", validate(setCreditsSchema), asyncHandler(async (req, res) => {
  const { userId, amount } = req.body;
  await setUserCredits(userId, amount);
  logger.info("Admin set user credits", { adminId: req.userId, targetUser: userId, amount });
  send(res, { updated: true, userId, amount });
}));

// ── POST /admin/disable-user ──────────────────────────────────────────────────
router.post("/disable-user", validate(userIdSchema), asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (userId === req.userId) {
    return res.status(400).json({ success: false, error: "Cannot disable your own account", code: "SELF_DISABLE" });
  }
  await disableUser(userId);
  logger.warn("Admin disabled user account", { adminId: req.userId, targetUser: userId });
  send(res, { disabled: true, userId });
}));

// ── POST /admin/enable-user ───────────────────────────────────────────────────
router.post("/enable-user", validate(userIdSchema), asyncHandler(async (req, res) => {
  const { userId } = req.body;
  await enableUser(userId);
  logger.info("Admin enabled user account", { adminId: req.userId, targetUser: userId });
  send(res, { enabled: true, userId });
}));

// ── GET /admin/sites ──────────────────────────────────────────────────────────
// Query params: ?limit, ?offset, ?search (business_name), ?status
router.get("/sites", asyncHandler(async (req, res) => {
  console.log("REQ USER:", req.user);

  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!req.userProfile?.is_admin) {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const limit  = Math.min(Math.max(parseInt(req.query.limit)  || 100, 1), 500);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    const status = req.query.status || undefined;
    const search = req.query.search?.trim() || undefined;

    const sites = await listAllSites({ limit, offset, status, search });
    logger.info("Admin listed all sites", { adminId: req.userId, count: sites.length, status, search });
    return res.json(sites);
  } catch (error) {
    console.error("ADMIN ERROR:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}));

// ── POST /admin/disable-site ──────────────────────────────────────────────────
router.post("/disable-site", validate(disableSiteSchema), asyncHandler(async (req, res) => {
  const { siteId, reason } = req.body;
  const result = await adminDisableSite(siteId, reason || "");
  logger.warn("Admin disabled site", { adminId: req.userId, siteId, reason });
  send(res, result);
}));

// ── POST /admin/enable-site ───────────────────────────────────────────────────
router.post("/enable-site", validate(siteIdSchema), asyncHandler(async (req, res) => {
  const { siteId } = req.body;
  await adminEnableSite(siteId);
  logger.info("Admin enabled site", { adminId: req.userId, siteId });
  send(res, { enabled: true, siteId });
}));

// ═══════════════════════════════════════════════════════════════════════════════
// RESTful routes — new surface
// ═══════════════════════════════════════════════════════════════════════════════

// ── PATCH /admin/users/:id/ban ────────────────────────────────────────────────
// Ban or unban a user in a single idempotent endpoint.
// Body: { banned: boolean, reason?: string }
router.patch(
  "/users/:id/ban",
  validate(banSchema),
  asyncHandler(async (req, res) => {
    const targetId = req.params.id;
    const { banned, reason } = req.body;

    if (targetId === req.userId) {
      throw new BusinessError("Cannot ban your own admin account", "SELF_BAN");
    }

    const user = await getUser(targetId);
    if (!user) throw new NotFoundError("User");

    if (banned) {
      await disableUser(targetId);
      logger.warn("Admin banned user", {
        adminId:    req.userId,
        targetUser: targetId,
        email:      user.email,
        reason:     reason || "—",
      });
      send(res, { banned: true, userId: targetId, email: user.email });
    } else {
      await enableUser(targetId);
      logger.info("Admin unbanned user", {
        adminId:    req.userId,
        targetUser: targetId,
        email:      user.email,
      });
      send(res, { banned: false, userId: targetId, email: user.email });
    }
  })
);

// ── PATCH /admin/users/:id/plan ───────────────────────────────────────────────
// RESTful alternative to POST /admin/set-plan.
// Body: { plan: "basic" | "pro" | "admin" }
router.patch(
  "/users/:id/plan",
  validate(planSchema),
  asyncHandler(async (req, res) => {
    const targetId = req.params.id;
    const { plan } = req.body;

    const user = await getUser(targetId);
    if (!user) throw new NotFoundError("User");

    await setUserPlan(targetId, plan);
    logger.info("Admin updated user plan", {
      adminId:    req.userId,
      targetUser: targetId,
      email:      user.email,
      plan,
    });
    send(res, { updated: true, userId: targetId, email: user.email, plan });
  })
);

// ── PATCH /admin/users/:id/credits ────────────────────────────────────────────
// Body: { amount: number }
router.patch(
  "/users/:id/credits",
  validate(creditsSchema),
  asyncHandler(async (req, res) => {
    const targetId = req.params.id;
    const { amount } = req.body;

    const user = await getUser(targetId);
    if (!user) throw new NotFoundError("User");

    await setUserCredits(targetId, amount);
    logger.info("Admin set user credits", {
      adminId:    req.userId,
      targetUser: targetId,
      email:      user.email,
      amount,
    });
    send(res, { updated: true, userId: targetId, email: user.email, amount });
  })
);

// ── POST /admin/users/:id/credits — alias for PATCH (frontend compat) ─────────
router.post(
  "/users/:id/credits",
  validate(creditsSchema),
  asyncHandler(async (req, res) => {
    const targetId = req.params.id;
    const { amount } = req.body;

    const user = await getUser(targetId);
    if (!user) throw new NotFoundError("User");

    await setUserCredits(targetId, amount);
    logger.info("Admin set user credits", {
      adminId:    req.userId,
      targetUser: targetId,
      email:      user.email,
      amount,
    });
    send(res, { updated: true, userId: targetId, email: user.email, amount });
  })
);

// ── PATCH /admin/sites/:id/status ─────────────────────────────────────────────
// Force-set a site's status — bypasses all transition constraints.
// Valid statuses: draft | ready | published | archived | disabled
// Body: { status: string }
router.patch(
  "/sites/:id/status",
  validate(statusSchema),
  asyncHandler(async (req, res) => {
    const siteId = req.params.id;
    const { status } = req.body;

    const result = await setSiteStatus(siteId, status);

    logger.warn("Admin force-set site status", {
      adminId: req.userId,
      siteId,
      status,
    });

    send(res, result);
  })
);

// ── POST /admin/generate-batch ────────────────────────────────────────────────
// Bulk site generation without an end-user context.
// Body: { leads: LeadObject[], generateImages?: boolean }
// Max 50 leads per request. Each lead gets its own Supabase user + site.
router.post(
  "/generate-batch",
  validate(batchSchema),
  asyncHandler(async (req, res) => {
    let { leads, generateImages } = req.body;

    if (generateImages) {
      leads = leads.map(l => ({ ...l, generateImages: true }));
    }

    logger.info("Admin batch generation started", {
      adminId: req.userId,
      count:   leads.length,
    });

    const results     = await buildSitesV2(leads);
    const successful  = results.filter(r => !r.error);
    const failed      = results.filter(r =>  r.error);

    logger.info("Admin batch generation complete", {
      adminId:    req.userId,
      total:      leads.length,
      successful: successful.length,
      failed:     failed.length,
    });

    send(res, {
      total:      leads.length,
      successful: successful.length,
      failed:     failed.length,
      results: results.map(r =>
        r.error
          ? { error: r.error, lead: r.lead }
          : {
              id:          r.site.id,
              status:      "draft",
              niche:       r.siteJson.niche,
              pages:       r.siteJson.pages,
              assets:      r.siteJson.assets,
              animations:  r.siteJson.animations,
              meta:        r.siteJson.meta,
              generation:  r.siteJson.generation,
              credentials: r.credentials,
              userId:      r.user.id,
            }
      ),
    }, 201);
  })
);

export default router;
