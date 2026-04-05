/**
 * adminOrders.js — Rotas de super admin para o sistema de pedidos.
 *
 * Montado em /admin (junto com o admin.js existente — sem conflito de paths).
 *
 * GET /admin/stores           — todas as lojas com stats básicas
 * GET /admin/orders           — todos os pedidos (com filtros)
 * GET /admin/revenue          — receita agregada por loja / período
 */

import { Router } from 'express';

import { asyncHandler, send } from '../utils/asyncHandler.js';
import { requireAuth }        from '../middleware/auth.js';
import { requireAdmin }       from '../middleware/adminGuard.js';
import { getAdminClient }     from '../saas/db.js';

const router = Router();
router.use(requireAuth, requireAdmin);

// ── GET /admin/stores ────────────────────────────────────────────────────────
/**
 * Lista todas as lojas com contagem de pedidos e receita total.
 * Query: ?type=food|pharmacy  &active=true|false  &search=nome
 */
router.get('/stores', asyncHandler(async (req, res) => {
  const db = getAdminClient();
  const { type, active, search } = req.query;

  let query = db
    .from('stores')
    .select(`
      id, name, slug, type, delivery_fee, is_active, owner_id, created_at,
      users ( id, email, plan )
    `)
    .order('created_at', { ascending: false });

  if (type)   query = query.eq('type', type);
  if (active !== undefined) query = query.eq('is_active', active === 'true');
  if (search) query = query.ilike('name', `%${search}%`);

  const { data: stores, error } = await query;
  if (error) throw new Error(`adminListStores: ${error.message}`);

  // Agrega contagem de pedidos e receita para cada loja
  const storeIds = (stores ?? []).map((s) => s.id);
  let orderStats = [];

  if (storeIds.length > 0) {
    const { data: stats } = await db
      .from('store_orders')
      .select('store_id, status, total_price')
      .in('store_id', storeIds);

    // Agrupa por store_id
    const statsMap = {};
    for (const row of stats ?? []) {
      if (!statsMap[row.store_id]) {
        statsMap[row.store_id] = { orderCount: 0, revenue: 0, pendingCount: 0 };
      }
      statsMap[row.store_id].orderCount++;
      if (['completed', 'delivering'].includes(row.status)) {
        statsMap[row.store_id].revenue += Number(row.total_price);
      }
      if (row.status === 'pending') {
        statsMap[row.store_id].pendingCount++;
      }
    }
    orderStats = statsMap;
  }

  const result = (stores ?? []).map((s) => ({
    ...s,
    stats: orderStats[s.id] ?? { orderCount: 0, revenue: 0, pendingCount: 0 },
  }));

  send(res, result);
}));

// ── GET /admin/orders ────────────────────────────────────────────────────────
/**
 * Lista todos os pedidos de todas as lojas.
 * Query: ?storeId=  &status=  &dateFrom=ISO  &dateTo=ISO  &limit=50  &offset=0
 */
router.get('/orders', asyncHandler(async (req, res) => {
  const db = getAdminClient();
  const { storeId, status, dateFrom, dateTo, limit = '50', offset = '0' } = req.query;

  let query = db
    .from('store_orders')
    .select(`
      id, customer_name, customer_phone, customer_address, total_price, delivery_fee,
      status, created_at, updated_at,
      stores ( id, name, slug, type )
    `)
    .order('created_at', { ascending: false })
    .range(parseInt(offset, 10), parseInt(offset, 10) + parseInt(limit, 10) - 1);

  if (storeId)  query = query.eq('store_id', storeId);
  if (status)   query = query.eq('status', status);
  if (dateFrom) query = query.gte('created_at', dateFrom);
  if (dateTo)   query = query.lte('created_at', dateTo);

  const { data, error } = await query;
  if (error) throw new Error(`adminListOrders: ${error.message}`);
  send(res, data ?? []);
}));

// ── GET /admin/revenue ───────────────────────────────────────────────────────
/**
 * Receita agregada.
 * Query: ?storeId=  &period=day|week|month  &dateFrom=ISO  &dateTo=ISO
 *
 * Retorna:
 *   - totalRevenue: número global (ou da loja filtrada)
 *   - totalOrders: contagem
 *   - byStore: [{ storeId, name, revenue, orderCount }]
 *   - byDay: [{ date, revenue, orderCount }]  (últimos 30 dias se sem filtro)
 */
router.get('/revenue', asyncHandler(async (req, res) => {
  const db = getAdminClient();
  const { storeId, dateFrom, dateTo } = req.query;

  // Período padrão: últimos 30 dias
  const from = dateFrom ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const to   = dateTo   ?? new Date().toISOString();

  let query = db
    .from('store_orders')
    .select('id, store_id, total_price, delivery_fee, status, created_at, stores(id, name, type)')
    .in('status', ['completed', 'delivering'])
    .gte('created_at', from)
    .lte('created_at', to)
    .order('created_at', { ascending: true });

  if (storeId) query = query.eq('store_id', storeId);

  const { data: orders, error } = await query;
  if (error) throw new Error(`adminRevenue: ${error.message}`);

  const rows = orders ?? [];

  // Totais globais
  let totalRevenue = 0;
  for (const o of rows) totalRevenue += Number(o.total_price);

  // Por loja
  const byStoreMap = {};
  for (const o of rows) {
    if (!byStoreMap[o.store_id]) {
      byStoreMap[o.store_id] = {
        storeId:    o.store_id,
        name:       o.stores?.name ?? o.store_id,
        type:       o.stores?.type,
        revenue:    0,
        orderCount: 0,
      };
    }
    byStoreMap[o.store_id].revenue    += Number(o.total_price);
    byStoreMap[o.store_id].orderCount += 1;
  }

  // Por dia (agregação em memória — simples e rápida para volumes normais)
  const byDayMap = {};
  for (const o of rows) {
    const day = o.created_at.slice(0, 10); // "2025-04-01"
    if (!byDayMap[day]) byDayMap[day] = { date: day, revenue: 0, orderCount: 0 };
    byDayMap[day].revenue    += Number(o.total_price);
    byDayMap[day].orderCount += 1;
  }

  send(res, {
    period:       { from, to },
    totalRevenue,
    totalOrders:  rows.length,
    byStore:      Object.values(byStoreMap).sort((a, b) => b.revenue - a.revenue),
    byDay:        Object.values(byDayMap).sort((a, b) => a.date.localeCompare(b.date)),
  });
}));

export default router;
