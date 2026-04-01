/**
 * /images routes — Image management via Supabase Storage.
 *
 * Pattern: client uploads DIRECTLY to Supabase Storage (avoiding bandwidth
 * through our server). We provide signed upload URLs and record metadata.
 *
 * POST /images/upload-url         — get a signed upload URL
 * POST /images/record             — record an uploaded image in DB
 * GET  /images/:siteId            — list images for a site
 * DELETE /images/:id              — delete image (storage + DB record)
 */

import { Router }       from "express";
import { requireAuth }  from "../middleware/auth.js";
import { validate, schemas } from "../middleware/validate.js";
import { asyncHandler, send }   from "../utils/asyncHandler.js";
import { getAdminClient }       from "../saas/db.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import logger from "../utils/logger.js";

const BUCKET          = "site-images";
const MAX_FILE_SIZE   = 5 * 1024 * 1024;   // 5 MB
const ALLOWED_TYPES   = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const SIGNED_URL_TTL  = 300;                // 5 min — enough for frontend to complete upload

const router = Router();
router.use(requireAuth);

// ── POST /images/upload-url — generate signed upload URL ──────────────────
router.post(
  "/upload-url",
  validate(schemas.imageUploadUrl),
  asyncHandler(async (req, res) => {
    const { siteId, fileName, mimeType, fileSize, imageType } = req.body;
    const db = getAdminClient();

    // Verify site ownership
    const { count } = await db
      .from("sites")
      .select("id", { count: "exact", head: true })
      .eq("id", siteId)
      .eq("user_id", req.userId);
    if (!count) throw new NotFoundError("Site");

    if (!ALLOWED_TYPES.has(mimeType)) {
      throw new ValidationError("Invalid file type. Allowed: JPEG, PNG, WebP, GIF");
    }
    if (fileSize > MAX_FILE_SIZE) {
      throw new ValidationError("File too large. Maximum: 5MB");
    }

    // Build storage path: {userId}/{siteId}/{type}-{timestamp}-{sanitizedName}
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
    const path     = `${req.userId}/${siteId}/${imageType}-${Date.now()}-${safeName}`;

    const { data, error } = await db.storage
      .from(BUCKET)
      .createSignedUploadUrl(path, { upsert: false });

    if (error) {
      logger.error("Signed URL generation failed", { userId: req.userId, error: error.message });
      throw new Error(`Storage error: ${error.message}`);
    }

    // Public URL (available after upload completes)
    const { data: { publicUrl } } = db.storage.from(BUCKET).getPublicUrl(path);

    send(res, {
      signedUrl:  data.signedUrl,
      token:      data.token,
      storagePath: path,
      publicUrl,
      expiresIn:  SIGNED_URL_TTL,
    });
  })
);

// ── POST /images/record — save metadata after successful upload ────────────
router.post(
  "/record",
  validate(schemas.imageRecord),
  asyncHandler(async (req, res) => {
    const db = getAdminClient();
    const { siteId, storagePath, publicUrl, fileName, fileSize, mimeType, type } = req.body;

    // Verify site ownership
    const { count } = await db
      .from("sites")
      .select("id", { count: "exact", head: true })
      .eq("id", siteId)
      .eq("user_id", req.userId);
    if (!count) throw new NotFoundError("Site");

    // If uploading a new logo, delete old logo record (one logo per site)
    if (type === "logo") {
      const { data: oldLogos } = await db
        .from("images")
        .select("id, storage_path")
        .eq("site_id", siteId)
        .eq("type", "logo");

      for (const old of oldLogos ?? []) {
        await db.storage.from(BUCKET).remove([old.storage_path]);
        await db.from("images").delete().eq("id", old.id);
      }
    }

    const { data, error } = await db.from("images").insert({
      site_id:      siteId,
      user_id:      req.userId,
      storage_path: storagePath,
      public_url:   publicUrl,
      file_name:    fileName,
      file_size:    fileSize,
      mime_type:    mimeType,
      type,
    }).select().single();

    if (error) throw new Error(`Image record failed: ${error.message}`);
    logger.info("Image recorded", { userId: req.userId, siteId, type, path: storagePath });
    send(res, data, 201);
  })
);

// ── GET /images/:siteId ────────────────────────────────────────────────────
router.get("/:siteId", asyncHandler(async (req, res) => {
  const db = getAdminClient();

  const { count } = await db
    .from("sites")
    .select("id", { count: "exact", head: true })
    .eq("id", req.params.siteId)
    .eq("user_id", req.userId);
  if (!count) throw new NotFoundError("Site");

  const { data, error } = await db
    .from("images")
    .select("id, public_url, type, file_name, file_size, created_at")
    .eq("site_id", req.params.siteId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`getImages: ${error.message}`);
  send(res, data ?? []);
}));

// ── DELETE /images/:id ─────────────────────────────────────────────────────
router.delete("/:id", asyncHandler(async (req, res) => {
  const db = getAdminClient();

  const { data: img, error } = await db
    .from("images")
    .select("id, storage_path, site_id, user_id")
    .eq("id", req.params.id)
    .eq("user_id", req.userId)
    .single();

  if (error || !img) throw new NotFoundError("Image");

  // Remove from Supabase Storage
  const { error: storageErr } = await db.storage.from(BUCKET).remove([img.storage_path]);
  if (storageErr) {
    logger.warn("Storage delete failed (continuing DB delete)", {
      path: img.storage_path, error: storageErr.message
    });
  }

  // Remove DB record
  await db.from("images").delete().eq("id", req.params.id);
  logger.info("Image deleted", { userId: req.userId, imageId: req.params.id });
  send(res, { deleted: true });
}));

export default router;
