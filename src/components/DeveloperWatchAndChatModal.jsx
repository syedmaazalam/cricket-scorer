import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Radio,
  ExternalLink,
  Copy,
  Check,
  MessageSquare,
  ShieldCheck,
  User,
  Trash2,
  Send,
  RefreshCw,
  Zap,
  Trophy,
  Users
} from 'lucide-react';
import { db } from '../firebase/config.js';
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { sendMatchMessage, subscribeMatchMessages, setMatchMessageInactive, deriveMatchDisplayScore, getMatchStatusMeta } from '../firebase/matches.js';
import { replayEvents } from '../engine/reducer.js';
import { formatOvers, calculateCRR, calculateRRR } from '../engine/rules.js';

export default function DeveloperWatchAndChatModal({
  isOpen,
  onClose,
  match,
  onOpenScoring
}) {
  const [matchState, setMatchState] = useState(match || null);
  const [activeTab, setActiveTab] = useState('match'); // 'match' | 'chat' (for mobile tab switcher)
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  const lastSeenMsgCountRef = useRef(0);

  const matchId = match?.matchId;
  const matchCode = match?.code;

  // Real-time Match Subscription
  useEffect(() => {
    if (!isOpen || !matchId) return;

    // 1. Subscribe to match doc snapshot
    const unsubDoc = onSnapshot(doc(db, 'matches', matchId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setMatchState((prev) => ({ ...prev, ...data }));
      }
    });

    // 2. Subscribe to event stream to re-derive live score if events exist
    const eventsCol = collection(db, 'matches', matchId, 'events');
    const qEvents = query(eventsCol, orderBy('timestamp', 'asc'));
    const unsubEvents = onSnapshot(qEvents, (snapshot) => {
      if (!snapshot.empty) {
        const events = [];
        snapshot.forEach((s) => events.push(s.data()));
        try {
          const replayed = replayEvents(events);
          setMatchState((prev) => ({ ...prev, ...replayed }));
        } catch (e) {
          console.warn('Developer watch replay error:', e);
        }
      }
    });

    // 3. Subscribe to real-time chat messages
    const unsubChat = subscribeMatchMessages(matchId, (msgs) => {
      if (Array.isArray(msgs)) {
        if (lastSeenMsgCountRef.current > 0 && msgs.length > lastSeenMsgCountRef.current) {
          const newest = msgs[msgs.length - 1];
          if (newest && newest.sender === 'scorer' && activeTab !== 'chat') {
            setUnreadCount((prev) => prev + 1);
          }
        }
        lastSeenMsgCountRef.current = msgs.length;
        setMessages(msgs);
      }
    });

    return () => {
      unsubDoc();
      unsubEvents();
      unsubChat();
    };
  }, [isOpen, matchId, activeTab]);

  useEffect(() => {
    if (activeTab === 'chat' || isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab, isOpen]);

  if (!isOpen || !match) return null;

  const currentInningsIndex = matchState?.currentInningsIndex || 0;
  const currentInnings = matchState?.innings?.[currentInningsIndex] || {
    score: 0,
    wickets: 0,
    legalBalls: 0,
    balls: [],
    batters: [],
    bowlers: []
  };

  const statusMeta = getMatchStatusMeta(matchState);
  const scoreDerived = deriveMatchDisplayScore(matchState, matchState?.balls || currentInnings?.balls || []);
  const crr = calculateCRR(currentInnings.score || 0, currentInnings.legalBalls || 0);

  // Current over balls
  const balls = currentInnings.balls || [];
  const legalCount = currentInnings.legalBalls || 0;
  const currentOverNumber = Math.floor(legalCount / 6);
  let legalBallsSeen = 0;
  const currentOverBalls = [];
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    const ballOver = Math.floor(legalBallsSeen / 6);
    if (ballOver === currentOverNumber) {
      currentOverBalls.push(b);
    }
    if (!b.extraType || (b.extraType !== 'wide' && b.extraType !== 'no_ball')) {
      legalBallsSeen++;
    }
  }

  const handleCopyCode = () => {
    if (!matchCode) return;
    navigator.clipboard?.writeText(matchCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const clean = inputText.trim();
    if (!clean || isSending) return;

    try {
      setIsSending(true);
      await sendMatchMessage(matchId, {
        sender: 'developer',
        senderName: 'Developer (Maaz)',
        text: clean
      });
      setInputText('');
    } catch (err) {
      console.warn('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (msgId) => {
    if (!matchId || !msgId) return;
    try {
      await setMatchMessageInactive(matchId, msgId);
    } catch (err) {
      console.warn('Failed to delete message:', err);
    }
  };

  const team1 = matchState?.teams?.[0]?.name || 'Team 1';
  const team2 = matchState?.teams?.[1]?.name || 'Team 2';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
      <div
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)',
          color: 'var(--text)'
        }}
        className="w-full max-w-5xl h-[88vh] max-h-[780px] rounded-2xl border-2 shadow-2xl flex flex-col overflow-hidden animate-scaleUp"
      >
        {/* Top Header Bar */}
        <div
          style={{ borderColor: 'var(--border)' }}
          className="p-3 sm:p-4 border-b flex items-center justify-between gap-2 shrink-0 bg-black/10"
        >
          <div className="flex items-center gap-2 truncate">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-black m-0 truncate" style={{ color: 'var(--text)' }}>
                  {team1} vs {team2}
                </h3>
                {matchCode && (
                  <button
                    onClick={handleCopyCode}
                    style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)' }}
                    className="px-2 py-0.5 rounded-lg border text-[10px] font-mono font-bold flex items-center gap-1 hover:border-[#22C55E]"
                    title="Copy Match Code"
                  >
                    <span>{matchCode}</span>
                    {copiedCode ? <Check className="w-3 h-3 text-[#22C55E]" /> : <Copy className="w-3 h-3 text-slate-400" />}
                  </button>
                )}
              </div>
              <p className="text-[10px] m-0 text-slate-400 flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.isCompleted ? 'bg-slate-400' : 'bg-[#22C55E] animate-ping'}`} />
                <span>{statusMeta.label}</span>
                <span>• Developer Watch & Chat Studio</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenScoring && (
              <button
                onClick={() => onOpenScoring(matchId)}
                style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)' }}
                className="hidden sm:flex px-2.5 py-1.5 rounded-xl border text-xs font-semibold items-center gap-1 hover:border-[#22C55E] active:scale-95 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#22C55E]" />
                <span>Scorer Screen</span>
              </button>
            )}

            <button
              onClick={onClose}
              style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)' }}
              className="p-1.5 rounded-xl border text-slate-400 hover:text-white active:scale-95 transition-colors"
              title="Close Watch Studio"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Tab Switcher */}
        <div className="flex sm:hidden border-b shrink-0" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card-alt)' }}>
          <button
            onClick={() => setActiveTab('match')}
            className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-all ${
              activeTab === 'match' ? 'border-[#22C55E] text-[#22C55E]' : 'border-transparent text-slate-400'
            }`}
          >
            Live Match View
          </button>
          <button
            onClick={() => {
              setActiveTab('chat');
              setUnreadCount(0);
            }}
            className={`flex-1 py-2 text-xs font-bold text-center border-b-2 transition-all relative ${
              activeTab === 'chat' ? 'border-[#22C55E] text-[#22C55E]' : 'border-transparent text-slate-400'
            }`}
          >
            <span>Chat with Scorer</span>
            {unreadCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-[#22C55E] text-white text-[9px] font-black rounded-full animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Main Content: Split 2-Column on Desktop, Tabbed on Mobile */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 sm:grid-cols-12 min-h-0">
          {/* LEFT: Live Match Watch Viewer (7 columns on desktop) */}
          <div
            className={`sm:col-span-7 p-3 sm:p-4 overflow-y-auto flex flex-col gap-3 border-r ${
              activeTab === 'match' ? 'flex' : 'hidden sm:flex'
            }`}
            style={{ borderColor: 'var(--border)' }}
          >
            {/* Live Score Highlight Box */}
            <div
              style={{
                backgroundColor: 'var(--card-alt)',
                borderColor: 'var(--border)'
              }}
              className="p-4 rounded-2xl border flex flex-col gap-2.5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {currentInnings.battingTeam || team1} · 1st Innings
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-white flex items-baseline gap-2">
                    <span>{currentInnings.score}/{currentInnings.wickets}</span>
                    <span className="text-xs font-bold text-slate-400">
                      ({formatOvers(currentInnings.legalBalls)} / {matchState?.overs || 20} ov)
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold text-emerald-400">CRR: {crr}</div>
                  {matchState?.target && (
                    <div className="text-[11px] font-semibold text-amber-400 mt-0.5">
                      Target: {matchState.target}
                    </div>
                  )}
                </div>
              </div>

              {scoreDerived.resultText && (
                <div className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>{scoreDerived.resultText}</span>
                </div>
              )}
            </div>

            {/* Current Batters */}
            <div
              style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)' }}
              className="p-3 rounded-xl border flex flex-col gap-1.5 text-xs"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Users className="w-3 h-3 text-[#22C55E]" />
                <span>At The Crease</span>
              </span>
              <div className="flex items-center justify-between font-bold pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
                <span className="flex items-center gap-1 text-white">
                  <span>{matchState?.striker || 'Striker'}</span>
                  <span className="text-[#22C55E] text-[10px] font-black">*</span>
                </span>
                <span className="font-mono text-slate-300">
                  {currentInnings.batters?.find((b) => b.name === matchState?.striker)?.runs || 0} runs
                </span>
              </div>
              <div className="flex items-center justify-between font-medium text-slate-400">
                <span>{matchState?.nonStriker || 'Non-Striker'}</span>
                <span className="font-mono text-slate-300">
                  {currentInnings.batters?.find((b) => b.name === matchState?.nonStriker)?.runs || 0} runs
                </span>
              </div>
            </div>

            {/* Current Bowler & Over Balls Strip (with high contrast) */}
            <div
              style={{ backgroundColor: 'var(--card-alt)', borderColor: 'var(--border)' }}
              className="p-3 rounded-xl border flex flex-col gap-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Bowler: <span className="text-white font-bold">{matchState?.currentBowler || 'Current Bowler'}</span>
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  Current Over: {currentOverBalls.length} ball{currentOverBalls.length === 1 ? '' : 's'}
                </span>
              </div>

              {/* Over Deliveries Strip */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {currentOverBalls.length === 0 ? (
                  <span className="text-xs text-slate-500 italic py-1">No deliveries yet in this over</span>
                ) : (
                  currentOverBalls.map((b, i) => (
                    <div
                      key={i}
                      style={{
                        backgroundColor: b.isWicket
                          ? 'var(--red)'
                          : b.runs === 6
                          ? 'var(--purple)'
                          : b.runs === 4
                          ? 'var(--blue)'
                          : b.extraType
                          ? 'var(--orange)'
                          : b.runs > 0
                          ? 'var(--ball-run-bg)'
                          : 'var(--card)',
                        color: b.runs === 0 && !b.extraType && !b.isWicket
                          ? 'var(--muted)'
                          : b.runs > 0 && !b.extraType && !b.isWicket
                          ? 'var(--ball-run-text)'
                          : '#FFFFFF',
                        borderColor: b.runs > 0 && !b.extraType && !b.isWicket
                          ? 'var(--ball-run-border)'
                          : 'var(--border)'
                      }}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 border shadow-sm"
                    >
                      {b.shortLabel || b.runs || (b.isWicket ? 'W' : '0')}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Real-time Live Scorer Chat (5 columns on desktop) */}
          <div
            className={`sm:col-span-5 flex flex-col h-full overflow-hidden ${
              activeTab === 'chat' ? 'flex' : 'hidden sm:flex'
            }`}
          >
            {/* Chat Subhead */}
            <div
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card-alt)' }}
              className="p-2.5 border-b flex items-center justify-between text-xs font-bold"
            >
              <div className="flex items-center gap-1.5 text-emerald-400">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Live Chat with Scorer</span>
              </div>
              <span className="text-[10px] text-slate-400 font-normal">
                {messages.filter(m => m.status !== 'inactive').length} active messages
              </span>
            </div>

            {/* Chat Thread */}
            <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2 min-h-0">
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                  <MessageSquare className="w-8 h-8 opacity-20 mb-2 text-slate-400" />
                  <p className="text-xs font-semibold text-slate-400 m-0">No messages yet</p>
                  <p className="text-[11px] text-slate-500 m-0 mt-0.5">
                    Send a message to coordinate live match scoring.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender === 'developer';
                  const isInactive = msg.status === 'inactive';
                  const timeStr = msg.timestamp
                    ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '';

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1 mb-0.5 px-1 text-[10px] text-slate-400">
                        {isMine ? (
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <User className="w-3 h-3 text-blue-400" />
                        )}
                        <span className="font-semibold">{msg.senderName || (isMine ? 'Developer' : 'Scorer')}</span>
                        <span>• {timeStr}</span>
                        {isInactive && (
                          <span className="text-amber-500 font-bold ml-1">(Inactive)</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 max-w-[90%] group">
                        {isMine && !isInactive && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-red-400 transition-all text-xs"
                            title="Delete message (set status to inactive)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <div
                          style={{
                            backgroundColor: isInactive
                              ? 'rgba(148, 163, 184, 0.1)'
                              : isMine
                              ? 'var(--primary)'
                              : 'var(--card-alt)',
                            color: isInactive
                              ? 'var(--muted)'
                              : isMine
                              ? '#FFFFFF'
                              : 'var(--text)',
                            borderColor: isInactive
                              ? 'var(--border)'
                              : isMine
                              ? 'transparent'
                              : 'var(--border)'
                          }}
                          className={`px-3 py-2 rounded-2xl text-xs leading-relaxed border shadow-sm break-words ${
                            isInactive ? 'italic line-through border-dashed' : ''
                          }`}
                        >
                          {isInactive ? 'Message deleted (status: inactive)' : msg.text}
                        </div>

                        {!isMine && !isInactive && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-red-400 transition-all text-xs"
                            title="Delete message (set status to inactive)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Compose Input Form */}
            <form
              onSubmit={handleSend}
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card-alt)' }}
              className="p-2.5 border-t flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                placeholder="Type message to scorer..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                style={{
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
                className="flex-1 px-3 py-2 rounded-xl border text-xs focus:outline-none focus:border-[#22C55E]"
                maxLength={300}
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isSending}
                style={{
                  backgroundColor: 'var(--primary)',
                  color: '#FFFFFF'
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all shadow-md disabled:opacity-50"
              >
                {isSending ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Send</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
