import type { Expense, Category } from './types';

// ── Date helpers ──────────────────────────────────────────────
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getMonthKey(date: string): string {
  return date.slice(0, 7); // YYYY-MM
}

export function getMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const d = new Date(Number(year), Number(month) - 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function getDaysInMonth(monthKey: string): number {
  const [year, month] = monthKey.split('-');
  return new Date(Number(year), Number(month), 0).getDate();
}

export function getWeekDates(): string[] {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - ((dayOfWeek + 7 - 1) % 7) - i + 6);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

export function getWeekStart(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const t = new Date();
  const todayStr = t.toISOString().slice(0, 10);
  const yesterday = new Date(t);
  yesterday.setDate(t.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  if (dateStr === todayStr) return 'Today';
  if (dateStr === yesterdayStr) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export function getDayOfWeekLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

export function getPrevMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const d = new Date(year, month - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ── Currency formatting ───────────────────────────────────────
export function formatCurrency(amount: number, currency: string = '$'): string {
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount < 0 ? '-' : ''}${currency}${formatted}`;
}

// ── ID generation ─────────────────────────────────────────────
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

// ── Expense grouping ──────────────────────────────────────────
export function groupByDate(expenses: Expense[]): Map<string, Expense[]> {
  const map = new Map<string, Expense[]>();
  const sorted = [...expenses].sort((a, b) => b.createdAt - a.createdAt);
  for (const exp of sorted) {
    const existing = map.get(exp.date);
    if (existing) {
      existing.push(exp);
    } else {
      map.set(exp.date, [exp]);
    }
  }
  return map;
}

export function getCategorySpending(expenses: Expense[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const exp of expenses) {
    map.set(exp.categoryId, (map.get(exp.categoryId) || 0) + exp.amount);
  }
  return map;
}

export function getMonthExpenses(expenses: Expense[], monthKey: string): Expense[] {
  return expenses.filter((e) => getMonthKey(e.date) === monthKey);
}

// ── CSV Export/Import ─────────────────────────────────────────
export function exportToCSV(expenses: Expense[], categories: Category[]): string {
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const header = 'Date,Category,Amount,Payment Method,Note';
  const rows = expenses
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => {
      const cat = catMap.get(e.categoryId) || e.categoryId;
      const note = `"${e.note.replace(/"/g, '""')}"`;
      return `${e.date},${cat},${e.amount.toFixed(2)},${e.paymentMethod},${note}`;
    });
  return [header, ...rows].join('\n');
}

export function importFromCSV(csv: string, categories: Category[]): Expense[] {
  const catMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  const expenses: Expense[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = parseCSVLine(lines[i]);
    if (parts.length < 4) continue;

    const [date, category, amountStr, paymentMethod, ...noteParts] = parts;
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) continue;

    const categoryId = catMap.get(category.toLowerCase()) || 'other';
    const validMethods = ['cash', 'credit', 'debit', 'venmo', 'other'];
    const pm = validMethods.includes(paymentMethod.toLowerCase())
      ? (paymentMethod.toLowerCase() as Expense['paymentMethod'])
      : 'other';

    expenses.push({
      id: generateId(),
      amount,
      categoryId,
      date: date || today(),
      note: noteParts.join(',').replace(/^"|"$/g, '').replace(/""/g, '"'),
      paymentMethod: pm,
      createdAt: Date.now() + i,
    });
  }
  return expenses;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

// ── JSON Export/Import ────────────────────────────────────────
export function exportToJSON(
  expenses: Expense[],
  budget: { monthly: number; categoryBudgets: Record<string, number> },
  settings: {
    currency: string;
    defaultPaymentMethod: string;
    darkMode: boolean;
    customCategories: Category[];
  }
): string {
  return JSON.stringify({ expenses, budget, settings, exportedAt: new Date().toISOString() }, null, 2);
}

// ── File Download ─────────────────────────────────────────────
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── File Read ─────────────────────────────────────────────────
export function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
