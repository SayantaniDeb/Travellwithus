import { Plane } from 'lucide-react';

export default function LoadingSpinner({ label = 'Loading…', compact = false }) {
  return (
    <div role="status" className={`flex items-center justify-center ${compact ? 'gap-2' : 'flex-col gap-4 py-8'}`}>
      <span aria-hidden="true" className={`flight-loader ${compact ? 'flight-loader-small' : ''}`}>
        <span className="flight-loader-orbit"><Plane className="flight-loader-plane" /></span>
      </span>
      <span className="text-xs font-medium text-slate-500">{label}</span>
    </div>
  );
}
