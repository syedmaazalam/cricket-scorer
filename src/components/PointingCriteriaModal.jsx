import React from 'react';
import { Award, X } from 'lucide-react';
import { POINTING_CRITERIA } from '../engine/potm.js';

export default function PointingCriteriaModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)',
          color: 'var(--text)'
        }}
        className="w-full max-w-md rounded-xl p-5 sm:p-6 border shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 relative max-h-[90vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          style={{ color: 'var(--muted)' }}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 active:scale-95 transition-all"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
          <div
            style={{
              backgroundColor: 'var(--green-15)',
              color: 'var(--primary)'
            }}
            className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg border border-emerald-500/30"
          >
            <Award className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-base font-semibold m-0" style={{ color: 'var(--text)' }}>
              Official Pointing System Criteria
            </h3>
            <p className="text-xs m-0" style={{ color: 'var(--muted)' }}>
              Player of the Match & Performance Ranking Formula
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {POINTING_CRITERIA.map((crit, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: 'var(--card-alt)',
                borderColor: 'var(--border)'
              }}
              className="p-3 rounded-lg border flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex flex-col">
                <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                  {crit.item}
                </span>
                <span className="text-[11px] font-normal" style={{ color: 'var(--muted)' }}>
                  {crit.desc}
                </span>
              </div>
              <span
                style={{
                  backgroundColor: 'var(--green-15)',
                  color: 'var(--green)',
                  borderColor: 'var(--green-30)'
                }}
                className="px-2.5 py-1 rounded-md font-mono font-bold text-xs shrink-0 border"
              >
                {crit.points}
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            backgroundColor: 'color-mix(in srgb, var(--primary) 10%, var(--card-alt))',
            borderColor: 'var(--primary)'
          }}
          className="rounded-lg p-3 border text-xs text-center font-medium"
        >
          <span style={{ color: 'var(--text)' }}>
            Points calculate live throughout the match and crown the <strong style={{ color: 'var(--primary)' }}>Player of the Match</strong> at conclusion.
          </span>
        </div>

        <button
          onClick={onClose}
          style={{ backgroundColor: 'var(--primary)', color: '#FFFFFF' }}
          className="w-full py-3 rounded-lg font-semibold text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all"
        >
          Got It
        </button>
      </div>
    </div>
  );
}
