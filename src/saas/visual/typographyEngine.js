/**
 * typographyEngine.js — SplitType animation configs.
 *
 * Generates SplitType configurations for kinetic typography effects.
 * SplitType splits text into chars/words/lines; GSAP then animates each.
 *
 * Effects:
 *   char_reveal   — chars animate in from below with clip-path
 *   word_float    — words float up from opacity 0
 *   line_slide    — lines slide in from left/right
 *   kinetic       — chars animate individually with varying speeds
 *   compress      — text starts wide (letter-spacing) and compresses into place
 *   scramble      — chars cycle through random chars before settling (via GSAP ScrambleText)
 *
 * Performance: animations use transform + opacity only (no reflow).
 * SplitType automatically handles resize (re-splits on window resize).
 */

// ── Effect library ─────────────────────────────────────────────────────────

const EFFECTS = {

  char_reveal: {
    id:          "char_reveal",
    splitBy:     "chars lines",
    parentOverflow: "hidden",      // parent must clip overflowing chars
    from: {
      y:          "110%",          // chars start below the clip boundary
      opacity:    1,               // opacity stays — clipping hides them
      rotateX:    8,               // slight 3D tilt for depth
    },
    to: {
      y:          "0%",
      rotateX:    0,
      ease:       "expo.out",
      stagger:    { amount: 0.55, from: "start" },
      duration:   0.85,
    },
    willChange:  "transform",
  },

  word_float: {
    id:          "word_float",
    splitBy:     "words",
    // No blur — animating filter:blur() triggers paint on every frame.
    // y + opacity alone is fully GPU-compositable.
    from: {
      y:          40,
      opacity:    0,
    },
    to: {
      y:          0,
      opacity:    1,
      ease:       "power3.out",
      stagger:    { amount: 0.45, from: "start" },
      duration:   0.70,
    },
    willChange:  "transform, opacity",
  },

  line_slide: {
    id:          "line_slide",
    splitBy:     "lines",
    parentOverflow: "hidden",
    from: {
      xPercent:  -101,             // slides from left, hidden by clip
      opacity:   1,
    },
    to: {
      xPercent:  0,
      ease:      "expo.out",
      stagger:   0.12,
      duration:  0.90,
    },
    willChange:  "transform",
  },

  kinetic: {
    id:          "kinetic",
    splitBy:     "chars",
    // Each char gets an individual stagger based on index (odd faster, even slower)
    from: {
      y:          (i) => i % 2 === 0 ? -30 : 30,  // alternating direction
      opacity:    0,
      scale:      (i) => 0.7 + (i % 3) * 0.15,
    },
    to: {
      y:          0,
      opacity:    1,
      scale:      1,
      ease:       "elastic.out(1, 0.6)",
      stagger:    {
        amount:   0.80,
        from:     "center",        // chars animate from center outward
        ease:     "power1.inOut",
      },
      duration:   1.1,
    },
    willChange:  "transform, opacity",
  },

  compress: {
    id:          "compress",
    splitBy:     "words",
    // scaleX replaces letterSpacing: same "wide → tight" feel, zero reflow.
    // letterSpacing triggers full layout reflow on every frame.
    from: {
      scaleX:     1.18,
      opacity:    0,
      y:          20,
      transformOrigin: "center center",
    },
    to: {
      scaleX:     1.0,
      opacity:    1,
      y:          0,
      ease:       "power4.out",
      stagger:    0.08,
      duration:   1.0,
    },
    willChange:  "transform, opacity",
  },

  scramble: {
    id:          "scramble",
    splitBy:     "chars",
    plugin:      "ScrambleText",   // requires GSAP ScrambleText plugin
    to: {
      duration:    1.2,
      scrambleText: {
        text:        "{original}",
        chars:       "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
        revealDelay: 0.4,
        speed:       0.4,
      },
      ease:        "none",
      stagger:     0.03,
    },
    fallback:    "word_float",     // if ScrambleText plugin not loaded
  },

};

// ── Selector → element type mapping ────────────────────────────────────────
// Maps common CSS selectors to the DOM elements they target.
// Frontend uses these to apply SplitType to the right elements.

const SELECTORS = {
  heading:     ["h1", "h2", "h3", ".hero-headline", ".section-title"],
  subheading:  [".hero-subheadline", ".section-subtitle", ".lead-text"],
  body:        [".hero-body", ".about-text", ".service-description"],
  label:       [".trust-badge", ".stat-label", ".tag"],
  cta_text:    [".cta-button span", ".hero-cta-primary span"],
};

// ── Niche × personality → effect assignment ────────────────────────────────

function assignEffects(category, personality) {
  // Map personality → preferred effects
  const PERSONALITY_EFFECTS = {
    "caloroso":           { heading: "word_float",  body: "word_float",  label: "word_float" },
    "confiante":          { heading: "char_reveal", body: "line_slide",  label: "char_reveal" },
    "tecnico-humanizado": { heading: "compress",    body: "word_float",  label: "compress" },
    "narrativo":          { heading: "line_slide",  body: "word_float",  label: "word_float" },
    "local-comunitario":  { heading: "word_float",  body: "word_float",  label: "word_float" },
  };

  // Niche overrides for headline (hero headline is the most prominent typography)
  const NICHE_HEADLINE_OVERRIDE = {
    odontologia: "compress",      // precise, deliberate
    fitness:     "kinetic",       // energetic, dynamic
    restaurante: "word_float",    // warm, inviting
    beleza:      "char_reveal",   // elegant, revealing
    servicos:    "compress",      // crisp, authoritative
    oficina:     "char_reveal",   // strong, direct
  };

  const pEffects = PERSONALITY_EFFECTS[personality] || PERSONALITY_EFFECTS.confiante;

  return {
    heading:    NICHE_HEADLINE_OVERRIDE[category] || pEffects.heading,
    subheading: "word_float",     // always smooth for subheadings
    body:       pEffects.body,
    label:      pEffects.label,
    cta_text:   "char_reveal",    // CTA text always reveals dramatically
  };
}

// ── Main export ────────────────────────────────────────────────────────────

/**
 * Build the complete typography animation config for a site.
 *
 * @param {string} category    — niche category
 * @param {string} personality — personality id
 * @returns {Object}           — typography block for site JSON
 */
export function buildTypographyConfig(category, personality) {
  const assignment = assignEffects(category, personality);

  // Build per-selector animation descriptors
  const animations = Object.entries(assignment).map(([role, effectId]) => {
    const effect    = EFFECTS[effectId] || EFFECTS.word_float;
    const selectors = SELECTORS[role] || [];

    return {
      role,
      selectors,
      effect: {
        ...effect,
        // ScrollTrigger: text animates when entering viewport
        scrollTrigger: {
          start:       "top 88%",
          once:        true,
          toggleActions: "play none none none",
        },
      },
    };
  });

  return {
    library:    "SplitType",
    version:    "0.3.4",
    gsap:       "3.12",
    animations,
    // Global SplitType options
    options: {
      resizeDelay: 100,            // ms debounce for re-split on resize
      absolute:    false,          // relative layout (not absolute positioned)
    },
    // Reduced motion: don't split, just fade
    reducedMotion: {
      splitType:   null,
      from:        { opacity: 0 },
      to:          { opacity: 1, duration: 0.4, ease: "power1.out" },
    },
  };
}
