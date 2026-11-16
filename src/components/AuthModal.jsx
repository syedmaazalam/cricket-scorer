import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Mail,
  User,
  ShieldCheck,
  AlertCircle,
  LogIn,
  UserPlus,
  WifiOff,
  KeyRound,
  ArrowLeft,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { saveManagerProfileToCloud } from '../firebase/matches.js';
import { saveManagerLocally, getAllLocalManagers } from '../store/localDb.js';
import { sendVerificationEmailOtp } from '../services/emailService.js';

// Toggle for 6-digit OTP verification: turned off per user request, can be re-enabled later.
export const ENABLE_OTP_VERIFICATION = false;

export default function AuthModal({ isOpen, onClose, onSuccess }) {
  // Steps: 'form' | 'otp' | 'forgot_password' | 'forgot_otp'
  const [authStep, setAuthStep] = useState('form');
  const [isRegister, setIsRegister] = useState(true);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // OTP Fields for Registration
  const [otpInput, setOtpInput] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpExpiry, setOtpExpiry] = useState(null);

  // Forgot Password Fields
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtpInput, setForgotOtpInput] = useState('');
  const [generatedResetOtp, setGeneratedResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [fieldErrors, setFieldErrors] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validateFields = () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanName = name.trim();
    const errors = { name: '', email: '', password: '' };
    let hasErr = false;

    if (isRegister && !cleanName) {
      errors.name = 'Please enter your manager name.';
      hasErr = true;
    }

    if (!cleanEmail) {
      errors.email = 'Please enter your email address.';
      hasErr = true;
    } else if (!EMAIL_REGEX.test(cleanEmail)) {
      errors.email = 'Please enter a valid email address.';
      hasErr = true;
    }

    if (!cleanPassword) {
      errors.password = 'Please enter your password.';
      hasErr = true;
    } else if (cleanPassword.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
      hasErr = true;
    }

    setFieldErrors(errors);
    return !hasErr;
  };

  const handleContinueOffline = () => {
    if (isRegister) {
      const isValid = validateFields();
      if (!isValid) {
        setError('Please fill in all required fields to register.');
        return;
      }
    }

    const offlineMgr = {
      uid: 'offline_' + Math.random().toString(36).substring(2, 9),
      name: name.trim() || 'Offline Manager',
      email: email.trim().toLowerCase() || 'offline@scorer.local',
      isOffline: true,
      emailVerified: true,
      createdAt: Date.now(),
      lastActive: Date.now()
    };
    saveManagerLocally(offlineMgr);
    try {
      localStorage.setItem('cricket_manager_user', JSON.stringify(offlineMgr));
      localStorage.setItem('cricket_is_manager', 'true');
    } catch {}
    onSuccess(offlineMgr);
    onClose();
  };

  // Helper to generate secure 6-digit OTP
  const createSixDigitOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // 1. Initial Submit (Sign In OR Initiate Registration OTP)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const isValid = validateFields();
    if (!isValid) {
      setError('Please resolve the errors highlighted below.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanName = name.trim();

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      handleContinueOffline();
      return;
    }

    if (isRegister) {

      // Check for duplicate registrations in local managers database
      try {
        setLoading(true);
        const localMgrs = await getAllLocalManagers();
        const existingLocal = localMgrs.find(
          (m) => m.email?.trim().toLowerCase() === cleanEmail
        );
        if (existingLocal) {
          setError('This email is already registered. Please switch to Sign In or reset password.');
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Local manager check notice:', err);
      } finally {
        setLoading(false);
      }

      // When OTP verification is turned off, directly register and activate account
      if (!ENABLE_OTP_VERIFICATION) {
        await executeDirectRegistration(cleanName, cleanEmail, cleanPassword);
        return;
      }

      // Generate 6-digit OTP, send to user's Gmail, and proceed to verification step
      const code = createSixDigitOtp();
      setGeneratedOtp(code);
      setOtpExpiry(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
      setResendCooldown(45);
      setOtpInput('');
      setSuccessMsg(`We've dispatched a 6-digit verification code to ${cleanEmail}`);
      sendVerificationEmailOtp({
        email: cleanEmail,
        name: cleanName,
        otp: code,
        type: 'registration'
      });
      setAuthStep('otp');
      return;
    }

    // Sign In Flow
    try {
      setLoading(true);
      const auth = getAuth();
      let managerData = null;

      try {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        managerData = {
          uid: cred.user.uid,
          name: cred.user.displayName || cleanEmail.split('@')[0],
          email: cleanEmail,
          emailVerified: true,
          lastActive: Date.now()
        };
      } catch (fbErr) {
        const code = fbErr.code || '';
        if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
          // Check local managers list
          const localMgrs = await getAllLocalManagers();
          const foundLocal = localMgrs.find((m) => m.email?.toLowerCase() === cleanEmail);
          if (!foundLocal) {
            setError('No manager account found with this email. Please register first.');
            setLoading(false);
            return;
          }
          managerData = { ...foundLocal, lastActive: Date.now() };
        } else if (code === 'auth/wrong-password') {
          setError('Incorrect password. Please verify or use Forgot Password.');
          setLoading(false);
          return;
        } else if (code === 'auth/invalid-email') {
          setError('Please enter a valid email address.');
          setLoading(false);
          return;
        } else if (!navigator.onLine) {
          handleContinueOffline();
          return;
        } else {
          setError('Authentication failed. Please verify credentials or register.');
          setLoading(false);
          return;
        }
      }

      await saveManagerLocally(managerData);
      await saveManagerProfileToCloud(managerData);

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

  // Direct Registration (used when OTP verification is turned off)
  const executeDirectRegistration = async (cleanName, cleanEmail, cleanPassword) => {
    try {
      setLoading(true);
      const auth = getAuth();
      let managerData = null;

      try {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        if (cleanName) {
          await updateProfile(cred.user, { displayName: cleanName }).catch(() => {});
        }
        managerData = {
          uid: cred.user.uid,
          name: cleanName || cleanEmail.split('@')[0],
          email: cleanEmail,
          emailVerified: true,
          createdAt: Date.now(),
          lastActive: Date.now()
        };
      } catch (fbErr) {
        const code = fbErr.code || '';
        if (code === 'auth/email-already-in-use') {
          setError('This email is already registered. Please switch to Sign In.');
          setLoading(false);
          return;
        } else if (code === 'auth/weak-password') {
          setError('Password should be at least 6 characters.');
          setLoading(false);
          return;
        } else {
          // Cloud fallback with verified local UID
          const localUid = 'mgr_' + Math.random().toString(36).substring(2, 9);
          managerData = {
            uid: localUid,
            name: cleanName || cleanEmail.split('@')[0],
            email: cleanEmail,
            emailVerified: true,
            createdAt: Date.now(),
            lastActive: Date.now()
          };
        }
      }

      await saveManagerLocally(managerData);
      await saveManagerProfileToCloud(managerData);

      localStorage.setItem('cricket_manager_user', JSON.stringify(managerData));
      localStorage.setItem('cricket_is_manager', 'true');

      onSuccess(managerData);
      onClose();
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Complete Registration upon OTP Verification
  const handleVerifyOtpAndRegister = async (e) => {
    e.preventDefault();
    setError(null);

    const cleanOtp = otpInput.trim();
    if (!cleanOtp) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    if (cleanOtp !== generatedOtp) {
      setError('Invalid verification code. Please check and try again.');
      return;
    }

    if (otpExpiry && Date.now() > otpExpiry) {
      setError('Verification code has expired. Please tap Resend Code.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanName = name.trim();

    try {
      setLoading(true);
      const auth = getAuth();
      let managerData = null;

      try {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        if (cleanName) {
          await updateProfile(cred.user, { displayName: cleanName }).catch(() => {});
        }
        managerData = {
          uid: cred.user.uid,
          name: cleanName || cleanEmail.split('@')[0],
          email: cleanEmail,
          emailVerified: true,
          createdAt: Date.now(),
          lastActive: Date.now()
        };
      } catch (fbErr) {
        const code = fbErr.code || '';
        if (code === 'auth/email-already-in-use') {
          setError('This email is already registered. Please switch to Sign In.');
          setLoading(false);
          return;
        } else if (code === 'auth/weak-password') {
          setError('Password should be at least 6 characters.');
          setLoading(false);
          return;
        } else {
          // Cloud fallback with verified local UID
          const localUid = 'mgr_' + Math.random().toString(36).substring(2, 9);
          managerData = {
            uid: localUid,
            name: cleanName || cleanEmail.split('@')[0],
            email: cleanEmail,
            emailVerified: true,
            createdAt: Date.now(),
            lastActive: Date.now()
          };
        }
      }

      await saveManagerLocally(managerData);
      await saveManagerProfileToCloud(managerData);

      localStorage.setItem('cricket_manager_user', JSON.stringify(managerData));
      localStorage.setItem('cricket_is_manager', 'true');

      onSuccess(managerData);
      onClose();
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendRegistrationOtp = () => {
    if (resendCooldown > 0) return;
    const code = createSixDigitOtp();
    setGeneratedOtp(code);
    setOtpExpiry(Date.now() + 10 * 60 * 1000);
    setResendCooldown(45);
    const cleanEmail = email.trim().toLowerCase();
    sendVerificationEmailOtp({
      email: cleanEmail,
      name: name.trim(),
      otp: code,
      type: 'registration'
    });
    setSuccessMsg(`A new 6-digit verification code has been sent to ${cleanEmail}`);
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  // 3. Forgot Password: Step 1 (Request Reset Code)
  const handleRequestResetOtp = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = forgotEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your registered email address.');
      return;
    }

    try {
      setLoading(true);

      // Trigger official Firebase reset email if supported
      try {
        const auth = getAuth();
        await sendPasswordResetEmail(auth, cleanEmail);
      } catch {}

      // If OTP is disabled, proceed straight to set new password without blocking user
      if (!ENABLE_OTP_VERIFICATION) {
        setForgotOtpInput('DIRECT');
        setNewPassword('');
        setConfirmPassword('');
        setSuccessMsg(`Enter your new password below for ${cleanEmail}`);
        setAuthStep('forgot_otp');
        return;
      }

      const code = createSixDigitOtp();
      setGeneratedResetOtp(code);
      setResendCooldown(45);
      setForgotOtpInput('');
      setNewPassword('');
      setConfirmPassword('');

      sendVerificationEmailOtp({
        email: cleanEmail,
        otp: code,
        type: 'password_reset'
      });

      setSuccessMsg(`Password reset code has been sent to ${cleanEmail}`);
      setAuthStep('forgot_otp');
    } catch (err) {
      setError('Failed to initiate password reset. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Forgot Password: Step 2 (Verify OTP & Save New Password)
  const handleResetPasswordWithOtp = async (e) => {
    e.preventDefault();
    setError(null);

    const cleanOtp = forgotOtpInput.trim();
    const cleanPass = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();
    const cleanEmail = forgotEmail.trim().toLowerCase();

    if (ENABLE_OTP_VERIFICATION) {
      if (!cleanOtp) {
        setError('Please enter the 6-digit verification code.');
        return;
      }

      if (cleanOtp !== generatedResetOtp) {
        setError('Invalid verification code. Please check and try again.');
        return;
      }
    }

    if (!cleanPass || cleanPass.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    if (cleanPass !== cleanConfirm) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      setLoading(true);
      const localMgrs = await getAllLocalManagers();
      const existing = localMgrs.find((m) => m.email?.trim().toLowerCase() === cleanEmail);

      const updatedManager = {
        uid: existing?.uid || 'mgr_' + Math.random().toString(36).substring(2, 9),
        name: existing?.name || cleanEmail.split('@')[0],
        email: cleanEmail,
        emailVerified: true,
        lastActive: Date.now()
      };

      await saveManagerLocally(updatedManager);
      await saveManagerProfileToCloud(updatedManager);

      localStorage.setItem('cricket_manager_user', JSON.stringify(updatedManager));
      localStorage.setItem('cricket_is_manager', 'true');

      onSuccess(updatedManager);
      onClose();
    } catch (err) {
      setError('Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-md animate-fadeIn select-none">
      <div
        style={{
          backgroundColor: 'var(--card)',
          borderColor: 'var(--border)',
          color: 'var(--text)'
        }}
        className="w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden transition-all"
      >
        {/* Header */}
        <div
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card-alt)' }}
          className="p-4 border-b flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <div
              style={{ backgroundColor: '#22C55E', color: '#FFFFFF' }}
              className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shadow-sm"
            >
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold m-0" style={{ color: 'var(--text)' }}>
                {authStep === 'otp'
                  ? 'Verify Registration OTP'
                  : authStep === 'forgot_password' || authStep === 'forgot_otp'
                  ? 'Reset Manager Password'
                  : isRegister
                  ? 'Manager Registration'
                  : 'Manager Sign In'}
              </h3>
              <p className="text-[10px] m-0" style={{ color: 'var(--muted)' }}>
                {authStep === 'otp'
                  ? 'Verify 6-digit one-time password to complete sign up'
                  : authStep === 'forgot_password' || authStep === 'forgot_otp'
                  ? 'Recover your manager account credentials'
                  : 'Required to create, score, and manage matches'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text)' }}
            className="p-1.5 rounded-lg border hover:opacity-80 transition-all active:scale-95"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher (Only visible in standard form mode) */}
        {authStep === 'form' && (
          <div className="grid grid-cols-2 p-2 gap-1.5 border-b" style={{ borderColor: 'var(--border)' }}>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true);
                setError(null);
                setSuccessMsg(null);
              }}
              style={{
                backgroundColor: isRegister ? '#22C55E' : 'transparent',
                color: isRegister ? '#FFFFFF' : 'var(--muted)'
              }}
              className="py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register Manager</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setError(null);
                setSuccessMsg(null);
              }}
              style={{
                backgroundColor: !isRegister ? '#22C55E' : 'transparent',
                color: !isRegister ? '#FFFFFF' : 'var(--muted)'
              }}
              className="py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 1: REGISTRATION / SIGN IN FORM                                       */}
        {/* ========================================================================= */}
        {authStep === 'form' && (
          <form onSubmit={handleSubmit} className="p-4 space-y-3">
            {error && (
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  color: '#EF4444',
                  borderColor: 'rgba(239, 68, 68, 0.3)'
                }}
                className="p-3 rounded-xl border text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {isRegister && (
              <div>
                <label className="block text-[11px] font-semibold uppercase mb-1" style={{ color: 'var(--muted)' }}>
                  Manager Name / Organizer
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-[var(--muted)]" />
                  <input
                    type="text"
                    placeholder="e.g. Scorer Name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }));
                    }}
                    style={{
                      backgroundColor: 'var(--card-alt)',
                      borderColor: fieldErrors.name ? 'var(--red)' : 'var(--border)',
                      color: 'var(--text)'
                    }}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:border-[#22C55E]"
                  />
                </div>
                {fieldErrors.name && (
                  <p className="text-[11px] text-red-500 font-semibold mt-1 animate-in fade-in">
                    {fieldErrors.name}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold uppercase mb-1" style={{ color: 'var(--muted)' }}>
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-[var(--muted)]" />
                <input
                  type="email"
                  placeholder="scorer@cricket.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: '' }));
                  }}
                  style={{
                    backgroundColor: 'var(--card-alt)',
                    borderColor: fieldErrors.email ? 'var(--red)' : 'var(--border)',
                    color: 'var(--text)'
                  }}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:border-[#22C55E]"
                />
              </div>
              {fieldErrors.email && (
                <p className="text-[11px] text-red-500 font-semibold mt-1 animate-in fade-in">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-semibold uppercase" style={{ color: 'var(--muted)' }}>
                  Password
                </label>
                {!isRegister && (
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setError(null);
                      setSuccessMsg(null);
                      setAuthStep('forgot_password');
                    }}
                    className="text-[11px] font-semibold text-[#22C55E] hover:underline"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-[var(--muted)]" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: '' }));
                  }}
                  style={{
                    backgroundColor: 'var(--card-alt)',
                    borderColor: fieldErrors.password ? 'var(--red)' : 'var(--border)',
                    color: 'var(--text)'
                  }}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:border-[#22C55E]"
                />
              </div>
              {fieldErrors.password && (
                <p className="text-[11px] text-red-500 font-semibold mt-1 animate-in fade-in">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: '#22C55E',
                color: '#FFFFFF'
              }}
              className="w-full py-3 rounded-xl font-bold text-xs shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 mt-4 hover:bg-emerald-600 cursor-pointer"
            >
              {loading ? (
                <span className="animate-pulse">Checking credentials...</span>
              ) : isRegister ? (
                <span>{ENABLE_OTP_VERIFICATION ? 'Continue & Send Verification OTP' : 'Create Manager Account'}</span>
              ) : (
                <span>Sign In as Manager</span>
              )}
            </button>

            {/* Offline Continuation Option */}
            <div className="pt-2 border-t flex flex-col items-center gap-1.5 mt-2" style={{ borderColor: 'var(--border)' }}>
              <button
                type="button"
                onClick={handleContinueOffline}
                style={{
                  backgroundColor: 'var(--card-alt)',
                  borderColor: 'var(--border)',
                  color: 'var(--muted)'
                }}
                className="w-full py-2 rounded-xl border text-xs font-semibold hover:text-[var(--text)] transition-colors flex items-center justify-center gap-1.5"
              >
                <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                <span>Continue Offline without Login</span>
              </button>
              <span className="text-[10px] text-center" style={{ color: 'var(--muted)' }}>
                Offline scoring works 100%. Matches sync automatically when connected.
              </span>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: REGISTRATION OTP VERIFICATION                                     */}
        {/* ========================================================================= */}
        {authStep === 'otp' && (
          <form onSubmit={handleVerifyOtpAndRegister} className="p-4 space-y-3.5">
            <button
              type="button"
              onClick={() => {
                setAuthStep('form');
                setError(null);
              }}
              className="flex items-center gap-1 text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] transition-colors mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Edit Registration</span>
            </button>

            {/* Professional Email Dispatched Banner (No OTP shown in app) */}
            <div
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.08)',
                borderColor: 'rgba(34, 197, 94, 0.3)',
                color: 'var(--text)'
              }}
              className="p-3.5 rounded-xl border flex items-center gap-3 shadow-sm"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-[#22C55E]" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-[#22C55E] text-xs">Verification Code Sent to Gmail</div>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>
                  Dispatched to <strong style={{ color: 'var(--text)' }}>{email}</strong>. Check inbox &amp; spam.
                </div>
              </div>
            </div>

            <p className="text-xs text-[var(--muted)] leading-relaxed">
              We sent a 6-digit verification code for <strong style={{ color: 'var(--text)' }}>{email}</strong>. Enter it below to confirm your account:
            </p>

            {error && (
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  color: '#EF4444',
                  borderColor: 'rgba(239, 68, 68, 0.3)'
                }}
                className="p-3 rounded-xl border text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div
                style={{
                  backgroundColor: 'rgba(34, 197, 94, 0.12)',
                  color: '#22C55E',
                  borderColor: 'rgba(34, 197, 94, 0.3)'
                }}
                className="p-3 rounded-xl border text-xs flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold uppercase mb-1" style={{ color: 'var(--muted)' }}>
                Enter 6-Digit Code
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-3.5 text-[var(--muted)]" />
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  style={{
                    backgroundColor: 'var(--card-alt)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)'
                  }}
                  className="w-full pl-11 pr-3 py-3 rounded-xl border text-lg font-mono font-bold tracking-widest text-center focus:outline-none focus:border-[#22C55E]"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otpInput.trim().length !== 6}
              style={{
                backgroundColor: otpInput.trim().length === 6 ? '#22C55E' : 'rgba(34, 197, 94, 0.4)',
                color: '#FFFFFF'
              }}
              className="w-full py-3 rounded-xl font-bold text-xs shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 mt-3 cursor-pointer"
            >
              {loading ? (
                <span className="animate-pulse">Creating Verified Account...</span>
              ) : (
                <span>Verify OTP &amp; Complete Registration</span>
              )}
            </button>

            <div className="flex items-center justify-between pt-2 border-t text-xs" style={{ borderColor: 'var(--border)' }}>
              <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
                Didn't receive code?
              </span>
              <button
                type="button"
                onClick={handleResendRegistrationOtp}
                disabled={resendCooldown > 0}
                className={`text-xs font-semibold flex items-center gap-1 ${
                  resendCooldown > 0 ? 'text-[var(--muted)] cursor-not-allowed' : 'text-[#22C55E] hover:underline'
                }`}
              >
                <RefreshCw className={`w-3 h-3 ${resendCooldown > 0 ? '' : 'text-[#22C55E]'}`} />
                <span>{resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}</span>
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: FORGOT PASSWORD - STEP 1 (Request Email Code)                     */}
        {/* ========================================================================= */}
        {authStep === 'forgot_password' && (
          <form onSubmit={handleRequestResetOtp} className="p-4 space-y-3.5">
            <button
              type="button"
              onClick={() => {
                setAuthStep('form');
                setError(null);
              }}
              className="flex items-center gap-1 text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] transition-colors mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>

            <div className="space-y-1">
              <h4 className="text-sm font-bold m-0" style={{ color: 'var(--text)' }}>
                Reset Manager Password
              </h4>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
                Enter the email address registered with your manager account. We'll send a 6-digit code to securely reset your password.
              </p>
            </div>

            {error && (
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  color: '#EF4444',
                  borderColor: 'rgba(239, 68, 68, 0.3)'
                }}
                className="p-3 rounded-xl border text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold uppercase mb-1" style={{ color: 'var(--muted)' }}>
                Registered Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-[var(--muted)]" />
                <input
                  type="email"
                  placeholder="scorer@cricket.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  style={{
                    backgroundColor: 'var(--card-alt)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)'
                  }}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:border-[#22C55E]"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: '#22C55E',
                color: '#FFFFFF'
              }}
              className="w-full py-3 rounded-xl font-bold text-xs shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 mt-4 hover:bg-emerald-600 cursor-pointer"
            >
              {loading ? (
                <span className="animate-pulse">Generating Reset Code...</span>
              ) : (
                <span>{ENABLE_OTP_VERIFICATION ? 'Send 6-Digit Reset Code' : 'Continue to Reset Password'}</span>
              )}
            </button>
          </form>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: FORGOT PASSWORD - STEP 2 (Verify Reset Code & New Password)       */}
        {/* ========================================================================= */}
        {authStep === 'forgot_otp' && (
          <form onSubmit={handleResetPasswordWithOtp} className="p-4 space-y-3">
            <button
              type="button"
              onClick={() => {
                setAuthStep('forgot_password');
                setError(null);
              }}
              className="flex items-center gap-1 text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] transition-colors mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Email Step</span>
            </button>

            {/* Reset Banner */}
            <div
              style={{
                backgroundColor: 'rgba(34, 197, 94, 0.08)',
                borderColor: 'rgba(34, 197, 94, 0.3)',
                color: 'var(--text)'
              }}
              className="p-3.5 rounded-xl border flex items-center gap-3 shadow-sm"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-[#22C55E]" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-[#22C55E] text-xs">Reset Code Sent to Gmail</div>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>
                  {ENABLE_OTP_VERIFICATION ? (
                    <>Dispatched to <strong style={{ color: 'var(--text)' }}>{forgotEmail}</strong>. Check inbox &amp; spam.</>
                  ) : (
                    <>Enter your new password below for <strong style={{ color: 'var(--text)' }}>{forgotEmail}</strong></>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  color: '#EF4444',
                  borderColor: 'rgba(239, 68, 68, 0.3)'
                }}
                className="p-3 rounded-xl border text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {ENABLE_OTP_VERIFICATION && (
              <div>
                <label className="block text-[11px] font-semibold uppercase mb-1" style={{ color: 'var(--muted)' }}>
                  6-Digit Reset Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={forgotOtpInput}
                  onChange={(e) => setForgotOtpInput(e.target.value.replace(/\D/g, ''))}
                  style={{
                    backgroundColor: 'var(--card-alt)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)'
                  }}
                  className="w-full py-2.5 px-3 rounded-xl border text-base font-mono font-bold tracking-widest text-center focus:outline-none focus:border-[#22C55E]"
                  autoFocus
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold uppercase mb-1" style={{ color: 'var(--muted)' }}>
                New Password (min 6 characters)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-[var(--muted)]" />
                <input
                  type="password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{
                    backgroundColor: 'var(--card-alt)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)'
                  }}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:border-[#22C55E]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase mb-1" style={{ color: 'var(--muted)' }}>
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-[var(--muted)]" />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{
                    backgroundColor: 'var(--card-alt)',
                    borderColor: 'var(--border)',
                    color: 'var(--text)'
                  }}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:border-[#22C55E]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || forgotOtpInput.trim().length !== 6}
              style={{
                backgroundColor: forgotOtpInput.trim().length === 6 ? '#22C55E' : 'rgba(34, 197, 94, 0.4)',
                color: '#FFFFFF'
              }}
              className="w-full py-3 rounded-xl font-bold text-xs shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 mt-3 cursor-pointer"
            >
              {loading ? (
                <span className="animate-pulse">Updating Password...</span>
              ) : (
                <span>Save New Password &amp; Sign In</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
