import { useState, useCallback, useEffect } from 'react';
import type { Expense } from '../types';

const STORAGE_KEY = 'pocketledger_expenses';

function loadExpenses(): Expense[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveExpenses(expenses: Expense[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>(loadExpenses);

  useEffect(() => {
    saveExpenses(expenses);
  }, [expenses]);

  const addExpense = useCallback((expense: Expense) => {
    setExpenses((prev) => [expense, ...prev]);
  }, []);

  const deleteExpense = useCallback((id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const updateExpense = useCallback((id: string, updates: Partial<Expense>) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
  }, []);

  const importExpenses = useCallback((newExpenses: Expense[]) => {
    setExpenses((prev) => {
      const existingIds = new Set(prev.map((e) => e.id));
      const unique = newExpenses.filter((e) => !existingIds.has(e.id));
      return [...prev, ...unique];
    });
  }, []);

  const replaceAllExpenses = useCallback((newExpenses: Expense[]) => {
    setExpenses(newExpenses);
  }, []);

  const clearAll = useCallback(() => {
    setExpenses([]);
  }, []);

  return {
    expenses,
    addExpense,
    deleteExpense,
    updateExpense,
    importExpenses,
    replaceAllExpenses,
    clearAll,
  };
}
