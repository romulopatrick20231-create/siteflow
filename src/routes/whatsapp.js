import { Router } from "express"
import { supabase } from "../lib/supabase.js"
import { handleIncomingMessage, getConversationSummary, clearConversationHistory } from "../modules/agent/agent.service.js"
import { enqueueMessage, invalidateStoreCache } from "../modules/whatsapp/whatsapp.service.js"
import { requireAuth as authMiddleware } from "../middleware/auth.js"

const router = Router()

router.post("/webhook/:storeId", async (req, res) => {
  try {
    const { storeId } = req.params
    const body = req.body

    const phone   = body?.messages?.[0]?.from || body?.from
    const message = body?.messages?.[0]?.text?.body || body?.text?.body || body?.body

    if (!phone || !message) return res.sendStatus(200)

    const cleanPhone = phone.replace(/\D/g, "").replace(/^55/, "")

    await handleIncomingMessage({ storeId, phone: cleanPhone, message })

    res.sendStatus(200)
  } catch (err) {
    console.error("Webhook error:", err.message)
    res.sendStatus(200)
  }
})

router.post("/send", authMiddleware, async (req, res) => {
  const { phone, message, store_id } = req.body
  if (!phone || !message) return res.status(400).json({ error: "phone and message required" })
  await enqueueMessage(phone, message, store_id || null)
  res.json({ success: true })
})

router.get("/conversations/:phone", authMiddleware, async (req, res) => {
  const storeId = req.user?.store_id
  const { phone } = req.params
  const history = await getConversationSummary(storeId, phone)
  res.json({ history })
})

router.delete("/conversations/:phone", authMiddleware, async (req, res) => {
  const storeId = req.user?.store_id
  const { phone } = req.params
  await clearConversationHistory(storeId, phone)
  res.json({ success: true })
})

router.put("/settings", authMiddleware, async (req, res) => {
  const storeId = req.user?.store_id
  const { whapi_token, whapi_base_url, whatsapp_phone, ai_persona, ai_enabled } = req.body

  const { error } = await supabase
    .from("stores")
    .update({ whapi_token, whapi_base_url, whatsapp_phone, ai_persona, ai_enabled })
    .eq("id", storeId)

  if (error) return res.status(500).json({ error: error.message })

  invalidateStoreCache(storeId)
  res.json({ success: true })
})

router.get("/settings", authMiddleware, async (req, res) => {
  const storeId = req.user?.store_id
  const { data, error } = await supabase
    .from("stores")
    .select("whapi_base_url, whatsapp_phone, ai_persona, ai_enabled, store_type")
    .eq("id", storeId)
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

export default router
