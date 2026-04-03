/**
 * performanceConfig.js — Performance strategy and fallback configs.
 *
 * Rules:
 *   - 60fps mobile target via IntersectionObserver + transform-only animations
 *   - WebGL lazy-loads after page is interactive (not blocking)
 *   - prefers-reduced-motion disables all motion, replaces with instant fade
 *   - No animations touch left/top/width/height (zero layout reflow)
 *   - Images lazy-load via native loading="lazy" + IntersectionObserver for WebGL
 */

// ── Breakpoint config ──────────────────────────────────────────────────────

const BREAKPOINTS = {
  mobile:  { maxWidth: 768,  devicePixelRatio: null },
  tablet:  { maxWidth: 1024, devicePixelRatio: null },
  desktop: { minWidth: 1025, devicePixelRatio: null },
};

// ── Performance tiers ──────────────────────────────────────────────────────
// The frontend detects the device tier and applies the right config.

const PERFORMANCE_TIERS = {

  high: {
    label:          "High-end desktop",
    criteria:       "hardwareConcurrency >= 8 && deviceMemory >= 8",
    webgl:          true,
    particlesCount: "full",
    animationQuality: "full",
    textureSize:    1024,
    antialiasing:   true,
    shadowsEnabled: true,
    shaderComplexity: "full",
  },

  medium: {
    label:          "Mid-range desktop / high-end mobile",
    criteria:       "hardwareConcurrency >= 4 && deviceMemory >= 4",
    webgl:          true,
    particlesCount: "half",          // reduce particle count by 50%
    animationQuality: "full",
    textureSize:    512,
    antialiasing:   false,           // off for performance
    shadowsEnabled: false,
    shaderComplexity: "reduced",     // fbm iterations: 4→2
  },

  low: {
    label:          "Low-end mobile / older devices",
    criteria:       "hardwareConcurrency < 4 || deviceMemory < 4",
    webgl:          false,           // disable WebGL entirely
    particlesCount: 0,
    animationQuality: "reduced",     // shorter durations, simpler eases
    textureSize:    256,
    antialiasing:   false,
    shadowsEnabled: false,
    shaderComplexity: "css_fallback",
    // CSS gradient fallback replaces WebGL background
    cssBackgroundFallback: true,
  },

};

// ── CSS fallbacks for WebGL effects ────────────────────────────────────────
// Applied when WebGL is disabled or not supported.

const CSS_FALLBACKS = {
  aurora: {
    background: "linear-gradient(135deg, var(--color-bg-deep) 0%, var(--color-primary-dark) 50%, var(--color-accent) 100%)",
    animation:  "gradientShift 12s ease infinite alternate",
    keyframes: `@keyframes gradientShift {
  0%   { background-position: 0% 50%; }
  100% { background-position: 100% 50%; }
}`,
  },
  liquid_gradient: {
    background: "radial-gradient(ellipse at 30% 40%, var(--color-primary) 0%, transparent 55%), radial-gradient(ellipse at 70% 60%, var(--color-accent) 0%, transparent 55%), var(--color-bg-deep)",
    animation:  "liquidPulse 10s ease-in-out infinite",
    keyframes: `@keyframes liquidPulse {
  0%, 100% { opacity: 0.8; }
  50%       { opacity: 1.0; }
}`,
  },
  glass_frost: {
    background:    "rgba(255,255,255,0.08)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border:        "1px solid rgba(255,255,255,0.12)",
  },
  noise_particles: {
    // Pure CSS animated dots
    background: "radial-gradient(circle, var(--color-primary) 1px, transparent 1px)",
    backgroundSize: "40px 40px",
    animation:  "dotsFloat 20s linear infinite",
    opacity:    0.3,
    keyframes: `@keyframes dotsFloat {
  0%   { background-position: 0 0; }
  100% { background-position: 40px 40px; }
}`,
  },
};

// ── IntersectionObserver config ────────────────────────────────────────────

const INTERSECTION_OBSERVER = {
  // For animation triggers (reveal on scroll)
  animations: {
    rootMargin:  "0px 0px -60px 0px",
    threshold:   [0, 0.1, 0.5, 1.0],
    // Unobserve after first intersection (once: true)
    once:        true,
  },
  // For lazy WebGL initialization
  webgl: {
    rootMargin:  "200px 0px 200px 0px",  // start loading 200px before visible
    threshold:   0,
    once:        true,
  },
  // For lazy image loading
  images: {
    rootMargin:  "100px 0px",
    threshold:   0,
    once:        true,
  },
};

