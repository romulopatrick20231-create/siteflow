import { Router, Request, Response } from "express"
import { findById } from "../customer/customer.service"
import { updateStatus, getById } from "../order/order.service"
import { sendMessage } from "../whatsapp/sender.service"
import { Tenant } from "../tenant/tenant.types"

const router = Router()

const tenantStore = new Map<string, Tenant>()

export function registerTenant(tenant: Tenant): void {
  tenantStore.set(tenant.id, tenant)
}

router.post("/actions/send-route-message", async (req: Request, res: Response) => {
  const { tenant_id, customer_id, order_id } = req.body

  if (!tenant_id || !customer_id) {
    return res.status(400).json({ error: "Missing tenant_id or customer_id" })
  }

  const tenant = tenantStore.get(tenant_id)
  if (!tenant) {
    return res.status(404).json({ error: "Tenant not found" })
  }

  const customer = await findById(customer_id)
  if (!customer) {
    return res.status(404).json({ error: "Customer not found" })
  }

  if (customer.tenant_id !== tenant_id) {
    return res.status(403).json({ error: "Customer does not belong to this tenant" })
  }

  if (order_id) {
    await updateStatus(order_id, "on_route")
  }

  const name = customer.name ?? "Cliente"
  await sendMessage(tenant, customer.phone, `${name}, seu pedido saiu para entrega 🚀\nChega em breve!`)

  return res.json({ success: true })
})

router.patch("/actions/mark-paid", async (req: Request, res: Response) => {
  const { order_id } = req.body

  if (!order_id) {
    return res.status(400).json({ error: "Missing order_id" })
  }

  const order = await updateStatus(order_id, "paid")
  if (!order) {
    return res.status(404).json({ error: "Order not found" })
  }

  return res.json(order)
})

export default router
