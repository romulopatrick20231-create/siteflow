import { Router } from "express"
import { supabase } from "../lib/supabase.js"
import { requireAuth } from "../middleware/auth.js"
import { emitToStore, emitToTenant } from "../saas/socketService.js"

const router = Router()

router.get("/status", async (req, res) => {
  const tenant_id = req.query.tenant_id || req.query.store_id
  if (!tenant_id) return res.status(400).json({ error: "tenant_id required" })

  const { data } = await supabase
    .from("store_settings")
    .select("is_open, notice")
    .eq("tenant_id", tenant_id)
    .single()

  res.json({ is_open: data?.is_open ?? true, notice: data?.notice ?? "" })
})

router.patch("/status", requireAuth, async (req, res) => {
  const { is_open, notice, tenant_id } = req.body
  const tid = tenant_id || req.user?.store_id

  const { data, error } = await supabase
    .from("store_settings")
    .upsert({ tenant_id: tid, is_open, notice, updated_at: new Date().toISOString() }, { onConflict: "tenant_id" })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })

  emitToStore(tid, "store_status_changed", { is_open, notice })
  emitToTenant(tid, "store_status_changed", { is_open, notice })

  res.json({ is_open: data.is_open, notice: data.notice })
})

router.put("/notice", requireAuth, async (req, res) => {
  const { notice, tenant_id } = req.body
  const tid = tenant_id || req.user?.store_id

  const { error } = await supabase
    .from("store_settings")
    .upsert({ tenant_id: tid, notice, updated_at: new Date().toISOString() }, { onConflict: "tenant_id" })

  if (error) return res.status(500).json({ error: error.message })

  emitToStore(tid, "notice_updated", { notice })
  emitToTenant(tid, "notice_updated", { notice })

  res.json({ notice })
})

router.get("/dashboard", requireAuth, async (req, res) => {
  const tid = req.query.tenant_id || req.user?.store_id

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

  const [todayRes, monthRes] = await Promise.all([
    supabase.from("orders")
      .select("total, status")
      .eq("store_id", tid)
      .gte("created_at", today.toISOString()),
    supabase.from("orders")
      .select("total, status")
      .eq("store_id", tid)
      .gte("created_at", monthStart.toISOString()),
  ])

  const todayOrders  = todayRes.data  || []
  const monthOrders  = monthRes.data  || []

  const paidToday  = todayOrders.filter(o => o.status === "paid" || o.status === "delivered")
  const paidMonth  = monthOrders.filter(o => o.status === "paid" || o.status === "delivered")

  const revenue_today  = paidToday.reduce((s, o) => s + Number(o.total || 0), 0)
  const revenue_month  = paidMonth.reduce((s, o) => s + Number(o.total || 0), 0)
  const total_orders   = monthOrders.length
  const orders_today   = todayOrders.length
  const average_ticket = paidMonth.length ? revenue_month / paidMonth.length : 0

  res.json({
    revenue_today:  Math.round(revenue_today  * 100) / 100,
    revenue_month:  Math.round(revenue_month  * 100) / 100,
    total_orders,
    orders_today,
    average_ticket: Math.round(average_ticket * 100) / 100,
  })
})

export default router