// ── Animation reduction table ──────────────────────────────────────────────
// Applied when prefers-reduced-motion: reduce is detected.

const REDUCED_MOTION = {
  enabled:           true,         // always check prefers-reduced-motion
  detectQuery:       "(prefers-reduced-motion: reduce)",
  fallback: {
    gsap: {
      // Override all GSAP animations with instant opacity fade
      overrideDefaults: {
        duration:  0.01,           // essentially instant
        ease:      "none",
        y:         0, x: 0,        // no movement
        scale:     1,
        clipPath:  "none",
        filter:    "none",
      },
      // Transitions that are ok to keep (informational)
      allowedTransitions: ["opacity"],
    },
    splitType: {
      disabled:  true,             // don't split text — just fade whole element
    },
    webgl: {
      disabled:  true,             // no WebGL under reduced motion
    },
    cursor: {
      disabled:  true,             // revert to native cursor
    },
    particles: {
      disabled:  true,
    },
    ripple: {
      disabled:  true,
    },
    smoothScroll: {
      disabled:  true,             // native scroll behavior
    },
  },
};

// ── Frame budget config ────────────────────────────────────────────────────

const FRAME_BUDGET = {
  targetFPS:          60,
  // Scheduled tasks (non-critical work deferred to idle time)
  scheduler:          "requestIdleCallback",
  // Expensive operations that must yield to paint
  yieldToPaint:       ["shader compilation", "particle initialization", "texture upload"],
  // GSAP ticker config
  gsapTicker: {
    fps:           60,
    lagSmoothing:  150,            // ignore lag spikes under 150ms (300 was too permissive)
    sleep:         true,           // pause ticker when tab is inactive
  },
};

// ── Will-change policy ────────────────────────────────────────────────────

const WILL_CHANGE = {
  // Add will-change: transform BEFORE animation starts
  addBeforeAnimation: true,
  // Remove will-change AFTER animation completes (prevents layer thrashing)
  removeAfterAnimation: true,
  // Never put will-change on these elements (too many layers)
  neverApplyTo: ["body", "html", ":root", ".page-wrapper"],
};

// ── Main export ────────────────────────────────────────────────────────────

/**
 * Build the performance configuration for a site.
 * Deterministic — same output for all sites (performance strategy is universal).
 *
 * @returns {Object} — performance block for site JSON
 */
export function buildPerformanceConfig() {
  return {
    targetFPS:             60,
    tiers:                 PERFORMANCE_TIERS,
    breakpoints:           BREAKPOINTS,
    intersectionObserver:  INTERSECTION_OBSERVER,
    reducedMotion:         REDUCED_MOTION,
    frameBudget:           FRAME_BUDGET,
    willChange:            WILL_CHANGE,
    cssFallbacks:          CSS_FALLBACKS,
    // Lazy loading strategy for WebGL (don't block LCP)
    lazyWebGL: {
      enabled:             true,
      strategy:            "afterInteractive",   // load after TTI
      idleTimeout:         2000,                 // ms after idle
      visibilityThreshold: "200px",              // start loading when 200px from view
    },
    // Paint optimization hints
    containment: {
      sections:       "content",    // CSS contain: content on each section
      cards:          "layout style",
      // Canvas overlays get strict containment — they are composited independently
      canvas:         "strict",     // CSS contain: strict on #ripple-canvas, #particle-canvas
    },
    // Properties safe for animation (no reflow)
    safeProperties:        ["transform", "opacity", "clipPath", "backdropFilter"],
    // Properties that CAUSE reflow (never animate these)
    unsafeProperties:      ["width", "height", "top", "left", "right", "bottom", "margin", "padding", "fontSize", "letterSpacing"],
    // Mobile animation simplification (applied when tier === "low" or touch device)
    mobileAnimations: {
      skipParallax:        true,    // parallaxLayer has near-zero impact on mobile
      skipParticleTrail:   true,    // canvas particle trail disabled on touch
      skipHeroPin:         true,    // ScrollTrigger pin causes jank on low-end mobile
      reducedStagger:      0.06,    // tighter stagger to finish faster
      maxDuration:         0.60,    // cap all animation durations at 600ms
      preferOpacityOnly:   true,    // fallback: replace y+scale with opacity-only fade
    },
  };
}
