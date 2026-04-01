/**
 * adminGuard.js — Must run AFTER requireAuth.
 * Checks req.userProfile.is_admin before allowing access to admin routes.
 */

import { ForbiddenError } from "../utils/errors.js";
import logger from "../utils/logger.js";

export function requireAdmin(req, _res, next) {
  if (!req.userProfile?.is_admin) {
    logger.warn("Admin route access denied", {
      userId: req.userId,
      path:   req.path,
      ip:     req.ip,
    });
    return next(new ForbiddenError("Admin access required"));
  }
  next();
}
