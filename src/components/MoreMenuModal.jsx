import React, { useEffect } from 'react';
import {
  LayoutGrid,
  X,
  FileSpreadsheet,
  Users,
  Clock,
  Flag,
  Edit3,
  Trophy,
  TrendingUp,
  ChevronRight
} from 'lucide-react';

export default function MoreMenuModal({
  isOpen,
  onClose,
  onOpenSummary,
  onOpenSquad,
  onOpenTimeDeclare,
  onOpenDeclareInnings,
  onOpenBallEditor,
  onOpenActionLogs,
  onOpenPointingCriteria,
  isFirstInningsEnded = false
}) {
  // Prevent background scrolling while modal is open & handle Esc key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAction = (callback) => {
    onClose();
    callback?.();
  };

  const gridItems = [
    {
      id: 'summary',
      label: 'Match Summary',
      icon: FileSpreadsheet,
      color: '#EAB308', // Amber/Yellow
      action: () => handleAction(onOpenSummary)
    },
    {
      id: 'squad',
      label: 'Squad & Edit Players',
      icon: Users,
      color: '#22C55E', // Green
      action: () => handleAction(onOpenSquad)
    },
    {
      id: 'time_declare',
      label: 'Time Declare / Retire',
      icon: Clock,
      color: '#F97316', // Orange
      action: () => handleAction(onOpenTimeDeclare)
    },
    {
      id: 'declare_innings',
      label: isFirstInningsEnded ? 'Innings Concluded' : 'Declare 1st Innings',
      icon: Flag,
      color: '#3B82F6', // Blue
      action: () => handleAction(onOpenDeclareInnings)
    },
    {
      id: 'edit_ball',
      label: 'Edit Ball Score',
      icon: Edit3,
      color: '#0284C7', // Sky Blue
      action: () => handleAction(onOpenBallEditor)
    },
    {
      id: 'action_logs',
      label: 'Action Audit Logs (Undos)',
      icon: Trophy,
      color: '#A855F7', // Purple
      action: () => handleAction(onOpenActionLogs)
    }
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center select-none animate-in fade-in duration-200 px-2 pb-[80px] lg:pb-0"
      style={{
        backgroundColor: 'rgba(5, 12, 36, 0.45)',
        backdropFilter: 'blur(20px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.8)'
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="More Options Menu"
    >
      <div
        className="w-full max-w-[420px] lg:max-w-[480px] rounded-[28px] p-4 sm:p-6 transition-all animate-in slide-in-from-bottom-8 lg:slide-in-from-bottom-0 lg:zoom-in-95 duration-200"
        style={{
          background: 'linear-gradient(150deg, color-mix(in srgb, var(--card) 92%, transparent), color-mix(in srgb, var(--card) 80%, transparent))',
          backdropFilter: 'blur(30px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(30px) saturate(1.8)',
          border: '1px solid color-mix(in srgb, var(--t1) 12%, transparent)',
          borderTopColor: 'color-mix(in srgb, #fff 75%, transparent)',
          boxShadow: 'inset 0 1px 0 color-mix(in srgb, #fff 60%, transparent), 0 24px 60px -20px rgba(8, 20, 50, 0.45)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[var(--bd)]">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{
                background: 'color-mix(in srgb, var(--pri) 16%, transparent)',
                border: '1px solid color-mix(in srgb, var(--pri) 28%, transparent)'
              }}
            >
              <LayoutGrid className="w-4 h-4 text-[var(--pri)]" strokeWidth={2.5} />
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-[var(--t1)] tracking-tight">
              More
            </h2>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
            style={{
              background: 'linear-gradient(180deg, color-mix(in srgb, #fff 30%, transparent), color-mix(in srgb, var(--well) 70%, transparent))',
              color: 'var(--t1)',
              border: '1px solid var(--bd)'
            }}
            aria-label="Close"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* 3-Column Grid */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 my-4">
          {gridItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={item.action}
                className="group p-3 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150 active:scale-95 border hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(180deg, color-mix(in srgb, #fff 40%, var(--well)), color-mix(in srgb, var(--well) 85%, transparent))',
                  borderColor: 'var(--bd)',
                  borderTopColor: 'color-mix(in srgb, #fff 60%, transparent)',
                  boxShadow: '0 2px 8px rgba(11, 31, 59, 0.05), inset 0 1px 0 color-mix(in srgb, #fff 50%, transparent)'
                }}
              >
                <div
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 mb-2"
                  style={{
                    background: `color-mix(in srgb, ${item.color} 14%, transparent)`
                  }}
                >
                  <Icon
                    className="w-5 h-5 sm:w-6 sm:h-6"
                    style={{ color: item.color }}
                    strokeWidth={2.2}
                  />
                </div>
                <span className="text-[11px] sm:text-xs font-bold leading-snug text-[var(--t1)] line-clamp-2">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Full-Width Menu Option: Pointing System Criteria */}
        <button
          onClick={() => handleAction(onOpenPointingCriteria)}
          className="w-full p-3 sm:p-3.5 rounded-2xl flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-98 border hover:border-[var(--pri)]"
          style={{
            background: 'linear-gradient(180deg, color-mix(in srgb, #fff 40%, var(--well)), color-mix(in srgb, var(--well) 85%, transparent))',
            borderColor: 'var(--bd)',
            borderTopColor: 'color-mix(in srgb, #fff 60%, transparent)',
            boxShadow: '0 2px 8px rgba(11, 31, 59, 0.05), inset 0 1px 0 color-mix(in srgb, #fff 50%, transparent)'
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{
                background: 'color-mix(in srgb, #EC4899 14%, transparent)',
                border: '1px solid color-mix(in srgb, #EC4899 25%, transparent)'
              }}
            >
              <TrendingUp className="w-4 h-4 text-[#EC4899]" strokeWidth={2.2} />
            </div>
            <span className="text-xs sm:text-sm font-bold text-[var(--t1)]">
              Pointing System Criteria
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--t2)]" />
        </button>
      </div>
    </div>
  );
}
