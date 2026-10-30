import React from 'react';
import { Zap, FileText, Users, PieChart } from 'lucide-react';

export default function BottomNavBar({ activeTab, onSelectTab }) {
  const tabs = [
    { id: 'score', label: 'Score', icon: Zap },
    { id: 'scorecard', label: 'Scorecard', icon: FileText },
    { id: 'teams', label: 'Teams', icon: Users },
    { id: 'summary', label: 'Summary', icon: PieChart }
  ];

  return (
    <nav
      style={{
        backgroundColor: 'var(--card)',
        borderColor: 'var(--border)'
      }}
      className="fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-md transition-colors shadow-lg"
    >
      <div className="max-w-md mx-auto flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className="flex flex-col items-center justify-center flex-1 py-1 gap-1 transition-all active:scale-95"
            >
              <div
                style={{
                  color: isActive ? 'var(--green)' : 'var(--muted)'
                }}
                className="transition-colors"
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              </div>
              <span
                style={{
                  color: isActive ? 'var(--green)' : 'var(--muted)',
                  fontWeight: isActive ? '700' : '500'
                }}
                className="text-[11px] tracking-tight leading-none"
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
