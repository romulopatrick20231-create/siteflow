import { Tenant } from "../../modules/tenant/tenant.types"
import { WhatsAppProvider } from "./whatsapp.provider"
import { EvolutionProvider } from "./evolution.provider"

export function getProvider(tenant: Tenant): WhatsAppProvider {
  return new EvolutionProvider()
}
