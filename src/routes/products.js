/**
 * /products routes — Product/service catalog per site.
 *
 * GET    /products/:siteId        — list products for a site
 * POST   /products                — add product
 * PUT    /products/:id            — update product
 * DELETE /products/:id            — delete product
 * PUT    /products/:siteId/reorder — reorder products
 */

import { Router }       from "express";
import { requireAuth }  from "../middleware/auth.js";
import { validate, schemas } from "../middleware/validate.js";
import { asyncHandler, send } from "../utils/asyncHandler.js";
import {
  addProduct, updateProduct, deleteProduct,
} from "../saas/sites.js";
import { getAdminClient } from "../saas/db.js";
import { NotFoundError, ForbiddenError } from "../utils/errors.js";
import Joi from "joi";

const router = Router();
router.use(requireAuth);

// ── GET /products/:siteId ──────────────────────────────────────────────────
router.get("/:siteId", asyncHandler(async (req, res) => {
  const db = getAdminClient();

  // Verify site ownership
  const { count } = await db
    .from("sites")
    .select("id", { count: "exact", head: true })
    .eq("id", req.params.siteId)
    .eq("user_id", req.userId);

  if (!count) throw new NotFoundError("Site");

  const { data, error } = await db
    .from("products")
    .select("*")
    .eq("site_id", req.params.siteId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(`getProducts: ${error.message}`);
  send(res, data ?? []);
}));

// ── POST /products ─────────────────────────────────────────────────────────
router.post(
  "/",
  validate(schemas.createProduct),
  asyncHandler(async (req, res) => {
    const { siteId, ...productData } = req.body;
    const product = await addProduct(siteId, req.userId, productData);
    send(res, product, 201);
  })
);

// ── PUT /products/:id ──────────────────────────────────────────────────────
router.put(
  "/:id",
  validate(schemas.updateProduct),
  asyncHandler(async (req, res) => {
    const result = await updateProduct(req.params.id, req.userId, req.body);
    send(res, result);
  })
);

// ── DELETE /products/:id ───────────────────────────────────────────────────
router.delete("/:id", asyncHandler(async (req, res) => {
  const result = await deleteProduct(req.params.id, req.userId);
  send(res, result);
}));

// ── PUT /products/:siteId/reorder ─────────────────────────────────────────
router.put(
  "/:siteId/reorder",
  validate(Joi.object({
    order: Joi.array().items(
      Joi.object({ id: Joi.string().uuid().required(), sortOrder: Joi.number().integer().min(0).required() })
    ).min(1).max(50).required(),
  })),
  asyncHandler(async (req, res) => {
    const db = getAdminClient();

    // Verify site ownership
    const { count } = await db
      .from("sites")
      .select("id", { count: "exact", head: true })
      .eq("id", req.params.siteId)
      .eq("user_id", req.userId);

    if (!count) throw new NotFoundError("Site");

    // Batch update sort orders
    const updates = req.body.order.map(({ id, sortOrder }) =>
      db.from("products")
        .update({ sort_order: sortOrder, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", req.userId)
    );
    await Promise.all(updates);

    send(res, { reordered: true });
  })
);

export default router;
