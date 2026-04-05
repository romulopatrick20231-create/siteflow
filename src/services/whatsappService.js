/**
 * whatsappService.js — Integração com Z-API para envio de WhatsApp.
 *
 * Regra de ouro: NUNCA lançar exceção para o chamador.
 * Se o envio falhar (rede, credenciais, número inválido), o erro é logado
 * e a função retorna { sent: false, error } — o pedido segue normalmente.
 *
 * Variáveis de ambiente necessárias (opcionais — serviço desabilitado se ausentes):
 *   ZAPI_INSTANCE_ID   — ID da instância Z-API
 *   ZAPI_TOKEN         — Token de segurança da instância
 *   ZAPI_CLIENT_TOKEN  — Client-Token do header (conta Z-API)
 *
 * Docs Z-API: https://developer.z-api.io/message/send-text
 */

import axios  from 'axios';
import logger from '../utils/logger.js';

// ── Config ────────────────────────────────────────────────────────────────────

const ZAPI_BASE = 'https://api.z-api.io/instances';

function getConfig() {
  const instanceId   = process.env.ZAPI_INSTANCE_ID;
  const token        = process.env.ZAPI_TOKEN;
  const clientToken  = process.env.ZAPI_CLIENT_TOKEN;
  return { instanceId, token, clientToken };
}

function isEnabled() {
  const { instanceId, token, clientToken } = getConfig();
  return !!(instanceId && token && clientToken);
}

// ── Formatação de telefone ─────────────────────────────────────────────────────

/**
 * Normaliza telefone para o formato E.164 sem o "+".
 * Z-API aceita: "5511999998888" (DDI + DDD + número).
 *
 * Aceita entradas como:
 *   (11) 99999-8888  →  5511999998888
 *   11999998888      →  5511999998888
 *   +5511999998888   →  5511999998888
 *   5511999998888    →  5511999998888
 */
function formatPhone(raw) {
  // Remove tudo que não for dígito
  const digits = String(raw).replace(/\D/g, '');

  // Já tem DDI 55
  if (digits.startsWith('55') && digits.length >= 12) return digits;

  // Sem DDI — adiciona 55 (Brasil)
  return `55${digits}`;
}

// ── Envio base ────────────────────────────────────────────────────────────────

/**
 * Envia uma mensagem de texto via Z-API.
 *
 * @param {string} phone   — telefone do destinatário (qualquer formato)
 * @param {string} message — texto da mensagem
 * @returns {Promise<{ sent: boolean, error?: string }>}
 */
export async function sendMessage(phone, message) {
  if (!isEnabled()) {
    logger.debug('whatsappService: desabilitado (vars Z-API não configuradas)');
    return { sent: false, error: 'ZAPI não configurado' };
  }

  if (!phone || !message) {
    logger.warn('whatsappService.sendMessage: phone ou message ausente');
    return { sent: false, error: 'phone e message são obrigatórios' };
  }

  const { instanceId, token, clientToken } = getConfig();
  const url     = `${ZAPI_BASE}/${instanceId}/token/${token}/send-text`;
  const payload = { phone: formatPhone(phone), message };

  try {
    await axios.post(url, payload, {
      headers: {
        'Content-Type':  'application/json',
        'Client-Token':  clientToken,
      },
      timeout: 8_000,
    });

    logger.debug('whatsappService: mensagem enviada', { phone: formatPhone(phone) });
    return { sent: true };

  } catch (err) {
    const detail = err.response?.data ?? err.message;
    logger.error('whatsappService.sendMessage: falha no envio', {
      phone: formatPhone(phone),
      error: detail,
    });
    return { sent: false, error: String(detail) };
  }
}

// ── Mensagens específicas ─────────────────────────────────────────────────────

/**
 * Confirma novo pedido para o cliente.
 *
 * Envia resumo completo: número do pedido, itens, total, status.
 *
 * @param {object} order — objeto completo do pedido (com items[])
 */
export async function sendOrderConfirmation(order) {
  const phone = order.customer_phone;
  if (!phone) return { sent: false, error: 'Telefone do cliente ausente' };

  // Monta lista de itens
  const itemLines = (order.items ?? [])
    .map((i) => `  • ${i.quantity}x — R$ ${Number(i.price).toFixed(2)}`)
    .join('\n');

  const message = [
    `✅ *Pedido recebido com sucesso!*`,
    ``,
    `Olá, *${order.customer_name}*! Seu pedido foi registrado.`,
    ``,
    `🧾 *Resumo do pedido #${order.id.slice(0, 8).toUpperCase()}*`,
    itemLines,
    ``,
    `🛵 Entrega em: *${order.customer_address}*`,
    `💰 Total: *R$ ${Number(order.total_price).toFixed(2)}*`,
    ``,
    `Em breve você receberá uma atualização do status. Obrigado! 🙏`,
  ].join('\n');

  return sendMessage(phone, message);
}

/**
 * Notifica mudança de status — especialmente "delivering".
 *
 * Mensagem varia pelo tipo de loja (food / pharmacy).
 *
 * @param {object} order — { customer_phone, customer_name, id, store_id, status }
 * @param {string} storeType — 'food' | 'pharmacy'
 */
export async function sendOrderStatus(order, storeType) {
  const phone = order.customer_phone;
  if (!phone) return { sent: false, error: 'Telefone do cliente ausente' };

  const STATUS_MSG = {
    food:     'Sua pizza já saiu 🍕 Estamos a caminho!',
    pharmacy: 'Seu pedido está a caminho 💊 Aguarde o entregador.',
  };

  const baseMsg  = STATUS_MSG[storeType] ?? 'Seu pedido está a caminho!';
  const orderId  = order.id.slice(0, 8).toUpperCase();

  const message = [
    `🚀 *Atualização do pedido #${orderId}*`,
    ``,
    `${baseMsg}`,
    ``,
    `Fique de olho e já deixa o local de entrega preparado. 👋`,
  ].join('\n');

  return sendMessage(phone, message);
}

/**
 * Envia follow-up 30 minutos após o pedido, verificando se tudo ocorreu bem.
 *
 * @param {object} order — { customer_phone, customer_name, id }
 */
export async function sendFollowUp(order) {
  const phone = order.customer_phone;
  if (!phone) return { sent: false, error: 'Telefone do cliente ausente' };

  const orderId = order.id.slice(0, 8).toUpperCase();

  const message = [
    `😊 *Olá, ${order.customer_name}!*`,
    ``,
    `Deu tudo certo com seu pedido #${orderId}?`,
    ``,
    `Se tiver qualquer problema, é só responder aqui que resolvemos! 🙌`,
  ].join('\n');

  return sendMessage(phone, message);
}
