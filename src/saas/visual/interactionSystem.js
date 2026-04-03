/**
 * interactionSystem.js — Cursor, hover, ripple, and particle trail configs.
 *
 * All interactions are implemented on the frontend using:
 *   - mousemove tracking + lerp smoothing
 *   - requestAnimationFrame render loop
 *   - Canvas overlay for particle trail and ripple
 *   - CSS custom properties updated via JS for magnetic cursor
 *
 * Output: configs that the frontend runtime reads to set up each system.
 * No DOM manipulation happens here — this is pure configuration generation.
 */

// ── Magnetic cursor ─────────────────────────────────────────────────────────
// Cursor follows mouse with lerp smoothing. On hover of magnetic targets,
// cursor snaps toward the target's center.

function magneticCursor(category, personality) {
  // Cursor feel per niche/personality
  const CURSOR_PROFILES = {
    odontologia: { size: 14, borderSize: 1.5, magnetStrength: 0.40, lerpSpeed: 0.10, trailEnabled: false, color: "rgba(30, 120, 220, 0.85)" },
    clinica:     { size: 12, borderSize: 1.5, magnetStrength: 0.35, lerpSpeed: 0.10, trailEnabled: false, color: "rgba(40, 100, 200, 0.80)" },
    restaurante: { size: 18, borderSize: 1.5, magnetStrength: 0.30, lerpSpeed: 0.12, trailEnabled: false, color: "rgba(200, 100, 30, 0.85)" },
    petshop:     { size: 16, borderSize: 2.0, magnetStrength: 0.45, lerpSpeed: 0.09, trailEnabled: true,  color: "rgba(40, 180, 100, 0.80)" },
    beleza:      { size: 20, borderSize: 1.0, magnetStrength: 0.38, lerpSpeed: 0.08, trailEnabled: true,  color: "rgba(180, 60, 140, 0.75)" },
    servicos:    { size: 12, borderSize: 1.5, magnetStrength: 0.30, lerpSpeed: 0.12, trailEnabled: false, color: "rgba(60, 80, 200, 0.80)" },
    fitness:     { size: 16, borderSize: 2.5, magnetStrength: 0.50, lerpSpeed: 0.07, trailEnabled: true,  color: "rgba(220, 80, 20, 0.90)" },
    educacao:    { size: 14, borderSize: 1.5, magnetStrength: 0.35, lerpSpeed: 0.10, trailEnabled: false, color: "rgba(50, 100, 220, 0.80)" },
    oficina:     { size: 14, borderSize: 2.0, magnetStrength: 0.40, lerpSpeed: 0.11, trailEnabled: true,  color: "rgba(220, 100, 20, 0.85)" },
    generico:    { size: 14, borderSize: 1.5, magnetStrength: 0.35, lerpSpeed: 0.10, trailEnabled: false, color: "rgba(80, 80, 200, 0.80)" },
  };

  const profile = CURSOR_PROFILES[category] || CURSOR_PROFILES.generico;

  return {
    enabled:        true,
    type:           "magnetic",
    // Cursor dot dimensions
    dot: {
      size:         profile.size,
      color:        profile.color,
      mixBlendMode: "difference",    // inverts background color for visibility
    },
    // Outer ring (follows with extra lag)
    ring: {
      size:         profile.size * 3.2,
      borderWidth:  profile.borderSize,
      borderColor:  profile.color,
      lerpSpeed:    profile.lerpSpeed * 0.55,  // ring trails behind dot
      mixBlendMode: "normal",
    },
    // Lerp smoothing for the dot
    lerpSpeed:       profile.lerpSpeed,
    // Magnetic snap on target hover
    magnetic: {
      strength:     profile.magnetStrength,
      maxDistance:  80,              // px — beyond this, no magnetic effect
      lerpSpeed:    0.18,
      targets:      [
        ".cta-button",
        ".hero-cta-primary",
        ".hero-cta-secondary",
        ".service-card",
        ".team-member-card",
        ".nav-link",
        ".social-link",
      ],
    },
    // Cursor states (add class to cursor element)
    states: {
      hover_link:      { scale: 1.6, opacity: 0.6 },
      hover_image:     { scale: 2.5, text: "Ver", fontSize: 10 },
      hover_button:    { scale: 1.4, opacity: 0.8 },
      dragging:        { scale: 0.8, opacity: 0.9 },
    },
    // Implementation instructions for frontend
    implementation: {
      method:          "rAF",        // requestAnimationFrame loop
      positionMethod:  "cssVars",    // update --cx, --cy CSS custom properties
      hideNativeCursor: true,
      mobileDisabled:  true,         // hide custom cursor on touch devices
    },
  };
}

