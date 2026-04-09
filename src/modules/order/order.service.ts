import { randomUUID } from "crypto"

export type PaymentMethod = "credit" | "debit" | "pix" | "cash"
export type OrderStatus = "pending" | "preparing" | "on_route" | "delivered" | "paid"

export interface Order {
  id: string
  tenant_id: string
  customer_id: string
  items: any[]
  total_amount: number
  payment_method: PaymentMethod
  status: OrderStatus
  address: string
  created_at: Date
}

const store = new Map<string, Order>()

export function createOrder(data: Omit<Order, "id" | "status" | "created_at">): Order {
  const order: Order = {
    id: randomUUID(),
    ...data,
    status: "pending",
    created_at: new Date(),
  }

  store.set(order.id, order)
  return order
}

export function updateStatus(order_id: string, status: OrderStatus): Order | undefined {
  const order = store.get(order_id)
  if (!order) return undefined
  order.status = status
  return order
}

export function getById(order_id: string): Order | undefined {
  return store.get(order_id)
}
