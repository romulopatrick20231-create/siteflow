/**
 * designKnowledge.js — Design intelligence for site generation.
 *
 * Derived from ui-ux-pro-max-skill (161 palettes, 57 typographies,
 * 161 reasoning rules) and mapped to the 20 Brazilian niches.
 *
 * Each entry provides:
 *   - palette:    Full WCAG-compliant color system (primary → border)
 *   - typography: Google Fonts pairing + CSS variables
 *   - ui:         Style, key effects, layout pattern, anti-patterns
 *   - emoji:      Niche icon
 *
 * Used by htmlBuilder.js (visual output) and nicheGenerator.js (AI prompts).
 */

// ── Design database by niche ──────────────────────────────────────────────────

export const DESIGN = {

  "Clínica Odontológica": {
    palette: {
      primary:         "#0891B2",  // calm cyan — trust + clinical
      primaryFg:       "#FFFFFF",
      secondary:       "#22D3EE",
      secondaryFg:     "#0F172A",
      accent:          "#059669",  // health green CTA
      accentFg:        "#FFFFFF",
      background:      "#ECFEFF",
      foreground:      "#164E63",
      card:            "#FFFFFF",
      cardForeground:  "#164E63",
      muted:           "#E8F1F6",
      mutedForeground: "#64748B",
      border:          "#A5F3FC",
    },
    typography: {
      name:        "Wellness Calm",
      headingFont: "Lora",
      bodyFont:    "Raleway",
      googleLink:  "https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Raleway:wght@300;400;500;600;700&display=swap",
      cssHeading:  "'Lora', Georgia, serif",
      cssBody:     "'Raleway', system-ui, sans-serif",
      mood:        "calm, wellness, health, trustworthy",
    },
    ui: {
      style:        "Soft UI Evolution + Neumorphism",
      keyEffects:   "Soft box-shadow + Smooth press (150ms) + Subtle hover lift",
      pattern:      "Social Proof-Focused + Hero-Centric",
      animations:   "gentle",
      antiPatterns: ["Bright neon colors", "Harsh animations", "Dark mode default", "AI purple/pink gradients"],
    },
    emoji: "🦷",
  },

  "Clínica Médica": {
    palette: {
      primary:         "#0369A1",  // trust blue — medical authority
      primaryFg:       "#FFFFFF",
      secondary:       "#0EA5E9",
      secondaryFg:     "#0F172A",
      accent:          "#059669",
      accentFg:        "#FFFFFF",
      background:      "#F0F9FF",
      foreground:      "#0C4A6E",
      card:            "#FFFFFF",
      cardForeground:  "#0C4A6E",
      muted:           "#E7EFF5",
      mutedForeground: "#64748B",
      border:          "#BAE6FD",
    },
    typography: {
      name:        "Corporate Trust",
      headingFont: "Lexend",
      bodyFont:    "Source Sans 3",
      googleLink:  "https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&display=swap",
      cssHeading:  "'Lexend', system-ui, sans-serif",
      cssBody:     "'Source Sans 3', system-ui, sans-serif",
      mood:        "corporate, trustworthy, accessible, professional",
    },
    ui: {
      style:        "Minimalism + Accessible & Ethical",
      keyEffects:   "Clear focus rings + Smooth transitions (200ms) + Soft hover",
      pattern:      "Trust & Authority + Social Proof",
      animations:   "gentle",
      antiPatterns: ["Bright neon", "Motion-heavy animations", "AI purple/pink gradients"],
    },
    emoji: "🏥",
  },

  "Clínica de Fisioterapia": {
    palette: {
      primary:         "#7C3AED",  // energy violet — movement + therapy
      primaryFg:       "#FFFFFF",
      secondary:       "#A78BFA",
      secondaryFg:     "#0F172A",
      accent:          "#059669",
      accentFg:        "#FFFFFF",
      background:      "#FAF5FF",
      foreground:      "#4C1D95",
      card:            "#FFFFFF",
      cardForeground:  "#4C1D95",
      muted:           "#EDEFF9",
      mutedForeground: "#64748B",
      border:          "#DDD6FE",
    },
    typography: {
      name:        "Wellness Calm",
      headingFont: "Lora",
      bodyFont:    "Raleway",
      googleLink:  "https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Raleway:wght@300;400;500;600;700&display=swap",
      cssHeading:  "'Lora', Georgia, serif",
      cssBody:     "'Raleway', system-ui, sans-serif",
      mood:        "calm, wellness, movement, energizing",
    },
    ui: {
      style:        "Soft UI Evolution + Neumorphism",
      keyEffects:   "Soft shadows + 200-300ms transitions + Gentle hover states",
      pattern:      "Social Proof-Focused + Feature-Rich",
      animations:   "gentle",
      antiPatterns: ["Harsh animations", "Dark default", "Overly clinical look"],
    },
    emoji: "💪",
  },

  "Consultório de Nutrição": {
    palette: {
      primary:         "#059669",  // health green — natural + vitality
      primaryFg:       "#FFFFFF",
      secondary:       "#10B981",
      secondaryFg:     "#0F172A",
      accent:          "#F59E0B",  // warm amber CTA
      accentFg:        "#0F172A",
      background:      "#ECFDF5",
      foreground:      "#064E3B",
      card:            "#FFFFFF",
      cardForeground:  "#064E3B",
      muted:           "#E8F1F3",
      mutedForeground: "#64748B",
      border:          "#A7F3D0",
    },
    typography: {
      name:        "Wellness Calm",
      headingFont: "Lora",
      bodyFont:    "Raleway",
      googleLink:  "https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Raleway:wght@300;400;500;600;700&display=swap",
      cssHeading:  "'Lora', Georgia, serif",
      cssBody:     "'Raleway', system-ui, sans-serif",
      mood:        "natural, organic, healthy, calming",
    },
    ui: {
      style:        "Soft UI Evolution + Minimalism",
      keyEffects:   "Soft press (150-200ms) + Breathing animation + Nature-inspired reveals",
      pattern:      "Hero-Centric + Social Proof",
      animations:   "gentle",
      antiPatterns: ["Neon colors", "Harsh transitions", "Corporate sterility"],
    },
    emoji: "🥗",
  },

  "Clínica Veterinária": {
    palette: {
      primary:         "#F97316",  // playful orange — warm + caring
      primaryFg:       "#0F172A",
      secondary:       "#FB923C",
      secondaryFg:     "#0F172A",
      accent:          "#2563EB",  // trust blue CTA
      accentFg:        "#FFFFFF",
      background:      "#FFF7ED",
      foreground:      "#9A3412",
      card:            "#FFFFFF",
      cardForeground:  "#9A3412",
      muted:           "#F1F0F0",
      mutedForeground: "#64748B",
      border:          "#FED7AA",
    },
    typography: {
      name:        "Soft Rounded",
      headingFont: "Varela Round",
      bodyFont:    "Nunito Sans",
      googleLink:  "https://fonts.googleapis.com/css2?family=Varela+Round&family=Nunito+Sans:wght@300;400;500;600;700&display=swap",
      cssHeading:  "'Varela Round', system-ui, sans-serif",
      cssBody:     "'Nunito Sans', system-ui, sans-serif",
      mood:        "soft, rounded, friendly, warm, playful",
    },
    ui: {
      style:        "Claymorphism + Vibrant & Block-based",
      keyEffects:   "Fluffy hover (200ms) + Soft drop shadow + Playful scale",
      pattern:      "Storytelling + Feature-Rich",
      animations:   "playful",
      antiPatterns: ["Generic design", "Cold clinical look", "No personality"],
    },
    emoji: "🐾",
  },

  "Farmácia": {
    palette: {
      primary:         "#0D9488",  // teal — health + trust
      primaryFg:       "#FFFFFF",
      secondary:       "#14B8A6",
      secondaryFg:     "#0F172A",
      accent:          "#F59E0B",
      accentFg:        "#0F172A",
      background:      "#F0FDFA",
      foreground:      "#134E4A",
      card:            "#FFFFFF",
      cardForeground:  "#134E4A",
      muted:           "#E8F1F4",
      mutedForeground: "#64748B",
      border:          "#99F6E4",
    },
    typography: {
      name:        "Corporate Trust",
      headingFont: "Lexend",
      bodyFont:    "Source Sans 3",
      googleLink:  "https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&display=swap",
      cssHeading:  "'Lexend', system-ui, sans-serif",
      cssBody:     "'Source Sans 3', system-ui, sans-serif",
      mood:        "trustworthy, accessible, professional, clear",
    },
    ui: {
      style:        "Minimalism + Accessible & Ethical",
      keyEffects:   "Quick actions (150ms) + Clear hover states + Smooth transitions",
      pattern:      "Feature-Rich + Conversion",
      animations:   "subtle",
      antiPatterns: ["Neon colors", "Complex animations", "Poor contrast"],
    },
    emoji: "💊",
  },

  "Salão de Beleza": {
    palette: {
      primary:         "#BE185D",  // deep rose — beauty + elegance
      primaryFg:       "#FFFFFF",
      secondary:       "#EC4899",
      secondaryFg:     "#FFFFFF",
      accent:          "#D4AF37",  // gold — premium
      accentFg:        "#0F172A",
      background:      "#FDF2F8",
      foreground:      "#831843",
      card:            "#FFFFFF",
      cardForeground:  "#831843",
      muted:           "#F1EEF5",
      mutedForeground: "#64748B",
      border:          "#FBCFE8",
    },
    typography: {
      name:        "Classic Elegant",
      headingFont: "Playfair Display",
      bodyFont:    "Inter",
      googleLink:  "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap",
      cssHeading:  "'Playfair Display', Georgia, serif",
      cssBody:     "'Inter', system-ui, sans-serif",
      mood:        "elegant, luxury, sophisticated, premium, feminine",
    },
    ui: {
      style:        "Soft UI Evolution + Neumorphism",
      keyEffects:   "Soft shadows + Smooth transitions (200-300ms) + Gold accent hover + Gentle parallax",
      pattern:      "Hero-Centric + Social Proof + Gallery",
      animations:   "elegant",
      antiPatterns: ["Bright neon", "Harsh animations", "Dark mode", "Corporate coldness"],
    },
    emoji: "💇",
  },

  "Barbearia": {
    palette: {
      primary:         "#1C1917",  // premium dark — masculine + bold
      primaryFg:       "#FFFFFF",
      secondary:       "#44403C",
      secondaryFg:     "#FFFFFF",
      accent:          "#D97706",  // amber gold — premium craft
      accentFg:        "#0F172A",
      background:      "#FAFAF9",
      foreground:      "#0C0A09",
      card:            "#FFFFFF",
      cardForeground:  "#0C0A09",
      muted:           "#F1EEF0",
      mutedForeground: "#64748B",
      border:          "#D6D3D1",
    },
    typography: {
      name:        "Bold Statement",
      headingFont: "Bebas Neue",
      bodyFont:    "Source Sans 3",
      googleLink:  "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Source+Sans+3:wght@300;400;500;600;700&display=swap",
      cssHeading:  "'Bebas Neue', Impact, sans-serif",
      cssBody:     "'Source Sans 3', system-ui, sans-serif",
      mood:        "bold, masculine, strong, craft, premium",
    },
    ui: {
      style:        "Minimalism + Dark Mode selective",
      keyEffects:   "Sharp hover (150ms) + Bold scale + Dramatic reveals + Strong contrast",
      pattern:      "Hero-Centric + Social Proof",
      animations:   "bold",
      antiPatterns: ["Soft pastels", "Feminine aesthetics", "Generic templates"],
    },
    emoji: "✂️",
  },

  "Clínica de Estética": {
    palette: {
      primary:         "#9333EA",  // luxury purple — sophistication
      primaryFg:       "#FFFFFF",
      secondary:       "#A855F7",
      secondaryFg:     "#FFFFFF",
      accent:          "#D4AF37",  // gold
      accentFg:        "#0F172A",
      background:      "#FAF5FF",
      foreground:      "#6B21A8",
      card:            "#FFFFFF",
      cardForeground:  "#6B21A8",
      muted:           "#F3F0F9",
      mutedForeground: "#64748B",
      border:          "#E9D5FF",
    },
    typography: {
      name:        "Luxury Serif",
      headingFont: "Cormorant",
      bodyFont:    "Montserrat",
      googleLink:  "https://fonts.googleapis.com/css2?family=Cormorant:wght@400;500;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap",
      cssHeading:  "'Cormorant', Georgia, serif",
      cssBody:     "'Montserrat', system-ui, sans-serif",
      mood:        "luxury, high-end, refined, sophisticated, elegant",
    },
    ui: {
      style:        "Soft UI Evolution + Glassmorphism",
      keyEffects:   "Chromatic hover + Slow parallax (400ms) + Premium reveal + Gold accent glow",
      pattern:      "Storytelling + Social Proof + Gallery",
      animations:   "elegant",
      antiPatterns: ["Neon colors", "Harsh transitions", "Cheap visuals", "Busy layouts"],
    },
    emoji: "✨",
  },

  "Restaurante": {
    palette: {
      primary:         "#B45309",  // warm amber — appetite + warmth
      primaryFg:       "#FFFFFF",
      secondary:       "#D97706",
      secondaryFg:     "#0F172A",
      accent:          "#DC2626",  // appetite red CTA
      accentFg:        "#FFFFFF",
      background:      "#FFFBEB",
      foreground:      "#78350F",
      card:            "#FFFFFF",
      cardForeground:  "#78350F",
      muted:           "#FEF3C7",
      mutedForeground: "#92400E",
      border:          "#FDE68A",
    },
    typography: {
      name:        "Retro Vintage",
      headingFont: "Abril Fatface",
      bodyFont:    "Merriweather",
      googleLink:  "https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Merriweather:wght@300;400;700&display=swap",
      cssHeading:  "'Abril Fatface', Georgia, serif",
      cssBody:     "'Merriweather', Georgia, serif",
      mood:        "appetizing, warm, inviting, nostalgic, vibrant",
    },
    ui: {
      style:        "Vibrant & Block-based + Motion-Driven",
      keyEffects:   "Food image reveal (300ms) + Menu hover + Warm color transitions + Appetite-stimulating animations",
      pattern:      "Hero-Centric + Feature-Rich (menu) + Gallery",
      animations:   "vibrant",
      antiPatterns: ["Low-quality imagery", "Cold blue tones", "Cluttered menus"],
    },
    emoji: "🍽️",
  },

  "Pizzaria": {
    palette: {
      primary:         "#DC2626",  // bold red — passion + appetite
      primaryFg:       "#FFFFFF",
      secondary:       "#EF4444",
      secondaryFg:     "#FFFFFF",
      accent:          "#F59E0B",  // golden cheese yellow
      accentFg:        "#0F172A",
      background:      "#FFF5F5",
      foreground:      "#7F1D1D",
      card:            "#FFFFFF",
      cardForeground:  "#7F1D1D",
      muted:           "#FEE2E2",
      mutedForeground: "#991B1B",
      border:          "#FECACA",
    },
    typography: {
      name:        "Bold Statement",
      headingFont: "Bebas Neue",
      bodyFont:    "Source Sans 3",
      googleLink:  "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Source+Sans+3:wght@300;400;500;600;700&display=swap",
      cssHeading:  "'Bebas Neue', Impact, sans-serif",
      cssBody:     "'Source Sans 3', system-ui, sans-serif",
      mood:        "bold, energetic, appetizing, fun, passionate",
    },
    ui: {
      style:        "Vibrant & Block-based",
      keyEffects:   "Bold scale hover (200ms) + Color pop + Appetite-stimulating reveals",
      pattern:      "Hero-Centric + Conversion + Menu Showcase",
      animations:   "vibrant",
      antiPatterns: ["Muted colors", "Corporate feel", "Text-heavy pages"],
    },
    emoji: "🍕",
  },

  "Padaria": {
    palette: {
      primary:         "#92400E",  // warm bread brown — artisanal + cozy
      primaryFg:       "#FFFFFF",
      secondary:       "#B45309",
      secondaryFg:     "#FFFFFF",
      accent:          "#F59E0B",  // golden crust
      accentFg:        "#0F172A",
      background:      "#FFFBEB",
      foreground:      "#78350F",
      card:            "#FFFFFF",
      cardForeground:  "#78350F",
      muted:           "#FEF3C7",
      mutedForeground: "#92400E",
      border:          "#FDE68A",
    },
    typography: {
      name:        "Handwritten Charm",
      headingFont: "Caveat",
      bodyFont:    "Quicksand",
      googleLink:  "https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&family=Quicksand:wght@300;400;500;600;700&display=swap",
      cssHeading:  "'Caveat', cursive",
      cssBody:     "'Quicksand', system-ui, sans-serif",
      mood:        "handcrafted, personal, warm, artisanal, cozy",
    },
    ui: {
      style:        "Vibrant & Block-based + Claymorphism",
      keyEffects:   "Warm hover glow + Soft scale (200ms) + Cozy reveals",
      pattern:      "Hero-Centric + Product Showcase + Storytelling",
      animations:   "playful",
      antiPatterns: ["Cold sterile look", "Corporate aesthetic", "Harsh geometry"],
    },
    emoji: "🍞",
  },

  "Hamburgueria": {
    palette: {
      primary:         "#1C1917",  // dark premium — craft burger
      primaryFg:       "#FFFFFF",
      secondary:       "#44403C",
      secondaryFg:     "#FFFFFF",
      accent:          "#C2410C",  // bold orange-red
      accentFg:        "#FFFFFF",
      background:      "#FAFAF9",
      foreground:      "#0C0A09",
      card:            "#292524",
      cardForeground:  "#F5F5F4",
      muted:           "#3C3836",
      mutedForeground: "#A8A29E",
      border:          "#57534E",
    },
    typography: {
      name:        "Bold Statement",
      headingFont: "Bebas Neue",
      bodyFont:    "Source Sans 3",
      googleLink:  "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Source+Sans+3:wght@300;400;500;600;700&display=swap",
      cssHeading:  "'Bebas Neue', Impact, sans-serif",
      cssBody:     "'Source Sans 3', system-ui, sans-serif",
      mood:        "bold, dark, craft, premium, street-food",
    },
    ui: {
      style:        "Dark Mode selective + Brutalism lite",
      keyEffects:   "Sharp hover (150ms) + Bold contrast + Fire-red CTA pop",
      pattern:      "Hero-Centric + Product Showcase",
      animations:   "bold",
      antiPatterns: ["Pastel colors", "Soft aesthetic", "Generic fast food look"],
    },
    emoji: "🍔",
  },

  "Escritório de Advocacia": {
    palette: {
      primary:         "#0F172A",  // authoritative navy — law + trust
      primaryFg:       "#FFFFFF",
      secondary:       "#334155",
      secondaryFg:     "#FFFFFF",
      accent:          "#B45309",  // gold — justice + prestige
      accentFg:        "#FFFFFF",
      background:      "#F8FAFC",
      foreground:      "#020617",
      card:            "#FFFFFF",
      cardForeground:  "#020617",
      muted:           "#E8ECF1",
      mutedForeground: "#64748B",
      border:          "#E2E8F0",
    },
    typography: {
      name:        "Legal Professional",
      headingFont: "EB Garamond",
      bodyFont:    "Lato",
      googleLink:  "https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600;700&family=Lato:wght@300;400;700&display=swap",
      cssHeading:  "'EB Garamond', Georgia, serif",
      cssBody:     "'Lato', system-ui, sans-serif",
      mood:        "authoritative, formal, trustworthy, traditional, professional",
    },
    ui: {
      style:        "Trust & Authority + Minimalism",
      keyEffects:   "Section transitions (300ms) + Authority reveals + Credibility-first layout",
      pattern:      "Trust & Authority + Feature-Rich + Social Proof",
      animations:   "subtle",
      antiPatterns: ["Playful design", "Bright colors", "Hidden credentials", "AI purple/pink gradients"],
    },
    emoji: "⚖️",
  },

  "Escritório de Contabilidade": {
    palette: {
      primary:         "#1E293B",  // professional charcoal
      primaryFg:       "#FFFFFF",
      secondary:       "#334155",
      secondaryFg:     "#FFFFFF",
      accent:          "#0369A1",  // trust blue CTA
      accentFg:        "#FFFFFF",
      background:      "#F8FAFC",
      foreground:      "#0F172A",
      card:            "#FFFFFF",
      cardForeground:  "#0F172A",
      muted:           "#E8ECF1",
      mutedForeground: "#64748B",
      border:          "#E2E8F0",
    },
    typography: {
      name:        "Corporate Trust",
      headingFont: "Lexend",
      bodyFont:    "Source Sans 3",
      googleLink:  "https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&display=swap",
      cssHeading:  "'Lexend', system-ui, sans-serif",
      cssBody:     "'Source Sans 3', system-ui, sans-serif",
      mood:        "professional, clear, trustworthy, corporate, reliable",
    },
    ui: {
      style:        "Minimalism + Flat Design",
      keyEffects:   "Feature reveals (250ms) + Clean transitions + Data-forward layout",
      pattern:      "Feature-Rich + Trust & Authority",
      animations:   "subtle",
      antiPatterns: ["Playful colors", "Complex animations", "Hidden ROI messaging"],
    },
    emoji: "📊",
  },

  "Imobiliária": {
    palette: {
      primary:         "#0369A1",  // trust blue — reliability + property
      primaryFg:       "#FFFFFF",
      secondary:       "#0EA5E9",
      secondaryFg:     "#0F172A",
      accent:          "#D4AF37",  // gold — premium property
      accentFg:        "#0F172A",
      background:      "#F0F9FF",
      foreground:      "#0C4A6E",
      card:            "#FFFFFF",
      cardForeground:  "#0C4A6E",
      muted:           "#E7EFF5",
      mutedForeground: "#64748B",
      border:          "#BAE6FD",
    },
    typography: {
      name:        "Modern Professional",
      headingFont: "Poppins",
      bodyFont:    "Open Sans",
      googleLink:  "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Open+Sans:wght@300;400;500;600;700&display=swap",
      cssHeading:  "'Poppins', system-ui, sans-serif",
      cssBody:     "'Open Sans', system-ui, sans-serif",
      mood:        "modern, professional, confident, trustworthy",
    },
    ui: {
      style:        "Glassmorphism + Minimalism",
      keyEffects:   "Property card hover lift (200ms) + Map integration + 3D property zoom feel",
      pattern:      "Hero-Centric + Feature-Rich + Social Proof",
      animations:   "smooth",
      antiPatterns: ["Poor photos", "Hidden pricing", "Complex navigation"],
    },
    emoji: "🏠",
  },

  "Academia / Studio Fitness": {
    palette: {
      primary:         "#DC2626",  // energetic red — power + action
      primaryFg:       "#FFFFFF",
      secondary:       "#EF4444",
      secondaryFg:     "#FFFFFF",
      accent:          "#F97316",  // orange energy
      accentFg:        "#FFFFFF",
      background:      "#0F0F0F",  // dark — gym intensity
      foreground:      "#F8FAFC",
      card:            "#1C1C1C",
      cardForeground:  "#F8FAFC",
      muted:           "#2D2D2D",
      mutedForeground: "#94A3B8",
      border:          "#374151",
    },
    typography: {
      name:        "Bold Statement",
      headingFont: "Bebas Neue",
      bodyFont:    "Source Sans 3",
      googleLink:  "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Source+Sans+3:wght@300;400;500;600;700&display=swap",
      cssHeading:  "'Bebas Neue', Impact, sans-serif",
      cssBody:     "'Source Sans 3', system-ui, sans-serif",
      mood:        "bold, motivational, energetic, powerful, impactful",
    },
    ui: {
      style:        "Dark Mode (OLED) + Vibrant & Block-based",
      keyEffects:   "Progress ring animations + Achievement unlocks + Bold scale (150ms) + Energy pulse",
      pattern:      "Hero-Centric + Feature-Rich + Social Proof",
      animations:   "bold",
      antiPatterns: ["Pastel colors", "Soft aesthetics", "No gamification", "Static design"],
    },
    emoji: "🏋️",
  },

  "Escola / Curso": {
    palette: {
      primary:         "#4F46E5",  // indigo — knowledge + depth
      primaryFg:       "#FFFFFF",
      secondary:       "#818CF8",
      secondaryFg:     "#0F172A",
      accent:          "#F97316",  // orange — energy + action
      accentFg:        "#FFFFFF",
      background:      "#EEF2FF",
      foreground:      "#1E1B4B",
      card:            "#FFFFFF",
      cardForeground:  "#1E1B4B",
      muted:           "#EBEEF8",
      mutedForeground: "#64748B",
      border:          "#C7D2FE",
    },
    typography: {
      name:        "Geometric Modern",
      headingFont: "Outfit",
      bodyFont:    "Work Sans",
      googleLink:  "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Work+Sans:wght@300;400;500;600;700&display=swap",
      cssHeading:  "'Outfit', system-ui, sans-serif",
      cssBody:     "'Work Sans', system-ui, sans-serif",
      mood:        "modern, clear, friendly, engaging, contemporary",
    },
    ui: {
      style:        "Claymorphism + Micro-interactions",
      keyEffects:   "Soft press (200ms) + Progress animation + Engaging reveals + Friendly bounce",
      pattern:      "Feature-Rich + Social Proof + Trust & Authority",
      animations:   "playful",
      antiPatterns: ["Dark mode", "Complex jargon", "Overwhelming information"],
    },
    emoji: "📚",
  },

  "Oficina Mecânica": {
    palette: {
      primary:         "#1F2937",  // industrial charcoal — reliability
      primaryFg:       "#FFFFFF",
      secondary:       "#374151",
      secondaryFg:     "#FFFFFF",
      accent:          "#F97316",  // tool orange — action
      accentFg:        "#FFFFFF",
      background:      "#F9FAFB",
      foreground:      "#111827",
      card:            "#FFFFFF",
      cardForeground:  "#111827",
      muted:           "#F3F4F6",
      mutedForeground: "#6B7280",
      border:          "#E5E7EB",
    },
    typography: {
      name:        "Modern Professional",
      headingFont: "Poppins",
      bodyFont:    "Open Sans",
      googleLink:  "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Open+Sans:wght@300;400;500;600;700&display=swap",
      cssHeading:  "'Poppins', system-ui, sans-serif",
      cssBody:     "'Open Sans', system-ui, sans-serif",
      mood:        "reliable, direct, professional, trustworthy",
    },
    ui: {
      style:        "Minimalism + Vibrant accent",
      keyEffects:   "Sharp hover (150ms) + Bold CTA + Clean transitions",
      pattern:      "Conversion + Feature-Rich + Social Proof",
      animations:   "subtle",
      antiPatterns: ["Soft pastels", "Overly decorative", "Hidden pricing"],
    },
    emoji: "🔧",
  },
};

