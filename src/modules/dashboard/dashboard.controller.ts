import { Router, Request, Response } from "express"
import { getDashboardMetrics } from "../order/order.service"
import { authMiddleware } from "../../middlewares/auth.middleware"

const router = Router()

router.get("/dashboard", authMiddleware, async (req: Request, res: Response) => {
  const { tenant_id } = req.query

  if (!tenant_id || typeof tenant_id !== "string") {
    return res.status(400).json({ error: "Missing tenant_id" })
  }

  if (req.user!.tenant_id !== tenant_id) {
    return res.status(403).json({ error: "Forbidden" })
  }

  const metrics = await getDashboardMetrics(tenant_id)
  return res.json(metrics)
})

export default router
