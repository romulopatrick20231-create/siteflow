import { WhatsAppProvider } from "./whatsapp.provider"

export class EvolutionProvider implements WhatsAppProvider {
  private readonly apiUrl: string
  private readonly apiKey: string

  constructor() {
    this.apiUrl = process.env.EVOLUTION_API_URL || "http://localhost:8080"
    this.apiKey = process.env.EVOLUTION_API_KEY || ""
  }

  async sendMessage(phone: string, message: string): Promise<void> {
    console.log(`[EvolutionProvider] POST ${this.apiUrl}/message/sendText`)
    console.log(`[EvolutionProvider] to=${phone} message=${message}`)

    // Ready for real API:
    // await fetch(`${this.apiUrl}/message/sendText`, {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     apikey: this.apiKey,
    //   },
    //   body: JSON.stringify({
    //     number: phone,
    //     options: { delay: 1000 },
    //     textMessage: { text: message },
    //   }),
    // })
  }
}