// Default for "Negócio Local" or unknown niches
export const DEFAULT_DESIGN = {
  palette: {
    primary:         "#2563EB",
    primaryFg:       "#FFFFFF",
    secondary:       "#3B82F6",
    secondaryFg:     "#FFFFFF",
    accent:          "#EA580C",
    accentFg:        "#FFFFFF",
    background:      "#F8FAFC",
    foreground:      "#1E293B",
    card:            "#FFFFFF",
    cardForeground:  "#1E293B",
    muted:           "#E9EFF8",
    mutedForeground: "#64748B",
    border:          "#E2E8F0",
  },
  typography: {
    name:        "Friendly SaaS",
    headingFont: "Plus Jakarta Sans",
    bodyFont:    "Plus Jakarta Sans",
    googleLink:  "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap",
    cssHeading:  "'Plus Jakarta Sans', system-ui, sans-serif",
    cssBody:     "'Plus Jakarta Sans', system-ui, sans-serif",
    mood:        "friendly, modern, professional, approachable",
  },
  ui: {
    style:        "Minimalism + Flat Design",
    keyEffects:   "Subtle hover (200ms) + Smooth transitions + Clean reveals",
    pattern:      "Hero-Centric + Social Proof",
    animations:   "subtle",
    antiPatterns: ["Complex animations", "Cluttered layout"],
  },
  emoji: "🏪",
};

