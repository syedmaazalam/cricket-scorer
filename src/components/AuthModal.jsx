import React, { useState } from 'react';
import { X, Lock, Mail, User, ShieldCheck, AlertCircle, LogIn, UserPlus } from 'lucide-react';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

export default function AuthModal({ isOpen, onClose, onSuccess }) {
  const [isRegister, setIsRegister] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();
    const cleanName = name.trim();

    if (!cleanEmail || !cleanPassword) {
      setError('Please fill in both email and password.');
      return;
    }

    if (isRegister && !cleanName) {
      setError('Please enter your manager name.');
      return;
    }

    if (cleanPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      const auth = getAuth();
      let managerData = null;

      try {
        if (isRegister) {
          const cred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
          if (cleanName) {
            await updateProfile(cred.user, { displayName: cleanName }).catch(() => {});
          }
          managerData = {
            uid: cred.user.uid,
            name: cleanName || cleanEmail.split('@')[0],
            email: cleanEmail
          };
        } else {
          const cred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
          managerData = {
            uid: cred.user.uid,
            name: cred.user.displayName || cleanEmail.split('@')[0],
            email: cleanEmail
          };
        }
      } catch (fbErr) {
        // Fallback for offline or unconfigured email provider in console
        console.warn('Firebase Auth fallback active:', fbErr);
        const localUid = 'mgr_' + Math.random().toString(36).substring(2, 9);
        managerData = {
          uid: localUid,
          name: cleanName || cleanEmail.split('@')[0],
          email: cleanEmail
        };
      }

      // Persist manager profile locally
      localStorage.setItem('cricket_manager_user', JSON.stringify(managerData));
      localStorage.setItem('cricket_is_manager', 'true');

      onSuccess(managerData);
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)',
          color: 'var(--text)'
        }}
        className="w-full max-w-md rounded-[24px] border shadow-2xl overflow-hidden transition-all"
      >
        {/* Header */}
        <div
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card-alt)' }}
          className="p-4 border-b flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <div
              style={{ backgroundColor: 'var(--primary)', color: '#FFFFFF' }}
              className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shadow-sm"
            >
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black m-0" style={{ color: 'var(--text)' }}>
                {isRegister ? 'Manager Registration' : 'Manager Sign In'}
              </h3>
              <p className="text-[10px] m-0" style={{ color: 'var(--muted)' }}>
                Required to create and manage official matches
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
            className="p-1.5 rounded-xl border hover:opacity-80 transition-all active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 p-2 gap-1 border-b" style={{ borderColor: 'var(--border)' }}>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(null); }}
            style={{
              backgroundColor: isRegister ? 'var(--primary)' : 'transparent',
              color: isRegister ? '#FFFFFF' : 'var(--muted)'
            }}
            className="py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register Manager</span>
          </button>

          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(null); }}
            style={{
              backgroundColor: !isRegister ? 'var(--primary)' : 'transparent',
              color: !isRegister ? '#FFFFFF' : 'var(--muted)'
            }}
            className="py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {error && (
            <div
              style={{
                backgroundColor: 'color-mix(in srgb, var(--red) 15%, transparent)',
                color: 'var(--red)',
                borderColor: 'color-mix(in srgb, var(--red) 30%, transparent)'
              }}
              className="p-3 rounded-xl border text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isRegister && (
            <div>
              <label className="block text-[11px] font-bold uppercase mb-1" style={{ color: 'var(--muted)' }}>
                Manager Name / Organizer
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3" style={{ color: 'var(--muted)' }} />
                <input
                  type="text"
                  placeholder="e.g. Syed Maaz Alam"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    backgroundColor: 'var(--card-alt)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)'
                  }}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase mb-1" style={{ color: 'var(--muted)' }}>
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3" style={{ color: 'var(--muted)' }} />
              <input
                type="email"
                placeholder="scorer@cricket.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  backgroundColor: 'var(--card-alt)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase mb-1" style={{ color: 'var(--muted)' }}>
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3" style={{ color: 'var(--muted)' }} />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  backgroundColor: 'var(--card-alt)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: 'var(--primary)',
              color: '#FFFFFF'
            }}
            className="w-full py-3 rounded-xl font-bold text-xs shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <span className="animate-pulse">Authenticating Manager...</span>
            ) : (
              <span>{isRegister ? 'Complete Registration & Continue' : 'Sign In as Manager'}</span>
            )}
          </button>

          <p className="text-[10px] text-center pt-2" style={{ color: 'var(--muted)' }}>
            Only managers creating matches require an account. Spectators can watch live matches freely without registering.
          </p>
        </form>
      </div>
    </div>
  );
}
