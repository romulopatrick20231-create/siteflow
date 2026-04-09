import { Router, Request, Response } from "express"
import { findByPhone, createCustomer, updateName, findById as findCustomerById } from "../customer/customer.service"
import { createOrder, getOrdersByTenant, getById, updateStatus, PaymentMethod, OrderStatus } from "./order.service"
import { sendMessage } from "../whatsapp/sender.service"
import { Tenant } from "../tenant/tenant.types"

const router = Router()

const tenantStore = new Map<string, Tenant>()

export function registerTenant(tenant: Tenant): void {
  tenantStore.set(tenant.id, tenant)
}

router.get("/orders", async (req: Request, res: Response) => {
  const { tenant_id } = req.query

  if (!tenant_id || typeof tenant_id !== "string") {
    return res.status(400).json({ error: "Missing tenant_id" })
  }

  const orders = await getOrdersByTenant(tenant_id)

  const result = await Promise.all(
    orders.map(async (order) => {
      const customer = await findCustomerById(order.customer_id)
      return {
        id: order.id,
        customer_name: customer?.name ?? null,
        total_amount: order.total_amount,
        payment_method: order.payment_method,
        status: order.status,
        address: order.address,
        created_at: order.created_at,
      }
    })
  )

  return res.json(result)
})

router.get("/orders/:id", async (req: Request, res: Response) => {
  const { tenant_id } = req.query
  const { id } = req.params

  if (!tenant_id || typeof tenant_id !== "string") {
    return res.status(400).json({ error: "Missing tenant_id" })
  }

  const order = await getById(id, tenant_id)
  if (!order) {
    return res.status(404).json({ error: "Order not found" })
  }

  const customer = await findCustomerById(order.customer_id)

  return res.json({
    ...order,
    customer: customer
      ? { id: customer.id, name: customer.name, phone: customer.phone }
      : null,
  })
})

router.patch("/orders/:id/status", async (req: Request, res: Response) => {
  const { tenant_id, status } = req.body
  const { id } = req.params

  if (!tenant_id || !status) {
    return res.status(400).json({ error: "Missing tenant_id or status" })
  }

  const order = await updateStatus(id, status as OrderStatus, tenant_id)
  if (!order) {
    return res.status(404).json({ error: "Order not found" })
  }

  return res.json(order)
})

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
