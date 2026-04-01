/**
 * auth.js — Supabase JWT verification middleware.
 *
 * Verifies the Bearer token on every protected route.
 * Attaches req.user (Supabase user) and req.userId.
 * Also loads the user's profile from public.users to get plan/is_admin.
 */

import { getAdminClient } from "../saas/db.js";
import { UnauthorizedError, ForbiddenError } from "../utils/errors.js";
import logger from "../utils/logger.js";

/**
 * Extract Bearer token from Authorization header.
 */
function extractToken(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

/**
 * requireAuth — verifies JWT + loads user profile.
 * Attaches: req.user, req.userId, req.userProfile
 */
export async function requireAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) throw new UnauthorizedError("No authorization token provided");

    const admin = getAdminClient();

    // Verify token with Supabase Auth
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user) throw new UnauthorizedError("Invalid or expired session");

    // Load user profile (plan, is_admin, is_active)
    const { data: profile, error: profileErr } = await admin
      .from("users")
      .select("id, email, plan, is_admin, is_active, publish_limit, publish_count_month")
      .eq("id", user.id)
      .single();

    if (profileErr) {
      // Profile may not exist yet for brand-new users — create it
      logger.warn("User profile missing, provisioning", { userId: user.id });
      const { data: newProfile } = await admin
        .from("users")
        .upsert({ id: user.id, email: user.email, plan: "basic" }, { onConflict: "id" })
        .select()
        .single();
      req.userProfile = newProfile;
    } else {
      req.userProfile = profile;
    }

    // Block inactive accounts
    if (req.userProfile && req.userProfile.is_active === false) {
      throw new ForbiddenError("Your account has been deactivated. Please contact support.");
    }

    req.user   = user;
    req.userId = user.id;

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * optionalAuth — same as requireAuth but doesn't reject if no token.
 * Used for public routes that have extra features when authenticated.
 */
export async function optionalAuth(req, _res, next) {
  const token = extractToken(req);
  if (!token) return next();

  try {
    const admin = getAdminClient();
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (!error && user) {
      req.user   = user;
      req.userId = user.id;
    }
  } catch {
    // silently ignore — this is optional
  }
  next();
}
