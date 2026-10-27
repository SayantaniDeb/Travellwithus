// Production requests use Vercel's same-origin /api proxy.
// Local development can target a separate backend through VITE_API_URL.
export const API_BASE = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
