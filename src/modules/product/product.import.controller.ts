import { Router, Request, Response } from "express"
import multer from "multer"
import { importProducts, exportProductsCsv } from "./product.import.service"
import { authMiddleware } from "../../middlewares/auth.middleware"

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

router.post(
  "/products/import",
  authMiddleware,
  upload.single("file"),
  async (req: Request, res: Response) => {
    const { tenant_id } = req.body

    if (!tenant_id) {
      return res.status(400).json({ error: "Missing tenant_id" })
    }

    if (req.user!.tenant_id !== tenant_id) {
      return res.status(403).json({ error: "Forbidden" })
    }

    if (!req.file) {
      return res.status(400).json({ error: "Missing CSV file" })
    }

    try {
      const result = await importProducts(tenant_id, req.file.buffer)
      return res.json(result)
    } catch (err: any) {
      return res.status(500).json({ error: err.message })
    }
  }
)

router.get("/products/export", authMiddleware, async (req: Request, res: Response) => {
  const { tenant_id } = req.query

  if (!tenant_id || typeof tenant_id !== "string") {
    return res.status(400).json({ error: "Missing tenant_id" })
  }

  if (req.user!.tenant_id !== tenant_id) {
    return res.status(403).json({ error: "Forbidden" })
  }

  try {
    const csv = await exportProductsCsv(tenant_id)
    res.setHeader("Content-Type", "text/csv")
    res.setHeader("Content-Disposition", `attachment; filename="products-${tenant_id}.csv"`)
    return res.send(csv)
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
})

export default router
