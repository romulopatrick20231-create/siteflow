/**
 * emailService.js — Transactional email via Resend REST API.
 *
 * Uses native fetch — no npm package required.
 * Called when an order is paid to notify the business owner.
 */

import logger from "../utils/logger.js";

const RESEND_API = "https://api.resend.com/emails";

function getResendKey() {
  return process.env.RESEND_API_KEY || null;
}

function getFromEmail() {
  return process.env.RESEND_FROM_EMAIL || "pedidos@forgesites.app";
}

// ── Format helpers ────────────────────────────────────────────────────────────

function fmtBRL(cents) {
  return "R$ " + (cents / 100).toFixed(2).replace(".", ",");
}

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Email templates ───────────────────────────────────────────────────────────

/**
 * Build HTML email for a new paid order notification sent to the business owner.
 */
function buildOrderEmail({ businessName, order, items }) {
  const rows = (items || []).map(i => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${i.product_name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center">${i.qty}x</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right">${fmtBRL(i.total_cents)}</td>
    </tr>`).join("");

  const deliveryRow = order.delivery_cents > 0
    ? `<tr><td colspan="2" style="padding:8px 12px;color:#666">Taxa de entrega</td><td style="padding:8px 12px;text-align:right">${fmtBRL(order.delivery_cents)}</td></tr>`
    : "";

  const deliveryBadge = order.delivery_type === "delivery"
    ? `<span style="background:#DBEAFE;color:#1D4ED8;padding:2px 10px;border-radius:12px;font-size:12px">🛵 Delivery</span>`
    : `<span style="background:#D1FAE5;color:#065F46;padding:2px 10px;border-radius:12px;font-size:12px">🏪 Retirada</span>`;

  const customerBlock = [
    order.customer_name  && `<b>Nome:</b> ${order.customer_name}`,
    order.customer_email && `<b>Email:</b> ${order.customer_email}`,
    order.customer_phone && `<b>Telefone:</b> ${order.customer_phone}`,
    order.customer_cep   && `<b>CEP:</b> ${order.customer_cep}`,
  ].filter(Boolean).join("<br>");

  const orderId = order.id ? order.id.slice(0, 8).toUpperCase() : "—";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:40px 0">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.1)">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1D4ED8,#2563EB);padding:28px 32px">
          <p style="margin:0;color:rgba(255,255,255,.8);font-size:13px;text-transform:uppercase;letter-spacing:.05em">ForgeSites • Novo Pedido</p>
          <h1 style="margin:6px 0 0;color:#FFFFFF;font-size:24px;font-weight:700">${businessName}</h1>
        </td></tr>

        <!-- Order ID + date -->
        <tr><td style="padding:24px 32px 0;border-bottom:1px solid #F0F0F0">
          <table width="100%"><tr>
            <td>
              <p style="margin:0;font-size:13px;color:#666">Pedido</p>
              <p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#111">#${orderId}</p>
            </td>
            <td align="right">
              <p style="margin:0;font-size:13px;color:#666">${fmtDate(order.created_at)}</p>
              <div style="margin-top:6px">${deliveryBadge}</div>
            </td>
          </tr></table>
          <div style="height:20px"></div>
        </td></tr>

        <!-- Items table -->
        <tr><td style="padding:20px 32px 0">
          <p style="margin:0 0 12px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#888">Itens</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">
            <thead>
              <tr style="background:#F9FAFB">
                <th style="padding:8px 12px;text-align:left;color:#666;font-weight:600;font-size:12px">Produto</th>
                <th style="padding:8px 12px;text-align:center;color:#666;font-weight:600;font-size:12px">Qtd</th>
                <th style="padding:8px 12px;text-align:right;color:#666;font-weight:600;font-size:12px">Total</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>
              ${deliveryRow}
              <tr style="background:#F9FAFB">
                <td colspan="2" style="padding:12px;font-weight:700;font-size:15px">Total</td>
                <td style="padding:12px;font-weight:700;font-size:15px;text-align:right;color:#1D4ED8">${fmtBRL(order.total_cents)}</td>
              </tr>
            </tfoot>
          </table>
        </td></tr>

        <!-- Customer info -->
        ${customerBlock ? `
        <tr><td style="padding:24px 32px 0">
          <p style="margin:0 0 10px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#888">Cliente</p>
          <div style="background:#F9FAFB;border-radius:8px;padding:14px 16px;font-size:14px;line-height:1.8;color:#333">
            ${customerBlock}
          </div>
        </td></tr>` : ""}

        <!-- Footer -->
        <tr><td style="padding:28px 32px;border-top:1px solid #F0F0F0;margin-top:24px">
          <p style="margin:0;font-size:12px;color:#999;text-align:center">
            Você recebeu este email porque é dono do site <b>${businessName}</b> no ForgeSites.<br>
            Acesse seu painel para gerenciar o pedido.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Send a new-order notification email to the business owner.
 *
 * @param {object} opts
 * @param {string}  opts.ownerEmail
 * @param {string}  opts.businessName
 * @param {object}  opts.order        - order row from DB
 * @param {Array}   opts.items        - order_items rows from DB
 */
export async function sendOrderNotification({ ownerEmail, businessName, order, items }) {
  const key = getResendKey();
  if (!key) {
    logger.warn("RESEND_API_KEY not set — skipping order email");
    return;
  }

  const orderId = order.id ? order.id.slice(0, 8).toUpperCase() : "novo pedido";
  const subject = `🛒 Novo pedido #${orderId} — ${businessName}`;
  const html = buildOrderEmail({ businessName, order, items });

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        from:    `ForgeSites <${getFromEmail()}>`,
        to:      [ownerEmail],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.warn("Resend email failed", { status: res.status, body });
      return;
    }

    const data = await res.json().catch(() => ({}));
    logger.info("Order notification email sent", { ownerEmail, orderId: order.id, emailId: data.id });
  } catch (err) {
    // Never let email failure break the order flow
    logger.warn("sendOrderNotification threw", { error: err.message });
  }
}
