import { Router } from "express"
import { supabase } from "../lib/supabase.js"
import { requireAuth } from "../middleware/auth.js"
import { invalidateStoreCache } from "../modules/whatsapp/whatsapp.service.js"
import OpenAI from "openai"

const router = Router()
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

router.get("/config", requireAuth, async (req, res) => {
  const tid = req.query.tenant_id || req.user?.store_id

  const { data, error } = await supabase
    .from("stores")
    .select("ai_enabled, whatsapp_provider, ai_model, ai_system_prompt, ai_temperature, store_type, ai_persona")
    .eq("id", tid)
    .single()

  if (error) return res.status(404).json({ error: "Not found" })

  res.json({
    is_active:     data.ai_enabled ?? true,
    provider:      data.whatsapp_provider || "whapi",
    model:         data.ai_model || "gpt-4o-mini",
    system_prompt: data.ai_system_prompt || "",
    temperature:   data.ai_temperature || 0.85,
    store_type:    data.store_type || "generic",
    persona:       data.ai_persona || "",
  })
})

router.put("/config", requireAuth, async (req, res) => {
  const { is_active, model, system_prompt, temperature, store_type, persona, tenant_id } = req.body
  const tid = tenant_id || req.user?.store_id

  const { error } = await supabase
    .from("stores")
    .update({
      ai_enabled:      is_active,
      ai_model:        model,
      ai_system_prompt: system_prompt,
      ai_temperature:  temperature,
      store_type,
      ai_persona:      persona,
    })
    .eq("id", tid)

  if (error) return res.status(500).json({ error: error.message })

  invalidateStoreCache(tid)
  res.json({ success: true })
})

router.post("/suggest-prompt", async (req, res) => {
  const { store_type = "generic", store_name = "nossa loja" } = req.body

  const metaPrompt = `Gere um system prompt profissional em português para um agente de atendimento virtual de ${store_type} chamado(a) "${store_name}". O prompt deve incluir: como cumprimentar clientes novos e retornantes, como apresentar o cardápio/catálogo, como confirmar pedidos de forma clara, como lidar com reclamações com empatia, e o tom de voz ideal (amigável, direto e humano). Máximo 400 palavras. Não use markdown.`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: metaPrompt }],
      temperature: 0.7,
      max_tokens: 600,
    })

    res.json({ prompt: completion.choices[0].message.content.trim() })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
