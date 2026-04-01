/**
 * crm.js
 * Supabase CRM integration.
 *
 * Run this SQL in your Supabase SQL Editor first:
 * ─────────────────────────────────────────────────
 * CREATE TABLE IF NOT EXISTS leads (
 *   id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   name        TEXT NOT NULL,
 *   phone       TEXT,
 *   neighborhood TEXT,
 *   city        TEXT,
 *   niche       TEXT,
 *   site_status TEXT,
 *   score       INTEGER DEFAULT 0,
 *   priority    TEXT DEFAULT 'low',
 *   site_url    TEXT,
 *   status      TEXT DEFAULT 'new',
 *   created_at  TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at  TIMESTAMPTZ DEFAULT NOW()
 * );
 * CREATE INDEX IF NOT EXISTS idx_leads_status    ON leads(status);
 * CREATE INDEX IF NOT EXISTS idx_leads_priority  ON leads(priority);
 * CREATE INDEX IF NOT EXISTS idx_leads_created   ON leads(created_at DESC);
 * ─────────────────────────────────────────────────
 */

import { createClient } from "@supabase/supabase-js";

let _client = null;

function getClient() {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_KEY must be set in .env to use CRM features"
    );
  }

  _client = createClient(url, key, {
    auth: { persistSession: false },
  });
  return _client;
}

/**
 * Inserts a new lead record.
 * @param {Object} data
 * @returns {Promise<Object>} inserted row
 */
export async function insertLead(data) {
  const client = getClient();

  const { data: row, error } = await client
    .from("leads")
    .insert({
      name: data.name,
      phone: data.phone || null,
      neighborhood: data.neighborhood || null,
      city: data.city || null,
      niche: data.niche || null,
      site_status: data.siteStatus || null,
      score: data.score ?? 0,
      priority: data.priority || "low",
      site_url: data.siteUrl || null,
      status: "new",
    })
    .select()
    .single();

  if (error) throw new Error(`CRM insertLead failed: ${error.message}`);
  return row;
}

/**
 * Updates status (and optional extra fields) for a lead.
 * @param {string} id - UUID
 * @param {string} status - new | processed | contacted | replied | closed
 * @param {Object} [extra] - additional columns to update
 */
export async function updateLeadStatus(id, status, extra = {}) {
  const client = getClient();

  const { error } = await client
    .from("leads")
    .update({ status, updated_at: new Date().toISOString(), ...extra })
    .eq("id", id);

  if (error) throw new Error(`CRM updateLeadStatus failed: ${error.message}`);
}

/**
 * Retrieves leads with optional filtering.
 * @param {{ status?: string, priority?: string, limit?: number }} opts
 * @returns {Promise<Array>}
 */
export async function getLeads({ status, priority, limit = 100 } = {}) {
  const client = getClient();

  let query = client
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) query = query.eq("status", status);
  if (priority) query = query.eq("priority", priority);

  const { data, error } = await query;
  if (error) throw new Error(`CRM getLeads failed: ${error.message}`);
  return data || [];
}

/**
 * Returns aggregate counts by status and priority.
 * @returns {Promise<Object>}
 */
export async function getLeadStats() {
  const client = getClient();

  const { data, error } = await client
    .from("leads")
    .select("status, priority, score");

  if (error) throw new Error(`CRM getLeadStats failed: ${error.message}`);

  const rows = data || [];
  const total = rows.length;

  const byStatus = rows.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  const byPriority = rows.reduce((acc, r) => {
    acc[r.priority] = (acc[r.priority] || 0) + 1;
    return acc;
  }, {});

  const avgScore =
    total > 0
      ? (rows.reduce((s, r) => s + (r.score || 0), 0) / total).toFixed(1)
      : 0;

  return { total, byStatus, byPriority, avgScore };
}
