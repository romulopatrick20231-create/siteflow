export type TenantType = "farmazap" | "pedezap"

export interface AgentConfig {
  greeting: string
  cta: string
  tone: "formal" | "casual"
  ask_name: boolean
}

export interface Tenant {
  id: string
  name: string
  type: TenantType
  whatsapp_number: string
  site_url: string
  agent_config: AgentConfig
}
