import { useEffect, useState, useMemo, useId } from 'react';
import { Link } from 'react-router-dom';
import { addDoc, updateDoc, deleteDoc, doc, collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../Firebase';
import { PencilLine, Trash2, X, Plus, Loader2 } from 'lucide-react';
import { estimateRowPatch } from '../utils/ledgerEdits';
import { budgetLedger } from '../utils/budgetLedger';

import { Button, Input, Label, NativeSelect } from './ui/form-controls';

const categoryNames = { accommodation: 'Accommodation', food: 'Food & dining', transport: 'Transport', activities: 'Activities', shopping: 'Shopping', other: 'Other' };

export default function BudgetTrackerPreview({ trip, userId, symbol, standalone = false, readOnlyEstimates = false, onDraftChange }) {
  const formId = useId();
  const localDate=()=>{const now=new Date();return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;};
  const [amount,setAmount]=useState(''),[description,setDescription]=useState(''),[category,setCategory]=useState('food'),[date,setDate]=useState(localDate),[saving,setSaving]=useState(false),[message,setMessage]=useState('');
  const [editing,setEditing]=useState(null),[editAmount,setEditAmount]=useState(''),[rowBusy,setRowBusy]=useState(false),[rowError,setRowError]=useState('');
  const [retry, setRetry] = useState(0);
  const [records, setRecords] = useState({ status: 'loading', expenses: [] });
  useEffect(() => {
    if (onDraftChange) { setRecords({ status: 'ready', expenses: trip.draftExpenses || [] }); return; }
    setRecords({ status: 'loading', expenses: [] });
    if (!db || !userId || !trip.id) {
      setRecords({ status: 'error', expenses: [] });
      return;
    }
    // Same collection and ordering as the full budget tracker.
    const expenses = query(collection(db, 'users', userId, 'trips', trip.id, 'expenses'), orderBy('date', 'desc'));
    return onSnapshot(expenses, snapshot => {
      setRecords({ status: 'ready', expenses: snapshot.docs.map(document => ({ ...document.data(), id: document.id })) });
    }, error => {
      console.error('Could not load tracker expenses:', error.code, error.message);
      setRecords({ status: 'error', expenses: [], code: error.code });
    });
  }, [userId, trip.id, trip.draftExpenses, Boolean(onDraftChange), retry]);

  const ledger=useMemo(()=>budgetLedger(trip,records.expenses),[trip,records.expenses]);
  const remaining=Number(trip.budgetAmount)-ledger.total;
  const ready = records.status === 'ready';
  const unavailable = records.status === 'error';
  const unavailableText = unavailable ? 'Unavailable' : 'Loading…';
  const reliable = ready && ledger.invalid === 0 && ledger.missing === 0;
  const hasBudget = Number(trip.budgetAmount) > 0;
  const money = amount => `${symbol}${Number(amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const addDailyExpense=async event=>{
    event.preventDefault();if(saving)return;
    const value=Number(amount);
    if(!Number.isFinite(value)||value<=0||!date||(!onDraftChange&&(!userId||!trip.id||!db))){setMessage('Enter a valid amount and date to log an expense.');return;}
    if (onDraftChange) {
      onDraftChange({draftExpenses:[...(trip.draftExpenses || []),{id:crypto.randomUUID(),amount:value,description:description.trim()||categoryNames[category],category,date}]});
      setAmount('');setDescription('');setMessage('Cost added to this draft. Save the trip to keep it in your account.');return;
    }
    setSaving(true);setMessage('');
    try{await addDoc(collection(db,'users',userId,'trips',trip.id,'expenses'),{amount:value,description:description.trim()||categoryNames[category],category,date,createdAt:new Date()});setAmount('');setDescription('');setMessage('Expense added. Your spending summary updates automatically.');}
    catch{setMessage('Could not save this expense. Your entries are kept so you can retry.');}
    finally{setSaving(false);}
  };
  const saveRow=async(row,clear=false)=>{
    if(rowBusy||(!onDraftChange&&!userId)||(readOnlyEstimates&&row.type!=='additional'))return;
    const value=clear?null:Number(editAmount);
    if(!clear&&(editAmount.trim()===''||!Number.isFinite(value)||value<0||(row.type==='additional'&&value===0))){setRowError('Enter a valid amount. Added costs must be positive.');return;}
    setRowBusy(true);setRowError('');
    try{
      if(onDraftChange){
        onDraftChange(row.type==='additional'?{draftExpenses:clear?(trip.draftExpenses||[]).filter(item=>item.id!==row.expenseId):(trip.draftExpenses||[]).map(item=>item.id===row.expenseId?{...item,amount:value}:item)}:estimateRowPatch(trip,row,value));
        setEditing(null);return;
      }
      if(row.type==='additional'){const ref=doc(db,'users',userId,'trips',trip.id,'expenses',row.expenseId);if(clear)await deleteDoc(ref);else await updateDoc(ref,{amount:value});}
      else await updateDoc(doc(db,'users',userId,'trips',trip.id),{...estimateRowPatch(trip,row,value),updatedAt:new Date()});
      setEditing(null);
    }catch(err){setRowError(err.message||'Could not save this change. Please retry.');}
    finally{setRowBusy(false);}
  };
  const rowAmount = row => <>{editing===row.id&&!(readOnlyEstimates&&row.type!=='additional')?<form onSubmit={e=>{e.preventDefault();saveRow(row);}} className="flex flex-wrap items-center justify-end gap-2"><input aria-label={`Amount for ${row.description}`} type="number" min={row.type==='additional'?'0.01':'0'} step="0.01" value={editAmount} onChange={e=>setEditAmount(e.target.value)} className="w-24 rounded-lg border border-slate-300 bg-white p-2 text-slate-900"/><button disabled={rowBusy} className="rounded-lg bg-blue-600 px-2 py-2 text-white">Save</button><button type="button" aria-label="Cancel amount edit" onClick={()=>setEditing(null)}><X size={15}/></button></form>:row.amount===null?'Not estimated':money(row.amount)}</>;
  const rowActions = row => <>{readOnlyEstimates&&row.type!=='additional'?<span className="px-2 text-[10px] text-slate-500">Read only</span>:<div className="flex gap-1"><button type="button" aria-label={`Edit ${row.description||'cost'} amount`} title="Edit amount" disabled={rowBusy} onClick={()=>{setEditing(row.id);setEditAmount(row.amount===null?'':String(row.amount));setRowError('');}} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-blue-700 hover:bg-blue-50"><PencilLine size={16}/></button><button type="button" aria-label={`${row.type==='additional'?'Delete cost':'Clear amount for'} ${row.description||'cost'}`} title={row.type==='additional'?'Delete added cost':'Clear amount; keep row and card'} disabled={rowBusy} onClick={()=>saveRow(row,true)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"><Trash2 size={16}/></button></div>}</>;
  return (
    <section aria-labelledby="tracker-preview-heading" className="budget-preview-card rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 id="tracker-preview-heading" className="text-base font-semibold text-slate-950">Budget tracker</h2><p className="mt-1 text-xs text-slate-500">AI plan estimates + additional costs</p></div>
        {!standalone&&!onDraftChange&&<Link to={`/budget/${encodeURIComponent(trip.id)}`} className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100">Open tracker ↗</Link>}
      </div>
      <div aria-live="polite" className="mt-4 grid grid-cols-3 divide-x divide-slate-100 [&>div]:min-w-0 [&>div]:px-3 [&>div:first-child]:pl-0 [&>div:last-child]:pr-0">
        <div><p className="text-xs text-slate-500">Budget</p><p className="mt-1 break-words text-sm font-semibold tabular-nums sm:text-lg text-slate-900">{hasBudget ? money(trip.budgetAmount) : 'Not set'}</p></div>
        <div><p className="text-xs text-slate-500">Planned + added</p><p className="mt-1 break-words text-sm font-semibold tabular-nums sm:text-lg text-slate-900">{ready ? money(ledger.total) : records.status === 'error' ? 'Unavailable' : 'Loading…'}</p></div>
        <div><p className="text-xs text-slate-500">{ready&&hasBudget&&remaining<0?(reliable?'Over budget by':'Over budget by at least'):reliable?'Budget balance':'Remaining (partial)'}</p><p className={`mt-1 break-words text-sm font-semibold tabular-nums sm:text-lg ${remaining<0?'text-amber-700':'text-emerald-700'}`}>{ready&&hasBudget?money(Math.abs(remaining)):ready&&!hasBudget?'Set a budget':records.status==='loading'?'Loading…':'Unavailable'}</p></div>
      </div>
      {ready && hasBudget && !reliable && remaining >= 0 && <p className="mt-3 text-xs leading-relaxed text-slate-500">The remaining amount is an upper limit; missing costs will reduce it.</p>}
      {reliable && hasBudget && <div className="mt-4"><div role="progressbar" aria-label="Budget allocated" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100,ledger.total/Number(trip.budgetAmount)*100)} aria-valuetext={`${money(ledger.total)} allocated of ${money(trip.budgetAmount)}`} className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div style={{ width: `${Math.min(100,ledger.total/Number(trip.budgetAmount)*100)}%` }} className={`h-full rounded-full ${remaining < 0 ? 'bg-amber-500' : 'bg-blue-600'}`} /></div><p className="mt-2 text-xs text-slate-500">{Math.round(ledger.total / Number(trip.budgetAmount) * 100)}% allocated</p></div>}
      {records.status === 'error' && <div role="status" className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800"><p>{records.code === 'permission-denied' ? 'You do not have permission to read these expenses.' : 'Could not load additional expenses. Your plan estimates are still shown; the balance is unavailable.'}</p><button type="button" onClick={() => setRetry(value => value + 1)} className="mt-2 rounded-lg border border-amber-200 px-3 py-1 font-semibold">Retry loading expenses</button></div>}
      {ready && ledger.invalid > 0 && <p role="status" className="mt-4 text-xs text-amber-700">Some expenses have invalid amounts. The spending subtotal is incomplete; check them in the tracker.</p>}
      {onDraftChange && <p className="mt-3 text-xs text-slate-500">Draft tracker · save this trip to keep your costs in your account.</p>}
      {ready && records.expenses.length === 0 && <p className="mt-3 text-xs text-slate-500">Your plan estimates are listed below. Add extra costs as new rows.</p>}
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500"><span>Saved plan: <strong className="text-slate-900">{money(ledger.baseline)}</strong></span><span>Additional costs: <strong className="text-slate-900">{ready?money(ledger.added):unavailableText}</strong></span></div>
      {ledger.missing>0&&<p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">{ledger.missing} plan cost{ledger.missing===1?' is':'s are'} missing. The displayed total is partial.</p>}
      <div className="mt-4 sm:hidden">
        <ul aria-label="Trip cost items" className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200">
          {ledger.rows.map(row => <li key={row.id} className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-3 py-2 ${row.type === 'additional' ? 'bg-blue-50/40' : ''}`}>
            <p className="min-w-0 break-words text-xs font-medium leading-5 text-slate-900">{row.description || categoryNames[row.category] || 'Additional cost'}</p>
            <div className={`${editing === row.id ? 'col-span-2 row-start-2 py-1' : 'text-right'} text-xs font-semibold tabular-nums text-slate-900`}>{rowAmount(row)}</div>
            <p className="min-w-0 text-[10px] leading-4 text-slate-500">{row.date || 'No date'} · {row.type === 'estimate' ? 'AI estimate' : row.type === 'journey' ? 'Journey cost' : 'Added cost'}</p>
            <div className="justify-self-end">{rowActions(row)}</div>
          </li>)}
        </ul>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-900"><span className="font-medium">{ledger.missing ? 'Recorded total (partial)' : 'Plan + additional costs'}</span><strong className="tabular-nums">{ready ? money(ledger.total) : unavailableText}</strong></div>
      </div>
      <div className="mt-4 hidden sm:block overflow-x-auto rounded-xl border border-slate-200"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-3 font-medium">Date</th><th className="p-3 font-medium">Cost item</th><th className="p-3 font-medium">Source</th><th className="p-3 text-right font-medium">Amount</th><th className="p-3 font-medium">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{ledger.rows.map(row=><tr key={row.id} className={row.type==='additional'?'bg-blue-50/40':''}><td className="whitespace-nowrap p-3 text-slate-500">{row.date||'—'}</td><td className="min-w-[160px] p-3 text-slate-900">{row.description||categoryNames[row.category]||'Additional cost'}</td><td className="p-3"><span className={`whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-medium ${row.type==='additional'?'bg-blue-50 text-blue-700':'bg-slate-100 text-slate-600'}`}>{row.type==='estimate'?'AI estimate':row.type==='journey'?'Journey cost':'Added cost'}</span></td><td className="whitespace-nowrap p-3 text-right font-semibold tabular-nums text-slate-900">{rowAmount(row)}</td><td className="p-2">{rowActions(row)}</td></tr>)}</tbody><tfoot className="border-t border-slate-200 bg-slate-50"><tr><td colSpan={3} className="p-3 font-semibold">{ledger.missing?'Recorded total (partial)':'Plan + additional costs'}</td><td className="p-3 text-right font-bold tabular-nums">{ready?money(ledger.total):unavailableText}</td><td/></tr></tfoot></table></div>
      {rowError&&<p role="alert" className="mt-2 text-xs text-red-700">{rowError}</p>}
      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">AI estimates are not actual spending. Add only extra costs to avoid counting planned items twice.</p>
      <div className="mt-4 border-t border-slate-200 pt-4 sm:mt-6 sm:pt-6">
        <div className="mb-3 space-y-1 sm:mb-5 sm:space-y-1.5">
          <h3 id={`${formId}-heading`} className="text-sm sm:text-base font-semibold tracking-tight text-slate-900">Add an additional cost</h3>
          <p id={`${formId}-description`} className="text-xs sm:text-sm leading-relaxed text-slate-500">Add extras to your plan in {trip.currency || 'INR'}.</p>
        </div>
        <form onSubmit={addDailyExpense} aria-labelledby={`${formId}-heading`} aria-describedby={`${formId}-description`} aria-busy={saving} className="budget-add-form grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          <div className="min-w-0 space-y-1 sm:space-y-2">
            <Label htmlFor={`${formId}-date`}>Date</Label>
            <Input id={`${formId}-date`} aria-label="Expense date" type="date" required value={date} onChange={e=>setDate(e.target.value)} />
          </div>
          <div className="min-w-0 space-y-1 sm:space-y-2">
            <Label htmlFor={`${formId}-amount`}>Amount ({symbol})</Label>
            <Input id={`${formId}-amount`} aria-label="Expense amount" type="number" inputMode="decimal" min="0.01" step="0.01" required value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="min-w-0 space-y-1 sm:space-y-2">
            <Label htmlFor={`${formId}-category`}>Category</Label>
            <NativeSelect id={`${formId}-category`} value={category} onChange={e=>setCategory(e.target.value)}>{Object.entries(categoryNames).map(([id,name])=><option key={id} value={id}>{name}</option>)}</NativeSelect>
          </div>
          <div className="min-w-0 space-y-1 sm:space-y-2">
            <Label htmlFor={`${formId}-description-input`}>Description <span className="font-normal text-slate-400">(optional)</span></Label>
            <Input id={`${formId}-description-input`} value={description} maxLength={200} onChange={e=>setDescription(e.target.value)} placeholder="What was it for?" />
          </div>
          <div className="col-span-2 flex flex-wrap items-center justify-end gap-2 lg:col-span-4">
            <p role="status" aria-live="polite" className="text-sm text-slate-500">{message}</p>
            <Button type="submit" disabled={saving||(!onDraftChange&&(!userId||!db))} className="w-auto">
              {saving?<Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin"/>:<Plus aria-hidden="true" className="h-4 w-4"/>}
              {saving?'Saving…':'Add cost'}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
