import OpenAI from "openai"

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface MessageAnalysis {
  intent: "greeting" | "order" | "price" | "name" | "other"
  name: string | null
}

export async function analyzeMessage(message: string): Promise<MessageAnalysis> {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a message classifier for a WhatsApp chatbot. Analyze the user message and return ONLY a JSON object with exactly two fields:
- "intent": one of "greeting", "order", "price", "name", "other"
  - "greeting": message is a hello/hi/oi/olá/bom dia type message
  - "order": message is about placing or checking an order
  - "price": message is asking about prices or values
  - "name": message is ONLY a person's name (e.g. "João", "Maria Silva")
  - "other": anything else
- "name": if the message contains or is a person's name, extract it as a string; otherwise null

Return ONLY valid JSON. No explanation. No extra fields.`,
      },
      {
        role: "user",
        content: message,
      },
    ],
  })

  const raw = response.choices[0]?.message?.content ?? "{}"
  const parsed = JSON.parse(raw) as MessageAnalysis
  return parsed
}
