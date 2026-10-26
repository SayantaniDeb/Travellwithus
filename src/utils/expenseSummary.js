export function expenseSummary(expenses, budget) {
  const categories = {};
  let spent = 0;
  let invalidCount = 0;
  for (const expense of expenses) {
    const raw = expense.amount;
    const amount = typeof raw === 'number' || (typeof raw === 'string' && raw.trim()) ? Number(raw) : NaN;
    if (!Number.isFinite(amount) || amount < 0) { invalidCount++; continue; }
    spent += amount;
    const category = expense.category || 'other';
    categories[category] = (categories[category] || 0) + amount;
  }
  const totalBudget = Number(budget) || 0;
  return { spent, remaining: totalBudget - spent, invalidCount,
    percentSpent: totalBudget > 0 ? Math.min(100, spent / totalBudget * 100) : 0,
    categories: Object.entries(categories).sort((a, b) => b[1] - a[1]) };
}
