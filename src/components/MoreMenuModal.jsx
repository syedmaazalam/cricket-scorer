import React, { useEffect } from 'react';
import {
  LayoutGrid,
  X,
  FileSpreadsheet,
  Users,
  Clock,
  Flag,
  Edit3,
  History,
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
  isFirstInningsEnded = false,
  isViewer = false
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

  // Full list of items with clear, plain-English descriptive subtitles for the scorer
  const allGridItems = [
    {
      id: 'summary',
      label: 'Match Summary',
      description: 'View overall scorecard & MVP player analysis',
      icon: FileSpreadsheet,
      color: '#EAB308', // Amber/Yellow
      forViewer: true,
      action: () => handleAction(onOpenSummary)
    },
    {
      id: 'squad',
      label: 'Squad & Players',
      description: isViewer ? 'Inspect team lineups and playing XI' : 'View, edit, or rename player rosters',
      icon: Users,
      color: '#22C55E', // Green
      forViewer: true,
      action: () => handleAction(onOpenSquad)
    },
    {
      id: 'time_declare',
      label: 'Time Declare / Retire',
      description: 'Retire a batter hurt or bring in bench batsman',
      icon: Clock,
      color: '#F97316', // Orange
      forViewer: false,
      action: () => handleAction(onOpenTimeDeclare)
    },
    {
      id: 'declare_innings',
      label: isFirstInningsEnded ? 'Innings Concluded' : 'Declare 1st Innings',
      description: isFirstInningsEnded ? 'First innings already ended' : 'Close 1st innings early and set target',
      icon: Flag,
      color: '#3B82F6', // Blue
      forViewer: false,
      action: () => handleAction(onOpenDeclareInnings)
    },
    {
      id: 'edit_ball',
      label: 'Edit Ball Score',
      description: 'Fix runs, extras, or wickets on previous balls',
      icon: Edit3,
      color: '#0284C7', // Sky Blue
      forViewer: false,
      action: () => handleAction(onOpenBallEditor)
    },
    {
      id: 'action_logs',
      label: 'Action Audit Logs',
      description: 'Review complete history of undos and ball events',
      icon: History,
      color: '#A855F7', // Purple
      forViewer: false,
      action: () => handleAction(onOpenActionLogs)
    }
  ];

  // Filter items if viewer mode (only show spectator-relevant items)
  const gridItems = isViewer
    ? allGridItems.filter((item) => item.forViewer)
    : allGridItems;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center select-none animate-in fade-in duration-200 px-2 pb-[80px] lg:pb-0"
      style={{
        backgroundColor: 'rgba(5, 12, 36, 0.65)',
        backdropFilter: 'blur(20px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.8)'
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="More Options Menu"
    >
      <div
        className="w-full max-w-[420px] lg:max-w-[500px] rounded-[28px] p-4 sm:p-6 transition-all animate-in slide-in-from-bottom-8 lg:slide-in-from-bottom-0 lg:zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto border shadow-2xl"
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)',
          color: 'var(--text)',
          boxShadow: '0 24px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--border)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center border"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--pri) 16%, transparent)',
                borderColor: 'color-mix(in srgb, var(--pri) 28%, transparent)'
              }}
            >
              <LayoutGrid className="w-4 h-4 text-[var(--pri)]" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight m-0" style={{ color: 'var(--text)' }}>
                {isViewer ? 'Match Options' : 'Scorer Controls & Tools'}
              </h2>
              <p className="text-[11px] m-0" style={{ color: 'var(--muted)' }}>
                {isViewer ? 'Explore match details and squads' : 'Manage lineups, review undos, or correct balls'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0 border"
            style={{
              backgroundColor: 'var(--card-alt)',
              borderColor: 'var(--border)',
              color: 'var(--text)'
            }}
            aria-label="Close"
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* Options Grid (2 columns for viewer, 2 or 3 for scorer with descriptive cards) */}
        <div className={`grid ${isViewer ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'} gap-2.5 sm:gap-3 my-3.5`}>
          {gridItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={item.action}
                className="group p-3 rounded-2xl flex flex-col items-center text-center cursor-pointer transition-all duration-150 active:scale-95 border hover:scale-[1.02] hover:border-[var(--pri)]"
                style={{
                  backgroundColor: 'var(--card-alt)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 mb-2 shrink-0 border"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${item.color} 16%, transparent)`,
                    borderColor: `color-mix(in srgb, ${item.color} 30%, transparent)`
                  }}
                >
                  <Icon
                    className="w-5 h-5"
                    style={{ color: item.color }}
                    strokeWidth={2.2}
                  />
                </div>
                <span className="text-xs font-bold leading-tight" style={{ color: 'var(--text)' }}>
                  {item.label}
                </span>
                <span className="text-[10px] leading-tight mt-1 line-clamp-2" style={{ color: 'var(--muted)' }}>
                  {item.description}
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
            backgroundColor: 'var(--card-alt)',
            borderColor: 'var(--border)',
            color: 'var(--text)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center border shrink-0"
              style={{
                backgroundColor: 'color-mix(in srgb, #EC4899 16%, transparent)',
                borderColor: 'color-mix(in srgb, #EC4899 30%, transparent)'
              }}
            >
              <TrendingUp className="w-4 h-4 text-[#EC4899]" strokeWidth={2.2} />
            </div>
            <div className="text-left">
              <span className="text-xs sm:text-sm font-bold block" style={{ color: 'var(--text)' }}>
                Pointing System Criteria
              </span>
              <span className="text-[10px] block" style={{ color: 'var(--muted)' }}>
                Official POTM scoring formulas and calculation rules
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--muted)' }} />
        </button>
      </div>
    </div>
  );
}
