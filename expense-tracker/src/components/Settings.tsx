import React, { useState, useRef } from 'react';
import type { Settings as SettingsType, Category, Expense, Budget, PaymentMethod } from '../types';
import { DEFAULT_CATEGORIES, PAYMENT_METHODS } from '../categories';
import {
  exportToCSV,
  exportToJSON,
  importFromCSV,
  downloadFile,
  readFile,
  today,
} from '../utils';

interface Props {
  settings: SettingsType;
  categories: Category[];
  expenses: Expense[];
  budget: Budget;
  onUpdateSettings: (updates: Partial<SettingsType>) => void;
  onImportExpenses: (expenses: Expense[]) => void;
  onReplaceAll: (expenses: Expense[]) => void;
  onReplaceBudget: (budget: Budget) => void;
  onClearAll: () => void;
}

export default function Settings({
  settings,
  categories,
  expenses,
  budget,
  onUpdateSettings,
  onImportExpenses,
  onReplaceAll,
  onReplaceBudget,
  onClearAll,
}: Props) {
  const [clearConfirm, setClearConfirm] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [addCatName, setAddCatName] = useState('');
  const [addCatIcon, setAddCatIcon] = useState('📌');
  const [addCatColor, setAddCatColor] = useState('#6B7280');
  const [showAddCat, setShowAddCat] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const handleExportCSV = () => {
    const csv = exportToCSV(expenses, categories);
    downloadFile(csv, `pocketledger-expenses-${today()}.csv`, 'text/csv');
  };

  const handleExportJSON = () => {
    const json = exportToJSON(expenses, budget, settings);
    downloadFile(json, `pocketledger-backup-${today()}.json`, 'application/json');
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const content = await readFile(file);
      const imported = importFromCSV(content, categories);
      if (imported.length === 0) {
        setImportMsg('No valid expenses found in CSV.');
      } else {
        onImportExpenses(imported);
        setImportMsg(`Imported ${imported.length} expense(s) from CSV.`);
      }
    } catch {
      setImportMsg('Failed to read CSV file.');
    }
    e.target.value = '';
    setTimeout(() => setImportMsg(''), 4000);
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const content = await readFile(file);
      const data = JSON.parse(content);
      if (data.expenses && Array.isArray(data.expenses)) {
        onReplaceAll(data.expenses);
        if (data.budget) onReplaceBudget(data.budget);
        if (data.settings) {
          onUpdateSettings({
            currency: data.settings.currency || '$',
            defaultPaymentMethod: data.settings.defaultPaymentMethod || 'cash',
            darkMode: data.settings.darkMode !== false,
            customCategories: data.settings.customCategories || [],
          });
        }
        setImportMsg(`Restored ${data.expenses.length} expense(s) from backup.`);
      } else {
        setImportMsg('Invalid backup file format.');
      }
    } catch {
      setImportMsg('Failed to read JSON file.');
    }
    e.target.value = '';
    setTimeout(() => setImportMsg(''), 4000);
  };

  const handleClearAll = () => {
    if (clearConfirm) {
      onClearAll();
      setClearConfirm(false);
      if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
    } else {
      setClearConfirm(true);
      setTimeout(() => setClearConfirm(false), 5000);
    }
  };

  const handleAddCategory = () => {
    if (!addCatName.trim()) return;
    const id = addCatName.trim().toLowerCase().replace(/\s+/g, '-');
    const newCat: Category = {
      id,
      name: addCatName.trim(),
      icon: addCatIcon,
      color: addCatColor,
    };
    onUpdateSettings({
      customCategories: [...settings.customCategories, newCat],
    });
    setAddCatName('');
    setAddCatIcon('📌');
    setAddCatColor('#6B7280');
    setShowAddCat(false);
  };

  const handleRemoveCustomCategory = (id: string) => {
    onUpdateSettings({
      customCategories: settings.customCategories.filter((c) => c.id !== id),
    });
  };

  return (
    <div className="px-4 pt-2 pb-4 space-y-5 animate-fadeIn">
      <h2 className="text-lg font-semibold text-white">Settings</h2>

      {/* Import Message */}
      {importMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-sm text-emerald-400">
          {importMsg}
        </div>
      )}

      {/* General */}
      <div className="bg-[#141420] rounded-2xl p-4 border border-[#1e1e30] space-y-4">
        <p className="text-xs text-gray-400 uppercase tracking-wider">General</p>

        {/* Currency */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-300">Currency Symbol</label>
          <input
            type="text"
            value={settings.currency}
            onChange={(e) => onUpdateSettings({ currency: e.target.value.slice(0, 3) })}
            maxLength={3}
            className="w-16 bg-[#1a1a2e] text-white text-sm text-center rounded-lg px-2 py-1.5 border border-[#252540] outline-none focus:border-emerald-500/50"
          />
        </div>

        {/* Default Payment Method */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-300">Default Payment</label>
          <select
            value={settings.defaultPaymentMethod}
            onChange={(e) => onUpdateSettings({ defaultPaymentMethod: e.target.value as PaymentMethod })}
            className="bg-[#1a1a2e] text-white text-sm rounded-lg px-3 py-1.5 border border-[#252540] outline-none [color-scheme:dark]"
          >
            {PAYMENT_METHODS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.icon} {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Dark Mode */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-300">Dark Mode</label>
          <button
            onClick={() => onUpdateSettings({ darkMode: !settings.darkMode })}
            className={`w-12 h-7 rounded-full transition-colors duration-200 relative ${
              settings.darkMode ? 'bg-emerald-500' : 'bg-gray-600'
            }`}
            aria-label={settings.darkMode ? 'Disable dark mode' : 'Enable dark mode'}
          >
            <div
              className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all duration-200 ${
                settings.darkMode ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-[#141420] rounded-2xl p-4 border border-[#1e1e30] space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Custom Categories</p>
          <button
            onClick={() => setShowAddCat(!showAddCat)}
            className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            {showAddCat ? 'Cancel' : '+ Add'}
          </button>
        </div>

        {showAddCat && (
          <div className="bg-[#1a1a2e] rounded-xl p-3 space-y-2 animate-slideDown">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Name"
                value={addCatName}
                onChange={(e) => setAddCatName(e.target.value)}
                className="flex-1 bg-[#141420] text-white text-sm rounded-lg px-3 py-2 border border-[#252540] outline-none focus:border-emerald-500/50 placeholder-gray-600"
              />
              <input
                type="text"
                placeholder="🎯"
                value={addCatIcon}
                onChange={(e) => setAddCatIcon(e.target.value)}
                maxLength={4}
                className="w-12 bg-[#141420] text-white text-sm text-center rounded-lg px-2 py-2 border border-[#252540] outline-none"
              />
              <input
                type="color"
                value={addCatColor}
                onChange={(e) => setAddCatColor(e.target.value)}
                className="w-10 h-9 rounded-lg border border-[#252540] cursor-pointer bg-transparent"
              />
            </div>
            <button
              onClick={handleAddCategory}
              disabled={!addCatName.trim()}
              className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Add Category
            </button>
          </div>
        )}

        {settings.customCategories.length > 0 ? (
          <div className="space-y-2">
            {settings.customCategories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between bg-[#1a1a2e] rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{cat.icon}</span>
                  <span className="text-sm text-gray-300">{cat.name}</span>
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                </div>
                <button
                  onClick={() => handleRemoveCustomCategory(cat.id)}
                  className="text-gray-600 hover:text-red-400 text-sm transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-600">No custom categories. Default categories are always available.</p>
        )}
      </div>

      {/* Data Management */}
      <div className="bg-[#141420] rounded-2xl p-4 border border-[#1e1e30] space-y-3">
        <p className="text-xs text-gray-400 uppercase tracking-wider">Data</p>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleExportCSV}
            className="py-2.5 bg-[#1a1a2e] hover:bg-[#1f1f35] text-sm text-gray-300 rounded-xl border border-[#252540] transition-colors"
          >
            📄 Export CSV
          </button>
          <button
            onClick={handleExportJSON}
            className="py-2.5 bg-[#1a1a2e] hover:bg-[#1f1f35] text-sm text-gray-300 rounded-xl border border-[#252540] transition-colors"
          >
            💾 Export JSON
          </button>
          <button
            onClick={() => csvInputRef.current?.click()}
            className="py-2.5 bg-[#1a1a2e] hover:bg-[#1f1f35] text-sm text-gray-300 rounded-xl border border-[#252540] transition-colors"
          >
            📥 Import CSV
          </button>
          <button
            onClick={() => jsonInputRef.current?.click()}
            className="py-2.5 bg-[#1a1a2e] hover:bg-[#1f1f35] text-sm text-gray-300 rounded-xl border border-[#252540] transition-colors"
          >
            📥 Import JSON
          </button>
        </div>

        <input
          ref={csvInputRef}
          type="file"
          accept=".csv"
          onChange={handleImportCSV}
          className="hidden"
        />
        <input
          ref={jsonInputRef}
          type="file"
          accept=".json"
          onChange={handleImportJSON}
          className="hidden"
        />

        <div className="pt-2 border-t border-[#1e1e30]">
          <button
            onClick={handleClearAll}
            className={`w-full py-2.5 text-sm font-medium rounded-xl transition-all ${
              clearConfirm
                ? 'bg-red-500 text-white'
                : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
            }`}
          >
            {clearConfirm ? 'Tap again to confirm — this cannot be undone' : 'Clear All Data'}
          </button>
        </div>
      </div>

      {/* About */}
      <div className="bg-[#141420] rounded-2xl p-4 border border-[#1e1e30] text-center space-y-1">
        <p className="text-sm font-semibold text-white">PocketLedger</p>
        <p className="text-xs text-gray-500">Private expense tracking. No bank linking. No cloud.</p>
        <p className="text-xs text-gray-600">All data stays on your device.</p>
      </div>
    </div>
  );
}
