import React, { useState, useEffect } from 'react';
import { PlusCircle, Radio, History, ArrowRight, Play, Search, Loader2 } from 'lucide-react';
import { getAllLocalMatches } from '../store/localDb.js';
import { searchMatches } from '../firebase/matches.js';
import ThemeToggle from '../components/ThemeToggle.jsx';

export default function Home({ onNavigate, onResumeMatch, onWatchLive }) {
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
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

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchInput.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      // Query local and cloud
      const cloudMatches = await searchMatches(searchInput);

      // Also filter local matches
      const clean = searchInput.trim().toLowerCase();
      const localFiltered = localMatches.filter(m => {
        const t1 = (m.teams?.[0]?.name || '').toLowerCase();
        const t2 = (m.teams?.[1]?.name || '').toLowerCase();
        const c = (m.code || '').toLowerCase();
        return t1.includes(clean) || t2.includes(clean) || c.includes(clean);
      });

      // Merge results deduplicated by matchId
      const map = new Map();
      [...cloudMatches, ...localFiltered].forEach(m => {
        if (!map.has(m.matchId || m.id)) {
          map.set(m.matchId || m.id, m);
        }
      });

      setSearchResults(Array.from(map.values()));
    } catch (err) {
      console.warn('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 dark:bg-slate-950 light:bg-slate-50 text-slate-100 dark:text-slate-100 light:text-slate-900 flex flex-col p-4 max-w-lg mx-auto transition-colors">
      {/* Top Bar with Theme Toggle */}
      <div className="flex justify-end pt-1">
        <ThemeToggle />
      </div>

      {/* Header / Brand */}
      <div className="py-4 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 via-emerald-500 to-cyan-500 p-0.5 shadow-xl shadow-emerald-900/30 mb-3">
          <div className="w-full h-full bg-slate-950 dark:bg-slate-950 light:bg-white rounded-[22px] flex items-center justify-center">
            <span className="text-3xl">🏏</span>
          </div>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white dark:text-white light:text-slate-900 m-0">Cricket Scorer</h1>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          Offline-first, event-sourced live scoring with instant viewer sync.
        </p>
      </div>

      {/* Main Actions */}
      <div className="flex flex-col gap-3.5">
        {/* Create Match (Manager / Scorer) */}
        <button
          onClick={() => onNavigate('setup')}
          className="w-full py-4 px-5 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-base shadow-xl shadow-emerald-950/50 flex items-center justify-between active:scale-98 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
              <PlusCircle className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <div className="font-black text-base">New Match (Manager)</div>
              <div className="text-xs font-normal text-emerald-100">Zero-lag local scoring engine</div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-white/80" />
        </button>

        {/* Search for Match by Team Name or 6-Char Code */}
        <div className="bg-slate-900/90 dark:bg-slate-900/90 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-200 rounded-3xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
              <span>Watch Live Matches</span>
            </div>
            <span className="text-[10px] text-slate-500">By Code or Team Name</span>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search team (e.g. India) or code"
                className="w-full bg-slate-950 dark:bg-slate-950 light:bg-slate-100 border border-slate-700 dark:border-slate-700 light:border-slate-300 rounded-2xl pl-3.5 pr-8 py-2.5 text-sm text-white dark:text-white light:text-slate-900 focus:outline-none focus:border-amber-400"
              />
              {isSearching && (
                <Loader2 className="w-4 h-4 text-amber-400 animate-spin absolute right-3 top-3" />
              )}
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-4 py-2.5 rounded-2xl bg-slate-800 dark:bg-slate-800 light:bg-slate-200 hover:bg-slate-700 dark:hover:bg-slate-700 light:hover:bg-slate-300 text-amber-300 dark:text-amber-300 light:text-slate-900 font-bold text-xs uppercase tracking-wider border border-amber-500/30 flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search</span>
            </button>
          </form>

          {/* Search Results Display */}
          {searchResults.length > 0 && (
            <div className="mt-3 flex flex-col gap-2 pt-2 border-t border-slate-800 dark:border-slate-800 light:border-slate-200">
              <span className="text-[10px] font-bold uppercase text-slate-400">Search Results:</span>
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                {searchResults.map((m) => {
                  const t1 = m.teams?.[0]?.name || 'Team 1';
                  const t2 = m.teams?.[1]?.name || 'Team 2';
                  const code = m.code || '';
                  const scoreInfo = m.summary ? `${m.summary.score}/${m.summary.wickets}` : '';
                  return (
                    <div
                      key={m.matchId || m.code}
                      onClick={() => onWatchLive(code || m.matchId)}
                      className="p-2.5 rounded-xl bg-slate-950 dark:bg-slate-950 light:bg-slate-50 border border-slate-800 dark:border-slate-800 light:border-slate-200 flex items-center justify-between cursor-pointer hover:border-amber-500/50 transition-all"
                    >
                      <div>
                        <div className="font-bold text-xs text-white dark:text-white light:text-slate-900 flex items-center gap-1.5">
                          <span>{t1} vs {t2}</span>
                          {code && (
                            <span className="text-[9px] font-mono bg-slate-800 dark:bg-slate-800 light:bg-slate-200 text-amber-300 px-1 py-0.2 rounded font-bold">
                              {code}
                            </span>
                          )}
                        </div>
                        {scoreInfo && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Score: {scoreInfo} ({m.summary?.battingTeam || ''})
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg">
                        Watch Live
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Saved / Recent Matches */}
        <div className="mt-1 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            <History className="w-4 h-4 text-indigo-400" />
            <span>Recent Matches on this device</span>
          </div>

          {localMatches.length === 0 ? (
            <div className="bg-slate-900/40 dark:bg-slate-900/40 light:bg-white border border-slate-800/80 dark:border-slate-800/80 light:border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-500">
              No local matches recorded yet. Tap "New Match" to start scoring!
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
              {localMatches.map((m) => {
                const curInn = m.innings?.[m.currentInningsIndex || 0];
                const teamA = m.teams?.[0]?.name || 'Team 1';
                const teamB = m.teams?.[1]?.name || 'Team 2';
                return (
                  <div
                    key={m.matchId}
                    onClick={() => onResumeMatch(m.matchId)}
                    className="p-3 bg-slate-900/90 dark:bg-slate-900/90 light:bg-white border border-slate-800 dark:border-slate-800 light:border-slate-200 hover:border-slate-700 rounded-2xl flex items-center justify-between cursor-pointer transition-all active:scale-98 shadow-sm"
                  >
                    <div>
                      <div className="font-bold text-sm text-white dark:text-white light:text-slate-900 flex items-center gap-2">
                        <span>{teamA} vs {teamB}</span>
                        {m.code && (
                          <span className="text-[10px] font-mono font-bold bg-slate-800 dark:bg-slate-800 light:bg-slate-200 px-1.5 py-0.5 rounded text-amber-400 border border-amber-500/20">
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
      <footer className="mt-auto pt-6 pb-2 text-center text-xs text-slate-500 border-t border-slate-900 dark:border-slate-900 light:border-slate-200">
        Developed with 🏏 by <span className="text-slate-300 dark:text-slate-300 light:text-slate-800 font-bold">Syed Maaz Alam</span>
      </footer>
    </div>
  );
}
