/**
 * editableFields.js — Compatibility shim.
 *
 * The authoritative registry has moved to fieldRegistry.js.
 * This file re-exports the essentials so existing imports continue to work.
 */
export { isPathAllowed, FIELD_REGISTRY as EDITABLE_FIELDS } from "./fieldRegistry.js";
