import { Router, Request, Response } from "express"
import { getDashboardMetrics } from "../order/order.service"

const router = Router()

router.get("/dashboard", async (req: Request, res: Response) => {
  const { tenant_id } = req.query

  if (!tenant_id || typeof tenant_id !== "string") {
    return res.status(400).json({ error: "Missing tenant_id" })
  }

  const metrics = await getDashboardMetrics(tenant_id)
  return res.json(metrics)
})

export default router
