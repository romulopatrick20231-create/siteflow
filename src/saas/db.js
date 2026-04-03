/**
 * db.js — Supabase client factory for SaaS modules.
 *
 * Two clients:
 *   getClient()      — anon key, respects RLS (for user-scoped ops)
 *   getAdminClient() — service role key, bypasses RLS (server-side only)
 *   verifyToken(jwt) — validate a Supabase JWT and return user
 */

import { createClient } from "@supabase/supabase-js";

let _client = null;
let _adminClient = null;

export function getClient() {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env");
  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}

/**
 * Admin client uses the service role key — bypasses all RLS.
 * NEVER expose this key client-side.
 */
export function getAdminClient() {
  if (_adminClient) return _adminClient;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE must be set in .env");
  }
  _adminClient = createClient(url, key, { auth: { persistSession: false } });
  return _adminClient;
}

/**
 * Validate a user-provided JWT and return their user record.
 * @param {string} jwt
 * @returns {Promise<{id: string, email: string}>}
 */
export async function verifyToken(jwt) {
  if (!jwt) throw new Error("No authorization token provided");
  const admin = getAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(jwt);
  if (error || !user) throw new Error("Invalid or expired session token");
  return user;
}
