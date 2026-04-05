/**
 * server.js — ForgeSites AI SaaS API Server (v3 — Production)
 *
 * Production-grade Express server with:
 *   - Helmet security headers
 *   - CORS
 *   - Global rate limiting + slow-down
 *   - Structured request logging (Winston)
 *   - Stripe webhook with raw body (mounted BEFORE json parser)
 *   - Modular route mounting
 *   - Centralized error handling
 *   - Graceful shutdown
 *
 * Run: npm run server
 * Dev: npm run server:dev
 */

import "dotenv/config";

// Validate all required env vars on startup — crash fast if anything is missing
import "./src/config/env.js";

import { createServer }  from "http";
import express           from "express";
import helmet            from "helmet";
import cors              from "cors";
import { Server as SocketServer } from "socket.io";
import { init as initSocket }     from "./src/saas/socketService.js";

import { env }                           from "./src/config/env.js";
import logger                            from "./src/utils/logger.js";
import { globalLimiter, globalSlowDown } from "./src/middleware/rateLimiter.js";
import { AppError }                      from "./src/utils/errors.js";

// ── Route imports ─────────────────────────────────────────────────────────────
import authRouter                       from "./src/routes/auth.js";
import siteRouter                       from "./src/routes/site.js";      // single-site convenience
import sitesRouter                      from "./src/routes/sites.js";
import contentRouter                    from "./src/routes/content.js";
import productsRouter                   from "./src/routes/products.js";
import imagesRouter                     from "./src/routes/images.js";
import aiRouter                         from "./src/routes/ai.js";
import creditsRouter                    from "./src/routes/credits.js";
import publishRouter                    from "./src/routes/publish.js";
import billingRouter, { webhookRouter }              from "./src/routes/billing.js";
import checkoutRouter                                from "./src/routes/checkout.js";
import { ecommerceWebhookRouter }                    from "./src/routes/webhookEcommerce.js";
import domainRouter                                  from "./src/routes/domain.js";
import adminRouter                      from "./src/routes/admin.js";
import generateRouter                   from "./src/routes/generate.js";  // admin bulk generation (v1)
import generateBatchRouter             from "./src/routes/generateBatch.js"; // niche-aware generation (v2)
import storeRouter                     from "./src/routes/store.js";       // order system (public)
import storeAdminRouter                from "./src/routes/storeAdmin.js";  // order system (admin)
import merchantRouter                  from "./src/routes/merchant.js";    // painel do lojista
import adminOrdersRouter               from "./src/routes/adminOrders.js"; // super admin: stores/orders/revenue

// ── App + HTTP server ─────────────────────────────────────────────────────────
const app        = express();
const httpServer = createServer(app);

// Trust reverse proxy (Render, Railway, Fly.io) for correct req.ip / protocol
app.set("trust proxy", 1);

// ── Security headers (helmet) ─────────────────────────────────────────────────
app.use(helmet({
  // This is a pure JSON API — no HTML document is served from this server
  contentSecurityPolicy:         false,
  crossOriginResourcePolicy:     { policy: "cross-origin" },
  crossOriginOpenerPolicy:       false,
}));


// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = env.CORS_ORIGIN === "*"
  ? "*"
  : env.CORS_ORIGIN.split(",").map(s => s.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (allowedOrigins === "*") return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "stripe-signature"],
  credentials: true,
  maxAge: 86400,
}));

// ── Socket.io ─────────────────────────────────────────────────────────────────
const io = new SocketServer(httpServer, {
  cors: {
    origin:      allowedOrigins === "*" ? "*" : allowedOrigins,
    methods:     ["GET", "POST"],
    credentials: true,
  },
});

// Lojistas entram na room da sua loja: socket.join("store:{storeId}")
io.on("connection", (socket) => {
  socket.on("join_store", (storeId) => {
    if (storeId) socket.join(`store:${storeId}`);
  });

  socket.on("leave_store", (storeId) => {
    if (storeId) socket.leave(`store:${storeId}`);
  });
});

// Compartilha a instância com todos os serviços via singleton
initSocket(io);

