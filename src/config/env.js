/**
 * env.js — Environment configuration validation.
 *
 * Validates all required env vars on startup.
 * Crashes fast with a clear message if anything is missing.
 * Never let the server start in a broken state.
 */

const REQUIRED = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE",
  "OPENAI_API_KEY",
  "VERCEL_TOKEN",
];

const OPTIONAL = {
  NODE_ENV:                "development",
  PORT:                    "3001",
  LOG_LEVEL:               "info",
  CORS_ORIGIN:             "*",
  STRIPE_SECRET_KEY:                "",
  STRIPE_WEBHOOK_SECRET:            "",
  STRIPE_ECOMMERCE_WEBHOOK_SECRET:  "",
  STRIPE_PRICE_BASIC:               "",
  STRIPE_PRICE_PRO:                 "",
  DOMAIN_PROVIDER:         "namecheap",         // namecheap | cloudflare
  NAMECHEAP_API_KEY:       "",
  NAMECHEAP_API_USER:      "",
  NAMECHEAP_CLIENT_IP:     "0.0.0.0",
  CLOUDFLARE_API_TOKEN:    "",
  CLOUDFLARE_ACCOUNT_ID:   "",
  VERCEL_TEAM_ID:          "",
  OPENAI_MODEL:            "gpt-4o-mini",
  RATE_LIMIT_WINDOW_MS:    "900000",            // 15 min
  RATE_LIMIT_MAX:          "100",
  AUTH_RATE_MAX:           "10",
  AI_RATE_MAX:             "20",
  PUBLISH_RATE_MAX:        "10",
};

const missing = REQUIRED.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error("\n❌ Missing required environment variables:\n");
  missing.forEach(k => console.error(`   • ${k}`));
  console.error("\nAdd them to your .env file and restart.\n");
  process.exit(1);
}

// Apply defaults for optional vars
for (const [key, defaultVal] of Object.entries(OPTIONAL)) {
  if (!process.env[key] && defaultVal !== "") {
    process.env[key] = defaultVal;
  }
}

export const env = {
  NODE_ENV:              process.env.NODE_ENV,
  PORT:                  parseInt(process.env.PORT, 10),
  LOG_LEVEL:             process.env.LOG_LEVEL,
  CORS_ORIGIN:           process.env.CORS_ORIGIN,
  IS_PROD:               process.env.NODE_ENV === "production",

  // Supabase
  SUPABASE_URL:          process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY:     process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE: process.env.SUPABASE_SERVICE_ROLE,

  // OpenAI
  OPENAI_API_KEY:        process.env.OPENAI_API_KEY,
  OPENAI_MODEL:          process.env.OPENAI_MODEL,

  // Vercel
  VERCEL_TOKEN:          process.env.VERCEL_TOKEN,
  VERCEL_TEAM_ID:        process.env.VERCEL_TEAM_ID || null,

  // Stripe
  STRIPE_SECRET_KEY:                process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET:            process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_ECOMMERCE_WEBHOOK_SECRET:  process.env.STRIPE_ECOMMERCE_WEBHOOK_SECRET,
  STRIPE_PRICE_BASIC:               process.env.STRIPE_PRICE_BASIC,
  STRIPE_PRICE_PRO:                 process.env.STRIPE_PRICE_PRO,

  // Domain
  DOMAIN_PROVIDER:       process.env.DOMAIN_PROVIDER,
  NAMECHEAP_API_KEY:     process.env.NAMECHEAP_API_KEY,
  NAMECHEAP_API_USER:    process.env.NAMECHEAP_API_USER,
  NAMECHEAP_CLIENT_IP:   process.env.NAMECHEAP_CLIENT_IP,
  CLOUDFLARE_API_TOKEN:  process.env.CLOUDFLARE_API_TOKEN,
  CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,

  // Rate limiting
  RATE_LIMIT_WINDOW_MS:  parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10),
  RATE_LIMIT_MAX:        parseInt(process.env.RATE_LIMIT_MAX, 10),
  AUTH_RATE_MAX:         parseInt(process.env.AUTH_RATE_MAX, 10),
  AI_RATE_MAX:           parseInt(process.env.AI_RATE_MAX, 10),
  PUBLISH_RATE_MAX:      parseInt(process.env.PUBLISH_RATE_MAX, 10),
};
