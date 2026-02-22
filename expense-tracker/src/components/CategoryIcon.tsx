import React from 'react';
import type { Category } from '../types';

interface Props {
  category: Category;
  size?: 'sm' | 'md' | 'lg';
  selected?: boolean;
  onClick?: () => void;
}

const sizes = {
  sm: { wrapper: 'w-8 h-8', emoji: 'text-sm' },
  md: { wrapper: 'w-10 h-10', emoji: 'text-lg' },
  lg: { wrapper: 'w-14 h-14', emoji: 'text-2xl' },
};

export default function CategoryIcon({ category, size = 'md', selected, onClick }: Props) {
  const s = sizes[size];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${s.wrapper} rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 ${
        selected
          ? 'ring-2 ring-emerald-400 scale-110'
          : 'hover:scale-105'
      }`}
      style={{
        backgroundColor: selected ? category.color + '33' : category.color + '1a',
      }}
      aria-label={category.name}
    >
      <span className={s.emoji} role="img" aria-hidden="true">
        {category.icon}
      </span>
    </button>
  );
}
