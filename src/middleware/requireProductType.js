/**
 * requireProductType.js — Middleware de isolamento entre PedeZap e FarmaZap.
 *
 * Uso:
 *   router.get('/prescriptions', requireType('farmazap'), handler)
 *   router.get('/delivery',      requireType('pedezap'),  handler)
 *
 * Deve ser usado APÓS requireAuth (depende de req.userProfile).
 *
 * Retorna 403 se o usuário pertencer a um produto diferente do esperado.
 */

const PRODUCT_NAMES = {
  pedezap:  'PedeZap',
  farmazap: 'FarmaZap',
};

/**
 * Bloqueia acesso se req.userProfile.type !== expectedType.
 *
 * @param {'pedezap' | 'farmazap'} expectedType
 * @returns Express middleware
 */
export function requireType(expectedType) {
  return (req, res, next) => {
    if (!req.userProfile) {
      return res.status(401).json({
        success:   false,
        error:     'Não autenticado',
        timestamp: new Date().toISOString(),
      });
    }

    const userType = req.userProfile.type;

    if (userType !== expectedType) {
      const expected = PRODUCT_NAMES[expectedType] ?? expectedType;
      const actual   = userType ? (PRODUCT_NAMES[userType] ?? userType) : 'sem tipo definido';

      return res.status(403).json({
        success:   false,
        error:     `Acesso negado. Esta rota é exclusiva do ${expected}.`,
        detail:    `Seu usuário é do produto "${actual}".`,
        timestamp: new Date().toISOString(),
      });
    }

    next();
  };
}