/**
 * Get design config for a niche.
 * @param {string} niche
 * @returns {{ palette, typography, ui, emoji }}
 */
export function getDesign(niche) {
  return DESIGN[niche] || DEFAULT_DESIGN;
}

/**
 * Build the Google Fonts <link> tags for a niche.
 * @param {string} niche
 * @returns {string} HTML link tags
 */
export function buildFontLinks(niche) {
  const d = getDesign(niche);
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${d.typography.googleLink}" rel="stylesheet">`;
}

/**
 * Build CSS font variables for a niche.
 * @param {string} niche
 * @returns {string} CSS custom properties string
 */
export function buildFontVars(niche) {
  const d = getDesign(niche);
  return `--font-heading: ${d.typography.cssHeading};
      --font-body:    ${d.typography.cssBody};`;
}

// ── Niche-specific copy ───────────────────────────────────────────────────────
// Each niche has its own section titles, CTA copy and proof bar text.
// This prevents every site from looking like the same template.

const NICHE_COPY = {
  "Clínica Odontológica": {
    labelServices:      "Tratamentos",
    titleServices:      "O Que Tratamos",
    labelGallery:       "Resultados",
    titleGallery:       "Antes e Depois",
    labelTestimonials:  "Pacientes",
    titleTestimonials:  "O Que Nossos Pacientes Dizem",
    ctaHeadline:        "Agende Sua Consulta Hoje",
    ctaBody:            "Primeira avaliação sem compromisso. Cuidamos do seu sorriso com tecnologia e carinho.",
    proofBar:           "😁 Mais de {city} · Odontologia de excelência · Avaliação gratuita",
  },
  "Clínica Médica": {
    labelServices:      "Especialidades",
    titleServices:      "Nossas Especialidades",
    labelGallery:       "Estrutura",
    titleGallery:       "Nossa Clínica",
    labelTestimonials:  "Pacientes",
    titleTestimonials:  "A Experiência de Quem Nos Visita",
    ctaHeadline:        "Marque Sua Consulta Agora",
    ctaBody:            "Agenda online ou pelo WhatsApp. Atendimento humanizado e equipe especializada.",
    proofBar:           "🏥 Atendimento médico em {city} · Equipe especializada · Sem fila de espera",
  },
  "Clínica de Fisioterapia": {
    labelServices:      "Tratamentos",
    titleServices:      "Nossas Terapias",
    labelGallery:       "Espaço",
    titleGallery:       "Nosso Centro de Reabilitação",
    labelTestimonials:  "Pacientes",
    titleTestimonials:  "Recuperações Que Nos Orgulham",
    ctaHeadline:        "Inicie Sua Recuperação Hoje",
    ctaBody:            "Avaliação fisioterapêutica gratuita. Tratamentos personalizados para a sua dor.",
    proofBar:           "💪 Fisioterapia em {city} · Avaliação gratuita · Resultados reais",
  },
  "Consultório de Nutrição": {
    labelServices:      "Programas",
    titleServices:      "Nossos Programas",
    labelGallery:       "Resultados",
    titleGallery:       "Transformações Reais",
    labelTestimonials:  "Clientes",
    titleTestimonials:  "Resultados Que Falam Por Si",
    ctaHeadline:        "Comece Sua Transformação",
    ctaBody:            "Consulta de avaliação nutricional personalizada. Seu plano alimentar começa aqui.",
    proofBar:           "🥗 Nutrição em {city} · Plano alimentar personalizado · Resultados comprovados",
  },
  "Clínica Veterinária": {
    labelServices:      "Atendimentos",
    titleServices:      "Cuidamos do Seu Pet",
    labelGallery:       "Nosso Espaço",
    titleGallery:       "Ambiente Pensado Para Eles",
    labelTestimonials:  "Tutores",
    titleTestimonials:  "Tutores Que Confiam em Nós",
    ctaHeadline:        "Agende a Consulta do Seu Pet",
    ctaBody:            "Atendimento com amor e tecnologia veterinária de ponta. Seu pet merece o melhor.",
    proofBar:           "🐾 Veterinária em {city} · Atendimento com amor · Agendamento pelo WhatsApp",
  },
  "Farmácia": {
    labelServices:      "Produtos",
    titleServices:      "O Que Você Encontra Aqui",
    labelGallery:       "Nossa Farmácia",
    titleGallery:       "Produtos e Estrutura",
    labelTestimonials:  "Clientes",
    titleTestimonials:  "Quem Confia em Nós",
    ctaHeadline:        "Entrega Rápida ou Retire na Loja",
    ctaBody:            "Medicamentos, perfumaria e muito mais. Pedido pelo WhatsApp, entrega no mesmo dia.",
    proofBar:           "💊 Farmácia em {city} · Entrega rápida · Atendimento farmacêutico",
  },
  "Salão de Beleza": {
    labelServices:      "Serviços",
    titleServices:      "Nossos Tratamentos",
    labelGallery:       "Portfólio",
    titleGallery:       "Trabalhos em Destaque",
    labelTestimonials:  "Clientes",
    titleTestimonials:  "O Que Nossas Clientes Dizem",
    ctaHeadline:        "Reserve Seu Horário Agora",
    ctaBody:            "Agenda limitada. Garanta o seu horário pelo WhatsApp e saia ainda mais linda.",
    proofBar:           "✨ Salão em {city} · Agenda pelo WhatsApp · Produtos premium",
  },
  "Barbearia": {
    labelServices:      "Serviços",
    titleServices:      "Nossos Cortes e Tratamentos",
    labelGallery:       "Portfólio",
    titleGallery:       "Cortes em Destaque",
    labelTestimonials:  "Clientes",
    titleTestimonials:  "O Que Nossos Clientes Falam",
    ctaHeadline:        "Agenda Aberta Para Hoje",
    ctaBody:            "Reserva rápida pelo WhatsApp. Corte, barba e muito estilo te esperam aqui.",
    proofBar:           "✂️ Barbearia em {city} · Agendamento online · Ambiente exclusivo",
  },
  "Clínica de Estética": {
    labelServices:      "Procedimentos",
    titleServices:      "Nossos Procedimentos",
    labelGallery:       "Resultados",
    titleGallery:       "Antes e Depois",
    labelTestimonials:  "Clientes",
    titleTestimonials:  "Transformações Que Encantam",
    ctaHeadline:        "Agende Sua Avaliação Gratuita",
    ctaBody:            "Avaliação personalizada sem compromisso. Descubra o procedimento ideal para você.",
    proofBar:           "💆 Estética em {city} · Avaliação gratuita · Resultados visíveis",
  },
  "Restaurante": {
    labelServices:      "Cardápio",
    titleServices:      "Nosso Cardápio",
    labelGallery:       "Ambiente",
    titleGallery:       "Nossa Casa",
    labelTestimonials:  "Clientes",
    titleTestimonials:  "O Que Nossos Clientes Provam",
    ctaHeadline:        "Reserve Sua Mesa ou Peça Delivery",
    ctaBody:            "Reservas e pedidos pelo WhatsApp. Sabor de verdade, feito com ingredientes frescos.",
    proofBar:           "🍽️ Restaurante em {city} · Delivery e salão · Ingredientes frescos todo dia",
  },
  "Pizzaria": {
    labelServices:      "Cardápio",
    titleServices:      "Nossas Pizzas",
    labelGallery:       "A Nossa Pizzaria",
    titleGallery:       "Veja Nossas Criações",
    labelTestimonials:  "Clientes",
    titleTestimonials:  "Quem Já Provou Não Para de Pedir",
    ctaHeadline:        "Peça Agora pelo WhatsApp",
    ctaBody:            "Pizza quentinha na sua porta ou retire aqui. Massa artesanal, ingredientes selecionados.",
    proofBar:           "🍕 Pizzaria em {city} · Delivery rápido · Massa artesanal no forno a lenha",
  },
  "Padaria": {
    labelServices:      "Produtos",
    titleServices:      "Fresquinho Todo Dia",
    labelGallery:       "Nossa Padaria",
    titleGallery:       "Feito com Carinho",
    labelTestimonials:  "Clientes",
    titleTestimonials:  "Clientes Que Amam Nosso Pão",
    ctaHeadline:        "Encomende Pelo WhatsApp",
    ctaBody:            "Bolos, salgados e pães artesanais feitos na hora. Encomendas para eventos também.",
    proofBar:           "🥐 Padaria em {city} · Produtos frescos todos os dias · Encomendas pelo WhatsApp",
  },
  "Hamburgueria": {
    labelServices:      "Cardápio",
    titleServices:      "Nossos Smash Burgers",
    labelGallery:       "Hambúrgueres em Destaque",
    titleGallery:       "Fotos que Dão Água na Boca",
    labelTestimonials:  "Clientes",
    titleTestimonials:  "Quem Experimentou Voltou Sempre",
    ctaHeadline:        "Peça Agora — Delivery em Minutos",
    ctaBody:            "Blend exclusivo, pão artesanal e molhos autorais. Seu smash burger perfeito está aqui.",
    proofBar:           "🍔 Hamburgueria em {city} · Delivery rápido · Blend artesanal exclusivo",
  },
  "Escritório de Advocacia": {
    labelServices:      "Áreas de Atuação",
    titleServices:      "Nossas Especialidades Jurídicas",
    labelGallery:       "Escritório",
    titleGallery:       "Nosso Espaço",
    labelTestimonials:  "Clientes",
    titleTestimonials:  "Cases de Sucesso",
    ctaHeadline:        "Consulta Jurídica Gratuita",
    ctaBody:            "Agende uma consulta inicial sem custo. Defendemos seus direitos com estratégia e dedicação.",
    proofBar:           "⚖️ Advocacia em {city} · Consulta gratuita · Atendimento humanizado",
  },
  "Escritório de Contabilidade": {
    labelServices:      "Serviços",
    titleServices:      "O Que Fazemos Por Você",
    labelGallery:       "Estrutura",
    titleGallery:       "Nosso Escritório",
    labelTestimonials:  "Clientes",
    titleTestimonials:  "Empresas Que Confiam em Nós",
    ctaHeadline:        "Fale Com Um Contador Agora",
    ctaBody:            "Abertura de empresa, imposto de renda, folha de pagamento. Resolvemos tudo para você.",
    proofBar:           "📊 Contabilidade em {city} · Abertura de empresa · Atendimento especializado",
  },
  "Imobiliária": {
    labelServices:      "Serviços",
    titleServices:      "Como Podemos Ajudar",
    labelGallery:       "Imóveis em Destaque",
    titleGallery:       "Portfólio de Imóveis",
    labelTestimonials:  "Clientes",
    titleTestimonials:  "Famílias que Realizaram o Sonho",
    ctaHeadline:        "Encontre Seu Próximo Imóvel",
    ctaBody:            "Compra, venda e aluguel com total segurança jurídica. Seu imóvel ideal está aqui.",
    proofBar:           "🏠 Imobiliária em {city} · Compra, venda e aluguel · Assessoria completa",
  },
  "Academia / Studio Fitness": {
    labelServices:      "Modalidades",
    titleServices:      "Nossas Modalidades",
    labelGallery:       "Estrutura",
    titleGallery:       "Nossa Academia",
    labelTestimonials:  "Alunos",
    titleTestimonials:  "Transformações Reais dos Nossos Alunos",
    ctaHeadline:        "Comece Hoje — Primeira Aula Grátis",
    ctaBody:            "Experimente sem compromisso. Equipe especializada, ambiente motivador, resultado garantido.",
    proofBar:           "🏋️ Academia em {city} · 1ª aula grátis · Equipe especializada",
  },
  "Escola / Curso": {
    labelServices:      "Cursos",
    titleServices:      "Nossos Cursos",
    labelGallery:       "Estrutura",
    titleGallery:       "Nosso Espaço de Aprendizado",
    labelTestimonials:  "Alunos",
    titleTestimonials:  "O Que Nossos Alunos Conquistaram",
    ctaHeadline:        "Garanta Sua Vaga",
    ctaBody:            "Vagas limitadas por turma. Fale agora pelo WhatsApp e garanta sua inscrição.",
    proofBar:           "📚 Escola em {city} · Vagas limitadas · Certificado reconhecido",
  },
  "Oficina Mecânica": {
    labelServices:      "Serviços",
    titleServices:      "O Que Fazemos no Seu Carro",
    labelGallery:       "Nossa Oficina",
    titleGallery:       "Estrutura e Equipamentos",
    labelTestimonials:  "Clientes",
    titleTestimonials:  "Clientes que Confiam Seus Carros a Nós",
    ctaHeadline:        "Traga Seu Carro Hoje",
    ctaBody:            "Orçamento sem compromisso pelo WhatsApp. Mecânicos certificados, peças originais.",
    proofBar:           "🔧 Mecânica em {city} · Orçamento grátis · Mecânicos certificados",
  },
  "Negócio Local": {
    labelServices:      "Serviços",
    titleServices:      "O Que Oferecemos",
    labelGallery:       "Nosso Espaço",
    titleGallery:       "Conheça Nossa Estrutura",
    labelTestimonials:  "Clientes",
    titleTestimonials:  "O Que Nossos Clientes Dizem",
    ctaHeadline:        "Entre em Contato Agora",
    ctaBody:            "Atendimento rápido pelo WhatsApp. Estamos prontos para te atender.",
    proofBar:           "📍 {city} · Atendimento especializado · Fale conosco pelo WhatsApp",
  },
};

