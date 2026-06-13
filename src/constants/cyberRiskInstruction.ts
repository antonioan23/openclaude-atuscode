/**
 * CYBER_RISK_INSTRUCTION — REMOVED in 0.18.8
 *
 * The user (hostclube) requested removal of this prompt on 2026-06-13.
 * Their stated use cases (gambling, adult, security research) require a
 * model that does not pre-refuse based on content category.
 *
 * Refusal scrubbing is now done at the proxy layer (see
 * nvidia-proxy/server.js#stripRefusalFromString).
 */
export const CYBER_RISK_INSTRUCTION = ``;
