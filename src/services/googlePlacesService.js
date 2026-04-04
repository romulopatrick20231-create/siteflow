/**
 * googlePlacesService.js — Enrich lead data with real business info from Google Places.
 *
 * Pipeline:
 *   1. findPlace      — search by "businessName city" → get place_id
 *   2. getPlaceDetails — fetch rating, reviews, hours, address, phone, photos
 *   3. return enriched lead object
 *
 * Used in buildSiteV2 / buildSiteForUser BEFORE AI generation so the AI
 * receives real stats, real hours, and real photos as creative context.
 *
 * Fails silently — always returns the original lead if anything goes wrong.
 */

import axios from "axios";
import logger from "../utils/logger.js";

const BASE = "https://maps.googleapis.com/maps/api/place";

function key() {
  return process.env.GOOGLE_PLACES_API_KEY || "";
}

/**
 * Step 1 — Find the place_id for a business name + city.
 * Uses the cheaper findplacefromtext endpoint (1 call).
 */
async function findPlaceId(businessName, city) {
  const input = `${businessName} ${city}`;
  const { data } = await axios.get(`${BASE}/findplacefromtext/json`, {
    params: {
      input,
      inputtype:  "textquery",
      fields:     "place_id,name",
      language:   "pt-BR",
      key:        key(),
    },
    timeout: 6000,
  });
  const candidate = data.candidates?.[0];
  return candidate?.place_id || null;
}

/**
 * Step 2 — Fetch full place details using place_id.
 * Fields selected to minimize billing: basic + contact + atmosphere + photos.
 */
async function getPlaceDetails(placeId) {
  const { data } = await axios.get(`${BASE}/details/json`, {
    params: {
      place_id: placeId,
      fields: [
        "name",
        "formatted_address",
        "formatted_phone_number",
        "international_phone_number",
        "rating",
        "user_ratings_total",
        "opening_hours",
        "website",
        "reviews",
        "types",
        "vicinity",
      ].join(","),
      language: "pt-BR",
      key:      key(),
    },
    timeout: 8000,
  });
  return data.result || null;
}

/**
 * Build a photo URL from a Google Places photo reference.
 * maxwidth=1200 is free-tier safe and good for hero slides.
 */
function photoUrl(photoRef, maxWidth = 1200) {
  return `${BASE}/photo?maxwidth=${maxWidth}&photo_reference=${photoRef}&key=${key()}`;
}

/**
 * Parse opening_hours into a clean { weekdays, saturday, sunday } object.
 */
function parseHours(openingHours) {
  if (!openingHours?.weekday_text?.length) return null;
  const lines = openingHours.weekday_text; // ["Segunda-feira: 11:00 – 23:00", ...]
  const days   = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];
  const result = {};

  lines.forEach(line => {
    const lower = line.toLowerCase();
    const time  = line.split(":").slice(1).join(":").trim();
    if (days.slice(0, 5).some(d => lower.startsWith(d))) {
      // Weekday — only save first occurrence as representative
      if (!result.weekdays) result.weekdays = `Seg–Sex: ${time}`;
    } else if (lower.startsWith("sábado")) {
      result.saturday = `Sáb: ${time}`;
    } else if (lower.startsWith("domingo")) {
      result.sunday = `Dom: ${time}`;
    }
  });

  return Object.keys(result).length ? result : null;
}

/**
 * Main export — enrich a lead object with Google Places data.
 *
 * @param {Object} lead  — { businessName, city, ... }
 * @returns {Object}     — lead enriched with `placesData` field (or original lead on failure)
 */
export async function enrichLeadWithPlaces(lead) {
  if (!key()) {
    logger.debug("GOOGLE_PLACES_API_KEY not set — skipping enrichment");
    return lead;
  }

  try {
    const placeId = await findPlaceId(lead.businessName, lead.city || "");
    if (!placeId) {
      logger.info("Google Places: no match found", { businessName: lead.businessName });
      return lead;
    }

    const details = await getPlaceDetails(placeId);
    if (!details) return lead;

    // Top 3 reviews (filter out very short ones)
    const reviews = (details.reviews || [])
      .filter(r => r.text?.length > 40)
      .slice(0, 3)
      .map(r => ({ nome: r.author_name, texto: r.text, rating: r.rating }));

    const hours = parseHours(details.opening_hours);

    const placesData = {
      placeId,
      name:         details.name,
      address:      details.formatted_address,
      phone:        details.formatted_phone_number || details.international_phone_number,
      rating:       details.rating,
      totalRatings: details.user_ratings_total,
      hours,
      reviews,     // Real customer reviews — injected into AI prompt
      website:     details.website,
      vicinity:    details.vicinity,
    };

    logger.info("Google Places enrichment OK", {
      businessName: lead.businessName,
      rating:       placesData.rating,
      reviews:      reviews.length,
    });

    // Merge: real phone/address take priority if lead didn't provide them
    return {
      ...lead,
      phone:       lead.phone || placesData.phone || lead.phone,
      address:     lead.address || placesData.address || lead.address,
      placesData,
    };

  } catch (err) {
    logger.warn("Google Places enrichment failed — continuing without it", {
      businessName: lead.businessName,
      error:        err.message,
    });
    return lead;
  }
}
