/**
 * visual/index.js — Visual engine orchestrator.
 *
 * Assembles all visual layers (shaders, animations, interactions, typography,
 * performance) into a single config block that gets embedded in the site JSON.
 *
 * Called by siteBuilderV2.js after niche content is generated.
 * All generation is deterministic (no AI calls) — selects from curated
 * libraries based on niche category, personality, and flow variant.
 *
 * Output shape:
 * {
 *   shaders:      { enabled, renderer, effects: [...] }
 *   animations:   { engine, timelines: [...], ... }
 *   interactions: { cursor, hover, ripple, particle_trail }
 *   typography:   { animations: [...], ... }
 *   performance:  { tiers, reducedMotion, ... }
 * }
 */

import { buildShaderConfig }      from "./shaderLibrary.js";
import { buildGsapConfig }        from "./gsapEngine.js";
import { buildInteractionConfig } from "./interactionSystem.js";
import { buildTypographyConfig }  from "./typographyEngine.js";
import { buildPerformanceConfig } from "./performanceConfig.js";

/**
 * Generate the full visual engine config for a site.
 *
 * @param {Object} ctx
 *   @param {string}   ctx.category     — niche category (odontologia, clinica, ...)
 *   @param {string}   ctx.niche        — original niche string
 *   @param {string}   ctx.personality  — personality id from nicheGenerator
 *   @param {string}   ctx.flowVariant  — flow variant id from nicheSchema
 *   @param {string}   ctx.colorMood    — color mood from nicheContent.meta
 *   @param {Array}    ctx.pages        — pages array (to build per-section animations)
 *
 * @returns {Object} — { shaders, animations, interactions, typography, performance }
 */
export function generateVisualConfig(ctx) {
  const { category, personality, colorMood, pages } = ctx;

  // Only pin hero for high-impact niches where drama is appropriate
  const HERO_PIN_NICHES = new Set(["odontologia", "beleza", "restaurante", "fitness"]);
  const pinHero = HERO_PIN_NICHES.has(category);

  return {
    shaders:      buildShaderConfig(category, colorMood),
    animations:   buildGsapConfig(category, pages, pinHero),
    interactions: buildInteractionConfig(category, personality),
    typography:   buildTypographyConfig(category, personality),
    performance:  buildPerformanceConfig(),
  };
}
