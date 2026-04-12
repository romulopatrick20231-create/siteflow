import { Router } from "express"
import { supabase } from "../lib/supabase.js"
import { invalidateStoreCache, sendDirect } from "../modules/whatsapp/whatsapp.service.js"
import { PROVIDER_FIELDS } from "../modules/whatsapp/providers.js"
import { requireAuth as authMiddleware } from "../middleware/auth.js"
import { requireAdmin as adminGuard } from "../middleware/adminGuard.js"

const router = Router()

router.get("/provider-fields", (req, res) => {
  res.json(PROVIDER_FIELDS)
})

router.get("/stores", authMiddleware, adminGuard, async (req, res) => {
  const { data, error } = await supabase
    .from("stores")
    .select("id, name, store_type, whatsapp_provider, whatsapp_config, ai_system_prompt, ai_model, ai_temperature, ai_persona, ai_enabled, followup_enabled, followup_rules, whatsapp_phone")
    .order("name")
  if (error) return res.status(500).json({ error: error.message })
  const sanitized = data.map(s => ({
    ...s,
    whatsapp_config: maskConfig(s.whatsapp_config),
  }))
  res.json(sanitized)
})

router.get("/stores/:storeId", authMiddleware, adminGuard, async (req, res) => {
  const { data, error } = await supabase
    .from("stores")
    .select("id, name, store_type, whatsapp_provider, whatsapp_config, ai_system_prompt, ai_model, ai_temperature, ai_persona, ai_enabled, followup_enabled, followup_rules, whatsapp_phone")
    .eq("id", req.params.storeId)
    .single()
  if (error) return res.status(404).json({ error: "Store not found" })
  res.json({ ...data, whatsapp_config: maskConfig(data.whatsapp_config) })
})

router.put("/stores/:storeId/whatsapp", authMiddleware, adminGuard, async (req, res) => {
  const { storeId } = req.params
  const { whatsapp_provider, whatsapp_config, whatsapp_phone } = req.body

  const current = await supabase.from("stores").select("whatsapp_config").eq("id", storeId).single()
  const merged  = mergeMasked(current.data?.whatsapp_config || {}, whatsapp_config || {})

  const { error } = await supabase.from("stores")
    .update({ whatsapp_provider, whatsapp_config: merged, whatsapp_phone })
    .eq("id", storeId)

  if (error) return res.status(500).json({ error: error.message })
  invalidateStoreCache(storeId)
  res.json({ success: true })
})

router.put("/stores/:storeId/agent", authMiddleware, adminGuard, async (req, res) => {
  const { storeId } = req.params
  const { ai_system_prompt, ai_model, ai_temperature, ai_persona, ai_enabled, store_type } = req.body

  const { error } = await supabase.from("stores")
    .update({ ai_system_prompt, ai_model, ai_temperature, ai_persona, ai_enabled, store_type })
    .eq("id", storeId)

  if (error) return res.status(500).json({ error: error.message })
  invalidateStoreCache(storeId)
  res.json({ success: true })
})

router.put("/stores/:storeId/followup", authMiddleware, adminGuard, async (req, res) => {
  const { storeId } = req.params
  const { followup_enabled, followup_rules } = req.body

  const { error } = await supabase.from("stores")
    .update({ followup_enabled, followup_rules })
    .eq("id", storeId)

  if (error) return res.status(500).json({ error: error.message })
  invalidateStoreCache(storeId)
  res.json({ success: true })
})

router.post("/stores/:storeId/test-message", authMiddleware, adminGuard, async (req, res) => {
  const { storeId } = req.params
  const { phone, message } = req.body
  if (!phone || !message) return res.status(400).json({ error: "phone and message required" })
  try {
    await sendDirect(phone, message, storeId)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get("/stores/:storeId/crm", authMiddleware, adminGuard, async (req, res) => {
  const { data } = await supabase
    .from("customers_crm")
    .select("*")
    .eq("store_id", req.params.storeId)
    .order("last_seen_at", { ascending: false })
  res.json(data || [])
})

function maskConfig(config) {
  if (!config) return {}
  const masked = { ...config }
  for (const key of ["token", "api_key", "access_token", "client_token"]) {
    if (masked[key]) masked[key] = masked[key].slice(0, 6) + "••••••••"
  }
  return masked
}

function mergeMasked(existing, incoming) {
  const merged = { ...existing }
  for (const [k, v] of Object.entries(incoming)) {
    if (typeof v === "string" && v.includes("••••••••")) continue
    merged[k] = v
  }
  return merged
}

export default router
