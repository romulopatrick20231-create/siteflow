/**
 * imageGenerator.js — AI image generation via DALL-E 3.
 *
 * Generates niche-appropriate images for the site.
 * Fails gracefully: if DALL-E is unavailable or quota exceeded,
 * returns empty array and logs a warning.
 *
 * Image slots are defined in nicheSchema.js.
 * Each image is generated in parallel (up to CONCURRENCY at once).
 */

import OpenAI from "openai";
import { getImageSlotsForNiche } from "./nicheSchema.js";
import logger from "../utils/logger.js";

let _openai = null;
function getOpenAI() {
  if (_openai) return _openai;
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
  _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

const CONCURRENCY = 2; // DALL-E rate limits — keep low
const IMAGE_SIZE  = "1024x1024";
const IMAGE_QUALITY = "standard"; // "hd" for higher quality (costs more)

/**
 * Builds a DALL-E prompt for a given image slot and business.
 */
function buildImagePrompt(slot, businessName, city) {
  const location = city ? ` in ${city}, Brazil` : " in Brazil";
  return `Professional commercial photograph for ${businessName}${location}.
${slot.subject}.
Style: high-end agency photography, natural lighting, authentic feeling,
no text overlays, no logos, no watermarks.
Shot on professional camera, shallow depth of field, magazine quality.`;
}

/**
 * Generate a single DALL-E image.
 * Returns { slot, url, prompt } or null on failure.
 */
async function generateOneImage(slot, businessName, city) {
  try {
    const openai = getOpenAI();
    const prompt = buildImagePrompt(slot, businessName, city);

    const response = await openai.images.generate({
      model:   "dall-e-3",
      prompt,
      n:       1,
      size:    IMAGE_SIZE,
      quality: IMAGE_QUALITY,
    });

    return {
      slot:   slot.slot,
      url:    response.data[0].url,
      prompt,
    };
  } catch (err) {
    logger.warn("DALL-E image generation failed for slot", {
      slot:  slot.slot,
      error: err.message,
    });
    return null;
  }
}

/**
 * Generate all images for a given niche in parallel (with concurrency limit).
 *
 * @param {Object} lead - { businessName, niche, city }
 * @returns {Promise<Array>} - array of { slot, url, prompt }
 */
export async function generateNicheImages(lead) {
  const slots = getImageSlotsForNiche(lead.niche || "Negócio Local");
  const results = [];

  // Process in batches of CONCURRENCY
  for (let i = 0; i < slots.length; i += CONCURRENCY) {
    const batch = slots.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(
      batch.map((slot) => generateOneImage(slot, lead.businessName, lead.city))
    );

    for (const result of settled) {
      if (result.status === "fulfilled" && result.value) {
        results.push(result.value);
      }
    }
  }

  return results;
}
