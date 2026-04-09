import { Router, Request, Response } from "express"
import {
  createProduct,
  updateProduct,
  getProducts,
  getProductById,
  toggleActive,
  updateStock,
} from "./product.service"
import { authMiddleware } from "../../middlewares/auth.middleware"

const router = Router()

router.post("/products", authMiddleware, async (req: Request, res: Response) => {
  const { tenant_id, name, description, price, image, category, brand, stock, active, external_id } = req.body

  if (!tenant_id || !name || price === undefined) {
    return res.status(400).json({ error: "Missing required fields: tenant_id, name, price" })
  }

  if (req.user!.tenant_id !== tenant_id) {
    return res.status(403).json({ error: "Forbidden" })
  }

  const product = await createProduct({
    tenant_id,
    name,
    description: description ?? null,
    price,
    image: image ?? null,
    category: category ?? null,
    brand: brand ?? null,
    stock: stock ?? 0,
    active: active ?? true,
    external_id: external_id ?? null,
  })

  return res.status(201).json(product)
})

router.get("/products", authMiddleware, async (req: Request, res: Response) => {
  const { tenant_id, search, category, page, limit } = req.query

  if (!tenant_id || typeof tenant_id !== "string") {
    return res.status(400).json({ error: "Missing tenant_id" })
  }

  if (req.user!.tenant_id !== tenant_id) {
    return res.status(403).json({ error: "Forbidden" })
  }

  const result = await getProducts({
    tenant_id,
    search: search as string | undefined,
    category: category as string | undefined,
    page: page ? parseInt(page as string) : 1,
    limit: limit ? parseInt(limit as string) : 20,
  })

  return res.json(result)
})

router.get("/products/:id", authMiddleware, async (req: Request, res: Response) => {
  const { tenant_id } = req.query
  const { id } = req.params

  if (!tenant_id || typeof tenant_id !== "string") {
    return res.status(400).json({ error: "Missing tenant_id" })
  }

  if (req.user!.tenant_id !== tenant_id) {
    return res.status(403).json({ error: "Forbidden" })
  }

  const product = await getProductById(id, tenant_id)
  if (!product) {
    return res.status(404).json({ error: "Product not found" })
  }

  return res.json(product)
})

router.patch("/products/:id", authMiddleware, async (req: Request, res: Response) => {
  const { tenant_id, ...data } = req.body
  const { id } = req.params

  if (!tenant_id) {
    return res.status(400).json({ error: "Missing tenant_id" })
  }

  if (req.user!.tenant_id !== tenant_id) {
    return res.status(403).json({ error: "Forbidden" })
  }

  const product = await updateProduct(id, tenant_id, data)
  if (!product) {
    return res.status(404).json({ error: "Product not found" })
  }

  return res.json(product)
})

router.patch("/products/:id/toggle", authMiddleware, async (req: Request, res: Response) => {
  const { tenant_id } = req.body
  const { id } = req.params

  if (!tenant_id) {
    return res.status(400).json({ error: "Missing tenant_id" })
  }

  if (req.user!.tenant_id !== tenant_id) {
    return res.status(403).json({ error: "Forbidden" })
  }

  const product = await toggleActive(id, tenant_id)
  if (!product) {
    return res.status(404).json({ error: "Product not found" })
  }

  return res.json(product)
})

router.patch("/products/:id/stock", authMiddleware, async (req: Request, res: Response) => {
  const { tenant_id, stock } = req.body
  const { id } = req.params

  if (!tenant_id || stock === undefined) {
    return res.status(400).json({ error: "Missing tenant_id or stock" })
  }

  if (req.user!.tenant_id !== tenant_id) {
    return res.status(403).json({ error: "Forbidden" })
  }

  try {
    const product = await updateStock(id, tenant_id, stock)
    if (!product) {
      return res.status(404).json({ error: "Product not found" })
    }
    return res.json(product)
  } catch (err: any) {
    return res.status(400).json({ error: err.message })
  }
})

export default router
