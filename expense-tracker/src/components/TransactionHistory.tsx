import React, { useState, useMemo, useRef } from 'react';
import type { Expense, Category, PaymentMethod } from '../types';
import { formatCurrency, formatDate, groupByDate } from '../utils';
import { PAYMENT_METHODS } from '../categories';

interface Props {
  expenses: Expense[];
  categories: Category[];
  currency: string;
  onDelete: (id: string) => void;
}

export default function TransactionHistory({ expenses, categories, currency, onDelete }: Props) {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [touchStart, setTouchStart] = useState<{ id: string; x: number } | null>(null);
  const [swipedId, setSwipedId] = useState<string | null>(null);

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const filtered = useMemo(() => {
    let result = [...expenses];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.note.toLowerCase().includes(q) ||
          (catMap.get(e.categoryId)?.name || '').toLowerCase().includes(q)
      );
    }
    if (filterCategory !== 'all') {
      result = result.filter((e) => e.categoryId === filterCategory);
    }
    if (filterPayment !== 'all') {
      result = result.filter((e) => e.paymentMethod === filterPayment);
    }
    if (filterDateStart) {
      result = result.filter((e) => e.date >= filterDateStart);
    }
    if (filterDateEnd) {
      result = result.filter((e) => e.date <= filterDateEnd);
    }

    return result;
  }, [expenses, search, filterCategory, filterPayment, filterDateStart, filterDateEnd, catMap]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);
  const totalFiltered = useMemo(() => filtered.reduce((s, e) => s + e.amount, 0), [filtered]);

  const handleTouchStart = (id: string, x: number) => {
    setTouchStart({ id, x });
  };

  const handleTouchMove = (x: number) => {
    if (!touchStart) return;
    const diff = touchStart.x - x;
    if (diff > 60) {
      setSwipedId(touchStart.id);
    } else if (diff < -30) {
      setSwipedId(null);
    }
  };

  const handleTouchEnd = () => {
    setTouchStart(null);
  };

  const handleDelete = (id: string) => {
    if (deleteConfirm === id) {
      onDelete(id);
      setDeleteConfirm(null);
      setSwipedId(null);
      if (navigator.vibrate) navigator.vibrate(20);
    } else {
      setDeleteConfirm(id);
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  const pmMap = useMemo(() => new Map(PAYMENT_METHODS.map((p) => [p.id, p])), []);

  const activeFilterCount = [
    filterCategory !== 'all',
    filterPayment !== 'all',
    !!filterDateStart,
    !!filterDateEnd,
  ].filter(Boolean).length;

  return (
    <div className="px-4 pt-2 pb-4 space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">History</h2>
        <span className="text-xs text-gray-500">
          {filtered.length} expense{filtered.length !== 1 ? 's' : ''} &middot; {formatCurrency(totalFiltered, currency)}
        </span>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
        <input
          type="text"
          placeholder="Search by note or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#141420] text-white text-sm rounded-xl pl-9 pr-4 py-3 border border-[#1e1e30] outline-none focus:border-emerald-500/50 placeholder-gray-600 transition-colors"
        />
      </div>

      {/* Filters Toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-300 transition-colors"
      >
        <span>Filters</span>
        {activeFilterCount > 0 && (
          <span className="bg-emerald-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {activeFilterCount}
          </span>
        )}
        <span className={`transition-transform ${showFilters ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-[#141420] rounded-2xl p-4 border border-[#1e1e30] space-y-3 animate-slideDown">
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full mt-1 bg-[#1a1a2e] text-white text-sm rounded-lg px-3 py-2 border border-[#252540] outline-none [color-scheme:dark]"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wider">Payment Method</label>
            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
              className="w-full mt-1 bg-[#1a1a2e] text-white text-sm rounded-lg px-3 py-2 border border-[#252540] outline-none [color-scheme:dark]"
            >
              <option value="all">All Methods</option>
              {PAYMENT_METHODS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider">From</label>
              <input
                type="date"
                value={filterDateStart}
                onChange={(e) => setFilterDateStart(e.target.value)}
                className="w-full mt-1 bg-[#1a1a2e] text-white text-sm rounded-lg px-3 py-2 border border-[#252540] outline-none [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider">To</label>
              <input
                type="date"
                value={filterDateEnd}
                onChange={(e) => setFilterDateEnd(e.target.value)}
                className="w-full mt-1 bg-[#1a1a2e] text-white text-sm rounded-lg px-3 py-2 border border-[#252540] outline-none [color-scheme:dark]"
              />
            </div>
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setFilterCategory('all');
                setFilterPayment('all');
                setFilterDateStart('');
                setFilterDateEnd('');
              }}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Transaction List */}
      {grouped.size > 0 ? (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([date, exps]) => (
            <div key={date}>
              <p className="text-xs text-gray-500 font-medium mb-2 sticky top-0 bg-[#0a0a12] py-1 z-10">
                {formatDate(date)}
              </p>
              <div className="space-y-2">
                {exps.map((exp) => {
                  const cat = catMap.get(exp.categoryId);
                  const pm = pmMap.get(exp.paymentMethod);
                  const isSwiped = swipedId === exp.id;
                  return (
                    <div
                      key={exp.id}
                      className="relative overflow-hidden rounded-xl"
                      onTouchStart={(e) => handleTouchStart(exp.id, e.touches[0].clientX)}
                      onTouchMove={(e) => handleTouchMove(e.touches[0].clientX)}
                      onTouchEnd={handleTouchEnd}
                    >
                      {/* Delete background */}
                      <div className="absolute inset-y-0 right-0 w-20 bg-red-500 flex items-center justify-center rounded-r-xl">
                        <span className="text-white text-sm font-medium">Delete</span>
                      </div>

                      <div
                        className={`relative bg-[#141420] border border-[#1e1e30] rounded-xl p-3 flex items-center gap-3 transition-transform duration-200 ${
                          isSwiped ? '-translate-x-20' : 'translate-x-0'
                        }`}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
                          style={{ backgroundColor: (cat?.color || '#6B7280') + '1a' }}
                        >
                          {cat?.icon || '📦'}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-white font-medium truncate">
                              {cat?.name || 'Other'}
                            </span>
                            <span className="text-[10px] text-gray-600">
                              {pm?.icon} {pm?.label}
                            </span>
                          </div>
                          {exp.note && (
                            <p className="text-xs text-gray-500 truncate mt-0.5">{exp.note}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-semibold text-white tabular-nums">
                            {formatCurrency(exp.amount, currency)}
                          </span>
                          <button
                            onClick={() => handleDelete(exp.id)}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all text-xs ${
                              deleteConfirm === exp.id
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-transparent text-gray-600 hover:text-red-400 hover:bg-red-500/10'
                            }`}
                            aria-label={deleteConfirm === exp.id ? 'Confirm delete' : 'Delete expense'}
                          >
                            {deleteConfirm === exp.id ? '✓' : '×'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#141420] rounded-2xl p-8 border border-[#1e1e30] text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-gray-400 text-sm">
            {expenses.length === 0 ? 'No expenses recorded yet.' : 'No expenses match your filters.'}
          </p>
        </div>
      )}
    </div>
  );
}
