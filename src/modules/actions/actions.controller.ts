import { Router, Request, Response } from "express"
import { findById } from "../customer/customer.service"
import { updateStatus, getById } from "../order/order.service"
import { enqueueMessage } from "../whatsapp/whatsapp.service"
import { Tenant } from "../tenant/tenant.types"
import { authMiddleware } from "../../middlewares/auth.middleware"

const router = Router()

const tenantStore = new Map<string, Tenant>()

export function registerTenant(tenant: Tenant): void {
  tenantStore.set(tenant.id, tenant)
}

router.post("/actions/send-route-message", authMiddleware, async (req: Request, res: Response) => {
  const { tenant_id, customer_id, order_id } = req.body

  if (!tenant_id || !customer_id) {
    return res.status(400).json({ error: "Missing tenant_id or customer_id" })
  }

  if (req.user!.tenant_id !== tenant_id) {
    return res.status(403).json({ error: "Forbidden" })
  }

  const customer = await findById(customer_id)
  if (!customer) {
    return res.status(404).json({ error: "Customer not found" })
  }

  if (customer.tenant_id !== tenant_id) {
    return res.status(403).json({ error: "Customer does not belong to this tenant" })
  }

  if (order_id) {
    await updateStatus(order_id, "on_route", tenant_id)
  }

  const name = customer.name ?? "Cliente"
  enqueueMessage(customer.phone, `${name}, seu pedido saiu para entrega 🚀\nChega em breve!`)

  return res.json({ success: true })
})

router.patch("/actions/mark-paid", authMiddleware, async (req: Request, res: Response) => {
  const { order_id, tenant_id } = req.body

  if (!order_id) {
    return res.status(400).json({ error: "Missing order_id" })
  }

  if (tenant_id && req.user!.tenant_id !== tenant_id) {
    return res.status(403).json({ error: "Forbidden" })
  }

  const order = await updateStatus(order_id, "paid", req.user!.tenant_id)
  if (!order) {
    return res.status(404).json({ error: "Order not found" })
  }

  const customer = await findById(order.customer_id)
  if (customer) {
    const name = customer.name ?? "Cliente"
    enqueueMessage(customer.phone, `${name}, seu pagamento foi confirmado! ✅\nObrigado pela preferência.`)
  }

  return res.json(order)
})

export default router
