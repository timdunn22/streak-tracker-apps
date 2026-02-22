import type { Category } from './types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', name: 'Food', icon: '🍔', color: '#F59E0B' },
  { id: 'transport', name: 'Transport', icon: '🚗', color: '#3B82F6' },
  { id: 'housing', name: 'Housing', icon: '🏠', color: '#8B5CF6' },
  { id: 'utilities', name: 'Utilities', icon: '💡', color: '#6366F1' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: '#EC4899' },
  { id: 'shopping', name: 'Shopping', icon: '🛍️', color: '#F97316' },
  { id: 'health', name: 'Health', icon: '🏥', color: '#EF4444' },
  { id: 'education', name: 'Education', icon: '📚', color: '#14B8A6' },
  { id: 'subscriptions', name: 'Subscriptions', icon: '🔄', color: '#A855F7' },
  { id: 'travel', name: 'Travel', icon: '✈️', color: '#06B6D4' },
  { id: 'gifts', name: 'Gifts', icon: '🎁', color: '#E11D48' },
  { id: 'other', name: 'Other', icon: '📦', color: '#6B7280' },
];

export const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: '💵' },
  { id: 'credit', label: 'Credit', icon: '💳' },
  { id: 'debit', label: 'Debit', icon: '🏧' },
  { id: 'venmo', label: 'Venmo', icon: '📱' },
  { id: 'other', label: 'Other', icon: '🔖' },
] as const;
