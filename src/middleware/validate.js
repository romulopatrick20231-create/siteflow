/**
 * validate.js — Joi validation middleware factory.
 *
 * Usage:
 *   router.post("/sites", validate(schemas.createSite), handler)
 *
 * On failure: returns 400 with field-level error details.
 */

import Joi from "joi";
import { ValidationError } from "../utils/errors.js";

// ── Middleware factory ────────────────────────────────────────────────────
export function validate(schema, source = "body") {
  return (req, _res, next) => {
    const data = source === "body"  ? req.body   :
                 source === "query" ? req.query  :
                 source === "params"? req.params : req.body;

    const { error, value } = schema.validate(data, {
      abortEarly: false,       // return ALL errors, not just first
      stripUnknown: true,      // remove unknown fields
      allowUnknown: false,
    });

    if (error) {
      const details = error.details.map(d => ({
        field:   d.path.join("."),
        message: d.message.replace(/["]/g, ""),
      }));
      return next(new ValidationError("Validation failed", details));
    }

    // Replace with sanitized/validated value
    if (source === "body")   req.body   = value;
    if (source === "query")  req.query  = value;
    if (source === "params") req.params = value;
    next();
  };
}

// ── Reusable field definitions ────────────────────────────────────────────
const uuid    = () => Joi.string().uuid({ version: "uuidv4" });
const shortStr = (max = 200) => Joi.string().max(max).trim();
const longStr  = (max = 5000) => Joi.string().max(max).trim().allow("", null);
const price    = () => Joi.number().precision(2).min(0).max(999999).allow(null);
const niches   = [
  "Clínica Odontológica","Clínica Médica","Clínica de Fisioterapia",
  "Consultório de Nutrição","Clínica Veterinária","Farmácia",
  "Salão de Beleza","Barbearia","Clínica de Estética","Restaurante",
  "Pizzaria","Padaria","Hamburgueria","Escritório de Advocacia",
  "Escritório de Contabilidade","Imobiliária","Academia / Studio Fitness",
  "Escola / Curso","Oficina Mecânica","Negócio Local",
];

// ── Validation schemas ────────────────────────────────────────────────────
export const schemas = {

  // /sites
  createSite: Joi.object({
    businessName: shortStr(150).required(),
    niche:        Joi.string().valid(...niches).default("Negócio Local"),
    phone:        shortStr(20).allow("", null),
    city:         shortStr(100).allow("", null),
    neighborhood: shortStr(100).allow("", null),
  }),

  // /sites/:id/info
  updateSiteInfo: Joi.object({
    businessName: shortStr(150),
    niche:        Joi.string().valid(...niches),
    phone:        shortStr(20).allow("", null),
    city:         shortStr(100).allow("", null),
    neighborhood: shortStr(100).allow("", null),
  }).min(1),

  // /content/:siteId
  updateContent: Joi.object({
    headline:      shortStr(200).allow("", null),
    hero_copy:     shortStr(400).allow("", null),
    about_text:    longStr(3000),
    contact_email: Joi.string().email().max(200).allow("", null),
    whatsapp_link: Joi.string().uri().max(300).allow("", null),
    diferenciais:  Joi.array().items(
      Joi.alternatives().try(
        Joi.string().max(300),
        Joi.object({ title: shortStr(100), desc: shortStr(200) })
      )
    ).max(6),
    depoimentos: Joi.array().items(
      Joi.object({
        nome:  shortStr(100).required(),
        texto: shortStr(500).required(),
      })
    ).max(10),
  }).min(1),

  // /products
  createProduct: Joi.object({
    siteId:      uuid(),          // optional — auto-resolved from JWT if omitted
    name:        shortStr(150).required(),
    description: longStr(1000),
    price:       price(),
    imageUrl:    Joi.string().uri().max(500).allow("", null),
    sortOrder:   Joi.number().integer().min(0).default(0),
  }),

  updateProduct: Joi.object({
    name:        shortStr(150),
    description: longStr(1000),
    price:       price(),
    imageUrl:    Joi.string().uri().max(500).allow("", null),
    is_active:   Joi.boolean(),
    sortOrder:   Joi.number().integer().min(0),
  }).min(1),

  // /ai/generate
  // Accepts two formats:
  //   { siteId, prompt }            — free-form prompt (frontend simplified format)
  //   { siteId, type, context }     — typed generation (existing format)
  generateAI: Joi.object({
    siteId:  uuid(),              // optional — auto-resolved from JWT if omitted
    prompt:  Joi.string().max(2000).trim(),
    type:    Joi.string().valid(
      "headline","hero_copy","diferenciais","depoimentos","about_text","product_description"
    ),
    context: Joi.object({
      businessName:  shortStr(150),
      niche:         shortStr(100),
      city:          shortStr(100),
      neighborhood:  shortStr(100),
      phone:         shortStr(20),
      productName:   shortStr(150),
    }),
    // Site context for prompt-based generation — fields the AI may change
    siteContext: Joi.object({
      name:        shortStr(150).allow("", null),
      headline:    shortStr(300).allow("", null),
      description: shortStr(1000).allow("", null),
      phone:       shortStr(30).allow("", null),
      rating_text: shortStr(100).allow("", null),
    }),
  }).or("prompt", "type"),

  // /publish/:siteId
  publishSite: Joi.object({
    siteId: uuid().required(),
  }),

  // /stripe/checkout
  stripeCheckout: Joi.object({
    plan:        Joi.string().valid("basic", "pro").required(),
    successUrl:  Joi.string().uri().max(500).required(),
    cancelUrl:   Joi.string().uri().max(500).required(),
  }),

  // /domain/search
  domainSearch: Joi.object({
    name: Joi.string()
      .pattern(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/)
      .max(253)
      .lowercase()
      .required()
      .messages({
        "string.pattern.base": "Invalid domain format. Use example.com",
      }),
  }),

  // /domain/register
  domainRegister: Joi.object({
    siteId:    uuid().required(),
    domain:    Joi.string().max(253).lowercase().required(),
    years:     Joi.number().integer().min(1).max(10).default(1),
    firstName: shortStr(50).required(),
    lastName:  shortStr(50).required(),
    email:     Joi.string().email().max(200).required(),
    phone:     shortStr(20).required(),
    address1:  shortStr(200).required(),
    city:      shortStr(100).required(),
    state:     shortStr(100).required(),
    country:   Joi.string().length(2).uppercase().required(),
    zip:       shortStr(20).required(),
  }),

  // /domain/connect
  domainConnect: Joi.object({
    siteId:   uuid().required(),
    domainId: uuid().required(),
  }),

  // ── CMS ──────────────────────────────────────────────────────────────────

  // PATCH /sites/:id/edit
  siteEdit: Joi.object({
    path:  Joi.string()
      .max(300)
      .pattern(/^[a-zA-Z0-9_*]+(\.[a-zA-Z0-9_*]+)*$/)
      .required()
      .messages({
        "string.pattern.base": "path must be a dot-separated alphanumeric key path",
      }),
    value: Joi.alternatives()
      .try(
        Joi.string().max(5000).allow("", null),
        Joi.number(),
        Joi.boolean(),
        Joi.valid(null)
      )
      .required(),
  }),

  // PATCH /sites/:id/config
  siteConfig: Joi.object({
    primaryColor:   Joi.string().pattern(/^#[0-9a-fA-F]{3,8}$/).allow(null),
    secondaryColor: Joi.string().pattern(/^#[0-9a-fA-F]{3,8}$/).allow(null),
    logo:           Joi.string().uri().max(1000).allow(null),
    contact: Joi.object({
      phone:    Joi.string().max(30).allow("", null),
      email:    Joi.string().email().max(200).allow("", null),
      whatsapp: Joi.string().max(30).allow("", null),
      address:  Joi.string().max(300).allow("", null),
    }).optional(),
    social: Joi.object({
      instagram: Joi.string().max(200).allow("", null),
      facebook:  Joi.string().max(200).allow("", null),
      tiktok:    Joi.string().max(200).allow("", null),
      youtube:   Joi.string().max(200).allow("", null),
    }).optional(),
  }).min(1),

  // PATCH /sites/:id/status
  siteStatus: Joi.object({
    status: Joi.string()
      .valid("draft", "ready", "published", "archived")
      .required(),
  }),

  // PATCH /sites/:id/edits — batch edit (atomic)
  batchEdit: Joi.object({
    edits: Joi.array()
      .items(
        Joi.object({
          path: Joi.string()
            .max(300)
            .pattern(/^[a-zA-Z0-9_]+(\.([a-zA-Z0-9_]+|\*))*$/)
            .required()
            .messages({
              "string.pattern.base": "path must be a dot-separated alphanumeric key path",
            }),
          value: Joi.alternatives()
            .try(
              Joi.string().max(5000).allow("", null),
              Joi.number(),
              Joi.boolean(),
              Joi.valid(null)
            )
            .required(),
        })
      )
      .min(1)
      .max(50)
      .required(),
  }),

  // DELETE /sites/:id/edit — revert a single field
  revertEdit: Joi.object({
    path: Joi.string()
      .max(300)
      .pattern(/^[a-zA-Z0-9_*]+(\.[a-zA-Z0-9_*]+)*$/)
      .required()
      .messages({
        "string.pattern.base": "path must be a dot-separated alphanumeric key path",
      }),
  }),

  // /admin
  adminSetPlan: Joi.object({
    plan: Joi.string().valid("basic", "pro", "admin").required(),
  }),

  adminSetCredits: Joi.object({
    amount: Joi.number().integer().min(0).max(99999).required(),
  }),

  // Images
  imageRecord: Joi.object({
    siteId:      uuid().required(),
    storagePath: Joi.string().max(500).required(),
    publicUrl:   Joi.string().uri().max(1000).required(),
    fileName:    Joi.string().max(255).required(),
    fileSize:    Joi.number().integer().min(1).max(5_242_880).required(),  // max 5MB
    mimeType:    Joi.string().valid("image/jpeg","image/png","image/webp","image/gif").required(),
    type:        Joi.string().valid("logo","banner","product","gallery").default("gallery"),
  }),

  // Image signed URL request
  imageUploadUrl: Joi.object({
    siteId:    uuid().required(),
    fileName:  Joi.string().max(255).required(),
    mimeType:  Joi.string().valid("image/jpeg","image/png","image/webp","image/gif").required(),
    fileSize:  Joi.number().integer().min(1).max(5_242_880).required(),
    imageType: Joi.string().valid("logo","banner","product","gallery").default("gallery"),
  }),
};
