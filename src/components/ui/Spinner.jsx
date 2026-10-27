export default function Spinner({ className = 'h-4 w-4' }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={`shrink-0 animate-spin ${className}`}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity=".2"/><path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>;
}
