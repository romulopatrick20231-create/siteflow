export interface WhatsAppProvider {
  sendMessage(phone: string, message: string): Promise<void>
}
