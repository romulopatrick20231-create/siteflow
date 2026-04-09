import { supabase } from "../lib/supabase"
import { sendMessage } from "../modules/whatsapp/sender.service"
import { updateLastInteraction } from "../modules/customer/customer.service"
import { Tenant } from "../modules/tenant/tenant.types"

const INACTIVITY_DAYS = 30
const LIMIT_PER_TENANT = 20

const tenantStore = new Map<string, Tenant>()

export function registerTenantForReactivation(tenant: Tenant): void {
  tenantStore.set(tenant.id, tenant)
}

async function runReactivation(): Promise<void> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - INACTIVITY_DAYS)

  for (const tenant of tenantStore.values()) {
    const { data: customers, error } = await supabase
      .from("customers")
      .select("id, name, phone, tenant_id")
      .eq("tenant_id", tenant.id)
      .lt("last_interaction", cutoff.toISOString())
      .limit(LIMIT_PER_TENANT)

    if (error || !customers) continue

    for (const customer of customers) {
      const name = customer.name ?? "você"
      const message = `Fala ${name}! 👋\n\nTá precisando de algo?\nDá uma olhada aqui:\n${tenant.site_url}`

      try {
        await sendMessage(tenant, customer.phone, message)
        await updateLastInteraction(customer.id)
      } catch {
        // skip failed sends
      }
    }
  }
}

export function startReactivationJob(): void {
  const INTERVAL_MS = 24 * 60 * 60 * 1000
  runReactivation()
  setInterval(runReactivation, INTERVAL_MS)
}