// ── Stripe webhooks — RAW body MUST come before express.json() ────────────────
// Stripe verifies the signature against the raw Buffer.
// express.json() would consume the stream first and break verification.
app.use("/stripe/webhook",  webhookRouter);          // subscription billing
app.use("/webhook/stripe",  ecommerceWebhookRouter); // e-commerce purchases

// ── Body parser ───────────────────────────────────────────────────────────────
// 10mb limit: base64-encoded images via POST /images can approach 7-8 MB
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Global rate limiting ──────────────────────────────────────────────────────
// Progressive delay starts at 80% of the hard limit (configured in env)
app.use(globalSlowDown);
app.use(globalLimiter);

// ── Request logging ───────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  logger.debug("incoming", {
    method:    req.method,
    path:      req.path,
    ip:        req.ip,
    ua:        req.get("user-agent"),
  });
  next();
});

// ── Health check (no auth, not rate-limited by global limiter order) ──────────
app.get("/health", (_req, res) => {
  res.json({
    status:    "ok",
    service:   "forgesites-api",
    version:   "3.0.0",
    env:       env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ── Mount routes ──────────────────────────────────────────────────────────────
app.use("/auth",     authRouter);
app.use("/site",     siteRouter);     // single-site convenience (GET/PUT /site, POST /site/publish)
app.use("/sites",    sitesRouter);
app.use("/content",  contentRouter);
app.use("/products", productsRouter);
app.use("/images",   imagesRouter);
app.use("/ai",       aiRouter);
app.use("/credits",  creditsRouter);
app.use("/publish",  publishRouter);
app.use("/billing",   billingRouter);
app.use("/checkout",  checkoutRouter);
app.use("/domain",    domainRouter);
app.use("/admin",    adminRouter);
app.use("/generate",       generateRouter);      // admin bulk generation (v1 — legacy)
app.use("/generate-batch", generateBatchRouter); // niche-aware generation (v2)
app.use("/",            storeRouter);              // order system: /store/:slug, /products/:storeId, /orders
app.use("/store-admin", storeAdminRouter);         // order system admin: stores, categories, products
app.use("/merchant",    merchantRouter);           // painel do lojista
app.use("/admin",       adminOrdersRouter);        // super admin: /admin/stores, /admin/orders, /admin/revenue

// ── 404 — no route matched ────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success:   false,
    error:     "Endpoint not found",
    code:      "NOT_FOUND",
    timestamp: new Date().toISOString(),
  });
});

// ── Global error handler ──────────────────────────────────────────────────────
// 4-argument signature is required for Express to treat this as error middleware.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  const statusCode    = err.statusCode || 500;
  const isOperational = err instanceof AppError;

  if (!isOperational || statusCode >= 500) {
    // Unexpected errors — log with full context
    logger.error("unhandled error", {
      error:   err.message,
      code:    err.code,
      // Never log stack traces in production (sensitive paths)
      stack:   env.IS_PROD ? undefined : err.stack,
      method:  req.method,
      path:    req.path,
      userId:  req.userId ?? null,
      ip:      req.ip,
    });
  } else {
    // Known operational errors (4xx) — log as warnings
    logger.warn("request error", {
      error:  err.message,
      code:   err.code,
      status: statusCode,
      method: req.method,
      path:   req.path,
    });
  }

  // Never expose stack trace or implementation details in the response
  res.status(statusCode).json({
    success:   false,
    error:     isOperational ? err.message : "Internal server error",
    code:      err.code || "INTERNAL_ERROR",
    ...(err.details  && { details: err.details }),
    timestamp: new Date().toISOString(),
  });
});

// ── Start server ──────────────────────────────────────────────────────────────
const server = httpServer.listen(env.PORT, () => {
  logger.info("ForgeSites API started", {
    port: env.PORT,
    env:  env.NODE_ENV,
    pid:  process.pid,
  });
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
function shutdown(signal) {
  logger.info(`${signal} received — shutting down gracefully`);

  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });

  // Force-kill if connections don't drain within 10s
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

export default app;