// ── Hover distortion ────────────────────────────────────────────────────────
// Elements distort on mouse hover via CSS clip-path or SVG feTurbulence filter.

function hoverDistortion(category) {
  const HOVER_PROFILES = {
    odontologia: { type: "scale",    scale: 1.03, shadow: "0 20px 60px rgba(0,0,0,0.15)", duration: 0.35, ease: "power2.out" },
    clinica:     { type: "scale",    scale: 1.02, shadow: "0 16px 48px rgba(0,0,0,0.12)", duration: 0.30, ease: "power2.out" },
    restaurante: { type: "lift",     y: -8, shadow: "0 24px 48px rgba(0,0,0,0.20)",       duration: 0.40, ease: "back.out(1.5)" },
    petshop:     { type: "bounce",   scale: 1.05, rotate: 1.5,                            duration: 0.45, ease: "elastic.out(1,0.6)" },
    beleza:      { type: "glow",     scale: 1.04, glow: "0 0 30px rgba(180,60,140,0.35)", duration: 0.40, ease: "power3.out" },
    servicos:    { type: "scale",    scale: 1.02, shadow: "0 12px 40px rgba(0,0,0,0.12)", duration: 0.28, ease: "power2.out" },
    fitness:     { type: "shake",    scale: 1.05, rotate: -1,                             duration: 0.30, ease: "back.out(2)" },
    educacao:    { type: "lift",     y: -6, shadow: "0 20px 44px rgba(0,0,0,0.14)",       duration: 0.35, ease: "power2.out" },
    oficina:     { type: "tilt",     maxTilt: 6,                                          duration: 0.25, ease: "power2.out" },
    generico:    { type: "scale",    scale: 1.03, shadow: "0 16px 40px rgba(0,0,0,0.12)", duration: 0.32, ease: "power2.out" },
  };

  const profile = HOVER_PROFILES[category] || HOVER_PROFILES.generico;

  return {
    enabled:   true,
    profiles: {
      // Different effects per element type
      card: {
        ...profile,
        transition: `transform ${profile.duration}s ${profile.ease}, box-shadow ${profile.duration}s ease`,
      },
      button: {
        type:      "scale",
        scale:     1.05,
        shadow:    "0 8px 24px rgba(0,0,0,0.18)",
        duration:  0.25,
        ease:      "back.out(1.7)",
      },
      image: {
        type:      "zoom",
        scale:     1.06,
        duration:  0.5,
        ease:      "power3.out",
        overflow:  "hidden",           // parent must have overflow:hidden
      },
      text_link: {
        type:      "underline_slide",  // animated underline via scaleX
        duration:  0.3,
        ease:      "power2.out",
      },
    },
    // 3D tilt config (for card type "tilt")
    tilt: {
      enabled:     profile.type === "tilt",
      maxTiltX:    profile.maxTilt || 5,
      maxTiltY:    profile.maxTilt || 5,
      perspective: 800,
      scale:       1.02,
      transitionSpeed: 300,
    },
  };
}

// ── Ripple effect ────────────────────────────────────────────────────────────
// Canvas-based ripple on click. Renders on a fullscreen overlay canvas.

