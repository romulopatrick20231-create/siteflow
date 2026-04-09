import { supabase } from "../../lib/supabase"

export interface ProductVariation {
  id: string
  product_id: string
  name: string
  price: number
  stock: number
}

export async function createVariation(
  product_id: string,
  name: string,
  price: number,
  stock: number
): Promise<ProductVariation> {
  const { data, error } = await supabase
    .from("product_variations")
    .insert({ product_id, name, price, stock })
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? "Failed to create variation")
  return data as ProductVariation
}

export async function updateVariation(
  id: string,
  data: Partial<Pick<ProductVariation, "name" | "price" | "stock">>
): Promise<ProductVariation | undefined> {
  const { data: updated, error } = await supabase
    .from("product_variations")
    .update(data)
    .eq("id", id)
    .select()
    .single()

  if (error || !updated) return undefined
  return updated as ProductVariation
}

export async function deleteVariation(id: string): Promise<void> {
  const { error } = await supabase.from("product_variations").delete().eq("id", id)
  if (error) throw new Error(error.message)
}

export async function getVariations(product_id: string): Promise<ProductVariation[]> {
  const { data, error } = await supabase
    .from("product_variations")
    .select("*")
    .eq("product_id", product_id)

  if (error || !data) return []
  return data as ProductVariation[]
}

export async function getVariationById(id: string): Promise<ProductVariation | undefined> {
  const { data, error } = await supabase
    .from("product_variations")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !data) return undefined
  return data as ProductVariation
}
