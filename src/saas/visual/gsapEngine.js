/**
 * gsapEngine.js — GSAP animation timeline configs.
 *
 * Generates structured timeline descriptors that the frontend
 * consumes to construct GSAP animations. The backend defines WHAT
 * to animate and HOW; Three.js/GSAP on the frontend executes it.
 *
 * Spring physics via GSAP's elastic/back eases (not cubic-bezier).
 * All transforms use `transform` properties (no left/top — zero reflow).
 *
 * Output structure per timeline:
 * {
 *   id:            string          — unique identifier
 *   type:          "gsap" | "scrollTrigger" | "batch" | "counter" | "pin"
 *   target:        string          — CSS selector
 *   scrollTrigger: { ... }         — ScrollTrigger config (if applicable)
 *   sequence:      [{ ... }]       — ordered animation steps
 * }
 */

// ── Spring ease presets ────────────────────────────────────────────────────
// Maps a spring feel to a GSAP ease string + duration multiplier.

const SPRINGS = {
  // Heavy spring — slow release, satisfying settle
  heavy:     { ease: "elastic.out(0.8, 0.55)", durationMult: 1.4 },
  // Standard spring — natural feel for most UI elements
  standard:  { ease: "elastic.out(1, 0.65)",   durationMult: 1.0 },
  // Light spring — quick snap with slight overshoot
  light:     { ease: "back.out(1.7)",           durationMult: 0.85 },
  // Micro spring — subtle, for small movements
  micro:     { ease: "back.out(2.2)",           durationMult: 0.65 },
  // Entry deceleration — no bounce, heavy power curve
  entry:     { ease: "power4.out",              durationMult: 0.90 },
  // Exit — fast start, hard stop
  exit:      { ease: "power3.in",               durationMult: 0.70 },
  // Smooth — sinusoidal, organic
  smooth:    { ease: "sine.inOut",              durationMult: 1.10 },
};

// ── Niche timing profiles ──────────────────────────────────────────────────
// Controls overall feel: speed, spring type, stagger rhythm.

const NICHE_TIMING = {
  odontologia: {
    heroSpring:       SPRINGS.standard,
    heroDuration:     1.10,
    revealSpring:     SPRINGS.light,
    revealDuration:   0.75,
    stagger:          0.12,
    scrollScrub:      1.5,
    cardSpring:       SPRINGS.micro,
    countDuration:    2.2,
  },
  clinica: {
    heroSpring:       SPRINGS.entry,
    heroDuration:     1.00,
    revealSpring:     SPRINGS.light,
    revealDuration:   0.72,
    stagger:          0.11,
    scrollScrub:      1.2,
    cardSpring:       SPRINGS.micro,
    countDuration:    2.0,
  },
  restaurante: {
    heroSpring:       SPRINGS.smooth,
    heroDuration:     1.20,
    revealSpring:     SPRINGS.standard,
    revealDuration:   0.85,
    stagger:          0.15,
    scrollScrub:      2.0,
    cardSpring:       SPRINGS.light,
    countDuration:    1.8,
  },
  petshop: {
    heroSpring:       SPRINGS.heavy,
    heroDuration:     1.00,
    revealSpring:     SPRINGS.standard,
    revealDuration:   0.80,
    stagger:          0.14,
    scrollScrub:      1.0,
    cardSpring:       SPRINGS.standard,
    countDuration:    1.6,
  },
  beleza: {
    heroSpring:       SPRINGS.smooth,
    heroDuration:     1.30,
    revealSpring:     SPRINGS.smooth,
    revealDuration:   0.90,
    stagger:          0.18,
    scrollScrub:      2.5,
    cardSpring:       SPRINGS.light,
    countDuration:    2.0,
  },
  servicos: {
    heroSpring:       SPRINGS.entry,
    heroDuration:     0.95,
    revealSpring:     SPRINGS.micro,
    revealDuration:   0.68,
    stagger:          0.10,
    scrollScrub:      1.2,
    cardSpring:       SPRINGS.micro,
    countDuration:    1.8,
  },
  fitness: {
    heroSpring:       SPRINGS.light,
    heroDuration:     0.75,
    revealSpring:     SPRINGS.light,
    revealDuration:   0.55,
    stagger:          0.08,
    scrollScrub:      0.8,
    cardSpring:       SPRINGS.micro,
    countDuration:    1.4,
  },
  educacao: {
    heroSpring:       SPRINGS.standard,
    heroDuration:     1.00,
    revealSpring:     SPRINGS.smooth,
    revealDuration:   0.80,
    stagger:          0.13,
    scrollScrub:      1.5,
    cardSpring:       SPRINGS.light,
    countDuration:    2.0,
  },
  oficina: {
    heroSpring:       SPRINGS.heavy,
    heroDuration:     0.90,
    revealSpring:     SPRINGS.light,
    revealDuration:   0.65,
    stagger:          0.09,
    scrollScrub:      1.0,
    cardSpring:       SPRINGS.micro,
    countDuration:    1.5,
  },
  generico: {
    heroSpring:       SPRINGS.standard,
    heroDuration:     1.00,
    revealSpring:     SPRINGS.light,
    revealDuration:   0.75,
    stagger:          0.12,
    scrollScrub:      1.5,
    cardSpring:       SPRINGS.micro,
    countDuration:    2.0,
  },
};

