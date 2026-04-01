/**
 * /admin routes — Platform administration.
 *
 * All routes require is_admin === true (enforced by requireAdmin middleware).
 * All actions are logged with the acting admin's userId.
 *
 * GET  /admin/users          — list all users
 * POST /admin/set-plan       — change a user's plan
 * POST /admin/set-credits    — set a user's credit balance
 * POST /admin/disable-user   — deactivate user account + sites
 * POST /admin/enable-user    — reactivate user account + sites
 * GET  /admin/sites          — list all sites across all users
 * POST /admin/disable-site   — disable a specific site
 * POST /admin/enable-site    — re-enable a specific site
 */

import { Router } from "express";
import Joi        from "joi";
import { requireAuth }  from "../middleware/auth.js";
import { requireAdmin } from "../middleware/adminGuard.js";
import { validate }     from "../middleware/validate.js";
import { asyncHandler, send } from "../utils/asyncHandler.js";
import {
  listUsers,
  setUserPlan,
  setUserCredits,
  disableUser,
  enableUser,
  listAllSites,
  adminDisableSite,
  adminEnableSite,
} from "../saas/admin.js";
import logger from "../utils/logger.js";

const router = Router();

// All admin routes require authentication + admin flag
router.use(requireAuth);
router.use(requireAdmin);

// ── Inline schemas (admin-specific, not shared) ───────────────────────────────
const uuid = () => Joi.string().uuid({ version: "uuidv4" }).required();

const setPlanSchema = Joi.object({
  userId: uuid(),
  plan:   Joi.string().valid("basic", "pro", "admin").required(),
});

const setCreditsSchema = Joi.object({
  userId: uuid(),
  amount: Joi.number().integer().min(0).max(99999).required(),
});

const userIdSchema = Joi.object({
  userId: uuid(),
});

const disableSiteSchema = Joi.object({
  siteId: uuid(),
  reason: Joi.string().max(500).trim().allow("", null),
});

const siteIdSchema = Joi.object({
  siteId: uuid(),
});

// ── GET /admin/users ──────────────────────────────────────────────────────────
router.get(
  "/users",
  asyncHandler(async (req, res) => {
    const limit  = Math.min(Math.max(parseInt(req.query.limit)  || 100, 1), 500);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    const users  = await listUsers({ limit, offset });
    logger.info("Admin listed users", { adminId: req.userId, count: users.length });
    send(res, users);
  })
);

// ── POST /admin/set-plan ──────────────────────────────────────────────────────
router.post(
  "/set-plan",
  validate(setPlanSchema),
  asyncHandler(async (req, res) => {
    const { userId, plan } = req.body;
    await setUserPlan(userId, plan);
    logger.info("Admin set user plan", { adminId: req.userId, targetUser: userId, plan });
    send(res, { updated: true, userId, plan });
  })
);

// ── POST /admin/set-credits ───────────────────────────────────────────────────
router.post(
  "/set-credits",
  validate(setCreditsSchema),
  asyncHandler(async (req, res) => {
    const { userId, amount } = req.body;
    await setUserCredits(userId, amount);
    logger.info("Admin set user credits", { adminId: req.userId, targetUser: userId, amount });
    send(res, { updated: true, userId, amount });
  })
);

// ── POST /admin/disable-user ──────────────────────────────────────────────────
router.post(
  "/disable-user",
  validate(userIdSchema),
  asyncHandler(async (req, res) => {
    const { userId } = req.body;
    // Prevent admin from disabling themselves
    if (userId === req.userId) {
      return res.status(400).json({
        success: false,
        error:   "Cannot disable your own account",
        code:    "SELF_DISABLE",
      });
    }
    await disableUser(userId);
    logger.warn("Admin disabled user account", { adminId: req.userId, targetUser: userId });
    send(res, { disabled: true, userId });
  })
);

// ── POST /admin/enable-user ───────────────────────────────────────────────────
router.post(
  "/enable-user",
  validate(userIdSchema),
  asyncHandler(async (req, res) => {
    const { userId } = req.body;
    await enableUser(userId);
    logger.info("Admin enabled user account", { adminId: req.userId, targetUser: userId });
    send(res, { enabled: true, userId });
  })
);

// ── GET /admin/sites ──────────────────────────────────────────────────────────
router.get(
  "/sites",
  asyncHandler(async (req, res) => {
    const limit  = Math.min(Math.max(parseInt(req.query.limit)  || 100, 1), 500);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);
    const sites  = await listAllSites({ limit, offset });
    logger.info("Admin listed all sites", { adminId: req.userId, count: sites.length });
    send(res, sites);
  })
);

// ── POST /admin/disable-site ──────────────────────────────────────────────────
router.post(
  "/disable-site",
  validate(disableSiteSchema),
  asyncHandler(async (req, res) => {
    const { siteId, reason } = req.body;
    const result = await adminDisableSite(siteId, reason || "");
    logger.warn("Admin disabled site", { adminId: req.userId, siteId, reason });
    send(res, result);
  })
);

// ── POST /admin/enable-site ───────────────────────────────────────────────────
router.post(
  "/enable-site",
  validate(siteIdSchema),
  asyncHandler(async (req, res) => {
    const { siteId } = req.body;
    await adminEnableSite(siteId);
    logger.info("Admin enabled site", { adminId: req.userId, siteId });
    send(res, { enabled: true, siteId });
  })
);

export default router;
