import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { auth, db } from '../Firebase';
import { doc, getDoc, updateDoc, collection, addDoc, query, orderBy, onSnapshot, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Navbar from './Navbar';

// Currency data
const CURRENCIES = {
  USD: { symbol: '$', name: 'US Dollar' },
  EUR: { symbol: '€', name: 'Euro' },
  GBP: { symbol: '£', name: 'British Pound' },
  INR: { symbol: '₹', name: 'Indian Rupee' },
  JPY: { symbol: '¥', name: 'Japanese Yen' },
  AUD: { symbol: 'A$', name: 'Australian Dollar' },
  CAD: { symbol: 'C$', name: 'Canadian Dollar' },
  SGD: { symbol: 'S$', name: 'Singapore Dollar' },
  AED: { symbol: 'د.إ', name: 'UAE Dirham' },
  THB: { symbol: '฿', name: 'Thai Baht' },
};

// Expense categories with colors
const CATEGORIES = [
  { id: 'accommodation', name: 'Accommodation', icon: '🏨', color: 'bg-blue-500' },
  { id: 'food', name: 'Food & Dining', icon: '🍽️', color: 'bg-orange-500' },
  { id: 'transport', name: 'Transport', icon: '🚗', color: 'bg-green-500' },
  { id: 'activities', name: 'Activities', icon: '🎯', color: 'bg-purple-500' },
  { id: 'shopping', name: 'Shopping', icon: '🛍️', color: 'bg-pink-500' },
  { id: 'other', name: 'Other', icon: '📦', color: 'bg-gray-500' },
];

export default function BudgetTracker() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  
  const [user, setUser] = useState(null);
  const [trip, setTrip] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showSetBudget, setShowSetBudget] = useState(false);
  
  // Form states
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('food');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalBudget, setTotalBudgetInput] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch trip data
  useEffect(() => {
    if (!user || !tripId) return;

    const fetchTrip = async () => {
      try {
        const tripDoc = await getDoc(doc(db, 'users', user.uid, 'trips', tripId));
        if (tripDoc.exists()) {
          setTrip({ id: tripDoc.id, ...tripDoc.data() });
          setTotalBudgetInput(tripDoc.data().budgetAmount?.toString() || '');
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching trip:', err);
        setLoading(false);
      }
    };

    fetchTrip();
  }, [user, tripId]);

  // Listen to expenses
  useEffect(() => {
    if (!user || !tripId) return;

    const expensesRef = collection(db, 'users', user.uid, 'trips', tripId, 'expenses');
    const q = query(expensesRef, orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const expensesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setExpenses(expensesData);
    });

    return () => unsubscribe();
  }, [user, tripId]);

  const addExpense = async () => {
    if (!expenseAmount || parseFloat(expenseAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      const expensesRef = collection(db, 'users', user.uid, 'trips', tripId, 'expenses');
      await addDoc(expensesRef, {
        amount: parseFloat(expenseAmount),
        description: expenseDescription || CATEGORIES.find(c => c.id === expenseCategory)?.name,
        category: expenseCategory,
        date: expenseDate,
        createdAt: new Date()
      });

      setExpenseAmount('');
      setExpenseDescription('');
      setExpenseCategory('food');
      setShowAddExpense(false);
    } catch (err) {
      console.error('Error adding expense:', err);
      alert('Failed to add expense');
    }
  };

  const deleteExpense = async (expenseId) => {
    if (!confirm('Delete this expense?')) return;
    
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'trips', tripId, 'expenses', expenseId));
    } catch (err) {
      console.error('Error deleting expense:', err);
    }
  };

  const setBudget = async () => {
    if (!totalBudget || parseFloat(totalBudget) <= 0) {
      alert('Please enter a valid budget');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', user.uid, 'trips', tripId), {
        budgetAmount: parseFloat(totalBudget)
      });
      setTrip({ ...trip, budgetAmount: parseFloat(totalBudget) });
      setShowSetBudget(false);
    } catch (err) {
      console.error('Error setting budget:', err);
      alert('Failed to set budget');
    }
  };

  // Calculate totals
  const totalSpent = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const budgetAmount = trip?.budgetAmount || 0;
  const remaining = budgetAmount - totalSpent;
  const percentSpent = budgetAmount > 0 ? Math.min((totalSpent / budgetAmount) * 100, 100) : 0;

  // Category breakdown
  const categoryBreakdown = CATEGORIES.map(cat => {
    const catExpenses = expenses.filter(e => e.category === cat.id);
    const total = catExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const percent = totalSpent > 0 ? (total / totalSpent) * 100 : 0;
    return { ...cat, total, percent, count: catExpenses.length };
  }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  const currencySymbol = CURRENCIES[trip?.currency]?.symbol || '$';

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-50 flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-50">
        <Navbar />
        <div className="pt-20 sm:pt-24 pb-24 px-4">
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zinc-200/60 shadow-xl p-8">
              <h2 className="text-xl font-semibold text-zinc-900 mb-2">Please Login</h2>
              <p className="text-zinc-500 text-sm mb-6">You need to be logged in to track your budget.</p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-black hover:bg-gray-800 text-white rounded-xl text-sm font-medium transition-all shadow-lg"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-50">
        <Navbar />
        <div className="pt-20 sm:pt-24 pb-24 px-4">
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zinc-200/60 shadow-xl p-8">
              <h2 className="text-xl font-semibold text-zinc-900 mb-2">Trip Not Found</h2>
              <p className="text-zinc-500 text-sm mb-6">This trip doesn't exist or has been deleted.</p>
              <button
                onClick={() => navigate('/saved-trips')}
                className="px-6 py-3 bg-black hover:bg-gray-800 text-white rounded-xl text-sm font-medium transition-all shadow-lg"
              >
                View My Trips
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-50">
      <Navbar />
      <div className="pt-20 sm:pt-24 pb-24 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <button 
                onClick={() => navigate('/saved-trips')}
                className="inline-flex items-center gap-2 text-zinc-600 hover:text-zinc-900 text-sm mb-2 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Trips
              </button>
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">{trip.destination}</h1>
              <p className="text-zinc-500 text-sm">Budget Tracker</p>
            </div>
          </div>

          {/* Budget Overview Card */}
          <div className="bg-black rounded-2xl p-6 mb-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <p className="text-zinc-400 text-sm mb-1">Total Budget</p>
                {budgetAmount > 0 ? (
                  <p className="text-3xl sm:text-4xl font-bold text-white">
                    {currencySymbol}{budgetAmount.toLocaleString()}
                  </p>
                ) : (
                  <button
                    onClick={() => setShowSetBudget(true)}
                    className="text-white bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  >
                    + Set Budget
                  </button>
                )}
              </div>
              {budgetAmount > 0 && (
                <button
                  onClick={() => setShowSetBudget(true)}
                  className="text-zinc-300 hover:text-white text-sm transition-colors"
                >
                  Edit
                </button>
              )}
            </div>

            {budgetAmount > 0 && (
              <>
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-blue-200">Spent</span>
                    <span className="text-white font-medium">{percentSpent.toFixed(0)}%</span>
                  </div>
                  <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        percentSpent > 90 ? 'bg-red-400' : percentSpent > 70 ? 'bg-yellow-400' : 'bg-white'
                      }`}
                      style={{ width: `${percentSpent}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/20 rounded-xl p-4">
                    <p className="text-zinc-300 text-xs mb-1">Spent</p>
                    <p className="text-xl font-bold text-white">{currencySymbol}{totalSpent.toLocaleString()}</p>
                  </div>
                  <div className={`rounded-xl p-4 ${remaining >= 0 ? 'bg-white/20' : 'bg-red-500/30'}`}>
                    <p className="text-zinc-300 text-xs mb-1">{remaining >= 0 ? 'Remaining' : 'Over Budget'}</p>
                    <p className={`text-xl font-bold ${remaining >= 0 ? 'text-white' : 'text-red-300'}`}>
                      {remaining >= 0 ? '' : '-'}{currencySymbol}{Math.abs(remaining).toLocaleString()}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Category Breakdown */}
          {categoryBreakdown.length > 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zinc-200/60 p-5 mb-6 shadow-xl">
              <h3 className="text-zinc-900 font-semibold mb-4">Spending by Category</h3>
              <div className="space-y-3">
                {categoryBreakdown.map((cat) => (
                  <div key={cat.id} className="flex items-center gap-3">
                    <span className="text-xl">{cat.icon}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-zinc-600">{cat.name}</span>
                        <span className="text-zinc-900 font-medium">{currencySymbol}{cat.total.toLocaleString()}</span>
                      </div>
                      <div className="h-2 bg-zinc-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${cat.color} rounded-full transition-all duration-500`}
                          style={{ width: `${cat.percent}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-zinc-500 text-xs w-12 text-right">{cat.percent.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Expense Button */}
          <button
            onClick={() => setShowAddExpense(true)}
            className="w-full py-4 bg-black hover:bg-gray-800 text-white font-medium rounded-2xl transition-all shadow-lg mb-6 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Expense
          </button>

          {/* Expenses List */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-zinc-200/60 overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-zinc-200/60">
              <h3 className="text-zinc-900 font-semibold">Recent Expenses</h3>
              <p className="text-zinc-500 text-xs">{expenses.length} transaction{expenses.length !== 1 ? 's' : ''}</p>
            </div>
            
            {expenses.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">💰</span>
                </div>
                <p className="text-zinc-500 text-sm">No expenses yet</p>
                <p className="text-zinc-400 text-xs mt-1">Start tracking your spending!</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {expenses.map((expense) => {
                  const category = CATEGORIES.find(c => c.id === expense.category);
                  return (
                    <div key={expense.id} className="px-5 py-4 flex items-center gap-4 hover:bg-zinc-50 transition-colors">
                      <span className="w-10 h-10 flex items-center justify-center bg-zinc-100 rounded-xl text-lg">
                        {category?.icon || '📦'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-zinc-900 font-medium truncate">{expense.description}</p>
                        <p className="text-zinc-500 text-xs">{formatDate(expense.date)} • {category?.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-zinc-900 font-semibold">{currencySymbol}{expense.amount.toLocaleString()}</p>
                        <button
                          onClick={() => deleteExpense(expense.id)}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-zinc-200">
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900">Add Expense</h3>
              <button
                onClick={() => setShowAddExpense(false)}
                className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Amount ({currencySymbol})</label>
                <input
                  type="number"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-xl text-zinc-900 text-lg font-semibold placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Description</label>
                <input
                  type="text"
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  placeholder="What did you spend on?"
                  className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-xl text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setExpenseCategory(cat.id)}
                      className={`p-3 rounded-xl text-center transition-all ${
                        expenseCategory === cat.id 
                          ? 'bg-black text-white' 
                          : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                      }`}
                    >
                      <span className="text-xl block mb-1">{cat.icon}</span>
                      <span className="text-xs">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Date</label>
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-xl text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent"
                />
              </div>

              {/* Submit */}
              <button
                onClick={addExpense}
                className="w-full py-3.5 bg-black hover:bg-gray-800 text-white font-medium rounded-xl transition-all shadow-lg"
              >
                Add Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set Budget Modal */}
      {showSetBudget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-zinc-200">
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900">Set Budget</h3>
              <button
                onClick={() => setShowSetBudget(false)}
                className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                  Total Budget ({currencySymbol})
                </label>
                <input
                  type="number"
                  value={totalBudget}
                  onChange={(e) => setTotalBudgetInput(e.target.value)}
                  placeholder="Enter your budget"
                  className="w-full px-4 py-3 bg-white border border-zinc-300 rounded-xl text-zinc-900 text-xl font-semibold placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-transparent text-center"
                />
                <p className="text-zinc-500 text-xs mt-2 text-center">
                  This is the total amount you plan to spend on this trip
                </p>
              </div>

              <button
                onClick={setBudget}
                className="w-full py-3.5 bg-black hover:bg-gray-800 text-white font-medium rounded-xl transition-all shadow-lg"
              >
                Save Budget
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
