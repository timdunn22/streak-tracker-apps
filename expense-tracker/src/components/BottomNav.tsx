import React from 'react';
import type { Tab } from '../types';

interface Props {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Home', icon: '📊' },
  { id: 'add', label: 'Add', icon: '➕' },
  { id: 'history', label: 'History', icon: '📋' },
  { id: 'reports', label: 'Reports', icon: '📈' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function BottomNav({ activeTab, onTabChange }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#1e1e30] bg-[#0e0e1a]/95 backdrop-blur-lg safe-area-bottom">
      <div className="flex items-center justify-around max-w-lg mx-auto h-16">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isAdd = tab.id === 'add';
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 transition-all duration-200 ${
                isAdd
                  ? 'relative -mt-6'
                  : isActive
                  ? 'text-emerald-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {isAdd ? (
                <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 active:scale-95 transition-all">
                  <span className="text-2xl text-white leading-none" style={{ marginTop: '-1px' }}>+</span>
                </div>
              ) : (
                <>
                  <span className="text-lg leading-none" role="img" aria-hidden="true">
                    {tab.icon}
                  </span>
                  <span className="text-[10px] font-medium">{tab.label}</span>
                </>
              )}
              {isAdd && (
                <span className="text-[10px] font-medium text-emerald-400 mt-0.5">Add</span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
