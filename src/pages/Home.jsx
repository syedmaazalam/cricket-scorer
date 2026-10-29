import React, { useState, useEffect } from 'react';
import { PlusCircle, Radio, History, ArrowRight, Play, Trophy, Users } from 'lucide-react';
import { getAllLocalMatches } from '../store/localDb.js';

export default function Home({ onNavigate, onResumeMatch, onWatchLive }) {
  const [matchCodeInput, setMatchCodeInput] = useState('');
  const [localMatches, setLocalMatches] = useState([]);

  useEffect(() => {
    async function loadMatches() {
      try {
        const matches = await getAllLocalMatches();
        setLocalMatches(matches);
      } catch (e) {
        console.warn('Could not load local matches:', e);
      }
    }
    loadMatches();
  }, []);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!matchCodeInput.trim()) return;
    onWatchLive(matchCodeInput.trim().toUpperCase());
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 max-w-lg mx-auto">
      {/* Header / Brand */}
      <div className="py-6 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 via-emerald-500 to-cyan-500 p-0.5 shadow-xl shadow-emerald-900/30 mb-3">
          <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
            <span className="text-3xl">🏏</span>
          </div>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white m-0">Cricket Scorer</h1>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          Offline-first, event-sourced live scoring engine with zero data loss.
        </p>
      </div>

      {/* Main Actions */}
      <div className="flex flex-col gap-3">
        {/* Create Match */}
        <button
          onClick={() => onNavigate('setup')}
          className="w-full py-4 px-5 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-base shadow-xl shadow-emerald-950/50 flex items-center justify-between active:scale-98 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
              <PlusCircle className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <div className="font-black text-base">New Match</div>
              <div className="text-xs font-normal text-emerald-100">Setup teams, overs, squads & toss</div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-white/80" />
        </button>

        {/* Watch Live by Code */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-lg">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
            <span>Watch Live Match</span>
          </div>
          <form onSubmit={handleJoin} className="flex gap-2">
            <input
              type="text"
              maxLength={6}
              value={matchCodeInput}
              onChange={(e) => setMatchCodeInput(e.target.value.toUpperCase())}
              placeholder="ENTER 6-CHAR CODE"
              className="flex-1 bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-sm font-mono tracking-widest uppercase text-white focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs uppercase tracking-wider border border-amber-500/30"
            >
              Watch
            </button>
          </form>
        </div>

        {/* Saved / Recent Matches */}
        <div className="mt-2 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            <History className="w-4 h-4 text-indigo-400" />
            <span>Recent Matches</span>
          </div>

          {localMatches.length === 0 ? (
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 text-center text-xs text-slate-500">
              No recent matches yet. Create a new match to get started!
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
              {localMatches.map((m) => {
                const curInn = m.innings?.[m.currentInningsIndex || 0];
                const teamA = m.teams?.[0]?.name || 'Team 1';
                const teamB = m.teams?.[1]?.name || 'Team 2';
                return (
                  <div
                    key={m.matchId}
                    onClick={() => onResumeMatch(m.matchId)}
                    className="p-3.5 bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl flex items-center justify-between cursor-pointer transition-all active:scale-98"
                  >
                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        <span>{teamA} vs {teamB}</span>
                        {m.code && (
                          <span className="text-[10px] font-mono font-bold bg-slate-800 px-1.5 py-0.5 rounded text-amber-300 border border-amber-500/20">
                            {m.code}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {curInn ? (
                          <span>
                            {curInn.battingTeam}: {curInn.score}/{curInn.wickets} ({Math.floor(curInn.legalBalls / 6)}.{curInn.legalBalls % 6} ov)
                          </span>
                        ) : (
                          <span>Status: {m.status || 'In Progress'}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-emerald-400">Resume</span>
                      <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer Branding */}
      <footer className="mt-auto pt-8 pb-4 text-center text-xs text-slate-500 border-t border-slate-900">
        Developed with 🏏 by <span className="text-slate-300 font-bold">Syed Maaz Alam</span>
      </footer>
    </div>
  );
}