// ── Section-type → animation builder ──────────────────────────────────────

function heroEntrance(sectionType, timing) {
  const isBold    = sectionType === "hero_statement";
  const isStory   = sectionType === "hero_story";
  const isProof   = sectionType === "hero_social_proof";
  const { ease, durationMult } = timing.heroSpring;
  const d = timing.heroDuration * durationMult;

  const sequence = [];

  if (isProof) {
    // Social proof opens with the customer result, then the headline
    sequence.push(
      { target: ".hero-proof-quote", from: { y: 40, opacity: 0, scale: 0.96 }, to: { y: 0, opacity: 1, scale: 1, duration: d * 0.7, ease }, position: 0 },
      { target: ".hero-headline",    from: { y: 60, opacity: 0 }, to: { y: 0, opacity: 1, duration: d, ease: SPRINGS.entry.ease }, position: 0.4 },
    );
  } else if (isStory) {
    // Story hero: text wipes in like being read (clipPath = GPU-only, no reflow)
    sequence.push(
      { target: ".hero-story-hook", from: { opacity: 0, clipPath: "inset(0% 100% 0% 0%)" }, to: { opacity: 1, clipPath: "inset(0% 0% 0% 0%)", duration: d * 1.1, ease: SPRINGS.smooth.ease }, position: 0 },
      { target: ".hero-headline",   from: { y: 50, opacity: 0 }, to: { y: 0, opacity: 1, duration: d, ease }, position: 0.5 },
    );
  } else if (isBold) {
    // Bold statement: clips in from the bottom, dramatic
    sequence.push(
      { target: ".hero-headline", from: { y: "100%", clipPath: "inset(100% 0 0 0)" }, to: { y: "0%", clipPath: "inset(0% 0 0 0)", duration: d, ease: SPRINGS.entry.ease }, position: 0 },
    );
  } else {
    // Standard hero entrance
    sequence.push(
      { target: ".hero-headline", from: { y: 70, opacity: 0 }, to: { y: 0, opacity: 1, duration: d, ease }, position: 0 },
    );
  }

  // Shared elements after headline
  sequence.push(
    { target: ".hero-subheadline", from: { y: 40, opacity: 0 }, to: { y: 0, opacity: 1, duration: d * 0.85, ease: SPRINGS.entry.ease }, position: d * 0.35 },
    { target: ".hero-cta-primary",  from: { scale: 0.85, opacity: 0 }, to: { scale: 1, opacity: 1, duration: d * 0.65, ease: SPRINGS.light.ease }, position: d * 0.60 },
    { target: ".hero-cta-secondary",from: { x: -20, opacity: 0 }, to: { x: 0, opacity: 1, duration: d * 0.60, ease: SPRINGS.entry.ease }, position: d * 0.70 },
    { target: ".hero-trust-badge",  from: { y: 20, opacity: 0 }, to: { y: 0, opacity: 1, duration: d * 0.55, ease: SPRINGS.smooth.ease }, position: d * 0.80 },
  );

  return {
    id:   `${sectionType}-entrance`,
    type: "gsap",
    description: "Hero section entrance — plays once on page load",
    target:   ".hero-section",
    delay:    0.15,
    sequence,
  };
}

function scrollRevealBatch(timing) {
  return {
    id:          "scroll-reveal-batch",
    type:        "batch",
    description: "Staggered reveal of all content blocks on scroll",
    targets:     ".reveal-block",
    scrollTrigger: {
      type:      "batch",
      start:     "top 88%",
      once:      true,
    },
    from: { y: 55, opacity: 0, scale: 0.97 },
    to:   {
      y: 0, opacity: 1, scale: 1,
      duration: timing.revealDuration,
      ease:     timing.revealSpring.ease,
      stagger:  timing.stagger,
    },
  };
}

