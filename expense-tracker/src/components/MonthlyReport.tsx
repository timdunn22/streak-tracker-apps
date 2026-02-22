import React, { useState, useMemo } from 'react';
import type { Expense, Category } from '../types';
import {
  formatCurrency,
  getMonthKey,
  getMonthLabel,
  getMonthExpenses,
  getCategorySpending,
  getPrevMonthKey,
  getDaysInMonth,
  today,
} from '../utils';

interface Props {
  expenses: Expense[];
  categories: Category[];
  currency: string;
}

const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function MonthlyReport({ expenses, categories, currency }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(getMonthKey(today()));

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    months.add(getMonthKey(today()));
    for (const e of expenses) {
      months.add(getMonthKey(e.date));
    }
    return Array.from(months).sort().reverse();
  }, [expenses]);

  const monthExpenses = useMemo(() => getMonthExpenses(expenses, selectedMonth), [expenses, selectedMonth]);
  const prevMonthKey = getPrevMonthKey(selectedMonth);
  const prevMonthExpenses = useMemo(() => getMonthExpenses(expenses, prevMonthKey), [expenses, prevMonthKey]);

  const totalSpent = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const prevTotalSpent = prevMonthExpenses.reduce((s, e) => s + e.amount, 0);
  const daysInMonth = getDaysInMonth(selectedMonth);
  const dailyAvg = monthExpenses.length > 0 ? totalSpent / daysInMonth : 0;
  const biggestExpense = monthExpenses.length > 0
    ? monthExpenses.reduce((max, e) => (e.amount > max.amount ? e : max), monthExpenses[0])
    : null;

  const categorySpending = useMemo(() => getCategorySpending(monthExpenses), [monthExpenses]);
  const prevCategorySpending = useMemo(() => getCategorySpending(prevMonthExpenses), [prevMonthExpenses]);

  const catBreakdown = useMemo(() => {
    return Array.from(categorySpending.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([catId, amount]) => {
        const cat = categories.find((c) => c.id === catId);
        const prevAmount = prevCategorySpending.get(catId) || 0;
        const pctChange = prevAmount > 0 ? ((amount - prevAmount) / prevAmount) * 100 : 0;
        return {
          category: cat || categories[categories.length - 1],
          amount,
          percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
          pctChange,
          prevAmount,
        };
      });
  }, [categorySpending, prevCategorySpending, categories, totalSpent]);

  // Day-of-week spending pattern
  const dowSpending = useMemo(() => {
    const totals = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun
    const counts = [0, 0, 0, 0, 0, 0, 0];
    for (const e of monthExpenses) {
      const d = new Date(e.date + 'T12:00:00');
      const dow = (d.getDay() + 6) % 7; // Mon=0
      totals[dow] += e.amount;
      counts[dow]++;
    }
    return totals.map((total, i) => ({
      label: DOW_LABELS[i],
      total,
      avg: counts[i] > 0 ? total / counts[i] : 0,
    }));
  }, [monthExpenses]);

  const maxDow = Math.max(...dowSpending.map((d) => d.total), 1);

  const totalChange = prevTotalSpent > 0 ? ((totalSpent - prevTotalSpent) / prevTotalSpent) * 100 : 0;

  const navigateMonth = (dir: -1 | 1) => {
    const idx = availableMonths.indexOf(selectedMonth);
    const newIdx = idx - dir; // reversed because sorted desc
    if (newIdx >= 0 && newIdx < availableMonths.length) {
      setSelectedMonth(availableMonths[newIdx]);
    }
  };

  const biggestCat = biggestExpense
    ? categories.find((c) => c.id === biggestExpense.categoryId)
    : null;

  return (
    <div className="px-4 pt-2 pb-4 space-y-5 animate-fadeIn">
      <h2 className="text-lg font-semibold text-white">Reports</h2>

      {/* Month Selector */}
      <div className="flex items-center justify-between bg-[#141420] rounded-2xl p-3 border border-[#1e1e30]">
        <button
          onClick={() => navigateMonth(-1)}
          className="w-9 h-9 rounded-lg bg-[#1a1a2e] flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          aria-label="Previous month"
        >
          ←
        </button>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="bg-transparent text-white text-sm font-medium text-center outline-none cursor-pointer [color-scheme:dark]"
        >
          {availableMonths.map((m) => (
            <option key={m} value={m}>{getMonthLabel(m)}</option>
          ))}
        </select>
        <button
          onClick={() => navigateMonth(1)}
          className="w-9 h-9 rounded-lg bg-[#1a1a2e] flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          aria-label="Next month"
        >
          →
        </button>
      </div>

      {monthExpenses.length === 0 ? (
        <div className="bg-[#141420] rounded-2xl p-8 border border-[#1e1e30] text-center">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-gray-400 text-sm">No expenses for {getMonthLabel(selectedMonth)}.</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#141420] rounded-2xl p-4 border border-[#1e1e30]">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total Spent</p>
              <p className="text-xl font-bold text-white tabular-nums mt-1">
                {formatCurrency(totalSpent, currency)}
              </p>
              {prevTotalSpent > 0 && (
                <div className={`flex items-center gap-1 mt-1 text-xs ${totalChange > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  <span>{totalChange > 0 ? '↑' : '↓'}</span>
                  <span>{Math.abs(totalChange).toFixed(1)}%</span>
                  <span className="text-gray-600">vs last</span>
                </div>
              )}
            </div>

            <div className="bg-[#141420] rounded-2xl p-4 border border-[#1e1e30]">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Daily Average</p>
              <p className="text-xl font-bold text-white tabular-nums mt-1">
                {formatCurrency(dailyAvg, currency)}
              </p>
              <p className="text-xs text-gray-600 mt-1">per day</p>
            </div>

            <div className="bg-[#141420] rounded-2xl p-4 border border-[#1e1e30] col-span-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Biggest Expense</p>
              {biggestExpense && (
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-2xl">{biggestCat?.icon || '📦'}</span>
                  <div>
                    <p className="text-lg font-bold text-white tabular-nums">
                      {formatCurrency(biggestExpense.amount, currency)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {biggestCat?.name || 'Other'}
                      {biggestExpense.note ? ` — ${biggestExpense.note}` : ''}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-[#141420] rounded-2xl p-4 border border-[#1e1e30]">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Category Breakdown</p>
            <div className="space-y-3">
              {catBreakdown.map(({ category, amount, percentage, pctChange, prevAmount }) => (
                <div key={category.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{category.icon}</span>
                      <span className="text-sm text-gray-300">{category.name}</span>
                      <span className="text-[10px] text-gray-600 tabular-nums">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white tabular-nums">
                        {formatCurrency(amount, currency)}
                      </span>
                      {prevAmount > 0 && (
                        <span
                          className={`text-[10px] tabular-nums ${
                            pctChange > 0 ? 'text-red-400' : 'text-emerald-400'
                          }`}
                        >
                          {pctChange > 0 ? '↑' : '↓'}{Math.abs(pctChange).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 bg-[#1e1e30] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%`, backgroundColor: category.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Day-of-Week Pattern */}
          <div className="bg-[#141420] rounded-2xl p-4 border border-[#1e1e30]">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Spending by Day of Week</p>
            <div className="flex items-end justify-between gap-2 h-32">
              {dowSpending.map((d, i) => {
                const pct = maxDow > 0 ? (d.total / maxDow) * 100 : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] text-gray-500 tabular-nums">
                      {d.total > 0 ? formatCurrency(d.total, currency) : ''}
                    </span>
                    <div className="w-full h-20 flex items-end">
                      <div
                        className="w-full rounded-t-md bg-emerald-500/40 transition-all duration-500"
                        style={{ height: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-500">{d.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Comparison to Previous Month */}
          {prevMonthExpenses.length > 0 && (
            <div className="bg-[#141420] rounded-2xl p-4 border border-[#1e1e30]">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">
                vs {getMonthLabel(prevMonthKey)}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500">This month</p>
                  <p className="text-lg font-bold text-white tabular-nums">
                    {formatCurrency(totalSpent, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Last month</p>
                  <p className="text-lg font-bold text-gray-400 tabular-nums">
                    {formatCurrency(prevTotalSpent, currency)}
                  </p>
                </div>
                <div className="col-span-2">
                  <div className={`text-sm font-semibold ${totalChange > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {totalChange > 0 ? '↑' : '↓'} {Math.abs(totalChange).toFixed(1)}%{' '}
                    <span className="text-gray-500 font-normal">
                      ({totalChange > 0 ? 'more' : 'less'} than last month)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
