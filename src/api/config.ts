/**
 * Base URL for API calls.
 * - Dev  : not set → falls back to '/api' (Vite proxy rewrites to localhost:3000)
 * - Prod : set to 'https://api.xonaris.space' via Cloudflare Pages env var
 */
export const API_URL = import.meta.env.VITE_API_URL || '/api';
