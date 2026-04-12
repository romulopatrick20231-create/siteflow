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

// -- Route imports -------------------------------------------------------------
import authRouter                       from "./src/routes/auth.js";
import siteRouter                       from "./src/routes/site.js";
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
import generateRouter                   from "./src/routes/generate.js";
import generateBatchRouter             from "./src/routes/generateBatch.js";
import storeRouter                     from "./src/routes/store.js";
import storeAdminRouter                from "./src/routes/storeAdmin.js";
import merchantRouter                  from "./src/routes/merchant.js";
import adminOrdersRouter               from "./src/routes/adminOrders.js";
import whatsappRouter                 from "./src/routes/whatsapp.js";
import agentConfigRouter             from "./src/routes/agentConfig.js";
import storeStatusRouter             from "./src/routes/storeStatus.js";
import agentRouter                   from "./src/routes/agentRoute.js";
import messagingRouter               from "./src/routes/messagingConfig.js";

// -- App + HTTP server ---------------------------------------------------------
const app        = express();
const httpServer = createServer(app);

app.set("trust proxy", 1);

// -- Security headers ----------------------------------------------------------
app.use(helmet({
  contentSecurityPolicy:         false,
  crossOriginResourcePolicy:     { policy: "cross-origin" },
  crossOriginOpenerPolicy:       false,
}));

// -- CORS ----------------------------------------------------------------------
const allowedOrigins = (!env.CORS_ORIGIN || env.CORS_ORIGIN === "*")
  ? "*"
  : env.CORS_ORIGIN.split(",").map(s => s.trim()).filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins === "*") return callback(null, origin);
    if (allowedOrigins.includes(origin)) return callback(null, origin);
    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "stripe-signature", "x-requested-with"],
  credentials: true,
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// -- Socket.io -----------------------------------------------------------------
const io = new SocketServer(httpServer, {
  cors: {
    origin:      allowedOrigins === "*" ? true : allowedOrigins,
    methods:     ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  socket.on("join_store", (storeId) => {
    if (storeId) socket.join(`store:${storeId}`);
  });
  socket.on("leave_store", (storeId) => {
    if (storeId) socket.leave(`store:${storeId}`);
  });
  socket.on("join_tenant", (tenantId) => {
    if (tenantId) socket.join(`tenant_${tenantId}`);
  });
  socket.on("leave_tenant", (tenantId) => {
    if (tenantId) socket.leave(`tenant_${tenantId}`);
  });
});

initSocket(io);

// -- Stripe webhooks (raw body BEFORE json parser) ----------------------------
app.use("/stripe/webhook",  webhookRouter);
app.use("/webhook/stripe",  ecommerceWebhookRouter);

// -- Body parser ---------------------------------------------------------------
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// -- Global rate limiting ------------------------------------------------------
app.use(globalSlowDown);
app.use(globalLimiter);

// -- Request logging -----------------------------------------------------------
app.use((req, _res, next) => {
  logger.debug("incoming", {
    method: req.method,
    path:   req.path,
    ip:     req.ip,
    ua:     req.get("user-agent"),
  });
  next();
});

// -- Health check --------------------------------------------------------------
app.get("/health", (_req, res) => {
  res.json({
    status:    "ok",
    service:   "forgesites-api",
    version:   "3.0.0",
    env:       env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// -- Template check ------------------------------------------------------------
app.get("/template-check", async (req, res) => {
  try {
    const { getTemplate } = await import("./src/saas/templates/index.js");
    const niche = (req.query.niche || "Farmacia").toString();
    const fn    = getTemplate(niche);
    let isLovable = false;
    let htmlSize  = 0;
    if (fn) {
      const html = fn({
        business_name: "TESTE_CHECK", niche,
        phone: "11999999999", city: "SP",
        images: [], content: { pages: [] },
      });
      htmlSize  = html.length;
      isLovable = html.length > 500_000 && html.includes("TESTE_CHECK");
    }
    res.json({
      niche,
      template:   fn ? (fn.toString().includes("buildFarmaciaHTML") ? "buildFarmaciaHTML" : fn.name) : null,
      isLovable,
      htmlSizeKB: Math.round(htmlSize / 1024),
      timestamp:  new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// -- Mount routes --------------------------------------------------------------
app.use("/auth",     authRouter);
app.use("/site",     siteRouter);
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
app.use("/generate",       generateRouter);
app.use("/generate-batch", generateBatchRouter);
app.use("/",            storeRouter);
app.use("/store-admin", storeAdminRouter);
app.use("/merchant",    merchantRouter);
app.use("/admin",       adminOrdersRouter);
app.use("/whatsapp",     whatsappRouter);
app.use("/agent-config", agentConfigRouter);
app.use("/store",        storeStatusRouter);   // GET|PATCH /store/status, PUT /store/notice, GET /store/dashboard
app.use("/agent",        agentRouter);         // GET|PUT /agent/config, POST /agent/suggest-prompt
app.use("/messaging",    messagingRouter);     // GET|PUT /messaging/config, POST /messaging/test

// WhatsApp webhook at canonical path expected by providers
app.post("/webhook/:tenantId/whatsapp", async (req, res) => {
  try {
    const body    = req.body;
    const phone   = body?.messages?.[0]?.from || body?.from;
    const message = body?.messages?.[0]?.text?.body || body?.text?.body || body?.body;
    if (!phone || !message) return res.sendStatus(200);
    const cleanPhone = phone.replace(/\D/g, "").replace(/^55/, "");
    const { handleIncomingMessage } = await import("./src/modules/agent/agent.service.js");
    handleIncomingMessage({ storeId: req.params.tenantId, phone: cleanPhone, message }).catch(() => {});
    res.sendStatus(200);
  } catch (_e) {
    res.sendStatus(200);
  }
});

// -- 404 -----------------------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({
    success:   false,
    error:     "Endpoint not found",
    code:      "NOT_FOUND",
    timestamp: new Date().toISOString(),
  });
});

// -- Global error handler ------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  const statusCode    = err.statusCode || 500;
  const isOperational = err instanceof AppError;

  if (!isOperational || statusCode >= 500) {
    logger.error("unhandled error", {
      error:  err.message,
      code:   err.code,
      stack:  env.IS_PROD ? undefined : err.stack,
      method: req.method,
      path:   req.path,
      userId: req.userId ?? null,
      ip:     req.ip,
    });
  } else {
    logger.warn("request error", {
      error:  err.message,
      code:   err.code,
      status: statusCode,
      method: req.method,
      path:   req.path,
    });
  }

  res.status(statusCode).json({
    success:   false,
    error:     isOperational ? err.message : "Internal server error",
    code:      err.code || "INTERNAL_ERROR",
    ...(err.details && { details: err.details }),
    timestamp: new Date().toISOString(),
  });
});

// -- Start server --------------------------------------------------------------
const server = httpServer.listen(env.PORT, async () => {
  logger.info("ForgeSites API started", {
    port: env.PORT,
    env:  env.NODE_ENV,
    pid:  process.pid,
  });

  const { startMessageWorker } = await import("./src/modules/whatsapp/whatsapp.service.js");
  startMessageWorker();
});

// -- Graceful shutdown ---------------------------------------------------------
function shutdown(signal) {
  logger.info(`${signal} received — shutting down gracefully`);

  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

export default app;
