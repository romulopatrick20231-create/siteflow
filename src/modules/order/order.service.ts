import { supabase } from "../../lib/supabase"

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
  created_at: string
}

export async function createOrder(
  data: Omit<Order, "id" | "status" | "created_at">
): Promise<Order> {
  const { data: created, error } = await supabase
    .from("orders")
    .insert({ ...data, status: "pending" })
    .select()
    .single()

  if (error || !created) throw new Error(error?.message ?? "Failed to create order")
  return created as Order
}

export async function updateStatus(
  order_id: string,
  status: OrderStatus
): Promise<Order | undefined> {
  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", order_id)
    .select()
    .single()

  if (error || !data) return undefined
  return data as Order
}

export async function getById(order_id: string): Promise<Order | undefined> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", order_id)
    .single()

  if (error || !data) return undefined
  return data as Order
}