function parallaxLayer(timing) {
  return {
    id:          "hero-image-parallax",
    type:        "scrollTrigger",
    description: "Hero image parallax on scroll — CSS transform only",
    target:      ".hero-image-layer",
    scrollTrigger: {
      trigger:   ".hero-section",
      start:     "top top",
      end:       "bottom top",
      scrub:     timing.scrollScrub,
    },
    to: { y: "22%", ease: "none" },
  };
}

function statsCounter(timing) {
  return {
    id:          "stats-counter",
    type:        "counter",
    description: "Animate stat numbers from 0 when they scroll into view",
    targets:     ".stat-number",
    scrollTrigger: {
      trigger:   ".stats-section",
      start:     "top 82%",
      once:      true,
    },
    duration:    timing.countDuration,
    ease:        "power2.inOut",
    stagger:     0.18,
  };
}

function serviceCardsStagger(sectionType, timing) {
  const isFeatured = sectionType === "services_featured";
  const isAccordion = sectionType === "services_accordion";

  if (isAccordion) {
    return {
      id:     "services-accordion-reveal",
      type:   "scrollTrigger",
      target: ".accordion-item",
      scrollTrigger: { trigger: ".services-section", start: "top 80%", once: true },
      from: { x: -30, opacity: 0 },
      to:   { x: 0, opacity: 1, duration: timing.revealDuration, ease: timing.revealSpring.ease, stagger: 0.10 },
    };
  }

  if (isFeatured) {
    return {
      id:     "services-featured-reveal",
      type:   "gsap",
      target: ".services-section",
      sequence: [
        { target: ".service-featured-card", from: { y: 60, opacity: 0, scale: 0.94 }, to: { y: 0, opacity: 1, scale: 1, duration: timing.heroDuration, ease: timing.heroSpring.ease }, position: 0 },
        { target: ".service-supporting-card", from: { y: 40, opacity: 0 }, to: { y: 0, opacity: 1, duration: timing.revealDuration, ease: timing.revealSpring.ease, stagger: timing.stagger }, position: 0.4 },
      ],
      scrollTrigger: { trigger: ".services-section", start: "top 80%", once: true },
    };
  }

  return {
    id:     "services-grid-stagger",
    type:   "scrollTrigger",
    target: ".service-card",
    scrollTrigger: { trigger: ".services-section", start: "top 80%", once: true },
    from: { y: 50, opacity: 0, scale: 0.95 },
    to:   { y: 0, opacity: 1, scale: 1, duration: timing.revealDuration, ease: timing.cardSpring.ease, stagger: timing.stagger },
  };
}

function teamReveal(sectionType, timing) {
  const isFeatured = sectionType === "team_featured";

  if (isFeatured) {
    return {
      id:     "team-featured-reveal",
      type:   "gsap",
      target: ".team-section",
      scrollTrigger: { trigger: ".team-section", start: "top 78%", once: true },
      sequence: [
        { target: ".team-featured-member", from: { scale: 0.92, opacity: 0, rotateY: 8 }, to: { scale: 1, opacity: 1, rotateY: 0, duration: 1.0, ease: SPRINGS.standard.ease, transformPerspective: 800 }, position: 0 },
        { target: ".team-member-card",     from: { y: 35, opacity: 0 }, to: { y: 0, opacity: 1, duration: timing.revealDuration, ease: timing.cardSpring.ease, stagger: timing.stagger }, position: 0.35 },
      ],
    };
  }

  return {
    id:     "team-grid-stagger",
    type:   "scrollTrigger",
    target: ".team-member-card",
    scrollTrigger: { trigger: ".team-section", start: "top 80%", once: true },
    from: { y: 50, opacity: 0, scale: 0.94 },
    to:   { y: 0, opacity: 1, scale: 1, duration: timing.revealDuration, ease: timing.cardSpring.ease, stagger: timing.stagger },
  };
}

