import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Shield, Check, Users, Clock, Shuffle, AlertCircle, Activity } from 'lucide-react';
import { generateMatchCode } from '../firebase/matches.js';
import { EVENT_TYPES } from '../engine/constants.js';
import ThemeToggle from '../components/ThemeToggle.jsx';

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
  const [multilineA, setMultilineA] = useState('');
  const [multilineB, setMultilineB] = useState('');
  const [inputModeA, setInputModeA] = useState('multiline'); // 'multiline' | 'boxes'
  const [inputModeB, setInputModeB] = useState('multiline');

  // Toss & Openers
  const [tossWinner, setTossWinner] = useState('Team Alpha');
  const [tossDecision, setTossDecision] = useState('bat'); // 'bat' | 'bowl'
  const [striker, setStriker] = useState('');
  const [nonStriker, setNonStriker] = useState('');
  const [bowler, setBowler] = useState('');

  // Initialize squad names
  const initSquads = (count, nameA, nameB) => {
    const listA = Array.from({ length: count }, (_, i) => `${nameA} P${i + 1}`);
    const listB = Array.from({ length: count }, (_, i) => `${nameB} P${i + 1}`);
    setTeamAPlayers(listA);
    setTeamBPlayers(listB);
    setMultilineA(listA.join('\n'));
    setMultilineB(listB.join('\n'));
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

    if (teamAPlayers.length !== playersPerTeam) {
      initSquads(playersPerTeam, teamAName, teamBName);
    }
    setTossWinner(teamAName);
    setStep(2);
  };

  // Parses newline separated text into an array of player names
  const parseMultiline = (text, defaultPrefix, count) => {
    const lines = text
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);
    const result = [...lines];
    while (result.length < count) {
      result.push(`${defaultPrefix} P${result.length + 1}`);
    }
    return result.slice(0, count);
  };

  const handleMultilineAChange = (text) => {
    setMultilineA(text);
    const parsed = parseMultiline(text, teamAName, playersPerTeam);
    setTeamAPlayers(parsed);
  };

  const handleMultilineBChange = (text) => {
    setMultilineB(text);
    const parsed = parseMultiline(text, teamBName, playersPerTeam);
    setTeamBPlayers(parsed);
  };

  // Find duplicates helper
  const findDuplicates = (list) => {
    const seen = new Set();
    const dupes = [];
    for (const item of list) {
      const clean = (item || '').trim().toLowerCase();
      if (clean) {
        if (seen.has(clean)) {
          if (!dupes.includes(item.trim())) dupes.push(item.trim());
        } else {
          seen.add(clean);
        }
      }
    }
    return dupes;
  };

  const duplicatesA = findDuplicates(teamAPlayers);
  const duplicatesB = findDuplicates(teamBPlayers);
  const hasDuplicates = duplicatesA.length > 0 || duplicatesB.length > 0;

  const handleStep2Next = () => {
    if (hasDuplicates) {
      alert('Please resolve duplicate player names before proceeding.');
      return;
    }

    const battingTeamName = tossDecision === 'bat' ? tossWinner : (tossWinner === teamAName ? teamBName : teamAName);
    const bowlingTeamName = battingTeamName === teamAName ? teamBName : teamAName;

    const battingSquad = battingTeamName === teamAName ? teamAPlayers : teamBPlayers;
    const bowlingSquad = bowlingTeamName === teamAName ? teamAPlayers : teamBPlayers;

    setStriker(battingSquad[0] || 'Batter 1');
    setNonStriker(battingSquad[1] || 'Batter 2');
    setBowler(bowlingSquad[0] || 'Bowler 1');

    setStep(3);
  };

  const battingTeamName = tossDecision === 'bat' ? tossWinner : (tossWinner === teamAName ? teamBName : teamAName);
  const bowlingTeamName = battingTeamName === teamAName ? teamBName : teamAName;
  const currentBattingSquad = battingTeamName === teamAName ? teamAPlayers : teamBPlayers;
  const currentBowlingSquad = bowlingTeamName === teamAName ? teamAPlayers : teamBPlayers;

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

  return (
    <div
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
      className="min-h-screen flex flex-col p-4 max-w-xl mx-auto select-none transition-colors"
    >
      {/* Header */}
      <div style={{ borderColor: 'var(--border)' }} className="flex items-center justify-between pb-3 border-b">
        <button
          onClick={() => {
            if (step > 1) setStep(step - 1);
            else onBack();
          }}
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
          className="p-2 rounded-2xl border transition-all active:scale-95"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h2 className="text-base font-black m-0" style={{ color: 'var(--text)' }}>
            Match Configuration
          </h2>
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>
            Step {step} of 3 • {step === 1 ? 'Format & Teams' : step === 2 ? 'Squad Rosters' : 'Toss & Openers'}
          </span>
        </div>

        <ThemeToggle />
      </div>

      {/* STEP 1: Format & Teams */}
      {step === 1 && (
        <div className="flex flex-col gap-4 py-4">
          {/* Team Names Card */}
          <div
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
            className="app-card p-4 flex flex-col gap-3"
          >
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>
              <Shield className="w-4 h-4" />
              <span>Team Names</span>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase block mb-1" style={{ color: 'var(--muted)' }}>
                Team 1 (Home)
              </label>
              <input
                type="text"
                value={teamAName}
                onChange={(e) => setTeamAName(e.target.value)}
                style={{
                  backgroundColor: 'var(--card-alt)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
                placeholder="Team Alpha"
                className="w-full rounded-xl px-3.5 py-2.5 text-sm font-semibold border focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase block mb-1" style={{ color: 'var(--muted)' }}>
                Team 2 (Away)
              </label>
              <input
                type="text"
                value={teamBName}
                onChange={(e) => setTeamBName(e.target.value)}
                style={{
                  backgroundColor: 'var(--card-alt)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
                placeholder="Team Bravo"
                className="w-full rounded-xl px-3.5 py-2.5 text-sm font-semibold border focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
          </div>

          {/* Players Per Team */}
          <div
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
            className="app-card p-4 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--blue)' }}>
                <Users className="w-4 h-4" />
                <span>Players Per Team</span>
              </div>
              <span
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--blue) 20%, transparent)',
                  color: 'var(--blue)'
                }}
                className="text-xs font-black px-2.5 py-0.5 rounded-full"
              >
                {playersPerTeam} players (All out at {playersPerTeam - 1})
              </span>
            </div>

            <input
              type="range"
              min={2}
              max={15}
              value={playersPerTeam}
              onChange={(e) => setPlayersPerTeam(parseInt(e.target.value, 10))}
              className="w-full h-2 rounded-lg cursor-pointer"
              style={{ accentColor: 'var(--blue)' }}
            />

            <div className="flex justify-between text-[10px] font-mono" style={{ color: 'var(--muted)' }}>
              <span>2 (Gully)</span>
              <span>6 (Box)</span>
              <span>11 (Standard)</span>
              <span>15 (Max)</span>
            </div>
          </div>

          {/* Overs Selector */}
          <div
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
            className="app-card p-4 flex flex-col gap-3"
          >
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--orange)' }}>
              <Clock className="w-4 h-4" />
              <span>Match Overs</span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[5, 10, 20, 50].map((ov) => (
                <button
                  key={ov}
                  type="button"
                  onClick={() => {
                    setOvers(ov);
                    setCustomOversInput('');
                  }}
                  style={{
                    backgroundColor: overs === ov && !customOversInput ? 'var(--orange)' : 'var(--card-alt)',
                    color: overs === ov && !customOversInput ? '#FFFFFF' : 'var(--text)',
                    borderColor: 'var(--border)'
                  }}
                  className="py-2.5 rounded-xl text-xs font-black border transition-all"
                >
                  {ov} Overs
                </button>
              ))}
            </div>

            <div>
              <label className="text-[11px] block mb-1" style={{ color: 'var(--muted)' }}>
                Or Custom Overs
              </label>
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
                style={{
                  backgroundColor: 'var(--card-alt)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
                className="w-full rounded-xl px-3.5 py-2 text-sm font-semibold border focus:outline-none focus:ring-2 focus:ring-[var(--orange)]"
              />
            </div>
          </div>

          <button
            onClick={handleStep1Next}
            style={{ backgroundColor: 'var(--primary)', color: '#FFFFFF' }}
            className="w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 mt-2"
          >
            <span>Proceed to Squads</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 2: Squads with \n support & Duplicate Detection */}
      {step === 2 && (
        <div className="flex flex-col gap-4 py-4">
          {/* Error Banner for Duplicate Player Names */}
          {hasDuplicates && (
            <div
              style={{
                backgroundColor: 'color-mix(in srgb, var(--red) 15%, transparent)',
                color: 'var(--red)',
                borderColor: 'color-mix(in srgb, var(--red) 30%, transparent)'
              }}
              className="p-3.5 rounded-2xl border text-xs flex items-center gap-2.5 animate-pulse font-semibold"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-bold m-0">Duplicate Player Name Detected!</p>
                {duplicatesA.length > 0 && (
                  <p className="m-0 text-[11px]">{teamAName}: Duplicate "{duplicatesA.join(', ')}".</p>
                )}
                {duplicatesB.length > 0 && (
                  <p className="m-0 text-[11px]">{teamBName}: Duplicate "{duplicatesB.join(', ')}".</p>
                )}
                <span className="text-[10px] opacity-80">Every player in a squad must have a unique name.</span>
              </div>
            </div>
          )}

          {/* Team A Squad */}
          <div
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
            className="app-card p-4 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--primary)' }}>
                {teamAName} ({teamAPlayers.length} Players)
              </h3>
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setInputModeA('multiline')}
                  style={{
                    backgroundColor: inputModeA === 'multiline' ? 'var(--primary)' : 'var(--card-alt)',
                    color: inputModeA === 'multiline' ? '#FFFFFF' : 'var(--muted)'
                  }}
                  className="px-2 py-1 rounded-lg font-bold text-[10px] transition-all"
                >
                  Line-by-line (\n)
                </button>
                <button
                  type="button"
                  onClick={() => setInputModeA('boxes')}
                  style={{
                    backgroundColor: inputModeA === 'boxes' ? 'var(--primary)' : 'var(--card-alt)',
                    color: inputModeA === 'boxes' ? '#FFFFFF' : 'var(--muted)'
                  }}
                  className="px-2 py-1 rounded-lg font-bold text-[10px] transition-all"
                >
                  Boxes
                </button>
              </div>
            </div>

            {inputModeA === 'multiline' ? (
              <div>
                <label className="text-[10px] block mb-1" style={{ color: 'var(--muted)' }}>
                  Enter or paste player names separated by newlines (1 per line):
                </label>
                <textarea
                  rows={playersPerTeam > 6 ? 6 : playersPerTeam}
                  value={multilineA}
                  onChange={(e) => handleMultilineAChange(e.target.value)}
                  placeholder={`Ali\nhamza\nhaifer`}
                  style={{
                    backgroundColor: 'var(--card-alt)',
                    borderColor: duplicatesA.length > 0 ? 'var(--red)' : 'var(--border)',
                    color: 'var(--text)'
                  }}
                  className="w-full rounded-xl p-3 text-xs font-mono font-medium border focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-y"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {teamAPlayers.map((p, idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={p}
                    onChange={(e) => {
                      const next = [...teamAPlayers];
                      next[idx] = e.target.value;
                      setTeamAPlayers(next);
                      setMultilineA(next.join('\n'));
                    }}
                    style={{
                      backgroundColor: 'var(--card-alt)',
                      borderColor: duplicatesA.includes(p.trim()) ? 'var(--red)' : 'var(--border)',
                      color: 'var(--text)'
                    }}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-semibold border focus:outline-none"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Team B Squad */}
          <div
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
            className="app-card p-4 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--blue)' }}>
                {teamBName} ({teamBPlayers.length} Players)
              </h3>
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setInputModeB('multiline')}
                  style={{
                    backgroundColor: inputModeB === 'multiline' ? 'var(--blue)' : 'var(--card-alt)',
                    color: inputModeB === 'multiline' ? '#FFFFFF' : 'var(--muted)'
                  }}
                  className="px-2 py-1 rounded-lg font-bold text-[10px] transition-all"
                >
                  Line-by-line (\n)
                </button>
                <button
                  type="button"
                  onClick={() => setInputModeB('boxes')}
                  style={{
                    backgroundColor: inputModeB === 'boxes' ? 'var(--blue)' : 'var(--card-alt)',
                    color: inputModeB === 'boxes' ? '#FFFFFF' : 'var(--muted)'
                  }}
                  className="px-2 py-1 rounded-lg font-bold text-[10px] transition-all"
                >
                  Boxes
                </button>
              </div>
            </div>

            {inputModeB === 'multiline' ? (
              <div>
                <label className="text-[10px] block mb-1" style={{ color: 'var(--muted)' }}>
                  Enter or paste player names separated by newlines (1 per line):
                </label>
                <textarea
                  rows={playersPerTeam > 6 ? 6 : playersPerTeam}
                  value={multilineB}
                  onChange={(e) => handleMultilineBChange(e.target.value)}
                  placeholder={`Zubair\nBilal\nUsman`}
                  style={{
                    backgroundColor: 'var(--card-alt)',
                    borderColor: duplicatesB.length > 0 ? 'var(--red)' : 'var(--border)',
                    color: 'var(--text)'
                  }}
                  className="w-full rounded-xl p-3 text-xs font-mono font-medium border focus:outline-none focus:ring-2 focus:ring-[var(--blue)] resize-y"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {teamBPlayers.map((p, idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={p}
                    onChange={(e) => {
                      const next = [...teamBPlayers];
                      next[idx] = e.target.value;
                      setTeamBPlayers(next);
                      setMultilineB(next.join('\n'));
                    }}
                    style={{
                      backgroundColor: 'var(--card-alt)',
                      borderColor: duplicatesB.includes(p.trim()) ? 'var(--red)' : 'var(--border)',
                      color: 'var(--text)'
                    }}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-semibold border focus:outline-none"
                  />
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleStep2Next}
            disabled={hasDuplicates}
            style={{
              backgroundColor: hasDuplicates ? 'var(--card-alt)' : 'var(--primary)',
              color: hasDuplicates ? 'var(--muted)' : '#FFFFFF',
              opacity: hasDuplicates ? 0.6 : 1
            }}
            className="w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 mt-2"
          >
            <span>Proceed to Toss & Openers</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 3: Toss & Openers */}
      {step === 3 && (
        <div className="flex flex-col gap-4 py-4">
          {/* Toss Card */}
          <div
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
            className="app-card p-4 flex flex-col gap-3"
          >
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--orange)' }}>
              <Shuffle className="w-4 h-4" />
              <span>Toss Result</span>
            </div>

            <div>
              <label className="text-[11px] block mb-1" style={{ color: 'var(--muted)' }}>
                Toss Won By
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTossWinner(teamAName)}
                  style={{
                    backgroundColor: tossWinner === teamAName ? 'var(--orange)' : 'var(--card-alt)',
                    color: tossWinner === teamAName ? '#FFFFFF' : 'var(--text)',
                    borderColor: 'var(--border)'
                  }}
                  className="py-2.5 px-3 rounded-xl border text-xs font-bold transition-all truncate"
                >
                  {teamAName}
                </button>
                <button
                  type="button"
                  onClick={() => setTossWinner(teamBName)}
                  style={{
                    backgroundColor: tossWinner === teamBName ? 'var(--orange)' : 'var(--card-alt)',
                    color: tossWinner === teamBName ? '#FFFFFF' : 'var(--text)',
                    borderColor: 'var(--border)'
                  }}
                  className="py-2.5 px-3 rounded-xl border text-xs font-bold transition-all truncate"
                >
                  {teamBName}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] block mb-1" style={{ color: 'var(--muted)' }}>
                Elected To
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTossDecision('bat')}
                  style={{
                    backgroundColor: tossDecision === 'bat' ? 'var(--green)' : 'var(--card-alt)',
                    color: tossDecision === 'bat' ? '#FFFFFF' : 'var(--text)',
                    borderColor: 'var(--border)'
                  }}
                  className="py-2.5 px-3 rounded-xl border text-xs font-bold transition-all"
                >
                  Bat First
                </button>
                <button
                  type="button"
                  onClick={() => setTossDecision('bowl')}
                  style={{
                    backgroundColor: tossDecision === 'bowl' ? 'var(--blue)' : 'var(--card-alt)',
                    color: tossDecision === 'bowl' ? '#FFFFFF' : 'var(--text)',
                    borderColor: 'var(--border)'
                  }}
                  className="py-2.5 px-3 rounded-xl border text-xs font-bold transition-all"
                >
                  Bowl First
                </button>
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'var(--green-15)',
                borderColor: 'var(--green-30)',
                color: 'var(--primary)'
              }}
              className="text-xs font-semibold rounded-lg p-2.5 border flex items-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5 inline text-emerald-500 shrink-0" />
              <span><strong>{battingTeamName}</strong> will bat first. <strong>{bowlingTeamName}</strong> will bowl.</span>
            </div>
          </div>

          {/* Opening Players Card */}
          <div
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
            className="app-card p-4 flex flex-col gap-3"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text)' }}>
              Opening Batsmen & Bowler
            </h3>

            <div>
              <label className="text-[11px] block mb-1" style={{ color: 'var(--muted)' }}>
                Opening Striker ({battingTeamName})
              </label>
              <select
                value={striker}
                onChange={(e) => setStriker(e.target.value)}
                style={{
                  backgroundColor: 'var(--card-alt)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
                className="w-full rounded-xl px-3 py-2.5 text-xs font-bold border focus:outline-none"
              >
                {currentBattingSquad.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] block mb-1" style={{ color: 'var(--muted)' }}>
                Opening Non-Striker ({battingTeamName})
              </label>
              <select
                value={nonStriker}
                onChange={(e) => setNonStriker(e.target.value)}
                style={{
                  backgroundColor: 'var(--card-alt)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
                className="w-full rounded-xl px-3 py-2.5 text-xs font-bold border focus:outline-none"
              >
                {currentBattingSquad.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] block mb-1" style={{ color: 'var(--muted)' }}>
                Opening Bowler ({bowlingTeamName})
              </label>
              <select
                value={bowler}
                onChange={(e) => setBowler(e.target.value)}
                style={{
                  backgroundColor: 'var(--card-alt)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
                className="w-full rounded-xl px-3 py-2.5 text-xs font-bold border focus:outline-none"
              >
                {currentBowlingSquad.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleFinishSetup}
            style={{ backgroundColor: 'var(--primary)', color: '#FFFFFF' }}
            className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2 mt-2"
          >
            <span>Start Match & Launch Scoring</span>
            <Check className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
