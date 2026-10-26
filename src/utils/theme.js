const key = 'travelwithus-theme';
export function readTheme() {
  try { const saved=localStorage.getItem(key); if (saved==='light' || saved==='dark') return saved; } catch {}
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
export function applyTheme(theme) {
  document.documentElement.classList.toggle('dark',theme==='dark');
  document.documentElement.style.colorScheme=theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#0b1220':'#ffffff');
}
export function setTheme(theme) {
  try {localStorage.setItem(key,theme);} catch {}
  applyTheme(theme);
  window.dispatchEvent(new Event('travel-theme-change'));
}
export function subscribeTheme(callback) {
  const update=()=>{applyTheme(readTheme());callback();};
  const system=()=>{try {if(localStorage.getItem(key))return;}catch {}update();};
  const media=window.matchMedia?.('(prefers-color-scheme: dark)');
  window.addEventListener('storage',update);window.addEventListener('travel-theme-change',callback);media?.addEventListener('change',system);
  return ()=>{window.removeEventListener('storage',update);window.removeEventListener('travel-theme-change',callback);media?.removeEventListener('change',system);};
}
