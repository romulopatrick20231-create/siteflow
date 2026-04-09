import { Router, Request, Response } from "express"
import { findByPhone, createCustomer } from "../customer/customer.service"
import { createOrder, PaymentMethod } from "./order.service"

const router = Router()

router.post("/orders/from-site", async (req: Request, res: Response) => {
  const { tenant_id, customer: customerData, items, total_amount, payment_method, address } =
    req.body

  if (!tenant_id || !customerData?.phone || !items || total_amount === undefined || !payment_method || !address) {
    return res.status(400).json({ error: "Missing required fields" })
  }

  let customer = findByPhone(tenant_id, customerData.phone)
  if (!customer) {
    customer = createCustomer(tenant_id, customerData.phone, customerData.name)
  }

  const order = createOrder({
    tenant_id,
    customer_id: customer.id,
    items,
    total_amount,
    payment_method: payment_method as PaymentMethod,
    address,
  })

  return res.status(201).json(order)
})

export default router
