import { supabase } from "../../lib/supabase"

export interface ProductAddon {
  id: string
  product_id: string
  name: string
  price: number
}

export async function createAddon(
  product_id: string,
  name: string,
  price: number
): Promise<ProductAddon> {
  const { data, error } = await supabase
    .from("product_addons")
    .insert({ product_id, name, price })
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? "Failed to create addon")
  return data as ProductAddon
}

export async function updateAddon(
  id: string,
  data: Partial<Pick<ProductAddon, "name" | "price">>
): Promise<ProductAddon | undefined> {
  const { data: updated, error } = await supabase
    .from("product_addons")
    .update(data)
    .eq("id", id)
    .select()
    .single()

  if (error || !updated) return undefined
  return updated as ProductAddon
}

export async function deleteAddon(id: string): Promise<void> {
  const { error } = await supabase.from("product_addons").delete().eq("id", id)
  if (error) throw new Error(error.message)
}

export async function getAddons(product_id: string): Promise<ProductAddon[]> {
  const { data, error } = await supabase
    .from("product_addons")
    .select("*")
    .eq("product_id", product_id)

  if (error || !data) return []
  return data as ProductAddon[]
}

export async function getAddonsByIds(ids: string[]): Promise<ProductAddon[]> {
  if (!ids.length) return []

  const { data, error } = await supabase
    .from("product_addons")
    .select("*")
    .in("id", ids)

  if (error || !data) return []
  return data as ProductAddon[]
}
