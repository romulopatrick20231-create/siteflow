import { supabase } from "../../lib/supabase"

export interface Customer {
  id: string
  tenant_id: string
  phone: string
  name: string | null
  address: string | null
  last_interaction: string
  created_at: string
}

export async function findByPhone(tenant_id: string, phone: string): Promise<Customer | undefined> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("tenant_id", tenant_id)
    .eq("phone", phone)
    .single()

  if (error || !data) return undefined
  return data as Customer
}

export async function createCustomer(
  tenant_id: string,
  phone: string,
  name?: string
): Promise<Customer> {
  const existing = await findByPhone(tenant_id, phone)
  if (existing) return existing

  const { data, error } = await supabase
    .from("customers")
    .insert({ tenant_id, phone, name: name ?? null, address: null })
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? "Failed to create customer")
  return data as Customer
}

export async function updateName(customer_id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from("customers")
    .update({ name })
    .eq("id", customer_id)

  if (error) throw new Error(error.message)
}

export async function updateAddress(customer_id: string, address: string): Promise<void> {
  const { error } = await supabase
    .from("customers")
    .update({ address })
    .eq("id", customer_id)

  if (error) throw new Error(error.message)
}

export async function updateLastInteraction(customer_id: string): Promise<void> {
  const { error } = await supabase
    .from("customers")
    .update({ last_interaction: new Date().toISOString() })
    .eq("id", customer_id)

  if (error) throw new Error(error.message)
}

export async function findById(customer_id: string): Promise<Customer | undefined> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customer_id)
    .single()

  if (error || !data) return undefined
  return data as Customer
}
