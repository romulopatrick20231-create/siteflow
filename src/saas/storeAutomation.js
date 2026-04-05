/**
 * storeAutomation.js — Automações internas do sistema de pedidos.
 *
 * Follow-up de 30 minutos:
 *   Identifica pedidos `pending` com mais de 30 min sem confirmação.
 *   O frontend/cron chama `getPendingFollowups(storeId)` e usa o resultado
 *   para notificar o lojista (via UI, push, webhook, etc.).
 *   Após disparar a notificação, chama `markFollowupSent(orderId, 'pending_30min')`.
 *
 * Reativação simples:
 *   Pedidos `completed` há mais de 7 dias — candidatos para recontato.
 *   Útil para campanhas de retorno (WhatsApp, email, push).
 */

import { getAdminClient } from './db.js';

const PENDING_FOLLOWUP_MINUTES = 30;
const REACTIVATION_DAYS        = 7;

// ── Follow-up: pedidos pending > 30 min ──────────────────────────────────────

/**
 * Retorna pedidos `pending` criados há mais de 30 min
 * que ainda não receberam o follow-up `pending_30min`.
 *
 * @param {string} storeId
 * @returns {Promise<Array>}
 */
export async function getPendingFollowups(storeId) {
  const db        = getAdminClient();
  const threshold = new Date(Date.now() - PENDING_FOLLOWUP_MINUTES * 60 * 1000).toISOString();

  // Busca pedidos pending antigos sem follow-up registrado
  const { data, error } = await db
    .from('store_orders')
    .select(`
      id, customer_name, customer_phone, customer_address, total_price, created_at,
      store_order_followups ( id, type )
    `)
    .eq('store_id', storeId)
    .eq('status', 'pending')
    .lt('created_at', threshold)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`getPendingFollowups: ${error.message}`);

  // Filtra apenas os que não têm follow-up pending_30min registrado
  return (data ?? []).filter(
    (o) => !o.store_order_followups?.some((f) => f.type === 'pending_30min')
  ).map(({ store_order_followups: _, ...order }) => order); // remove join do retorno
}

/**
 * Registra que o follow-up foi disparado para um pedido.
 * Usa UPSERT com UNIQUE(order_id, type) — idempotente.
 *
 * @param {string} orderId
 * @param {string} storeId
 * @param {'pending_30min'|'reactivation'} type
 */
export async function markFollowupSent(orderId, storeId, type) {
  const db = getAdminClient();
  const { error } = await db
    .from('store_order_followups')
    .upsert({ order_id: orderId, store_id: storeId, type }, { onConflict: 'order_id,type' });

  if (error) throw new Error(`markFollowupSent: ${error.message}`);
  return { recorded: true };
}

// ── Reativação: clientes que pediram há +7 dias ───────────────────────────────

/**
 * Retorna pedidos `completed` de mais de 7 dias atrás,
 * sem follow-up `reactivation` registrado.
 * Útil para campanha de retorno (mostrar no painel do lojista).
 *
 * @param {string} storeId
 * @param {number} [limit=50]
 */
export async function getReactivationCandidates(storeId, limit = 50) {
  const db        = getAdminClient();
  const threshold = new Date(Date.now() - REACTIVATION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await db
    .from('store_orders')
    .select(`
      id, customer_name, customer_phone, customer_address, total_price, created_at,
      store_order_followups ( id, type )
    `)
    .eq('store_id', storeId)
    .eq('status', 'completed')
    .lt('created_at', threshold)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getReactivationCandidates: ${error.message}`);

  return (data ?? [])
    .filter((o) => !o.store_order_followups?.some((f) => f.type === 'reactivation'))
    .map(({ store_order_followups: _, ...order }) => order);
}

/**
 * Executa verificação completa de automação para uma loja.
 * Retorna o que precisa ser processado (não dispara nada — apenas informa).
 *
 * @param {string} storeId
 */
export async function runAutomationCheck(storeId) {
  const [pendingFollowups, reactivationCandidates] = await Promise.all([
    getPendingFollowups(storeId),
    getReactivationCandidates(storeId, 20),
  ]);

  return {
    pendingFollowups: {
      count: pendingFollowups.length,
      orders: pendingFollowups,
    },
    reactivation: {
      count: reactivationCandidates.length,
      orders: reactivationCandidates,
    },
  };
}
