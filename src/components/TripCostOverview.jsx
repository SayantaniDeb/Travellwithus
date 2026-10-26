import { tripBudgetSummary } from '../utils/tripBudget';

export default function TripCostOverview({ plan, budget, symbol }) {
  const costs = tripBudgetSummary(plan, budget);
  const money = value => `${symbol}${Math.round(value).toLocaleString()}`;
  const hasBudget = Number(budget) > 0;
  const overBudget = hasBudget && costs.balance < 0;
  return (
    <section aria-labelledby="trip-cost-heading" className="mb-7 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="trip-cost-heading" className="text-base font-semibold text-slate-950">Your budget, at a glance</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">Unverified estimates</span>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-5 min-[420px]:grid-cols-2">
          <div><p className="text-xs font-medium text-slate-500">{costs.available ? 'Estimated trip total' : 'Known cost subtotal'}</p><p className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">{money(costs.estimate)}</p><p className="mt-1 text-xs text-slate-400">{costs.available ? 'Recorded costs for the whole trip' : 'Incomplete — some costs are missing'}</p></div>
          <div className="min-[420px]:border-l min-[420px]:border-slate-100 min-[420px]:pl-5"><p className="text-xs font-medium text-slate-500">Your total budget</p><p className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">{hasBudget ? money(Number(budget)) : 'Flexible'}</p><p className="mt-1 text-xs text-slate-400">For all {costs.dayCount} days</p></div>
        </div>
      </div>
      <dl className="space-y-4 px-5 py-5 text-sm sm:px-6">
        <div className="flex items-start justify-between gap-5"><div><dt className="font-medium text-slate-700">Day expenses · whole trip</dt><dd className="mt-0.5 text-xs text-slate-400">Sum of {costs.dayCount} days{costs.missingDays ? ` · ${costs.missingDays} not estimated` : ''}</dd></div><dd className="shrink-0 font-semibold text-slate-900">{costs.missingDays ? 'At least ' : ''}{money(costs.dayTotal)}</dd></div>
        <div className="flex items-start justify-between gap-5"><div><dt className="font-medium text-slate-700">Average per day</dt><dd className="mt-0.5 text-xs text-slate-400">Day expenses ÷ {costs.dayCount} · excludes intercity travel</dd></div><dd className="shrink-0 font-semibold text-slate-900">{costs.averagePerDay === null ? 'Not estimated' : money(costs.averagePerDay)}</dd></div>
        <div className="flex items-start justify-between gap-5"><div><dt className="font-medium text-slate-700">Intercity travel · round trip</dt><dd className="mt-0.5 text-xs text-slate-400">{costs.travelTotal === null ? 'One or both journey costs are missing' : 'Separate onward and return cost estimates'}</dd></div><dd className="shrink-0 font-semibold text-slate-900">{costs.travelTotal === null ? (plan.includeTravel === false ? 'Not included' : 'Not estimated') : money(costs.travelTotal)}</dd></div>
      </dl>
      {hasBudget && <div role="status" className={`flex flex-wrap items-center justify-between gap-2 border-t px-5 py-4 text-sm sm:px-6 ${overBudget ? 'border-amber-100 bg-amber-50 text-amber-900' : costs.available ? 'border-emerald-100 bg-emerald-50 text-emerald-900' : 'border-slate-100 bg-slate-50 text-slate-600'}`}>
        <span className="font-medium">{overBudget ? (costs.available ? 'Over budget by' : 'Already over budget by at least') : costs.available ? 'Estimated remaining' : 'Remaining budget cannot be confirmed yet'}</span>
        {(overBudget || costs.available) && <strong>{money(Math.abs(costs.balance))}</strong>}
      </div>}
      <p className="border-t border-slate-100 px-5 py-4 text-[11px] leading-relaxed text-slate-500 sm:px-6">These are planning estimates, not actual spending. Accommodation, transfers and fees not recorded in the daily estimates may be extra. Missing costs are never treated as free.</p>
    </section>
  );
}
