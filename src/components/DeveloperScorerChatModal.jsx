import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, ShieldCheck, User, X, RefreshCw, Trash2 } from 'lucide-react';
import { sendMatchMessage, subscribeMatchMessages, setMatchMessageInactive } from '../firebase/matches.js';

export default function DeveloperScorerChatModal({
  isOpen,
  onClose,
  matchId,
  matchTitle = 'Match',
  role = 'developer', // 'developer' | 'scorer'
  senderName
}) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  const defaultSenderName = role === 'developer' ? 'Developer (Maaz)' : 'Match Scorer';
  const effectiveSenderName = senderName || defaultSenderName;
  const effectiveMatchId = matchId || (typeof window !== 'undefined' ? (localStorage.getItem('cricket_active_match_id') || localStorage.getItem('cricket_live_code')) : null);

  useEffect(() => {
    if (!isOpen || !effectiveMatchId) return;

    const unsubscribe = subscribeMatchMessages(effectiveMatchId, (msgs) => {
      setMessages(msgs || []);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [isOpen, effectiveMatchId]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen || !effectiveMatchId) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    const clean = inputText.trim();
    if (!clean || isSending) return;

    try {
      setIsSending(true);
      await sendMatchMessage(effectiveMatchId, {
        sender: role,
        senderName: effectiveSenderName,
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
      console.warn('Failed to set message inactive:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)',
          color: 'var(--text)'
        }}
        className="w-full max-w-lg h-[540px] max-h-[90vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden animate-scaleUp"
      >
        {/* Header */}
        <div
          style={{ borderColor: 'var(--border)' }}
          className="p-3.5 border-b flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold m-0 flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
                <span>Chat: {matchTitle}</span>
              </h3>
              <p className="text-[10px] m-0" style={{ color: 'var(--muted)' }}>
                {role === 'developer' ? 'Talking to Scorer as Developer' : 'Talking to Match Developer'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
            className="p-1.5 rounded-lg border hover:text-[var(--text)] transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-3.5 overflow-y-auto flex flex-col gap-2.5">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
              <MessageSquare className="w-8 h-8 opacity-20 mb-2" style={{ color: 'var(--muted)' }} />
              <p className="text-xs font-medium m-0" style={{ color: 'var(--muted)' }}>
                No messages yet.
              </p>
              <p className="text-[11px] m-0 mt-0.5" style={{ color: 'var(--muted)' }}>
                Send a message to coordinate live scoring.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              if (role !== 'developer' && msg.status === 'inactive') {
                return null;
              }

              const isMine = msg.sender === role;
              const isDev = msg.sender === 'developer';
              const isInactive = msg.status === 'inactive';
              const timeStr = msg.timestamp
                ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1 mb-0.5 px-1 text-[10px]" style={{ color: 'var(--muted)' }}>
                    {isDev ? (
                      <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <User className="w-3 h-3 text-blue-400" />
                    )}
                    <span className="font-semibold">{msg.senderName || (isDev ? 'Developer' : 'Scorer')}</span>
                    <span>• {timeStr}</span>
                    {isInactive && (
                      <span className="text-amber-500 font-bold ml-1">(Inactive)</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 max-w-[85%] group">
                    {isMine && role === 'developer' && !isInactive && (
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

                    {!isMine && role === 'developer' && !isInactive && (
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

        {/* Compose Form */}
        <form
          onSubmit={handleSend}
          style={{ borderColor: 'var(--border)' }}
          className="p-3 border-t flex items-center gap-2"
        >
          <input
            type="text"
            placeholder={role === 'developer' ? 'Type message to scorer...' : 'Reply to developer...'}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            style={{
              backgroundColor: 'var(--card-alt)',
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
            className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
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
  );
}