function rippleEffect(category, personality) {
  const RIPPLE_PROFILES = {
    odontologia: { color: "rgba(30,120,220,0.20)",  maxRadius: 120, duration: 600,  rings: 2 },
    clinica:     { color: "rgba(40,100,200,0.18)",  maxRadius: 110, duration: 580,  rings: 2 },
    restaurante: { color: "rgba(200,100,30,0.22)",  maxRadius: 130, duration: 650,  rings: 3 },
    petshop:     { color: "rgba(40,180,100,0.20)",  maxRadius: 125, duration: 700,  rings: 3 },
    beleza:      { color: "rgba(180,60,140,0.18)",  maxRadius: 140, duration: 750,  rings: 2 },
    servicos:    { color: "rgba(60,80,200,0.15)",   maxRadius: 100, duration: 520,  rings: 2 },
    fitness:     { color: "rgba(220,80,20,0.25)",   maxRadius: 150, duration: 500,  rings: 4 },
    educacao:    { color: "rgba(50,100,220,0.18)",  maxRadius: 115, duration: 600,  rings: 2 },
    oficina:     { color: "rgba(220,100,20,0.22)",  maxRadius: 130, duration: 550,  rings: 3 },
    generico:    { color: "rgba(80,80,200,0.18)",   maxRadius: 115, duration: 580,  rings: 2 },
  };

  const profile = RIPPLE_PROFILES[category] || RIPPLE_PROFILES.generico;

  return {
    enabled:     true,
    canvas: {
      position:  "fixed",
      zIndex:    9998,
      pointerEvents: "none",     // clicks pass through the canvas
    },
    ripple: {
      color:         profile.color,
      maxRadius:     profile.maxRadius,
      durationMs:    profile.duration,
      rings:         profile.rings,           // concentric rings per click
      ringGap:       22,                      // px gap between rings
      easing:        "ease-out",
      lineWidth:     1.5,
    },
    // Trigger ripple on these events
    triggers:    ["click", "touchend"],
    // Buttons get filled ripple (Material Design style)
    buttonRipple: {
      enabled:   true,
      color:     "rgba(255,255,255,0.25)",
      duration:  400,
      overflow:  "hidden",
    },
  };
}

// ── Particle trail ────────────────────────────────────────────────────────────
// Canvas particles that spawn at cursor position and float/fade.

function particleTrail(category, personality) {
  const TRAIL_PROFILES = {
    petshop:  { enabled: true, particleCount: 6, size: [3, 6],    color: ["#27c266","#6ee8a4"], lifeMs: 900,  spread: 20, gravity: -0.04 },
    beleza:   { enabled: true, particleCount: 5, size: [2, 5],    color: ["#c43c8c","#f8a8d4"], lifeMs: 1000, spread: 18, gravity: -0.06 },
    fitness:  { enabled: true, particleCount: 8, size: [2, 4],    color: ["#e85020","#ffca28"], lifeMs: 700,  spread: 25, gravity:  0.02 },
    oficina:  { enabled: true, particleCount: 6, size: [2, 4],    color: ["#e06010","#ffaa30"], lifeMs: 750,  spread: 20, gravity:  0.03 },
    default:  { enabled: false },
  };

  const profile = TRAIL_PROFILES[category] || TRAIL_PROFILES.default;

  if (!profile.enabled) {
    return { enabled: false };
  }

  return {
    enabled:   true,
    canvas: {
      position:     "fixed",
      zIndex:       9997,
      pointerEvents:"none",
    },
    spawn: {
      onMove:        true,
      throttleMs:    32,          // 30fps cap — 16ms caused excessive draw calls
      countPerSpawn: profile.particleCount,
      mobileDisabled: true,       // skip particle trail on touch devices
    },
    particle: {
      sizeRange:    profile.size,
      colorPalette: profile.color,
      lifeMs:       profile.lifeMs,
      spread:       profile.spread,    // initial velocity spread in px
      gravity:      profile.gravity,   // px per frame (negative = float up)
      frictionX:    0.96,
      frictionY:    0.97,
      fadeOut:      true,              // opacity → 0 as life expires
      shrink:       true,              // size → 0 as life expires
    },
    implementation: {
      method:  "rAF",
      canvas:  "overlay",
    },
  };
}

// ── Main export ────────────────────────────────────────────────────────────

/**
 * Build the complete interaction system config for a site.
 *
 * @param {string} category   — niche category
 * @param {string} personality — personality id (caloroso, confiante, etc.)
 * @returns {Object}           — interactions block for site JSON
 */
export function buildInteractionConfig(category, personality) {
  return {
    cursor:         magneticCursor(category, personality),
    hover:          hoverDistortion(category),
    ripple:         rippleEffect(category, personality),
    particle_trail: particleTrail(category, personality),
    // Global interaction settings
    global: {
      smoothScroll: {
        enabled:         true,
        library:         "lenis",
        speed:           1.0,
        lerp:            0.10,        // smoothing (0.05 = sluggish, 0.15 = snappy)
        smoothWheel:     true,
        wheelMultiplier: 1.0,
        touchMultiplier: 1.8,         // more responsive on touch than wheel
        ease:            "expo",
      },
      pageTransition: {
        enabled:   true,
        duration:  0.5,
        type:      "fade",          // "fade" | "slide" | "reveal"
      },
      focusVisible: {
        enabled:   true,            // keyboard focus ring via :focus-visible
        style:     "ring",
      },
    },
  };
}
