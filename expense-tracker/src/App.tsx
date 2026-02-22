import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { Tab, Settings as SettingsType, PaymentMethod, Category } from './types';
import { DEFAULT_CATEGORIES } from './categories';
import { useExpenses } from './hooks/useExpenses';
import { useBudget } from './hooks/useBudget';
import Dashboard from './components/Dashboard';
import QuickAdd from './components/QuickAdd';
import TransactionHistory from './components/TransactionHistory';
import BudgetSettings from './components/BudgetSettings';
import MonthlyReport from './components/MonthlyReport';
import Settings from './components/Settings';
import BottomNav from './components/BottomNav';

const SETTINGS_KEY = 'pocketledger_settings';

const DEFAULT_SETTINGS: SettingsType = {
  currency: '$',
  defaultPaymentMethod: 'cash',
  darkMode: true,
  customCategories: [],
};

function loadSettings(): SettingsType {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      currency: typeof parsed.currency === 'string' ? parsed.currency : '$',
      defaultPaymentMethod: parsed.defaultPaymentMethod || 'cash',
      darkMode: parsed.darkMode !== false,
      customCategories: Array.isArray(parsed.customCategories) ? parsed.customCategories : [],
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [settings, setSettings] = useState<SettingsType>(loadSettings);
  const { expenses, addExpense, deleteExpense, importExpenses, replaceAllExpenses, clearAll } = useExpenses();
  const { budget, setMonthlyBudget, setCategoryBudget, removeCategoryBudget, replaceBudget } = useBudget();

  // Persist settings
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  // Apply light/dark theme
  useEffect(() => {
    document.documentElement.classList.toggle('light-mode', !settings.darkMode);
  }, [settings.darkMode]);

  const categories: Category[] = useMemo(
    () => [...DEFAULT_CATEGORIES, ...settings.customCategories],
    [settings.customCategories]
  );

  const handleUpdateSettings = useCallback((updates: Partial<SettingsType>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleNavigate = useCallback((tab: Tab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleClearAll = useCallback(() => {
    clearAll();
    replaceBudget({ monthly: 0, categoryBudgets: {} });
  }, [clearAll, replaceBudget]);

  return (
    <div className="min-h-screen bg-[#0a0a12] text-white pb-24 max-w-lg mx-auto">
      {activeTab === 'dashboard' && (
        <Dashboard
          expenses={expenses}
          budget={budget}
          categories={categories}
          currency={settings.currency}
          onNavigate={handleNavigate}
        />
      )}
      {activeTab === 'add' && (
        <QuickAdd
          categories={categories}
          defaultPaymentMethod={settings.defaultPaymentMethod}
          onAdd={(expense) => {
            addExpense(expense);
            // Stay on add screen for rapid entry
          }}
          onNavigate={handleNavigate}
        />
      )}
      {activeTab === 'history' && (
        <TransactionHistory
          expenses={expenses}
          categories={categories}
          currency={settings.currency}
          onDelete={deleteExpense}
        />
      )}
      {activeTab === 'reports' && (
        <MonthlyReport
          expenses={expenses}
          categories={categories}
          currency={settings.currency}
        />
      )}
      {activeTab === 'settings' && (
        <>
          <BudgetSettings
            budget={budget}
            categories={categories}
            expenses={expenses}
            currency={settings.currency}
            onSetMonthly={setMonthlyBudget}
            onSetCategory={setCategoryBudget}
            onRemoveCategory={removeCategoryBudget}
          />
          <Settings
            settings={settings}
            categories={categories}
            expenses={expenses}
            budget={budget}
            onUpdateSettings={handleUpdateSettings}
            onImportExpenses={importExpenses}
            onReplaceAll={replaceAllExpenses}
            onReplaceBudget={replaceBudget}
            onClearAll={handleClearAll}
          />
        </>
      )}

      <BottomNav activeTab={activeTab} onTabChange={handleNavigate} />
    </div>
  );
}
