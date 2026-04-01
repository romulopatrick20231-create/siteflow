/**
 * /domain routes — Custom domain management.
 *
 * GET  /domain/search?name=example.com — check domain availability
 * POST /domain/register                — register a new domain
 * POST /domain/connect                 — connect domain to Vercel deployment
 * GET  /domain/status                  — list user's domains with status
 */

import { Router }       from "express";
import { requireAuth }  from "../middleware/auth.js";
import { domainLimiter } from "../middleware/rateLimiter.js";
import { validate, schemas } from "../middleware/validate.js";
import { asyncHandler, send } from "../utils/asyncHandler.js";
import {
  searchDomain,
  registerDomain,
  connectDomain,
  getUserDomains,
  verifyDomain,
} from "../services/domain.js";
import { NotFoundError } from "../utils/errors.js";
import logger from "../utils/logger.js";

const router = Router();
router.use(requireAuth);

// ── GET /domain/search?name=example.com ──────────────────────────────────────
router.get(
  "/search",
  domainLimiter,
  validate(schemas.domainSearch, "query"),
  asyncHandler(async (req, res) => {
    const result = await searchDomain(req.query.name);
    logger.debug("Domain search", { userId: req.userId, domain: req.query.name, available: result.available });
    send(res, result);
  })
);

// ── POST /domain/register ─────────────────────────────────────────────────────
router.post(
  "/register",
  domainLimiter,
  validate(schemas.domainRegister),
  asyncHandler(async (req, res) => {
    const { siteId, domain, years, firstName, lastName, email, phone, address1, city, state, country, zip } = req.body;

    const result = await registerDomain(req.userId, siteId, {
      domain,
      years,
      firstName,
      lastName,
      email,
      phone,
      address1,
      city,
      state,
      country,
      zip,
    });

    logger.info("Domain registered", { userId: req.userId, domain, siteId });
    send(res, result, 201);
  })
);

// ── POST /domain/connect ──────────────────────────────────────────────────────
router.post(
  "/connect",
  validate(schemas.domainConnect),
  asyncHandler(async (req, res) => {
    const { siteId, domainId } = req.body;
    const result = await connectDomain(req.userId, siteId, domainId);
    logger.info("Domain connected", { userId: req.userId, siteId, domainId });
    send(res, result);
  })
);

// ── GET /domain/status — list all user domains with verification status ───────
router.get(
  "/status",
  asyncHandler(async (req, res) => {
    const domains = await getUserDomains(req.userId);
    send(res, domains);
  })
);

// ── POST /domain/verify/:domainId — trigger DNS verification check ────────────
// Bonus endpoint: re-check DNS propagation for a specific domain
router.post(
  "/verify/:domainId",
  asyncHandler(async (req, res) => {
    const result = await verifyDomain(req.userId, req.params.domainId);
    send(res, result);
  })
);

export default router;
