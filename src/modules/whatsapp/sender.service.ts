import { Tenant } from "../tenant/tenant.types"
import { getProvider } from "../../core/providers/provider.factory"

function randomDelay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function sendMessage(
  tenant: Tenant,
  phone: string,
  message: string,
  retries = 2
): Promise<void> {
  const provider = getProvider(tenant)

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await randomDelay(2000, 6000)
      await provider.sendMessage(phone, message)
      return
    } catch (err) {
      if (attempt === retries) throw err
      console.warn(`[SenderService] Attempt ${attempt + 1} failed, retrying...`)
    }
  }
}
