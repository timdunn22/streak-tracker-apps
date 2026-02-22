import React, { useState } from 'react';
import type { Budget, Category, Expense } from '../types';
import { formatCurrency, getMonthKey, today, getMonthExpenses, getCategorySpending } from '../utils';

interface Props {
  budget: Budget;
  categories: Category[];
  expenses: Expense[];
  currency: string;
  onSetMonthly: (amount: number) => void;
  onSetCategory: (categoryId: string, amount: number) => void;
  onRemoveCategory: (categoryId: string) => void;
}

export default function BudgetSettings({
  budget,
  categories,
  expenses,
  currency,
  onSetMonthly,
  onSetCategory,
  onRemoveCategory,
}: Props) {
  const [monthlyInput, setMonthlyInput] = useState(budget.monthly > 0 ? budget.monthly.toString() : '');
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [catInput, setCatInput] = useState('');

  const currentMonth = getMonthKey(today());
  const monthExpenses = getMonthExpenses(expenses, currentMonth);
  const totalSpent = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const categorySpending = getCategorySpending(monthExpenses);

  const handleMonthlySubmit = () => {
    const val = parseFloat(monthlyInput);
    if (!isNaN(val) && val >= 0) {
      onSetMonthly(val);
    }
  };

  const handleCategorySubmit = (catId: string) => {
    const val = parseFloat(catInput);
    if (!isNaN(val) && val > 0) {
      onSetCategory(catId, val);
    }
    setEditingCat(null);
    setCatInput('');
  };

  const startEditCat = (catId: string) => {
    setEditingCat(catId);
    setCatInput(budget.categoryBudgets[catId]?.toString() || '');
  };

  return (
    <div className="px-4 pt-2 pb-4 space-y-5 animate-fadeIn">
      <h2 className="text-lg font-semibold text-white">Budget</h2>

      {/* Monthly Budget */}
      <div className="bg-[#141420] rounded-2xl p-5 border border-[#1e1e30]">
        <label className="text-xs text-gray-400 uppercase tracking-wider">Monthly Budget</label>
        <div className="flex items-center gap-3 mt-3">
          <span className="text-2xl text-gray-500">$</span>
          <input
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={monthlyInput}
            onChange={(e) => setMonthlyInput(e.target.value)}
            onBlur={handleMonthlySubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleMonthlySubmit()}
            className="flex-1 bg-[#1a1a2e] text-2xl font-bold text-white rounded-lg px-3 py-2 border border-[#252540] outline-none focus:border-emerald-500/50 tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            onClick={handleMonthlySubmit}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Set
          </button>
        </div>

        {/* Overall progress */}
        {budget.monthly > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-gray-400">
                {formatCurrency(totalSpent, currency)} of {formatCurrency(budget.monthly, currency)}
              </span>
              <span
                className={`font-medium ${
                  totalSpent > budget.monthly
                    ? 'text-red-400'
                    : totalSpent > budget.monthly * 0.8
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {Math.round((totalSpent / budget.monthly) * 100)}%
              </span>
            </div>
            <div className="h-3 bg-[#1e1e30] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  totalSpent > budget.monthly
                    ? 'bg-red-500'
                    : totalSpent > budget.monthly * 0.8
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min((totalSpent / budget.monthly) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Category Budgets */}
      <div className="bg-[#141420] rounded-2xl p-4 border border-[#1e1e30]">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Category Budgets</p>
        <div className="space-y-3">
          {categories.map((cat) => {
            const spent = categorySpending.get(cat.id) || 0;
            const catBudget = budget.categoryBudgets[cat.id];
            const pct = catBudget ? Math.min((spent / catBudget) * 100, 100) : 0;
            const isOver = catBudget ? spent > catBudget : false;
            const isWarning = catBudget ? spent > catBudget * 0.8 : false;
            const isEditing = editingCat === cat.id;

            return (
              <div key={cat.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{cat.icon}</span>
                    <span className="text-sm text-gray-300">{cat.name}</span>
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-500">$</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={catInput}
                        onChange={(e) => setCatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCategorySubmit(cat.id)}
                        autoFocus
                        className="w-20 bg-[#1a1a2e] text-white text-xs rounded px-2 py-1 border border-emerald-500/50 outline-none tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        onClick={() => handleCategorySubmit(cat.id)}
                        className="text-emerald-400 text-xs hover:text-emerald-300"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => setEditingCat(null)}
                        className="text-gray-500 text-xs hover:text-gray-300"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {catBudget ? (
                        <>
                          <span className={`text-xs tabular-nums ${isOver ? 'text-red-400' : 'text-gray-400'}`}>
                            {formatCurrency(spent, currency)} / {formatCurrency(catBudget, currency)}
                          </span>
                          <button
                            onClick={() => startEditCat(cat.id)}
                            className="text-gray-600 hover:text-gray-400 text-xs transition-colors"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => onRemoveCategory(cat.id)}
                            className="text-gray-600 hover:text-red-400 text-xs transition-colors"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => startEditCat(cat.id)}
                          className="text-xs text-emerald-400/60 hover:text-emerald-400 transition-colors"
                        >
                          + Set budget
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {catBudget && (
                  <div className="h-1.5 bg-[#1e1e30] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: isOver ? '#EF4444' : isWarning ? '#F59E0B' : cat.color,
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
