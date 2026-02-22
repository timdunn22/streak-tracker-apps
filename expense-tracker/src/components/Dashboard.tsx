import React, { useMemo } from 'react';
import type { Expense, Budget, Category, Tab } from '../types';
import {
  today,
  getMonthKey,
  formatCurrency,
  getMonthExpenses,
  getCategorySpending,
  getWeekDates,
  getDayOfWeekLabel,
  getMonthLabel,
} from '../utils';
import CategoryIcon from './CategoryIcon';

interface Props {
  expenses: Expense[];
  budget: Budget;
  categories: Category[];
  currency: string;
  onNavigate: (tab: Tab) => void;
}

export default function Dashboard({ expenses, budget, categories, currency, onNavigate }: Props) {
  const currentMonth = getMonthKey(today());
  const monthExpenses = useMemo(() => getMonthExpenses(expenses, currentMonth), [expenses, currentMonth]);
  const totalSpent = useMemo(() => monthExpenses.reduce((s, e) => s + e.amount, 0), [monthExpenses]);
  const categorySpending = useMemo(() => getCategorySpending(monthExpenses), [monthExpenses]);

  const topCategories = useMemo(() => {
    const entries = Array.from(categorySpending.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    return entries.map(([catId, amount]) => ({
      category: categories.find((c) => c.id === catId) || categories[categories.length - 1],
      amount,
    }));
  }, [categorySpending, categories]);

  const maxCategorySpend = useMemo(() => {
    return Math.max(...Array.from(categorySpending.values()), 1);
  }, [categorySpending]);

  const weekDates = useMemo(() => getWeekDates(), []);
  const weekSpending = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of weekDates) map.set(d, 0);
    for (const exp of expenses) {
      if (map.has(exp.date)) {
        map.set(exp.date, map.get(exp.date)! + exp.amount);
      }
    }
    return map;
  }, [expenses, weekDates]);
  const maxDailySpend = useMemo(() => Math.max(...Array.from(weekSpending.values()), 1), [weekSpending]);

  const budgetRemaining = budget.monthly > 0 ? budget.monthly - totalSpent : null;
  const budgetPercent = budget.monthly > 0 ? Math.min((totalSpent / budget.monthly) * 100, 100) : 0;
  const budgetWarning = budget.monthly > 0 && totalSpent >= budget.monthly * 0.8;
  const budgetOver = budget.monthly > 0 && totalSpent > budget.monthly;

  return (
    <div className="px-4 pt-2 pb-4 space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">PocketLedger</h1>
          <p className="text-xs text-gray-500">{getMonthLabel(currentMonth)}</p>
        </div>
        <button
          onClick={() => onNavigate('reports')}
          className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          View Reports
        </button>
      </div>

      {/* Total Spent Card */}
      <div className="bg-[#141420] rounded-2xl p-5 border border-[#1e1e30]">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Spent</p>
        <p className="text-4xl font-bold text-white tabular-nums">{formatCurrency(totalSpent, currency)}</p>

        {budget.monthly > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-400">
                Budget: {formatCurrency(budget.monthly, currency)}
              </span>
              <span
                className={`text-xs font-semibold ${
                  budgetOver ? 'text-red-400' : budgetWarning ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {budgetRemaining !== null && budgetRemaining >= 0
                  ? `${formatCurrency(budgetRemaining, currency)} left`
                  : `${formatCurrency(Math.abs(budgetRemaining || 0), currency)} over`}
              </span>
            </div>
            <div className="h-2 bg-[#1e1e30] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  budgetOver
                    ? 'bg-red-500'
                    : budgetWarning
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${budgetPercent}%` }}
              />
            </div>
          </div>
        )}

        {budget.monthly === 0 && (
          <button
            onClick={() => onNavigate('settings')}
            className="mt-3 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            + Set a monthly budget
          </button>
        )}
      </div>

      {/* Daily Spending This Week */}
      <div className="bg-[#141420] rounded-2xl p-4 border border-[#1e1e30]">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">This Week</p>
        <div className="flex items-end justify-between gap-1.5 h-28">
          {weekDates.map((date) => {
            const amount = weekSpending.get(date) || 0;
            const pct = maxDailySpend > 0 ? (amount / maxDailySpend) * 100 : 0;
            const isToday = date === today();
            return (
              <div key={date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] text-gray-500 tabular-nums">
                  {amount > 0 ? formatCurrency(amount, currency) : ''}
                </span>
                <div className="w-full h-20 flex items-end">
                  <div
                    className={`w-full rounded-t-md transition-all duration-500 ${
                      isToday ? 'bg-emerald-500' : 'bg-emerald-500/30'
                    }`}
                    style={{ height: `${Math.max(pct, 2)}%` }}
                  />
                </div>
                <span className={`text-[10px] ${isToday ? 'text-emerald-400 font-semibold' : 'text-gray-500'}`}>
                  {getDayOfWeekLabel(date)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Spending by Category */}
      {categorySpending.size > 0 && (
        <div className="bg-[#141420] rounded-2xl p-4 border border-[#1e1e30]">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">By Category</p>
          <div className="space-y-3">
            {Array.from(categorySpending.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([catId, amount]) => {
                const cat = categories.find((c) => c.id === catId);
                if (!cat) return null;
                const pct = (amount / maxCategorySpend) * 100;
                const catBudget = budget.categoryBudgets[catId];
                const overCatBudget = catBudget && amount > catBudget;
                return (
                  <div key={catId} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm" role="img" aria-hidden="true">{cat.icon}</span>
                        <span className="text-sm text-gray-300">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium tabular-nums ${overCatBudget ? 'text-red-400' : 'text-white'}`}>
                          {formatCurrency(amount, currency)}
                        </span>
                        {catBudget && (
                          <span className="text-[10px] text-gray-500">
                            / {formatCurrency(catBudget, currency)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-1.5 bg-[#1e1e30] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: overCatBudget ? '#EF4444' : cat.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Top 3 Categories */}
      {topCategories.length > 0 && (
        <div className="bg-[#141420] rounded-2xl p-4 border border-[#1e1e30]">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Top Categories</p>
          <div className="flex gap-3">
            {topCategories.map(({ category, amount }, i) => (
              <div
                key={category.id}
                className="flex-1 bg-[#1a1a2e] rounded-xl p-3 text-center border border-[#252540]"
              >
                <div className="text-2xl mb-1">{category.icon}</div>
                <p className="text-xs text-gray-400 truncate">{category.name}</p>
                <p className="text-sm font-semibold text-white tabular-nums mt-0.5">
                  {formatCurrency(amount, currency)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {monthExpenses.length === 0 && (
        <div className="bg-[#141420] rounded-2xl p-8 border border-[#1e1e30] text-center">
          <p className="text-4xl mb-3">💰</p>
          <p className="text-gray-400 text-sm">No expenses this month yet.</p>
          <button
            onClick={() => onNavigate('add')}
            className="mt-4 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Add Your First Expense
          </button>
        </div>
      )}
    </div>
  );
}
