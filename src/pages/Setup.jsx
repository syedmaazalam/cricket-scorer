import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Shield, Check, Users, Clock, Shuffle } from 'lucide-react';
import { generateMatchCode } from '../firebase/matches.js';
import { EVENT_TYPES } from '../engine/constants.js';

export default function Setup({ onStartMatch, onBack }) {
  const [step, setStep] = useState(1); // 1: Info & Format, 2: Squads, 3: Toss & Openers

  // Format
  const [teamAName, setTeamAName] = useState('Team Alpha');
  const [teamBName, setTeamBName] = useState('Team Bravo');
  const [playersPerTeam, setPlayersPerTeam] = useState(11);
  const [overs, setOvers] = useState(20);
  const [customOversInput, setCustomOversInput] = useState('');

  // Squads
  const [teamAPlayers, setTeamAPlayers] = useState([]);
  const [teamBPlayers, setTeamBPlayers] = useState([]);
  const [pasteTextA, setPasteTextA] = useState('');
  const [pasteTextB, setPasteTextB] = useState('');
  const [isPastingA, setIsPastingA] = useState(false);
  const [isPastingB, setIsPastingB] = useState(false);

  // Toss & Openers
  const [tossWinner, setTossWinner] = useState('Team Alpha');
  const [tossDecision, setTossDecision] = useState('bat'); // 'bat' | 'bowl'
  const [striker, setStriker] = useState('');
  const [nonStriker, setNonStriker] = useState('');
  const [bowler, setBowler] = useState('');

  // Auto-generate player names whenever playersPerTeam changes if not set
  const initSquads = (count, nameA, nameB) => {
    const listA = Array.from({ length: count }, (_, i) => `${nameA} P${i + 1}`);
    const listB = Array.from({ length: count }, (_, i) => `${nameB} P${i + 1}`);
    setTeamAPlayers(listA);
    setTeamBPlayers(listB);
  };

  const handleStep1Next = () => {
    if (!teamAName.trim() || !teamBName.trim()) {
      alert('Please enter names for both teams.');
      return;
    }
    const finalOvers = customOversInput ? parseInt(customOversInput, 10) : overs;
    if (!finalOvers || finalOvers < 1) {
      alert('Please select or enter valid number of overs.');
      return;
    }
    setOvers(finalOvers);

    // If squad empty, initialize
    if (teamAPlayers.length !== playersPerTeam) {
      initSquads(playersPerTeam, teamAName, teamBName);
    }
    setTossWinner(teamAName);
    setStep(2);
  };

  const handleApplyPasteA = () => {
    const names = pasteTextA
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(Boolean);
    if (names.length > 0) {
      const padded = [...names];
      while (padded.length < playersPerTeam) {
        padded.push(`${teamAName} P${padded.length + 1}`);
      }
      setTeamAPlayers(padded.slice(0, playersPerTeam));
      setIsPastingA(false);
    }
  };

  const handleApplyPasteB = () => {
    const names = pasteTextB
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(Boolean);
    if (names.length > 0) {
      const padded = [...names];
      while (padded.length < playersPerTeam) {
        padded.push(`${teamBName} P${padded.length + 1}`);
      }
      setTeamBPlayers(padded.slice(0, playersPerTeam));
      setIsPastingB(false);
    }
  };

  const handleStep2Next = () => {
    // Determine batting & bowling teams
    const battingTeamName = tossDecision === 'bat' ? tossWinner : (tossWinner === teamAName ? teamBName : teamAName);
    const bowlingTeamName = battingTeamName === teamAName ? teamBName : teamAName;

    const battingSquad = battingTeamName === teamAName ? teamAPlayers : teamBPlayers;
    const bowlingSquad = bowlingTeamName === teamAName ? teamAPlayers : teamBPlayers;

    setStriker(battingSquad[0] || 'Batter 1');
    setNonStriker(battingSquad[1] || 'Batter 2');
    setBowler(bowlingSquad[0] || 'Bowler 1');

    setStep(3);
  };

  const handleFinishSetup = () => {
    if (striker === nonStriker) {
      alert('Striker and Non-Striker must be two distinct players.');
      return;
    }
    if (!bowler) {
      alert('Please select an opening bowler.');
      return;
    }

    const matchId = 'match_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const code = generateMatchCode();

    const battingTeamName = tossDecision === 'bat' ? tossWinner : (tossWinner === teamAName ? teamBName : teamAName);
    const bowlingTeamName = battingTeamName === teamAName ? teamBName : teamAName;

    const initEvent = {
      type: EVENT_TYPES.MATCH_INIT,
      payload: {
        matchId,
        code,
        teams: [
          { name: battingTeamName, players: battingTeamName === teamAName ? teamAPlayers : teamBPlayers },
          { name: bowlingTeamName, players: bowlingTeamName === teamAName ? teamAPlayers : teamBPlayers }
        ],
        overs,
        playersPerTeam,
        toss: {
          winner: tossWinner,
          decision: tossDecision
        },
        striker,
        nonStriker,
        bowler
      }
    };

    onStartMatch(matchId, code, initEvent);
  };

  // Batting / bowling squad helpers for Step 3
  const battingTeamName = tossDecision === 'bat' ? tossWinner : (tossWinner === teamAName ? teamBName : teamAName);
  const bowlingTeamName = battingTeamName === teamAName ? teamBName : teamAName;
  const currentBattingSquad = battingTeamName === teamAName ? teamAPlayers : teamBPlayers;
  const currentBowlingSquad = bowlingTeamName === teamAName ? teamAPlayers : teamBPlayers;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 max-w-lg mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <button
          onClick={step === 1 ? onBack : () => setStep(s => s - 1)}
          className="p-2 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h2 className="text-base font-black text-white m-0">Match Setup</h2>
          <span className="text-[11px] text-slate-400">Step {step} of 3</span>
        </div>
        <div className="w-9" />
      </div>

      {/* Progress Bars */}
      <div className="grid grid-cols-3 gap-1.5 py-3">
        <div className={`h-1.5 rounded-full ${step >= 1 ? 'bg-emerald-500' : 'bg-slate-800'}`} />
        <div className={`h-1.5 rounded-full ${step >= 2 ? 'bg-emerald-500' : 'bg-slate-800'}`} />
        <div className={`h-1.5 rounded-full ${step >= 3 ? 'bg-emerald-500' : 'bg-slate-800'}`} />
      </div>

      {/* STEP 1: Teams & Format */}
      {step === 1 && (
        <div className="flex flex-col gap-4 py-2">
          {/* Team Names */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Team Names</span>
            </h3>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Team 1 (Host / Alpha)</label>
              <input
                type="text"
                value={teamAName}
                onChange={(e) => setTeamAName(e.target.value)}
                placeholder="Team Alpha"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-semibold"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Team 2 (Opponent / Bravo)</label>
              <input
                type="text"
                value={teamBName}
                onChange={(e) => setTeamBName(e.target.value)}
                placeholder="Team Bravo"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-semibold"
              />
            </div>
          </div>

          {/* Players Per Team (2 to 15) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>Players Per Team</span>
              </h3>
              <span className="text-xs font-black text-cyan-300 bg-cyan-950 px-2.5 py-0.5 rounded-full border border-cyan-800">
                {playersPerTeam} players (All out at {playersPerTeam - 1})
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={2}
                max={15}
                value={playersPerTeam}
                onChange={(e) => setPlayersPerTeam(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>2 (Gully / Pairs)</span>
              <span>6 (Box)</span>
              <span>11 (Standard)</span>
              <span>15 (Max)</span>
            </div>
          </div>

          {/* Overs Selector */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Match Overs</span>
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {[5, 10, 20, 50].map((ov) => (
                <button
                  key={ov}
                  type="button"
                  onClick={() => {
                    setOvers(ov);
                    setCustomOversInput('');
                  }}
                  className={`py-2.5 rounded-xl text-xs font-black border transition-all ${
                    overs === ov && !customOversInput
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-950'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                  }`}
                >
                  {ov} Overs
                </button>
              ))}
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Or Custom Overs</label>
              <input
                type="number"
                min={1}
                max={100}
                value={customOversInput}
                onChange={(e) => {
                  setCustomOversInput(e.target.value);
                  if (e.target.value) setOvers(parseInt(e.target.value, 10));
                }}
                placeholder="e.g. 6, 8, 12, 15, 25"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <button
            onClick={handleStep1Next}
            className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-emerald-950/40 flex items-center justify-center gap-2 mt-2"
          >
            <span>Proceed to Squads</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 2: Squads */}
      {step === 2 && (
        <div className="flex flex-col gap-4 py-2">
          {/* Team A Squad */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                {teamAName} ({teamAPlayers.length} Players)
              </h3>
              <button
                type="button"
                onClick={() => setIsPastingA(!isPastingA)}
                className="text-[11px] text-slate-400 hover:text-white underline"
              >
                {isPastingA ? 'Hide paste' : 'Paste names'}
              </button>
            </div>

            {isPastingA && (
              <div className="flex flex-col gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-700">
                <textarea
                  rows={3}
                  value={pasteTextA}
                  onChange={(e) => setPasteTextA(e.target.value)}
                  placeholder="Paste player names separated by newlines or commas"
                  className="w-full bg-transparent text-xs text-white focus:outline-none resize-none"
                />
                <button
                  type="button"
                  onClick={handleApplyPasteA}
                  className="py-1 px-3 bg-emerald-600 text-white rounded-lg text-xs font-bold self-end"
                >
                  Apply Names
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
              {teamAPlayers.map((p, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={p}
                  onChange={(e) => {
                    const next = [...teamAPlayers];
                    next[idx] = e.target.value;
                    setTeamAPlayers(next);
                  }}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              ))}
            </div>
          </div>

          {/* Team B Squad */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                {teamBName} ({teamBPlayers.length} Players)
              </h3>
              <button
                type="button"
                onClick={() => setIsPastingB(!isPastingB)}
                className="text-[11px] text-slate-400 hover:text-white underline"
              >
                {isPastingB ? 'Hide paste' : 'Paste names'}
              </button>
            </div>

            {isPastingB && (
              <div className="flex flex-col gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-700">
                <textarea
                  rows={3}
                  value={pasteTextB}
                  onChange={(e) => setPasteTextB(e.target.value)}
                  placeholder="Paste player names separated by newlines or commas"
                  className="w-full bg-transparent text-xs text-white focus:outline-none resize-none"
                />
                <button
                  type="button"
                  onClick={handleApplyPasteB}
                  className="py-1 px-3 bg-cyan-600 text-white rounded-lg text-xs font-bold self-end"
                >
                  Apply Names
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
              {teamBPlayers.map((p, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={p}
                  onChange={(e) => {
                    const next = [...teamBPlayers];
                    next[idx] = e.target.value;
                    setTeamBPlayers(next);
                  }}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              ))}
            </div>
          </div>

          <button
            onClick={handleStep2Next}
            className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-emerald-950/40 flex items-center justify-center gap-2 mt-2"
          >
            <span>Proceed to Toss & Openers</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 3: Toss & Openers */}
      {step === 3 && (
        <div className="flex flex-col gap-4 py-2">
          {/* Toss */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Shuffle className="w-4 h-4 text-amber-400" />
              <span>Toss Result</span>
            </h3>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Toss Won By</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTossWinner(teamAName)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold ${
                    tossWinner === teamAName
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {teamAName}
                </button>
                <button
                  type="button"
                  onClick={() => setTossWinner(teamBName)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold ${
                    tossWinner === teamBName
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {teamBName}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Elected To</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTossDecision('bat')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold ${
                    tossDecision === 'bat'
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  Bat First
                </button>
                <button
                  type="button"
                  onClick={() => setTossDecision('bowl')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold ${
                    tossDecision === 'bowl'
                      ? 'bg-cyan-600 text-white border-cyan-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  Bowl First
                </button>
              </div>
            </div>

            <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5">
              🏏 <strong>{battingTeamName}</strong> will bat first. <strong>{bowlingTeamName}</strong> will bowl.
            </div>
          </div>

          {/* Openers & Bowler */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Opening Players</h3>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                Striker ({battingTeamName})
              </label>
              <select
                value={striker}
                onChange={(e) => setStriker(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                {currentBattingSquad.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                Non-Striker ({battingTeamName})
              </label>
              <select
                value={nonStriker}
                onChange={(e) => setNonStriker(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                {currentBattingSquad.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                Opening Bowler ({bowlingTeamName})
              </label>
              <select
                value={bowler}
                onChange={(e) => setBowler(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                {currentBowlingSquad.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleFinishSetup}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-emerald-950/50 flex items-center justify-center gap-2 mt-2"
          >
            <span>Start Match & Scoring</span>
            <Check className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