function testimonialsReveal(sectionType, timing) {
  if (sectionType === "testimonials_featured") {
    return {
      id:     "testimonials-featured-reveal",
      type:   "gsap",
      target: ".testimonials-section",
      scrollTrigger: { trigger: ".testimonials-section", start: "top 80%", once: true },
      sequence: [
        { target: ".testimonial-featured", from: { y: 60, opacity: 0, scale: 0.95 }, to: { y: 0, opacity: 1, scale: 1, duration: 1.0, ease: SPRINGS.standard.ease }, position: 0 },
        { target: ".testimonial-short",    from: { x: 30, opacity: 0 }, to: { x: 0, opacity: 1, duration: 0.7, ease: SPRINGS.light.ease, stagger: 0.18 }, position: 0.4 },
      ],
    };
  }

  if (sectionType === "testimonials_story") {
    return {
      id:     "testimonials-story-reveal",
      type:   "scrollTrigger",
      target: ".testimonial-story-card",
      scrollTrigger: { trigger: ".testimonials-section", start: "top 80%", once: true },
      from: { y: 60, opacity: 0, clipPath: "inset(8% 0 0 0 round 12px)" },
      to:   { y: 0, opacity: 1, clipPath: "inset(0% 0 0 0 round 12px)", duration: 0.85, ease: SPRINGS.entry.ease, stagger: 0.20 },
    };
  }

  return {
    id:     "testimonials-reveal",
    type:   "scrollTrigger",
    target: ".testimonial-card",
    scrollTrigger: { trigger: ".testimonials-section", start: "top 80%", once: true },
    from: { y: 50, opacity: 0 },
    to:   { y: 0, opacity: 1, duration: timing.revealDuration, ease: timing.revealSpring.ease, stagger: timing.stagger },
  };
}

function ctaEntrance(sectionType, timing) {
  const isSteps = sectionType === "steps_cta";

  if (isSteps) {
    return {
      id:     "steps-cta-reveal",
      type:   "gsap",
      target: ".cta-section",
      scrollTrigger: { trigger: ".cta-section", start: "top 80%", once: true },
      sequence: [
        { target: ".cta-title",    from: { y: 40, opacity: 0 }, to: { y: 0, opacity: 1, duration: 0.80, ease: SPRINGS.entry.ease }, position: 0 },
        { target: ".step-item",    from: { y: 35, opacity: 0, scale: 0.95 }, to: { y: 0, opacity: 1, scale: 1, duration: 0.65, ease: SPRINGS.light.ease, stagger: 0.18 }, position: 0.30 },
        { target: ".cta-button",   from: { scale: 0.85, opacity: 0 }, to: { scale: 1, opacity: 1, duration: 0.55, ease: SPRINGS.standard.ease }, position: 0.85 },
      ],
    };
  }

  return {
    id:     "booking-cta-reveal",
    type:   "scrollTrigger",
    target: ".cta-section",
    scrollTrigger: { trigger: ".cta-section", start: "top 82%", once: true },
    from: { y: 50, opacity: 0 },
    to:   { y: 0, opacity: 1, duration: timing.heroDuration, ease: timing.heroSpring.ease },
  };
}

function galleryReveal(sectionType, timing) {
  const isMasonry = sectionType === "image_gallery";

  return {
    id:      isMasonry ? "gallery-masonry-reveal" : "gallery-grid-reveal",
    type:    "scrollTrigger",
    target:  ".gallery-item",
    scrollTrigger: { trigger: ".gallery-section", start: "top 82%", once: true },
    from: { scale: 0.90, opacity: 0, y: 30 },
    to:   {
      scale: 1, opacity: 1, y: 0,
      duration: 0.75,
      ease:     SPRINGS.light.ease,
      stagger:  { amount: 0.6, from: "start" },  // GSAP stagger object
    },
  };
}

function beforeAfterReveal(sectionType, timing) {
  return {
    id:     "before-after-reveal",
    type:   "scrollTrigger",
    target: ".before-after-case",
    scrollTrigger: { trigger: ".before-after-section", start: "top 78%", once: true },
    from: { opacity: 0, scale: 0.93, y: 40 },
    to:   { opacity: 1, scale: 1, y: 0, duration: 0.85, ease: SPRINGS.standard.ease, stagger: 0.22 },
  };
}

// ── Page-level pin (optional, for premium feel) ───────────────────────────

function heroPin(enabled) {
  if (!enabled) return null;
  return {
    id:     "hero-pin",
    type:   "pin",
    target: ".hero-section",
    scrollTrigger: {
      trigger:   ".hero-section",
      pin:       true,
      pinSpacing: false,
      start:     "top top",
      end:       "+=60%",
      scrub:     true,
    },
    // Fade out hero content as user scrolls into next section
    fadeOut: {
      target:   ".hero-content",
      scrub:    true,
      from:     { opacity: 1, scale: 1 },
      to:       { opacity: 0, scale: 0.95, ease: "none" },
    },
  };
}

