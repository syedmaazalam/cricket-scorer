import React from 'react';
import { Zap, FileText, LayoutGrid, Users, Settings } from 'lucide-react';

export default function BottomNavBar({
  activeTab,
  onSelectTab,
  isMoreOpen = false,
  onToggleMore
}) {
  const tabs = [
    { id: 'score', label: 'Score', icon: Zap },
    { id: 'scorecard', label: 'Scorecard', icon: FileText },
    { id: 'more', label: 'More', icon: LayoutGrid, isCenterMore: true },
    { id: 'teams', label: 'Teams', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <>
      {/* Mobile Floating Bottom Bar */}
      <nav
        className="lg:hidden fixed left-0 right-0 bottom-0 pointer-events-none z-40 select-none"
        style={{ padding: '0 4px calc(6px + env(safe-area-inset-bottom, 0px))' }}
        aria-label="Bottom Navigation"
      >
        <div
          className="pointer-events-auto w-full max-w-lg mx-auto flex items-center p-1 rounded-[22px] transition-all"
          style={{
            background: 'color-mix(in srgb, var(--bg2) 50%, transparent)',
            WebkitBackdropFilter: 'blur(32px) saturate(1.9)',
            backdropFilter: 'blur(32px) saturate(1.9)',
            border: '1px solid var(--bd)',
            borderTopColor: 'color-mix(in srgb, #fff 45%, transparent)',
            boxShadow: 'inset 0 1px 0 color-mix(in srgb, #fff 45%, transparent), 0 18px 40px -16px rgba(8, 20, 50, 0.4)'
          }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isCenter = tab.isCenterMore;
            const isActive = isCenter ? isMoreOpen : activeTab === tab.id;

            const handleClick = () => {
              if (isCenter) {
                if (onToggleMore) {
                  onToggleMore();
                } else if (onSelectTab) {
                  onSelectTab('more');
                }
              } else {
                onSelectTab?.(tab.id);
              }
            };

            return (
              <button
                key={tab.id}
                onClick={handleClick}
                aria-current={isActive ? 'page' : undefined}
                className={`flex-1 border-0 bg-transparent flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-[16px] text-[11px] font-bold transition-all ${
                  isActive
                    ? 'shadow-sm'
                    : 'hover:opacity-80 active:scale-95'
                }`}
                style={{
                  color: isActive ? 'var(--pri)' : 'var(--t2)',
                  background: isActive
                    ? 'color-mix(in srgb, var(--pri) 22%, transparent)'
                    : 'transparent',
                  boxShadow: isActive
                    ? 'inset 0 0 0 1px color-mix(in srgb, var(--pri) 50%, transparent)'
                    : 'none'
                }}
              >
                <Icon
                  className="w-[22px] h-[22px]"
                  strokeWidth={isActive ? 2.4 : 2}
                  aria-hidden="true"
                />
                <span className="leading-none">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Desktop Vertical Left Floating Rail */}
      <nav
        className="hidden lg:flex fixed left-5 top-1/2 -translate-y-1/2 z-40 select-none pointer-events-none"
        aria-label="Desktop Side Navigation"
      >
        <div
          className="pointer-events-auto flex flex-col items-center gap-1.5 p-2 py-3.5 rounded-[44px] transition-all w-[84px]"
          style={{
            background: 'color-mix(in srgb, var(--bg2) 50%, transparent)',
            WebkitBackdropFilter: 'blur(32px) saturate(1.9)',
            backdropFilter: 'blur(32px) saturate(1.9)',
            border: '1px solid var(--bd)',
            borderTopColor: 'color-mix(in srgb, #fff 50%, transparent)',
            boxShadow: 'inset 0 1px 0 color-mix(in srgb, #fff 45%, transparent), 0 18px 40px -16px rgba(8, 20, 50, 0.4)'
          }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isCenter = tab.isCenterMore;
            const isActive = isCenter ? isMoreOpen : activeTab === tab.id;

            const handleClick = () => {
              if (isCenter) {
                if (onToggleMore) {
                  onToggleMore();
                } else if (onSelectTab) {
                  onSelectTab('more');
                }
              } else {
                onSelectTab?.(tab.id);
              }
            };

            return (
              <button
                key={tab.id}
                onClick={handleClick}
                aria-current={isActive ? 'page' : undefined}
                className={`relative w-full border-0 bg-transparent flex flex-col items-center justify-center gap-1.5 py-3 px-1 rounded-[24px] text-[11px] font-bold transition-all ${
                  isActive ? 'shadow-sm' : 'hover:opacity-80 active:scale-95'
                }`}
                style={{
                  color: isActive ? 'var(--pri)' : 'var(--t2)',
                  background: isActive
                    ? 'color-mix(in srgb, var(--pri) 22%, transparent)'
                    : 'transparent',
                  boxShadow: isActive
                    ? 'inset 0 0 0 1px color-mix(in srgb, var(--pri) 50%, transparent)'
                    : 'none'
                }}
              >
                <Icon
                  className="w-[22px] h-[22px]"
                  strokeWidth={isActive ? 2.4 : 2}
                  aria-hidden="true"
                />
                <span className="leading-none">{tab.label}</span>
                {isActive && (
                  <span
                    className="absolute -right-2 top-1/2 -translate-y-1/2 w-[7px] h-[7px] rounded-full"
                    style={{
                      backgroundColor: 'var(--pri)',
                      boxShadow: '0 0 8px var(--pri)'
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
