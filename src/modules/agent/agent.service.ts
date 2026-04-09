import { Tenant } from "../tenant/tenant.types"
import {
  findByPhone,
  createCustomer,
  updateName,
  updateLastInteraction,
} from "../customer/customer.service"

interface IncomingMessage {
  tenant: Tenant
  phone: string
  message: string
}

function looksLikeName(text: string): boolean {
  const trimmed = text.trim()
  return /^[a-zA-ZÀ-ú\s]{2,40}$/.test(trimmed) && trimmed.split(" ").length <= 5
}

export async function handleIncomingMessage({
  tenant,
  phone,
  message,
}: IncomingMessage): Promise<string> {
  const config = tenant.agent_config
  let customer = findByPhone(tenant.id, phone)

  if (!customer) {
    customer = createCustomer(tenant.id, phone)
  } else {
    updateLastInteraction(customer.id)
  }

  if (!customer.name && config.ask_name) {
    if (looksLikeName(message)) {
      const name = message.trim()
      updateName(customer.id, name)
      return `Perfeito, ${name}! 👋\n\n${config.cta}\n${tenant.site_url}`
    }

    return `${config.greeting}\nSou o atendente virtual 👋\n\nPra começar, me diga seu nome.`
  }

  if (!customer.name) {
    return `${config.greeting}\nSou o atendente virtual 👋\n\n${config.cta}\n${tenant.site_url}`
  }

  return `${config.greeting} ${customer.name}! 👋\n\n${config.cta}\n${tenant.site_url}`
}
