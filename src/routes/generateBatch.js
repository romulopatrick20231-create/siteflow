/**
 * /generate-batch routes — Niche-aware site generation (v2).
 *
 * POST /generate-batch/site     — Single site (niche-aware, full JSON output)
 * POST /generate-batch          — Batch 10–50 sites from JSON array OR CSV body
 *
 * Access: admin only.
 *
 * Input formats:
 *
 * Single (JSON):
 *   {
 *     "businessName": "Clínica Bella Sorriso",
 *     "niche": "Clínica Odontológica",
 *     "city": "São Paulo",
 *     "phone": "11999887766",
 *     "address": "Rua das Flores, 123 — Vila Mariana",
 *     "generateImages": false
 *   }
 *
 * Batch (JSON):
 *   { "leads": [ { ...lead }, ... ], "generateImages": false }
 *
 * Batch (CSV body with Content-Type: text/csv):
 *   businessName,niche,city,phone,address
 *   Clínica Bella,...
 *
 * Output:
 *   { id, status, niche, pages, assets, animations, ... }
 */

import { Router }       from "express";
import { parse as parseCsv } from "csv-parse/sync";
import Joi              from "joi";
import { requireAuth }  from "../middleware/auth.js";
import { requireAdmin } from "../middleware/adminGuard.js";
import { validate }     from "../middleware/validate.js";
import { asyncHandler, send } from "../utils/asyncHandler.js";
import { buildSiteV2, buildSitesV2 } from "../saas/siteBuilderV2.js";
import logger           from "../utils/logger.js";

const router = Router();
router.use(requireAuth);
router.use(requireAdmin);

// ── Validation schemas ─────────────────────────────────────────────────────

const VALID_NICHES = [
  "Clínica Odontológica", "Clínica Médica", "Clínica de Fisioterapia",
  "Consultório de Nutrição", "Clínica Veterinária", "Farmácia",
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

// ── CSV parser middleware ──────────────────────────────────────────────────
// Reads raw text body when Content-Type is text/csv or text/plain.

function csvBodyParser(req, res, next) {
  const ct = (req.headers["content-type"] || "").toLowerCase();
  if (!ct.includes("text/csv") && !ct.includes("text/plain")) return next();

  let raw = "";
  req.setEncoding("utf8");
  req.on("data", (chunk) => { raw += chunk; });
  req.on("end",  () => { req.rawCsv = raw; next(); });
  req.on("error", next);
}

/** Parse CSV text → array of lead objects. */
function parseCsvToLeads(csvText) {
  const records = parseCsv(csvText, {
    columns:          true,
    skip_empty_lines: true,
    trim:             true,
    bom:              true,
  });

  return records.map((row) => ({
    businessName:   row.businessName || row.business_name || row["Nome"] || row["nome"] || "",
    niche:          row.niche        || row["Nicho"]  || row["nicho"]  || "Negócio Local",
    city:           row.city         || row["Cidade"] || row["cidade"] || "",
    phone:          row.phone        || row["Telefone"] || row["telefone"] || "",
    address:        row.address      || row["Endereço"] || row["endereco"] || "",
    neighborhood:   row.neighborhood || row["Bairro"]  || row["bairro"]  || "",
    email:          row.email        || row["Email"]   || row["email"]   || "",
    skipAI:         false,
    generateImages: false,
  })).filter((r) => r.businessName); // drop empty rows
}

// ── POST /generate-batch/site — single niche-aware site ───────────────────

router.post(
  "/site",
  validate(leadSchema),
  asyncHandler(async (req, res) => {
    logger.info("Single niche site generation (v2)", {
      adminId:      req.userId,
      businessName: req.body.businessName,
      niche:        req.body.niche,
    });

    const result = await buildSiteV2(req.body);

    logger.info("Single site generation complete (v2)", {
      adminId: req.userId,
      siteId:  result.site.id,
      niche:   result.site.niche,
      pages:   result.siteJson.pages?.length,
    });

    send(res, {
      id:          result.site.id,
      status:      result.siteJson.status,
      niche:       result.siteJson.niche,
      pages:       result.siteJson.pages,
      assets:      result.siteJson.assets,
      animations:  result.siteJson.animations,
      meta:        result.siteJson.meta,
      generation:  result.siteJson.generation,
      credentials: result.credentials,
      userId:      result.user.id,
    }, 201);
  })
);

// ── POST /generate-batch — batch from JSON array or CSV ───────────────────

router.post(
  "/",
  csvBodyParser,
  asyncHandler(async (req, res) => {
    let leads;
    let globalGenerateImages = false;

    // ── Parse input ──────────────────────────────────────────────────────
    if (req.rawCsv) {
      // CSV body
      try {
        leads = parseCsvToLeads(req.rawCsv);
      } catch (err) {
        return res.status(400).json({
          success: false,
          error:   `CSV parse error: ${err.message}`,
          code:    "INVALID_CSV",
        });
      }
    } else {
      // JSON body — validate
      const { error, value } = batchSchema.validate(req.body, {
        abortEarly:   false,
        stripUnknown: true,
      });

      if (error) {
        return res.status(400).json({
          success: false,
          error:   "Validation failed",
          details: error.details.map((d) => ({ field: d.path.join("."), message: d.message })),
          code:    "VALIDATION_ERROR",
        });
      }

      leads                = value.leads;
      globalGenerateImages = value.generateImages;
    }

    if (!leads || leads.length === 0) {
      return res.status(400).json({
        success: false,
        error:   "No valid leads found in input",
        code:    "NO_LEADS",
      });
    }

    if (leads.length > 50) {
      return res.status(400).json({
        success: false,
        error:   "Maximum 50 leads per batch",
        code:    "TOO_MANY_LEADS",
      });
    }

    // Apply global generateImages flag to all leads if set
    if (globalGenerateImages) {
      leads = leads.map((l) => ({ ...l, generateImages: true }));
    }

    logger.info("Batch site generation (v2)", {
      adminId: req.userId,
      count:   leads.length,
    });

    // ── Run batch ────────────────────────────────────────────────────────
    const results = await buildSitesV2(leads);

    const successful = results.filter((r) => !r.error);
    const failed     = results.filter((r) =>  r.error);

    logger.info("Batch generation complete (v2)", {
      adminId:    req.userId,
      total:      leads.length,
      successful: successful.length,
      failed:     failed.length,
    });

    send(res, {
      total:      leads.length,
      successful: successful.length,
      failed:     failed.length,
      results: results.map((r) =>
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
    });
  })
);

export default router;
