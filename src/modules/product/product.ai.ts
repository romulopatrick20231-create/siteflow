import OpenAI from "openai"

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface ProductClassification {
  category: string
  brand: string
}

export async function classifyProduct(name: string): Promise<ProductClassification> {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a product classifier. Given a product name, return ONLY a JSON with:
- "category": short generic category (e.g. "Vitamins", "Antibiotics", "Beverages", "Snacks", "Electronics")
- "brand": detected brand name or empty string if unknown

Return ONLY valid JSON. No explanation.`,
      },
      { role: "user", content: name },
    ],
  })

  const raw = response.choices[0]?.message?.content ?? "{}"
  return JSON.parse(raw) as ProductClassification
}

export async function generateDescription(name: string): Promise<string> {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content: `You are a product copywriter. Write a short commercial description (1-2 sentences, max 100 characters) for the given product name. Return ONLY the description text, nothing else.`,
      },
      { role: "user", content: name },
    ],
  })

  return response.choices[0]?.message?.content?.trim() ?? ""
}
