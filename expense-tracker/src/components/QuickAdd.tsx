import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Expense, Category, PaymentMethod, Tab } from '../types';
import { today, generateId } from '../utils';
import { PAYMENT_METHODS } from '../categories';
import CategoryIcon from './CategoryIcon';

interface Props {
  categories: Category[];
  defaultPaymentMethod: PaymentMethod;
  onAdd: (expense: Expense) => void;
  onNavigate: (tab: Tab) => void;
}

export default function QuickAdd({ categories, defaultPaymentMethod, onAdd, onNavigate }: Props) {
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('food');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(defaultPaymentMethod);
  const [showSuccess, setShowSuccess] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus amount input on mount
    const timer = setTimeout(() => amountRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = useCallback(() => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) return;

    const expense: Expense = {
      id: generateId(),
      amount: Math.round(parsed * 100) / 100,
      categoryId,
      date,
      note: note.trim(),
      paymentMethod,
      createdAt: Date.now(),
    };

    onAdd(expense);

    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(30);

    // Show success
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 1500);

    // Reset form
    setAmount('');
    setNote('');
    setDate(today());
    amountRef.current?.focus();
  }, [amount, categoryId, date, note, paymentMethod, onAdd]);

  const handleAmountKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const selectedCategory = categories.find((c) => c.id === categoryId);

  return (
    <div className="px-4 pt-2 pb-4 space-y-5 animate-fadeIn">
      <h2 className="text-lg font-semibold text-white">Add Expense</h2>

      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-6 py-2.5 rounded-full text-sm font-semibold shadow-lg shadow-emerald-500/30 animate-slideDown">
          Expense saved!
        </div>
      )}

      {/* Amount Input */}
      <div className="bg-[#141420] rounded-2xl p-5 border border-[#1e1e30]">
        <label className="text-xs text-gray-400 uppercase tracking-wider">Amount</label>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-3xl text-gray-500 font-light">$</span>
          <input
            ref={amountRef}
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={handleAmountKeyDown}
            className="flex-1 bg-transparent text-4xl font-bold text-white placeholder-gray-600 outline-none tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
      </div>

      {/* Category Grid */}
      <div className="bg-[#141420] rounded-2xl p-4 border border-[#1e1e30]">
        <label className="text-xs text-gray-400 uppercase tracking-wider">Category</label>
        <div className="grid grid-cols-4 gap-3 mt-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryId(cat.id)}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all duration-200 ${
                categoryId === cat.id
                  ? 'bg-white/5 ring-1 ring-emerald-400/50 scale-105'
                  : 'hover:bg-white/5'
              }`}
            >
              <CategoryIcon category={cat} size="md" selected={categoryId === cat.id} />
              <span
                className={`text-[10px] leading-tight text-center ${
                  categoryId === cat.id ? 'text-emerald-400 font-medium' : 'text-gray-500'
                }`}
              >
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Date & Note */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#141420] rounded-2xl p-4 border border-[#1e1e30]">
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-[#1a1a2e] text-white text-sm rounded-lg px-3 py-2.5 border border-[#252540] outline-none focus:border-emerald-500/50 transition-colors [color-scheme:dark]"
          />
        </div>
        <div className="bg-[#141420] rounded-2xl p-4 border border-[#1e1e30]">
          <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2">Note</label>
          <input
            type="text"
            placeholder="Optional..."
            maxLength={100}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={handleAmountKeyDown}
            className="w-full bg-[#1a1a2e] text-white text-sm rounded-lg px-3 py-2.5 border border-[#252540] outline-none focus:border-emerald-500/50 placeholder-gray-600 transition-colors"
          />
        </div>
      </div>

      {/* Payment Method */}
      <div className="bg-[#141420] rounded-2xl p-4 border border-[#1e1e30]">
        <label className="text-xs text-gray-400 uppercase tracking-wider block mb-3">Payment Method</label>
        <div className="flex gap-2">
          {PAYMENT_METHODS.map((pm) => (
            <button
              key={pm.id}
              onClick={() => setPaymentMethod(pm.id as PaymentMethod)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl transition-all duration-200 ${
                paymentMethod === pm.id
                  ? 'bg-emerald-500/10 ring-1 ring-emerald-400/50'
                  : 'bg-[#1a1a2e] hover:bg-[#1f1f35]'
              }`}
            >
              <span className="text-lg">{pm.icon}</span>
              <span
                className={`text-[10px] ${
                  paymentMethod === pm.id ? 'text-emerald-400 font-medium' : 'text-gray-500'
                }`}
              >
                {pm.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!amount || parseFloat(amount) <= 0}
        className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 disabled:text-gray-500 text-white text-base font-semibold rounded-2xl transition-all duration-200 active:scale-[0.98] shadow-lg shadow-emerald-500/20 disabled:shadow-none"
      >
        {amount && parseFloat(amount) > 0
          ? `Save ${selectedCategory?.icon} $${parseFloat(amount).toFixed(2)}`
          : 'Enter an amount'}
      </button>
    </div>
  );
}
