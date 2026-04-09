import { parse } from "csv-parser"
import { Readable } from "stream"
import { supabase } from "../../lib/supabase"
import { classifyProduct, generateDescription } from "./product.ai"

export interface CsvRow {
  external_id: string
  name: string
  price: string
  stock: string
  image?: string
}

export interface ImportResult {
  created: number
  updated: number
  enriched: number
  errors: string[]
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

function placeholderImage(name: string): string {
  const query = encodeURIComponent(`${name} product photo`)
  return `https://source.unsplash.com/400x400/?${query}`
}

async function findExisting(tenant_id: string, external_id: string, normalizedName: string) {
  if (external_id) {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("external_id", external_id)
      .single()
    if (data) return data
  }

  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("tenant_id", tenant_id)
    .ilike("name", normalizedName)
    .single()

  return data ?? null
}

export async function importProducts(
  tenant_id: string,
  csvBuffer: Buffer
): Promise<ImportResult> {
  const rows = await parseCsv(csvBuffer)
  const result: ImportResult = { created: 0, updated: 0, enriched: 0, errors: [] }

  for (const row of rows) {
    try {
      const normalizedName = normalizeName(row.name)
      const price = parseFloat(row.price)
      const stock = parseInt(row.stock ?? "0", 10)

      if (!normalizedName || isNaN(price)) {
        result.errors.push(`Invalid row: ${JSON.stringify(row)}`)
        continue
      }

      const existing = await findExisting(tenant_id, row.external_id, normalizedName)

      let category = existing?.category ?? null
      let brand = existing?.brand ?? null
      let description = existing?.description ?? null
      let image = existing?.image ?? row.image ?? null
      let aiUsed = false

      if (!category || !brand) {
        const classification = await classifyProduct(row.name)
        if (!category) category = classification.category || null
        if (!brand) brand = classification.brand || null
        aiUsed = true
      }

      if (!description) {
        description = await generateDescription(row.name)
        aiUsed = true
      }

      if (!image) {
        image = placeholderImage(row.name)
      }

      if (existing) {
        await supabase
          .from("products")
          .update({
            price,
            stock,
            category,
            brand,
            description,
            image,
            external_id: row.external_id || existing.external_id,
          })
          .eq("id", existing.id)
          .eq("tenant_id", tenant_id)

        result.updated++
        if (aiUsed) result.enriched++
      } else {
        await supabase.from("products").insert({
          tenant_id,
          name: row.name.trim(),
          price,
          stock,
          category,
          brand,
          description,
          image,
          external_id: row.external_id || null,
          active: true,
        })

        result.created++
        if (aiUsed) result.enriched++
      }
    } catch (err: any) {
      result.errors.push(`Error on "${row.name}": ${err.message}`)
    }
  }

  return result
}

function parseCsv(buffer: Buffer): Promise<CsvRow[]> {
  return new Promise((resolve, reject) => {
    const rows: CsvRow[] = []
    const stream = Readable.from(buffer)

    stream
      .pipe(parse({ headers: true, skipEmptyLines: true }))
      .on("data", (row: CsvRow) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject)
  })
}

export async function exportProductsCsv(tenant_id: string): Promise<string> {
  const { data, error } = await supabase
    .from("products")
    .select("external_id, name, price, stock, category, brand, active")
    .eq("tenant_id", tenant_id)
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) return "external_id,name,price,stock,category,brand,active\n"

  const { Parser } = await import("json2csv")
  const parser = new Parser({
    fields: ["external_id", "name", "price", "stock", "category", "brand", "active"],
  })

  return parser.parse(data)
}
