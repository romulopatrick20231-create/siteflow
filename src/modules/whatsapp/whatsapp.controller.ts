import { Router, Request, Response } from "express"
import { handleIncomingMessage } from "../agent/agent.service"
import { sendMessage } from "./sender.service"
import { Tenant } from "../tenant/tenant.types"

const router = Router()

const tenants: Tenant[] = [
  {
    id: "farmazap-1",
    name: "FarmaZap",
    type: "farmazap",
    whatsapp_number: process.env.FARMAZAP_NUMBER || "5511900000001",
    site_url: process.env.FARMAZAP_SITE_URL || "https://farmazap.com",
    agent_config: {
      greeting: "Olá",
      cta: "Faça seu pedido pelo nosso site:",
      tone: "formal",
      ask_name: true,
    },
  },
  {
    id: "pedezap-1",
    name: "PedeZap",
    type: "pedezap",
    whatsapp_number: process.env.PEDEZAP_NUMBER || "5511900000002",
    site_url: process.env.PEDEZAP_SITE_URL || "https://pedezap.com",
    agent_config: {
      greeting: "Oi",
      cta: "Peça agora pelo nosso cardápio online:",
      tone: "casual",
      ask_name: true,
    },
  },
]

export function findTenantByNumber(number: string): Tenant | undefined {
  return tenants.find((t) => t.whatsapp_number === number)
}

router.post("/webhook/whatsapp", async (req: Request, res: Response) => {
  const { from, message, to } = req.body

  if (!from || !message || !to) {
    return res.status(400).json({ error: "Missing fields: from, message, to" })
  }

  const tenant = findTenantByNumber(to)
  if (!tenant) {
    return res.status(404).json({ error: "Tenant not found for number" })
  }

  const reply = await handleIncomingMessage({ tenant, phone: from, message })
  await sendMessage(tenant, from, reply)

  return res.json({ success: true })
})

export default router