// ── Hero section type detector ─────────────────────────────────────────────

function findHeroSectionType(pages) {
  for (const page of (pages || [])) {
    for (const section of (page.sections || [])) {
      if (section.type?.startsWith("hero")) return section.type;
    }
  }
  return "hero";
}

// ── Map section types → animation builders ────────────────────────────────

const SECTION_ANIMATION_MAP = {
  "hero":              (t) => heroEntrance("hero", t),
  "hero_statement":    (t) => heroEntrance("hero_statement", t),
  "hero_story":        (t) => heroEntrance("hero_story", t),
  "hero_social_proof": (t) => heroEntrance("hero_social_proof", t),
  "trust_bar":         (t) => scrollRevealBatch(t),
  "stats_showcase":    (t) => statsCounter(t),
  "impact_numbers":    (t) => statsCounter(t),
  "services_grid":     (t) => serviceCardsStagger("services_grid", t),
  "services_featured": (t) => serviceCardsStagger("services_featured", t),
  "services_accordion":(t) => serviceCardsStagger("services_accordion", t),
  "team_grid":         (t) => teamReveal("team_grid", t),
  "team_featured":     (t) => teamReveal("team_featured", t),
  "testimonials":           (t) => testimonialsReveal("testimonials", t),
  "testimonials_story":     (t) => testimonialsReveal("testimonials_story", t),
  "testimonials_featured":  (t) => testimonialsReveal("testimonials_featured", t),
  "booking_cta":       (t) => ctaEntrance("booking_cta", t),
  "steps_cta":         (t) => ctaEntrance("steps_cta", t),
  "image_gallery":     (t) => galleryReveal("image_gallery", t),
  "image_grid":        (t) => galleryReveal("image_grid", t),
  "before_after_gallery": (t) => beforeAfterReveal("before_after_gallery", t),
  "before_after_slider":  (t) => beforeAfterReveal("before_after_slider", t),
};

/**
 * Build the complete GSAP animation config for a site.
 *
 * Output shape:
 * {
 *   hero:     { entrance, parallax (desktopOnly), pin }
 *   sections: [ scrollRevealBatch, ...per-section timelines ]
 * }
 *
 * @param {string}   category  — niche category
 * @param {Array}    pages     — pages array from nicheContent
 * @param {boolean}  pinHero   — whether to pin hero section (premium)
 * @returns {Object}           — animations block for site JSON
 */
export function buildGsapConfig(category, pages, pinHero = false) {
  const timing = NICHE_TIMING[category] || NICHE_TIMING.generico;
  const seen   = new Set();

  // ── Hero group ─────────────────────────────────────────────────────────────
  const heroType    = findHeroSectionType(pages);
  const heroBuilder = SECTION_ANIMATION_MAP[heroType] ?? ((t) => heroEntrance(heroType, t));
  seen.add(heroType);

  const hero = {
    entrance: heroBuilder(timing),
    // desktopOnly: parallax causes jank on touch devices — skipped via mobileAnimations.skipParallax
    parallax: { ...parallaxLayer(timing), desktopOnly: true },
    pin:      heroPin(pinHero) || null,
  };

  // ── Sections group ─────────────────────────────────────────────────────────
  // Global scroll reveal always first — applies to all .reveal-block elements
  const sections = [scrollRevealBatch(timing)];

  for (const page of (pages || [])) {
    for (const section of (page.sections || [])) {
      const type    = section.type;
      const builder = SECTION_ANIMATION_MAP[type];
      if (builder && !seen.has(type)) {
        sections.push(builder(timing));
        seen.add(type);
      }
    }
  }

  return {
    engine:  "gsap",
    version: "3.12",
    plugins: ["ScrollTrigger", "CustomEase"],
    defaults: {
      ease:       timing.revealSpring.ease,
      duration:   timing.revealDuration,
      overwrite:  "auto",
      force3D:    true,            // GPU compositing — avoid CPU repaints
      willChange: "transform, opacity",
    },
    scrollTrigger_defaults: {
      toggleActions: "play none none none",
      markers:       false,
    },
    hero,
    sections,
    // Axes forbidden from animation (prevent layout reflow)
    forbidden_properties: ["left", "top", "right", "bottom", "width", "height", "margin", "padding", "letterSpacing"],
    allowed_properties:   ["transform", "opacity", "clipPath", "scale"],
  };
}
