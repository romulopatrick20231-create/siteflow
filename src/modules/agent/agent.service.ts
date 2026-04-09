import { Tenant } from "../tenant/tenant.types"
import {
  findByPhone,
  createCustomer,
  updateName,
  updateLastInteraction,
} from "../customer/customer.service"
import { analyzeMessage } from "../ai/ai.service"

interface IncomingMessage {
  tenant: Tenant
  phone: string
  message: string
}

export async function handleIncomingMessage({
  tenant,
  phone,
  message,
}: IncomingMessage): Promise<string> {
  const config = tenant.agent_config
  let customer = await findByPhone(tenant.id, phone)
  const isNew = !customer

  if (!customer) {
    customer = await createCustomer(tenant.id, phone)
  } else {
    await updateLastInteraction(customer.id)
  }

  const analysis = await analyzeMessage(message)

  if (analysis.intent === "name" && analysis.name) {
    await updateName(customer.id, analysis.name)
    return `Perfeito, ${analysis.name}! 👋\n\n${config.cta}\n${tenant.site_url}`
  }

  if (!customer.name && config.ask_name) {
    return `${config.greeting}\nSou o atendente virtual 👋\n\nPra começar, me diga seu nome.`
  }

  if (isNew || !customer.name) {
    return `${config.greeting}\nSou o atendente virtual 👋\n\n${config.cta}\n${tenant.site_url}`
  }

  return `${config.greeting} ${customer.name}! 👋\n\n${config.cta}\n${tenant.site_url}`
}
