const KEY = 'travelwithus-auth-return';

export function rememberPlannerReturn(storage, path) {
  if (!/^\/plan-trip(?:\?|$)/.test(path)) throw new Error('Invalid planner return path');
  storage.setItem(KEY, JSON.stringify({ path, createdAt: Date.now() }));
}

export function consumePlannerReturn(storage, now = Date.now()) {
  try {
    const saved = JSON.parse(storage.getItem(KEY) || 'null');
    storage.removeItem(KEY);
    if (saved && /^\/plan-trip(?:\?|$)/.test(saved.path) && Number.isFinite(saved.createdAt) && now - saved.createdAt >= 0 && now - saved.createdAt < 24 * 60 * 60 * 1000) return saved.path;
  } catch { /* A missing or invalid return target uses the dashboard. */ }
  return '/home';
}
