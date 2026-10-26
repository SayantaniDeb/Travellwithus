import { AlertTriangle } from 'lucide-react';
import { tripBudgetSummary } from '../utils/tripBudget';
export default function PlanBudgetWarning({ plan, budget, symbol = '₹' }) {
  const amount=Number(budget),cost=tripBudgetSummary(plan,amount);
  if (!(amount>0) || cost.estimate<=amount) return null;
  const money=value=>`${symbol}${value.toLocaleString(undefined,{maximumFractionDigits:2})}`;
  return <div role="status" aria-live="polite" className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950"><AlertTriangle aria-hidden="true" size={19} className="mt-0.5 shrink-0 text-amber-600" /><div><p className="text-sm font-semibold">{cost.available?'Plan exceeds your budget by':'Recorded estimates already exceed your budget by at least'} {money(cost.estimate-amount)}</p><p className="mt-1 text-xs leading-relaxed text-amber-800">Recorded plan costs: {money(cost.estimate)} · Total budget: {money(amount)}.{!cost.available?' Some day or journey costs are still missing.':''} This compares planning estimates, not actual spending.</p></div></div>;
}
