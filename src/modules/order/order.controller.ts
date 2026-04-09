import { Router, Request, Response } from "express"
import { findByPhone, createCustomer, updateName } from "../customer/customer.service"
import { createOrder, PaymentMethod } from "./order.service"
import { sendMessage } from "../whatsapp/sender.service"
import { Tenant } from "../tenant/tenant.types"

const router = Router()

const tenantStore = new Map<string, Tenant>()

export function registerTenant(tenant: Tenant): void {
  tenantStore.set(tenant.id, tenant)
}

router.post("/orders/from-site", async (req: Request, res: Response) => {
  const { tenant_id, customer: customerData, items, total_amount, payment_method, address } =
    req.body

  if (!tenant_id || !customerData?.phone || !items || total_amount === undefined || !payment_method || !address) {
    return res.status(400).json({ error: "Missing required fields" })
  }

  let customer = await findByPhone(tenant_id, customerData.phone)

  if (!customer) {
    customer = await createCustomer(tenant_id, customerData.phone, customerData.name)
  } else if (!customer.name && customerData.name) {
    await updateName(customer.id, customerData.name)
    customer.name = customerData.name
  }

  const order = await createOrder({
    tenant_id,
    customer_id: customer.id,
    items,
    total_amount,
    payment_method: payment_method as PaymentMethod,
    address,
  })

  const tenant = tenantStore.get(tenant_id)
  if (tenant) {
    const name = customer.name ?? customerData.name ?? "Cliente"
    await sendMessage(
      tenant,
      customer.phone,
      `${name}, seu pedido foi recebido! ✅\nEm breve atualizamos o status.`
    )
  }

  return res.status(201).json({ success: true, order_id: order.id })
})

export default router