const DEFAULT_COPY = NICHE_COPY["Negócio Local"];

/**
 * Get niche-specific copy strings.
 * @param {string} niche
 * @param {string} [city]
 * @returns {object}
 */
export function getNicheCopy(niche, city = "") {
  const c = NICHE_COPY[niche] || DEFAULT_COPY;
  const loc = city || "sua cidade";
  // Replace {city} placeholder
  const resolve = (str) => str.replace("{city}", loc);
  return {
    labelServices:     resolve(c.labelServices),
    titleServices:     resolve(c.titleServices),
    labelGallery:      resolve(c.labelGallery),
    titleGallery:      resolve(c.titleGallery),
    labelTestimonials: resolve(c.labelTestimonials),
    titleTestimonials: resolve(c.titleTestimonials),
    ctaHeadline:       resolve(c.ctaHeadline),
    ctaBody:           resolve(c.ctaBody),
    proofBar:          resolve(c.proofBar),
  };
}

/**
 * Get a plain-text design brief for injecting into AI prompts.
 * @param {string} niche
 * @returns {string}
 */
export function getDesignBrief(niche) {
  const d = getDesign(niche);
  return `DESIGN SYSTEM DESTE SITE:
- Estilo Visual: ${d.ui.style}
- Tipografia: ${d.typography.name} — ${d.typography.mood}
- Padrão de Layout: ${d.ui.pattern}
- Efeitos e Animações: ${d.ui.keyEffects}
- Paleta: ${d.palette.primary} (primary), ${d.palette.accent} (CTA), ${d.palette.background} (fundo)
ESCREVA COPY QUE CASE COM ESTE ESTILO. Tom e palavras devem refletir a tipografia e o padrão acima.
EVITE NO COPY: ${d.ui.antiPatterns.join(" | ")}`;
}
