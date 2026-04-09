import { supabase } from "../../lib/supabase"
import { getProductById } from "../product/product.service"
import { getVariationById } from "../product/product.variation.service"
import { getAddonsByIds } from "../product/product.addon.service"

export type PaymentMethod = "credit" | "debit" | "pix" | "cash"
export type OrderStatus = "pending" | "preparing" | "on_route" | "delivered" | "paid"

export interface OrderItem {
  product_id: string
  variation_id?: string
  addons?: string[]
  quantity: number
  unit_price?: number
}

export interface Order {
  id: string
  tenant_id: string
  customer_id: string
  items: OrderItem[]
  total_amount: number
  payment_method: PaymentMethod
  status: OrderStatus
  address: string
  created_at: string
}

async function resolveItemPrice(
  tenant_id: string,
  item: OrderItem
): Promise<{ unit_price: number; stock: number; stock_type: "variation" | "product"; stock_ref_id: string }> {
  const product = await getProductById(item.product_id, tenant_id)
  if (!product) throw new Error(`Product ${item.product_id} not found`)
  if (!product.active) throw new Error(`Product "${product.name}" is not available`)

  let base_price = product.price ?? 0
  let stock = product.stock
  let stock_type: "variation" | "product" = "product"
  let stock_ref_id = product.id

  if (item.variation_id) {
    const variation = await getVariationById(item.variation_id)
    if (!variation) throw new Error(`Variation ${item.variation_id} not found`)
    base_price = variation.price
    stock = variation.stock
    stock_type = "variation"
    stock_ref_id = variation.id
  }

  let addons_total = 0
  if (item.addons && item.addons.length > 0) {
    const addons = await getAddonsByIds(item.addons)
    addons_total = addons.reduce((sum, a) => sum + a.price, 0)
  }

  const unit_price = (base_price + addons_total) * item.quantity

  return { unit_price, stock, stock_type, stock_ref_id }
}

async function decrementItemStock(
  stock_type: "variation" | "product",
  stock_ref_id: string,
  tenant_id: string,
  quantity: number
): Promise<void> {
  if (stock_type === "variation") {
    const { data: variation } = await supabase
      .from("product_variations")
      .select("stock")
      .eq("id", stock_ref_id)
      .single()

    if (!variation) throw new Error(`Variation ${stock_ref_id} not found`)
    await supabase
      .from("product_variations")
      .update({ stock: variation.stock - quantity })
      .eq("id", stock_ref_id)
  } else {
    const product = await getProductById(stock_ref_id, tenant_id)
    if (!product) throw new Error(`Product ${stock_ref_id} not found`)
    await supabase
      .from("products")
      .update({ stock: product.stock - quantity })
      .eq("id", stock_ref_id)
      .eq("tenant_id", tenant_id)
  }
}

export async function createOrder(
  data: Omit<Order, "id" | "status" | "created_at" | "total_amount"> & { total_amount?: number }
): Promise<Order> {
  let total_amount = 0
  const resolvedItems: Array<OrderItem & { _stock: number; _stock_type: "variation" | "product"; _stock_ref_id: string }> = []

  for (const item of data.items) {
    const { unit_price, stock, stock_type, stock_ref_id } = await resolveItemPrice(data.tenant_id, item)

    if (stock < item.quantity) {
      throw new Error(`Insufficient stock for product ${item.product_id}`)
    }

    total_amount += unit_price
    resolvedItems.push({ ...item, unit_price, _stock: stock, _stock_type: stock_type, _stock_ref_id: stock_ref_id })
  }

  const { data: created, error } = await supabase
    .from("orders")
    .insert({
      tenant_id: data.tenant_id,
      customer_id: data.customer_id,
      items: resolvedItems.map(({ _stock, _stock_type, _stock_ref_id, ...item }) => item),
      total_amount,
      payment_method: data.payment_method,
      status: "pending",
      address: data.address,
    })
    .select()
    .single()

  if (error || !created) throw new Error(error?.message ?? "Failed to create order")

  for (const item of resolvedItems) {
    await decrementItemStock(item._stock_type, item._stock_ref_id, data.tenant_id, item.quantity)
  }

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
