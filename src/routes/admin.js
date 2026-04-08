/**
 * /admin routes — Platform administration.
 *
 * All routes require: JWT (requireAuth) + is_admin flag (requireAdmin).
 * All mutating actions are logged with the acting admin's userId.
 *
 * ── Users ──────────────────────────────────────────────────────────────────
 * GET   /admin/users                  — list users  (?search, ?plan, ?active)
 * POST  /admin/users/create           — create user  { email, password, plan? }
 * POST  /admin/set-plan               — change plan (body: { userId, plan })
 * POST  /admin/set-credits            — set credits (body: { userId, amount })
 * POST  /admin/disable-user           — deactivate  (body: { userId })
 * POST  /admin/enable-user            — reactivate  (body: { userId })
 *
 * GET   /admin/users/:id/credits      — get credit balance
 * PATCH /admin/users/:id/password     — reset password  { password }
 * PATCH /admin/users/:id/role         — set admin flag  { is_admin }
 * PATCH /admin/users/:id/ban          — ban or unban    { banned, reason? }
 * PATCH /admin/users/:id/plan         — set plan        { plan }
 * PATCH /admin/users/:id/credits      — set credits     { amount }
 *
 * ── Sites ──────────────────────────────────────────────────────────────────
 * GET   /admin/sites                  — list all sites (?search, ?status)
 * POST  /admin/disable-site           — disable site (body: { siteId, reason? })
 * POST  /admin/enable-site            — enable  site (body: { siteId })
 *
 * PATCH /admin/sites/:id/status       — force-set any status { status }
 * PUT   /admin/sites/:id/stripe       — set Stripe/checkout config { stripe_account_id, checkout_enabled, ... }
 *
 * ── Generation ─────────────────────────────────────────────────────────────
 * POST  /admin/generate-batch         — generate sites in bulk { leads[], generateImages? }
 * POST  /admin/generate-single        — generate one site for existing user { userId, businessName, ... }
 * POST  /admin/sites/:id/publish      — force-publish any site (bypasses ownership + status guards)
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
  getUserCredits,
  createAdminUser,
  resetUserPassword,
  setUserRole,
  setUserPlan,
  setUserCredits,
  disableUser,
  enableUser,
  listAllSites,
  setSiteStatus,
  updateSiteStripe,
  adminDisableSite,
  adminEnableSite,
} from "../saas/admin.js";
import { buildSitesV2, buildSiteForUser } from "../saas/siteBuilderV2.js";
import { getSiteForBuild }               from "../saas/sites.js";
import { getAdminClient }               from "../saas/db.js";
import { exportHtml }                    from "../saas/exportHtml.js";
import { deploySite }                    from "../services/vercelService.js";
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
const createUserSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  plan:     Joi.string().valid("basic", "pro", "admin").default("basic"),
  type:     Joi.string().valid("pedezap", "farmazap").optional().allow(null),
});
const passwordSchema = Joi.object({ password: Joi.string().min(8).max(128).required() });
const roleSchema     = Joi.object({ is_admin: Joi.boolean().required() });
const banSchema      = Joi.object({ banned: Joi.boolean().required(), reason: Joi.string().max(500).trim().allow("", null) });
const planSchema     = Joi.object({ plan: Joi.string().valid("basic", "pro", "admin").required() });
const creditsSchema = Joi.object({
  amount:            Joi.number().integer().min(0).max(99999),
  credits:           Joi.number().integer().min(0).max(99999),
  credits_remaining: Joi.number().integer().min(0).max(99999),
}).or("amount", "credits", "credits_remaining");
const statusSchema      = Joi.object({ status: Joi.string().valid("draft", "ready", "published", "archived", "disabled").required() });
const siteStripeSchema  = Joi.object({
  stripe_account_id:   Joi.string().max(100).allow("", null),
  checkout_enabled:    Joi.boolean(),
  delivery_fee_fixed:  Joi.number().min(0).max(9999).allow(null),
  delivery_fee_per_km: Joi.number().min(0).max(999).allow(null),
  currency:            Joi.string().length(3).lowercase().allow(null),
}).min(1);

// Mapa de normalização: frontend pode enviar slug simples ou acentuado
const NICHE_NORMALIZE_MAP = {
  'farmacia': 'Farmácia', 'farmácia': 'Farmácia',
  'drogaria': 'Drogaria',
  'farmacia de manipulacao': 'Farmácia de Manipulação',
  'farmácia de manipulação': 'Farmácia de Manipulação',
  'manipulacao': 'Farmácia de Manipulação', 'manipulação': 'Farmácia de Manipulação',
  'pizzaria': 'Pizzaria',
  'hamburgueria': 'Hamburgueria',
  'restaurante': 'Restaurante',
  'padaria': 'Padaria',
  'salao': 'Salão de Beleza', 'salão': 'Salão de Beleza', 'salao de beleza': 'Salão de Beleza',
  'barbearia': 'Barbearia',
  'estetica': 'Clínica de Estética', 'estética': 'Clínica de Estética', 'clinica de estetica': 'Clínica de Estética',
  'clinica odontologica': 'Clínica Odontológica', 'odontologia': 'Clínica Odontológica',
  'clinica medica': 'Clínica Médica', 'medica': 'Clínica Médica',
  'fisioterapia': 'Clínica de Fisioterapia',
  'nutricao': 'Consultório de Nutrição', 'nutrição': 'Consultório de Nutrição',
  'veterinaria': 'Clínica Veterinária', 'veterinária': 'Clínica Veterinária',
  'advocacia': 'Escritório de Advocacia',
  'contabilidade': 'Escritório de Contabilidade',
  'imobiliaria': 'Imobiliária', 'imobiliária': 'Imobiliária',
  'academia': 'Academia / Studio Fitness', 'fitness': 'Academia / Studio Fitness',
  'escola': 'Escola / Curso', 'curso': 'Escola / Curso',
  'mecanica': 'Oficina Mecânica', 'mecânica': 'Oficina Mecânica',
  'negocio local': 'Negócio Local', 'negócio local': 'Negócio Local',
};

function normalizeNiche(req, _res, next) {
  const b = req.body;
  if (!b) return next();
  // snake_case → camelCase
  if (b.user_id      !== undefined && b.userId      === undefined) b.userId      = b.user_id;
  if (b.business_name !== undefined && b.businessName === undefined) b.businessName = b.business_name;
  // niche normalização
  if (b.niche) {
    const key = b.niche.toLowerCase().trim();
    b.niche = NICHE_NORMALIZE_MAP[key] ?? b.niche;
  }
  next();
}

// Single site generation for existing user
const generateSingleSchema = Joi.object({
  userId:       Joi.string().uuid({ version: "uuidv4" }).required(),
  businessName: Joi.string().max(150).trim().required(),
  niche:        Joi.string().valid(
    "Clínica Odontológica", "Clínica Médica", "Clínica de Fisioterapia",
    "Consultório de Nutrição", "Clínica Veterinária", "Farmácia",
    "Drogaria", "Farmácia de Manipulação",
    "Salão de Beleza", "Barbearia", "Clínica de Estética",
    "Restaurante", "Pizzaria", "Padaria", "Hamburgueria",
    "Escritório de Advocacia", "Escritório de Contabilidade", "Imobiliária",
    "Academia / Studio Fitness", "Escola / Curso", "Oficina Mecânica",
    "Negócio Local"
  ).default("Negócio Local"),
  city:         Joi.string().max(100).trim().allow("", null),
  phone:        Joi.string().max(20).trim().allow("", null),
  address:      Joi.string().max(300).trim().allow("", null),
  neighborhood: Joi.string().max(100).trim().allow("", null),
  email:        Joi.string().email().max(200).allow("", null),
  skipAI:       Joi.boolean().default(false),
});

// Batch generation schema
const VALID_NICHES = [
  "Clínica Odontológica", "Clínica Médica", "Clínica de Fisioterapia",
  "Consultório de Nutrição", "Clínica Veterinária", "Farmácia",
  "Drogaria", "Farmácia de Manipulação",
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
    return res.json(users.map(({ user_credits, ...u }) => {
      const uc = Array.isArray(user_credits) ? user_credits[0] : user_credits;
      return {
        ...u,
        is_active:          u.is_active ?? true,
        credits_remaining:  uc?.credits_remaining  ?? 0,
        credits_used_total: uc?.credits_used_total ?? 0,
      };
    }));
  } catch (error) {
    console.error("ADMIN ERROR:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}));

// ── POST /admin/users/create ──────────────────────────────────────────────────
// Create a new user account. Body: { email, password, plan?, type? }
router.post(
  "/users/create",
  (req, _res, next) => {
    console.log("[admin/users/create] BODY:", JSON.stringify(req.body, null, 2));
    next();
  },
  validate(createUserSchema),
  async (req, res) => {
    const { email, password, plan, type } = req.body;
    console.log("[admin/users/create] VALIDATED:", { email, plan, type });
    try {
      const user = await createAdminUser(email, password, plan, type ?? null);
      logger.info("Admin created user", { adminId: req.userId, email, plan, type });
      res.status(201).json(user);
    } catch (err) {
      console.error("[admin/users/create] ERROR:", err);
      res.status(err.statusCode ?? 500).json({
        success:   false,
        error:     err.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
);

// ── PATCH /admin/users/:id/password ───────────────────────────────────────────
// Reset a user's password. Body: { password }
router.patch(
  "/users/:id/password",
  validate(passwordSchema),
  asyncHandler(async (req, res) => {
    const targetId = req.params.id;
    const { password } = req.body;

    const user = await getUser(targetId);
    if (!user) throw new NotFoundError("User");

    await resetUserPassword(targetId, password);
    logger.info("Admin reset user password", { adminId: req.userId, targetUser: targetId, email: user.email });
    send(res, { updated: true, userId: targetId, email: user.email });
  })
);

// ── PATCH /admin/users/:id/role ───────────────────────────────────────────────
// Set is_admin flag. Body: { is_admin: boolean }
router.patch(
  "/users/:id/role",
  validate(roleSchema),
  asyncHandler(async (req, res) => {
    const targetId = req.params.id;
    const { is_admin } = req.body;

    if (targetId === req.userId && !is_admin) {
      throw new BusinessError("Cannot remove your own admin role", "SELF_DEMOTE");
    }

    const user = await getUser(targetId);
    if (!user) throw new NotFoundError("User");

    await setUserRole(targetId, is_admin);
    logger.warn("Admin updated user role", { adminId: req.userId, targetUser: targetId, email: user.email, is_admin });
    send(res, { updated: true, userId: targetId, email: user.email, is_admin });
  })
);

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
    const amount = req.body.amount ?? req.body.credits ?? req.body.credits_remaining;

    const user = await getUser(targetId);
    if (!user) throw new NotFoundError("User");

    await setUserCredits(targetId, amount);
    logger.info("Admin set user credits", { adminId: req.userId, targetUser: targetId, email: user.email, amount });
    send(res, { updated: true, userId: targetId, email: user.email, amount });
  })
);

// ── POST /admin/users/:id/credits — alias for PATCH (frontend compat) ─────────
router.post(
  "/users/:id/credits",
  validate(creditsSchema),
  asyncHandler(async (req, res) => {
    const targetId = req.params.id;
    const amount = req.body.amount ?? req.body.credits ?? req.body.credits_remaining;

    const user = await getUser(targetId);
    if (!user) throw new NotFoundError("User");

    await setUserCredits(targetId, amount);
    logger.info("Admin set user credits", { adminId: req.userId, targetUser: targetId, email: user.email, amount });
    send(res, { updated: true, userId: targetId, email: user.email, amount });
  })
);

// ── GET /admin/users/:id/credits ──────────────────────────────────────────────
// Returns current credit balance for a single user.
router.get(
  "/users/:id/credits",
  asyncHandler(async (req, res) => {
    const targetId = req.params.id;

    const user = await getUser(targetId);
    if (!user) throw new NotFoundError("User");

    const credits = await getUserCredits(targetId);
    send(res, { userId: targetId, email: user.email, ...credits });
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

// ── PUT /admin/sites/:id/stripe ───────────────────────────────────────────────
// Update Stripe / checkout settings for a site.
// Body: { stripe_account_id?, checkout_enabled?, delivery_fee_fixed?, delivery_fee_per_km?, currency? }
router.put(
  "/sites/:id/stripe",
  validate(siteStripeSchema),
  asyncHandler(async (req, res) => {
    const siteId = req.params.id;
    await updateSiteStripe(siteId, req.body);
    logger.info("Admin updated site Stripe settings", { adminId: req.userId, siteId, fields: Object.keys(req.body) });
    send(res, { updated: true, siteId, ...req.body });
  })
);

// ── POST /admin/sites/:id/publish ─────────────────────────────────────────────
// Force-publish any site regardless of status or ownership.
// Bypasses status guard (draft/ready) and publish-limit check.
// Used after generate-single to immediately deploy the site.
router.post(
  "/sites/:id/publish",
  asyncHandler(async (req, res) => {
    const siteId = req.params.id;
    const db     = getAdminClient();

    const site = await getSiteForBuild(siteId);
    if (!site) throw new NotFoundError("Site");

    logger.info("Admin force-publish started", { adminId: req.userId, siteId, siteName: site.business_name });

    const { html, css, js } = exportHtml(site);
    const { url } = await deploySite({
      slug:  site.slug,
      files: [
        { name: "index.html", content: html },
        { name: "style.css",  content: css  },
        { name: "script.js",  content: js   },
      ],
    });

    // Bypass markSitePublished (which re-checks status) — update DB directly
    const now = new Date().toISOString();
    await db.from("sites").update({
      status:            "published",
      site_url:          url,
      publish_count:     (site.publish_count || 0) + 1,
      last_published_at: now,
      updated_at:        now,
    }).eq("id", siteId);

    logger.info("Admin force-publish complete", { adminId: req.userId, siteId, url });

    send(res, { siteId, url, published_at: now });
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

// ── POST /admin/generate-single ───────────────────────────────────────────────
// Generate a complete site for an existing user (no new Supabase user created).
// Credits are NOT deducted — admin-privileged action.
// Body: { userId, businessName, niche?, city?, phone?, address?, neighborhood?, email?, skipAI? }
router.post(
  "/generate-single",
  (req, _res, next) => {
    console.log('[generate-single] RAW BODY:', JSON.stringify(req.body, null, 2));
    next();
  },
  normalizeNiche,
  validate(generateSingleSchema),
  asyncHandler(async (req, res) => {
    const { userId, ...lead } = req.body;

    // Verify the target user exists
    const user = await getUser(userId);
    if (!user) throw new NotFoundError("User");

    logger.info("Admin generate-single started", {
      adminId:      req.userId,
      targetUserId: userId,
      businessName: lead.businessName,
      niche:        lead.niche,
    });

    const { site, siteJson } = await buildSiteForUser(userId, lead);

    logger.info("Admin generate-single complete", {
      adminId:      req.userId,
      targetUserId: userId,
      siteId:       site.id,
    });

    // ── Auto-publish to Vercel ────────────────────────────────────────────────
    let vercelUrl = null;
    try {
      const fullSite = await getSiteForBuild(site.id);
      const { html, css, js } = exportHtml(fullSite);
      const deployed = await deploySite({
        slug:  fullSite.slug,
        files: [
          { name: "index.html", content: html },
          { name: "style.css",  content: css  },
          { name: "script.js",  content: js   },
        ],
      });
      vercelUrl = deployed.url;
      const now = new Date().toISOString();
      const db = getAdminClient();
      await db.from("sites").update({
        status:            "published",
        site_url:          vercelUrl,
        publish_count:     1,
        last_published_at: now,
        updated_at:        now,
      }).eq("id", site.id);
      logger.info("Admin generate-single auto-published", { siteId: site.id, vercelUrl });
    } catch (pubErr) {
      logger.error("Admin generate-single publish failed (non-fatal)", { siteId: site.id, error: pubErr.message });
    }
    // ─────────────────────────────────────────────────────────────────────────

    send(res, {
      id:     site.id,
      name:   lead.businessName,
      status: vercelUrl ? "published" : "draft",
      url:    vercelUrl,
      niche:  siteJson.niche,
      userId,
    }, 201);
  })
);

/**
 * GET /admin/template-check?niche=Farmácia
 * Diagnóstico público — sem auth. Confirma qual template está ativo no Railway.
 */
router.get(
  "/template-check",
  asyncHandler(async (req, res) => {
    const niche = (req.query.niche || "Farmácia").toString();
    send(res, {
      niche,
      template:  "renderTemplate",
      isLovable: true,
      timestamp: new Date().toISOString(),
    });
  })
);

export default router;
