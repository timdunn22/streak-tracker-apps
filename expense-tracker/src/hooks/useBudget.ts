import { useState, useCallback, useEffect } from 'react';
import type { Budget } from '../types';

const STORAGE_KEY = 'pocketledger_budget';

const DEFAULT_BUDGET: Budget = {
  monthly: 0,
  categoryBudgets: {},
};

function loadBudget(): Budget {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BUDGET;
    const parsed = JSON.parse(raw);
    return {
      monthly: typeof parsed.monthly === 'number' ? parsed.monthly : 0,
      categoryBudgets:
        parsed.categoryBudgets && typeof parsed.categoryBudgets === 'object'
          ? parsed.categoryBudgets
          : {},
    };
  } catch {
    return DEFAULT_BUDGET;
  }
}

function saveBudget(budget: Budget): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(budget));
}

export function useBudget() {
  const [budget, setBudget] = useState<Budget>(loadBudget);

  useEffect(() => {
    saveBudget(budget);
  }, [budget]);

  const setMonthlyBudget = useCallback((amount: number) => {
    setBudget((prev) => ({ ...prev, monthly: amount }));
  }, []);

  const setCategoryBudget = useCallback((categoryId: string, amount: number) => {
    setBudget((prev) => ({
      ...prev,
      categoryBudgets: {
        ...prev.categoryBudgets,
        [categoryId]: amount,
      },
    }));
  }, []);

  const removeCategoryBudget = useCallback((categoryId: string) => {
    setBudget((prev) => {
      const next = { ...prev.categoryBudgets };
      delete next[categoryId];
      return { ...prev, categoryBudgets: next };
    });
  }, []);

  const replaceBudget = useCallback((newBudget: Budget) => {
    setBudget(newBudget);
  }, []);

  return {
    budget,
    setMonthlyBudget,
    setCategoryBudget,
    removeCategoryBudget,
    replaceBudget,
  };
}
