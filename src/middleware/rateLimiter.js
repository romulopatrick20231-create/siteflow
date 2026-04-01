/**
 * rateLimiter.js — Multi-tier rate limiting.
 *
 * Tiers:
 *   global   — 100 req / 15 min per IP (all routes)
 *   auth     — 10 attempts / 15 min per IP (login/register)
 *   ai       — 20 generations / hour per user
 *   publish  — 10 publishes / hour per user
 *   domain   — 30 searches / hour per IP
 *   strict   — 5 req / 15 min per IP (password reset, etc.)
 */

import rateLimit from "express-rate-limit";
import slowDown  from "express-slow-down";
import { env }   from "../config/env.js";
import logger    from "../utils/logger.js";

// Standard JSON response for rate limit errors
const rateLimitHandler = (req, res) => {
  logger.warn("Rate limit hit", { ip: req.ip, path: req.path });
  res.status(429).json({
    success: false,
    error:   "Too many requests. Please slow down.",
    code:    "RATE_LIMIT",
    retryAfter: Math.ceil(req.rateLimit?.resetTime / 1000) || 60,
  });
};

// Key generator — prefer userId if authenticated, fall back to IP
const userOrIpKey = (req) =>
  req.userId ? `user:${req.userId}` : `ip:${req.ip}`;

// ── Global limiter — applied to all routes ────────────────────────────────
export const globalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max:      env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders:   false,
  handler:         rateLimitHandler,
});

// ── Slow-down — adds latency before hard limit ────────────────────────────
export const globalSlowDown = slowDown({
  windowMs:          env.RATE_LIMIT_WINDOW_MS,
  delayAfter:        Math.floor(env.RATE_LIMIT_MAX * 0.8),  // start delaying at 80%
  delayMs:           (used) => (used - Math.floor(env.RATE_LIMIT_MAX * 0.8)) * 200,
  maxDelayMs:        5000,
});

// ── Auth routes — strict, per IP ──────────────────────────────────────────
export const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max:      env.AUTH_RATE_MAX,
  standardHeaders: true,
  legacyHeaders:   false,
  handler:         rateLimitHandler,
  keyGenerator:    (req) => `auth:${req.ip}`,
});

// ── AI generation — per user ──────────────────────────────────────────────
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour
  max:      env.AI_RATE_MAX,
  standardHeaders: true,
  legacyHeaders:   false,
  handler:         rateLimitHandler,
  keyGenerator:    userOrIpKey,
});

// ── Publish — per user ────────────────────────────────────────────────────
export const publishLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour
  max:      env.PUBLISH_RATE_MAX,
  standardHeaders: true,
  legacyHeaders:   false,
  handler:         rateLimitHandler,
  keyGenerator:    userOrIpKey,
});

// ── Domain search — per IP ────────────────────────────────────────────────
export const domainLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour
  max:      30,
  standardHeaders: true,
  legacyHeaders:   false,
  handler:         rateLimitHandler,
  keyGenerator:    (req) => `domain:${req.ip}`,
});

// ── Strict limiter — password reset, email confirm, etc. ─────────────────
export const strictLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max:      5,
  standardHeaders: true,
  legacyHeaders:   false,
  handler:         rateLimitHandler,
});

// ── Stripe webhooks — very permissive (Stripe IPs only in prod) ───────────
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max:      200,
  standardHeaders: false,
  legacyHeaders:   false,
});
