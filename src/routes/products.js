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

// ── Helper: resolve user's primary site ─────────────────────────────────
async function getPrimarySiteId(userId) {
  const db = getAdminClient();
  const { data } = await db
    .from("sites")
    .select("id")
    .eq("user_id", userId)
    .neq("status", "disabled")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();
  return data?.id ?? null;
}

// Map DB row → frontend shape (snake_case → camelCase)
function mapProduct(p) {
  return {
    id:          p.id,
    name:        p.name,
    price:       p.price,
    imageUrl:    p.image_url,
    description: p.description,
    is_active:   p.is_active,
    sort_order:  p.sort_order,
  };
}

// ── GET /products — list products for user's primary site ─────────────────
// Must be declared BEFORE GET /:siteId so it matches first.
router.get("/", asyncHandler(async (req, res) => {
  const siteId = await getPrimarySiteId(req.userId);
  if (!siteId) { send(res, []); return; }

  const db = getAdminClient();
  const { data, error } = await db
    .from("products")
    .select("*")
    .eq("site_id", siteId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(`getProducts: ${error.message}`);
  send(res, (data ?? []).map(mapProduct));
}));

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
  send(res, (data ?? []).map(mapProduct));
}));

// ── POST /products — add product (siteId auto-resolved if not in body) ────
router.post(
  "/",
  validate(schemas.createProduct),
  asyncHandler(async (req, res) => {
    let { siteId, ...productData } = req.body;

    // Auto-resolve primary site if siteId not provided by client
    if (!siteId) {
      siteId = await getPrimarySiteId(req.userId);
      if (!siteId) throw new NotFoundError("Site");
    }

    const product = await addProduct(siteId, req.userId, productData);
    send(res, mapProduct(product), 201);
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
