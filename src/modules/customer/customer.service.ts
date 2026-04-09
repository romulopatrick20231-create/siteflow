import { randomUUID } from "crypto"

export interface Customer {
  id: string
  tenant_id: string
  phone: string
  name: string | null
  last_interaction: Date
  created_at: Date
}

const store = new Map<string, Customer>()

function key(tenant_id: string, phone: string): string {
  return `${tenant_id}::${phone}`
}

export function findByPhone(tenant_id: string, phone: string): Customer | undefined {
  return store.get(key(tenant_id, phone))
}

export function createCustomer(tenant_id: string, phone: string, name?: string): Customer {
  const existing = findByPhone(tenant_id, phone)
  if (existing) return existing

  const customer: Customer = {
    id: randomUUID(),
    tenant_id,
    phone,
    name: name ?? null,
    last_interaction: new Date(),
    created_at: new Date(),
  }

  store.set(key(tenant_id, phone), customer)
  return customer
}

export function updateName(customer_id: string, name: string): void {
  for (const customer of store.values()) {
    if (customer.id === customer_id) {
      customer.name = name
      return
    }
  }
}

export function updateLastInteraction(customer_id: string): void {
  for (const customer of store.values()) {
    if (customer.id === customer_id) {
      customer.last_interaction = new Date()
      return
    }
  }
}

export function findById(customer_id: string): Customer | undefined {
  for (const customer of store.values()) {
    if (customer.id === customer_id) return customer
  }
  return undefined
}
