import React from 'react';
import { Award, X } from 'lucide-react';
import { POINTING_CRITERIA } from '../engine/potm.js';

export default function PointingCriteriaModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md select-none animate-in fade-in duration-200"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="card"
        role="dialog"
        aria-modal="true"
        aria-label="Pointing System Criteria"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '400px',
          width: '100%',
          margin: 0,
          background: 'linear-gradient(150deg, color-mix(in srgb, var(--card) 92%, transparent), color-mix(in srgb, var(--card) 80%, transparent))',
          backdropFilter: 'blur(30px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(30px) saturate(1.8)',
          border: '1px solid color-mix(in srgb, var(--t1) 12%, transparent)',
          borderTopColor: 'color-mix(in srgb, #fff 75%, transparent)',
          boxShadow: 'inset 0 1px 0 color-mix(in srgb, #fff 60%, transparent), 0 24px 60px -20px rgba(8, 20, 50, 0.45)'
        }}
      >
        <div className="row bt" style={{ marginBottom: '14px' }}>
          <div className="row">
            <span className="ok"><Award className="w-5 h-5 text-[var(--ok)]" /></span>
            <h3 className="h2 font-serif font-bold text-lg">Scoring Criteria</h3>
          </div>
          <button
            onClick={onClose}
            className="ib"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
          {POINTING_CRITERIA.map((crit, idx) => (
            <div
              key={idx}
              className="row bt"
              style={{
                backgroundColor: 'var(--well)',
                border: '1px solid var(--bd)',
                borderRadius: '12px',
                padding: '8px 12px',
                fontSize: '12px'
              }}
            >
              <div className="flex flex-col">
                <span className="font-bold" style={{ color: 'var(--t1)' }}>
                  {crit.item}
                </span>
                <span className="mu" style={{ fontSize: '11px' }}>
                  {crit.desc}
                </span>
              </div>
              <span className="chip" style={{ fontSize: '11px', padding: '3px 8px' }}>
                {crit.points}
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            backgroundColor: 'var(--well)',
            border: '1px solid var(--bd)',
            borderRadius: '12px',
            padding: '10px 12px',
            fontSize: '11px',
            textAlign: 'center',
            marginTop: '12px'
          }}
          className="mu"
        >
          Points calculate live and crown the <b className="ac">Player of the Match</b> at conclusion.
        </div>

        <button
          onClick={onClose}
          className="btn p"
          style={{ marginTop: '12px', marginBottom: 0 }}
        >
          Got It
        </button>
      </div>
    </div>
  );
}
