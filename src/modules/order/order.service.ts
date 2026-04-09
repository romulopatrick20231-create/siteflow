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
  status: OrderStatus,
  tenant_id?: string
): Promise<Order | undefined> {
  let query = supabase.from("orders").update({ status }).eq("id", order_id)
  if (tenant_id) query = query.eq("tenant_id", tenant_id)

  const { data, error } = await query.select().single()
  if (error || !data) return undefined
  return data as Order
}

export async function getById(order_id: string, tenant_id?: string): Promise<Order | undefined> {
  let query = supabase.from("orders").select("*").eq("id", order_id)
  if (tenant_id) query = query.eq("tenant_id", tenant_id)

  const { data, error } = await query.single()
  if (error || !data) return undefined
  return data as Order
}

export async function getOrdersByTenant(tenant_id: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("tenant_id", tenant_id)
    .order("created_at", { ascending: false })

  if (error || !data) return []
  return data as Order[]
}

export async function getDashboardMetrics(tenant_id: string) {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const { data: allOrders, error } = await supabase
    .from("orders")
    .select("total_amount, created_at")
    .eq("tenant_id", tenant_id)

  if (error || !allOrders) return { total_today: 0, total_month: 0, total_orders: 0, average_ticket: 0 }

  const todayOrders = allOrders.filter((o) => o.created_at >= startOfDay)
  const monthOrders = allOrders.filter((o) => o.created_at >= startOfMonth)

  const total_today = todayOrders.reduce((sum, o) => sum + (o.total_amount ?? 0), 0)
  const total_month = monthOrders.reduce((sum, o) => sum + (o.total_amount ?? 0), 0)
  const total_orders = allOrders.length
  const average_ticket = total_orders > 0
    ? allOrders.reduce((sum, o) => sum + (o.total_amount ?? 0), 0) / total_orders
    : 0

  return { total_today, total_month, total_orders, average_ticket }
}
