/**
 * /generate routes — Admin-only bulk site generation from lead data.
 *
 * POST /generate       — generate one site from a single lead object
 * POST /generate/bulk  — generate multiple sites from a JSON array of leads
 *
 * Each call:
 *   1. Validates the lead data
 *   2. Creates a Supabase Auth user (email auto-generated if not provided)
 *   3. Calls OpenAI to generate full site content
 *   4. Saves site + content to DB
 *   5. Returns site ID, user ID, login credentials, and generated content
 *
 * Access: admin only (requireAuth + requireAdmin)
 *
 * Example single lead body:
 * {
 *   "businessName": "Clínica Bella Sorriso",
 *   "niche": "Clínica Odontológica",
 *   "phone": "11999887766",
 *   "city": "São Paulo",
 *   "neighborhood": "Vila Mariana",
 *   "email": "bella@example.com"   (optional)
 * }
 *
 * Example bulk body:
 * { "leads": [ { ...lead }, { ...lead } ] }
 */

import { Router }       from "express";
import Joi              from "joi";
import { requireAuth }  from "../middleware/auth.js";
import { requireAdmin } from "../middleware/adminGuard.js";
import { validate }     from "../middleware/validate.js";
import { asyncHandler, send } from "../utils/asyncHandler.js";
import { buildSiteFromLead, buildSitesFromLeads } from "../saas/siteBuilder.js";
import logger           from "../utils/logger.js";

const router = Router();
router.use(requireAuth);
router.use(requireAdmin);

// ── Validation schemas ────────────────────────────────────────────────────

const leadSchema = Joi.object({
  businessName:  Joi.string().max(150).trim().required(),
  niche:         Joi.string().max(100).trim().default("Negócio Local"),
  phone:         Joi.string().max(20).trim().allow("", null),
  city:          Joi.string().max(100).trim().allow("", null),
  neighborhood:  Joi.string().max(100).trim().allow("", null),
  email:         Joi.string().email().max(200).allow("", null),
  skipAI:        Joi.boolean().default(false),
});

const bulkSchema = Joi.object({
  leads: Joi.array().items(leadSchema).min(1).max(50).required(),
});

// ── POST /generate ────────────────────────────────────────────────────────
router.post(
  "/",
  validate(leadSchema),
  asyncHandler(async (req, res) => {
    logger.info("Single site generation requested", {
      adminId:      req.userId,
      businessName: req.body.businessName,
    });

    const result = await buildSiteFromLead(req.body);

    logger.info("Single site generation complete", {
      adminId: req.userId,
      siteId:  result.site.id,
      userId:  result.user.id,
      email:   result.credentials.email,
    });

    send(res, {
      siteId:  result.site.id,
      userId:  result.user.id,
      credentials: result.credentials,
      site:    result.site,
    }, 201);
  })
);

// ── POST /generate/bulk ───────────────────────────────────────────────────
router.post(
  "/bulk",
  validate(bulkSchema),
  asyncHandler(async (req, res) => {
    const { leads } = req.body;

    logger.info("Bulk site generation requested", {
      adminId: req.userId,
      count:   leads.length,
    });

    const results = await buildSitesFromLeads(leads);

    const successful = results.filter((r) => !r.error);
    const failed     = results.filter((r) =>  r.error);

    logger.info("Bulk generation complete", {
      adminId:    req.userId,
      total:      leads.length,
      successful: successful.length,
      failed:     failed.length,
    });

    send(res, {
      total:      leads.length,
      successful: successful.length,
      failed:     failed.length,
      results:    results.map((r) =>
        r.error
          ? { error: r.error, lead: r.lead }
          : {
              siteId:      r.site.id,
              userId:      r.user.id,
              credentials: r.credentials,
            }
      ),
    });
  })
);

export default router;
