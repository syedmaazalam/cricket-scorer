import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, ShieldCheck, User, X, RefreshCw } from 'lucide-react';
import { sendMatchMessage, subscribeMatchMessages } from '../firebase/matches.js';

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

  useEffect(() => {
    if (!isOpen || !matchId) return;

    const unsubscribe = subscribeMatchMessages(matchId, (msgs) => {
      setMessages(msgs || []);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [isOpen, matchId]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen || !matchId) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    const clean = inputText.trim();
    if (!clean || isSending) return;

    try {
      setIsSending(true);
      await sendMatchMessage(matchId, {
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
              const isMine = msg.sender === role;
              const isDev = msg.sender === 'developer';
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
                  </div>

                  <div
                    style={{
                      backgroundColor: isMine
                        ? 'var(--primary)'
                        : 'var(--card-alt)',
                      color: isMine ? '#FFFFFF' : 'var(--text)',
                      borderColor: isMine ? 'transparent' : 'var(--border)'
                    }}
                    className="max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed border shadow-sm break-words"
                  >
                    {msg.text}
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
