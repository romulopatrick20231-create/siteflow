import { supabase } from "../../lib/supabase"

export interface Product {
  id: string
  tenant_id: string
  name: string
  description: string | null
  price: number
  image: string | null
  category: string | null
  brand: string | null
  stock: number
  active: boolean
  external_id: string | null
  created_at: string
}

export interface GetProductsOptions {
  tenant_id: string
  search?: string
  category?: string
  page?: number
  limit?: number
}

export async function createProduct(
  data: Omit<Product, "id" | "created_at">
): Promise<Product> {
  const { data: created, error } = await supabase
    .from("products")
    .insert(data)
    .select()
    .single()

  if (error || !created) throw new Error(error?.message ?? "Failed to create product")
  return created as Product
}

export async function updateProduct(
  product_id: string,
  tenant_id: string,
  data: Partial<Omit<Product, "id" | "tenant_id" | "created_at">>
): Promise<Product | undefined> {
  const { data: updated, error } = await supabase
    .from("products")
    .update(data)
    .eq("id", product_id)
    .eq("tenant_id", tenant_id)
    .select()
    .single()

  if (error || !updated) return undefined
  return updated as Product
}

export async function getProducts(options: GetProductsOptions): Promise<{ data: Product[]; total: number }> {
  const { tenant_id, search, category, page = 1, limit = 20 } = options
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from("products")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenant_id)
    .eq("active", true)
    .range(from, to)

  if (search) {
    query = query.ilike("name", `%${search}%`)
  }

  if (category) {
    query = query.eq("category", category)
  }

  const { data, error, count } = await query

  if (error) throw new Error(error.message)
  return { data: (data ?? []) as Product[], total: count ?? 0 }
}

export async function getProductById(
  product_id: string,
  tenant_id: string
): Promise<Product | undefined> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", product_id)
    .eq("tenant_id", tenant_id)
    .single()

  if (error || !data) return undefined
  return data as Product
}

export async function toggleActive(
  product_id: string,
  tenant_id: string
): Promise<Product | undefined> {
  const product = await getProductById(product_id, tenant_id)
  if (!product) return undefined

  const { data, error } = await supabase
    .from("products")
    .update({ active: !product.active })
    .eq("id", product_id)
    .eq("tenant_id", tenant_id)
    .select()
    .single()

  if (error || !data) return undefined
  return data as Product
}

export async function updateStock(
  product_id: string,
  tenant_id: string,
  stock: number
): Promise<Product | undefined> {
  if (stock < 0) throw new Error("Stock cannot be negative")

  const { data, error } = await supabase
    .from("products")
    .update({ stock })
    .eq("id", product_id)
    .eq("tenant_id", tenant_id)
    .select()
    .single()

  if (error || !data) return undefined
  return data as Product
}

export async function decrementStock(
  product_id: string,
  tenant_id: string,
  quantity: number
): Promise<void> {
  const product = await getProductById(product_id, tenant_id)
  if (!product) throw new Error(`Product ${product_id} not found`)
  if (product.stock < quantity) throw new Error(`Insufficient stock for product: ${product.name}`)

  const newStock = product.stock - quantity
  const { error } = await supabase
    .from("products")
    .update({ stock: newStock })
    .eq("id", product_id)
    .eq("tenant_id", tenant_id)

  if (error) throw new Error(error.message)
}

export async function validateAndDecrementStock(
  tenant_id: string,
  items: { product_id: string; quantity: number }[]
): Promise<void> {
  for (const item of items) {
    const product = await getProductById(item.product_id, tenant_id)
    if (!product) throw new Error(`Product ${item.product_id} not found`)
    if (!product.active) throw new Error(`Product ${product.name} is not available`)
    if (product.stock < item.quantity) throw new Error(`Insufficient stock for product: ${product.name}`)
  }

  for (const item of items) {
    await decrementStock(item.product_id, tenant_id, item.quantity)
  }
}
