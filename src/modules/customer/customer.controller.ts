import { Router, Request, Response } from "express"
import { findById } from "./customer.service"
import { supabase } from "../../lib/supabase"
import { authMiddleware } from "../../middlewares/auth.middleware"

const router = Router()

router.get("/customers/:id/history", authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params

  const customer = await findById(id)
  if (!customer) {
    return res.status(404).json({ error: "Customer not found" })
  }

  if (req.user!.tenant_id !== customer.tenant_id) {
    return res.status(403).json({ error: "Forbidden" })
  }

  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .eq("customer_id", id)
    .eq("tenant_id", customer.tenant_id)
    .order("created_at", { ascending: false })

  if (error) {
    return res.status(500).json({ error: "Failed to fetch orders" })
  }

  const total_spent = (orders ?? []).reduce((sum, o) => sum + (o.total_amount ?? 0), 0)

  return res.json({
    customer,
    orders: orders ?? [],
    total_spent,
  })
})

export default router
