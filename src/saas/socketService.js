/**
 * socketService.js — Singleton do Socket.io.
 *
 * Centraliza a instância `io` para que qualquer módulo possa emitir
 * eventos sem precisar receber `io` por parâmetro.
 *
 * Uso:
 *   // Em server.js — inicializar uma vez:
 *   import { init } from './src/saas/socketService.js';
 *   init(io);
 *
 *   // Em qualquer serviço — emitir evento:
 *   import { emitToStore } from './socketService.js';
 *   emitToStore(storeId, 'new_order', orderPayload);
 */

import logger from '../utils/logger.js';

let _io = null;

/**
 * Inicializa o singleton com a instância do Socket.io.
 * Deve ser chamado uma única vez em server.js.
 * @param {import('socket.io').Server} io
 */
export function init(io) {
  _io = io;
  logger.info('Socket.io inicializado');
}

/**
 * Retorna a instância io. Null antes de init() ser chamado.
 * @returns {import('socket.io').Server|null}
 */
export function getIO() {
  return _io;
}

/**
 * Emite um evento para a room de uma loja específica.
 * Room pattern: store:{storeId}
 *
 * Falha silenciosamente se o socket ainda não foi inicializado
 * (garante que o REST continue funcionando mesmo sem socket).
 *
 * @param {string} storeId
 * @param {string} event   — nome do evento (ex: "new_order", "order_update")
 * @param {object} payload — dados a enviar
 */
export function emitToStore(storeId, event, payload) {
  if (!_io) {
    logger.warn('socketService.emitToStore: io não inicializado', { storeId, event });
    return;
  }

  const room = `store:${storeId}`;
  _io.to(room).emit(event, payload);

  logger.debug('Socket emitido', { room, event });
}
