export type PaymentMethod = 'cash' | 'credit' | 'debit' | 'venmo' | 'other';

export interface Expense {
  id: string;
  amount: number;
  categoryId: string;
  date: string; // ISO date string YYYY-MM-DD
  note: string;
  paymentMethod: PaymentMethod;
  createdAt: number; // timestamp
}

export interface Category {
  id: string;
  name: string;
  icon: string; // emoji
  color: string; // hex color
}

export interface Budget {
  monthly: number;
  categoryBudgets: Record<string, number>; // categoryId -> amount
}

export interface Settings {
  currency: string;
  defaultPaymentMethod: PaymentMethod;
  darkMode: boolean;
  customCategories: Category[];
}

export type Tab = 'dashboard' | 'add' | 'history' | 'reports' | 'settings';

export interface DateRange {
  start: string;
  end: string;
}
