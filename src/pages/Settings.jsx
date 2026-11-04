import React, { useState, useEffect } from 'react';
import {
  Palette,
  Smartphone,
  Share2,
  Info,
  Moon,
  Sun,
  Eye,
  Volume2,
  Vibrate,
  Shield,
  HelpCircle,
  Mail,
  Check,
  CheckCircle2
} from 'lucide-react';

export default function Settings({ onBack }) {
  // Appearance Settings
  const [theme, setTheme] = useState(() => localStorage.getItem('cricket_theme') || 'dark');
  const [glassBlur, setGlassBlur] = useState(() => localStorage.getItem('setting_glass_blur') !== 'false');
  const [reduceMotion, setReduceMotion] = useState(() => localStorage.getItem('setting_reduce_motion') === 'true');
  const [textSize, setTextSize] = useState(() => localStorage.getItem('setting_text_size') || 'normal');

  // Scoring Comfort Settings
  const [keepAwake, setKeepAwake] = useState(() => localStorage.getItem('setting_keep_awake') === 'true');
  const [hapticFeedback, setHapticFeedback] = useState(() => localStorage.getItem('setting_haptics') !== 'false');
  const [confirmUndo, setConfirmUndo] = useState(() => localStorage.getItem('setting_confirm_undo') === 'true');
  const [leftHanded, setLeftHanded] = useState(() => localStorage.getItem('setting_left_handed') === 'true');

  // Export & Share Settings
  const [imageResolution, setImageResolution] = useState(() => localStorage.getItem('setting_export_res') || '1920');
  const [includeFooter, setIncludeFooter] = useState(() => localStorage.getItem('setting_footer_credit') !== 'false');
  const [timeFormat, setTimeFormat] = useState(() => localStorage.getItem('setting_time_format') || '12h');

  // Feedback Toast
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  // Sync settings on mount & listen to theme events
  useEffect(() => {
    try {
      if (!glassBlur) {
        document.documentElement.classList.add('no-glass');
      } else {
        document.documentElement.classList.remove('no-glass');
      }
      document.documentElement.setAttribute('data-reduce-motion', String(reduceMotion));
      document.documentElement.setAttribute('data-text-scale', textSize);
    } catch (_) {}

    const handleThemeSync = (e) => {
      if (e?.detail) {
        setTheme(e.detail);
      }
    };
    window.addEventListener('cricket_theme_changed', handleThemeSync);
    return () => window.removeEventListener('cricket_theme_changed', handleThemeSync);
  }, []);

  // Handle Theme Change
  const handleThemeChange = (newTheme) => {
    let effective = newTheme;
    if (newTheme === 'system') {
      effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    setTheme(newTheme);
    try {
      document.documentElement.setAttribute('data-theme', effective);
      document.documentElement.classList.toggle('dark', effective === 'dark');
      localStorage.setItem('cricket_theme', effective);
      localStorage.setItem('setting_theme_pref', newTheme);
      window.dispatchEvent(new CustomEvent('cricket_theme_changed', { detail: effective }));
      triggerSaved();
    } catch (_) {}
  };

  // Glass blur toggle
  const handleBlurToggle = () => {
    const next = !glassBlur;
    setGlassBlur(next);
    localStorage.setItem('setting_glass_blur', String(next));
    if (!next) {
      document.documentElement.classList.add('no-glass');
    } else {
      document.documentElement.classList.remove('no-glass');
    }
    triggerSaved();
  };

  // Reduce motion toggle
  const handleReduceMotionToggle = () => {
    const next = !reduceMotion;
    setReduceMotion(next);
    localStorage.setItem('setting_reduce_motion', String(next));
    try {
      document.documentElement.setAttribute('data-reduce-motion', String(next));
    } catch (_) {}
    triggerSaved();
  };

  // Text scale change
  const handleTextSizeChange = (size) => {
    setTextSize(size);
    localStorage.setItem('setting_text_size', size);
    try {
      document.documentElement.setAttribute('data-text-scale', size);
    } catch (_) {}
    triggerSaved();
  };

  // Keep screen awake (WakeLock API)
  const handleKeepAwakeToggle = async () => {
    const next = !keepAwake;
    setKeepAwake(next);
    localStorage.setItem('setting_keep_awake', String(next));
    if (next && 'wakeLock' in navigator) {
      try {
        await navigator.wakeLock.request('screen');
      } catch (_) {}
    }
    triggerSaved();
  };

  const triggerSaved = () => {
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 1800);
  };

  return (
    <div
      style={{ color: 'var(--t1)' }}
      className="w-full max-w-4xl mx-auto px-0 sm:px-2 py-1 select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[var(--bd)] px-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-black tracking-tight text-[var(--t1)]">
            Settings
          </h1>
          <p className="text-[11px] sm:text-xs text-[var(--t2)] mt-0.5 font-medium">
            Personalize app experience, visual theme, and export options
          </p>
        </div>
        {showSavedToast && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs font-bold animate-in fade-in duration-150">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Saved</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 w-full">
        {/* 1. Appearance Section */}
        <section className="card glass-card rounded-2xl p-3.5 sm:p-4 border border-[var(--bd)] shadow-sm bg-[var(--card)] flex flex-col gap-3 w-full">
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--bd)]">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[var(--pri)]/15 text-[var(--pri)]">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-[var(--t1)] uppercase tracking-wide">
                Appearance
              </h2>
              <span className="text-[11px] text-[var(--t2)]">Theme, blur, and motion</span>
            </div>
          </div>

          {/* Theme Selector */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-[var(--t2)]">Theme Mode</span>
            <div className="seg" role="group">
              <button
                type="button"
                onClick={() => handleThemeChange('light')}
                className={theme === 'light' ? 'on' : ''}
              >
                Light
              </button>
              <button
                type="button"
                onClick={() => handleThemeChange('dark')}
                className={theme === 'dark' ? 'on' : ''}
              >
                Dark
              </button>
              <button
                type="button"
                onClick={() => handleThemeChange('system')}
                className={theme === 'system' ? 'on' : ''}
              >
                System
              </button>
            </div>
          </div>

          {/* Glass Blur Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--well)]/50 border border-[var(--bd)]">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[var(--t1)]">Frosted Glass Blur</span>
              <span className="text-[11px] text-[var(--t2)]">Disable on slower mobile devices</span>
            </div>
            <button
              onClick={handleBlurToggle}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${glassBlur ? 'bg-[var(--pri)]' : 'bg-[var(--well)] border border-[var(--bd)]'}`}
              aria-label="Toggle Glass Blur"
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${glassBlur ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {/* Reduce Motion */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--well)]/50 border border-[var(--bd)]">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[var(--t1)]">Reduce Motion</span>
              <span className="text-[11px] text-[var(--t2)]">Minimizes orb drifts and animations</span>
            </div>
            <button
              onClick={handleReduceMotionToggle}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${reduceMotion ? 'bg-[var(--pri)]' : 'bg-[var(--well)] border border-[var(--bd)]'}`}
              aria-label="Toggle Reduce Motion"
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${reduceMotion ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {/* Text Size */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--well)]/50 border border-[var(--bd)]">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[var(--t1)]">Text Scale</span>
              <span className="text-[11px] text-[var(--t2)]">Compact or larger typography</span>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => handleTextSizeChange('normal')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${textSize === 'normal' ? 'bg-[var(--pri)] text-white' : 'bg-[var(--well)] text-[var(--t2)]'}`}
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => handleTextSizeChange('large')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${textSize === 'large' ? 'bg-[var(--pri)] text-white' : 'bg-[var(--well)] text-[var(--t2)]'}`}
              >
                Large
              </button>
            </div>
          </div>
        </section>

        {/* 2. Scoring Screen Comfort */}
        <section className="card glass-card rounded-2xl p-3.5 sm:p-4 border border-[var(--bd)] shadow-sm bg-[var(--card)] flex flex-col gap-3 w-full">
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--bd)]">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[var(--ok)]/15 text-[var(--ok)]">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-[var(--t1)] uppercase tracking-wide">
                Scoring Comfort
              </h2>
              <span className="text-[11px] text-[var(--t2)]">Keypad, haptics, and screen controls</span>
            </div>
          </div>

          {/* Keep Screen Awake */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--well)]/50 border border-[var(--bd)]">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[var(--t1)]">Keep Screen Awake</span>
              <span className="text-[11px] text-[var(--t2)]">Prevents phone sleep while scoring match</span>
            </div>
            <button
              onClick={handleKeepAwakeToggle}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${keepAwake ? 'bg-[var(--ok)]' : 'bg-[var(--well)] border border-[var(--bd)]'}`}
              aria-label="Toggle Keep Screen Awake"
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${keepAwake ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {/* Haptic Vibration */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--well)]/50 border border-[var(--bd)]">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[var(--t1)]">Haptic Vibration on Tap</span>
              <span className="text-[11px] text-[var(--t2)]">Physical vibration click on each ball</span>
            </div>
            <button
              onClick={() => {
                const next = !hapticFeedback;
                setHapticFeedback(next);
                localStorage.setItem('setting_haptics', String(next));
                triggerSaved();
              }}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${hapticFeedback ? 'bg-[var(--ok)]' : 'bg-[var(--well)] border border-[var(--bd)]'}`}
              aria-label="Toggle Haptic Feedback"
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${hapticFeedback ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {/* Confirm Undo / Wicket */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--well)]/50 border border-[var(--bd)]">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[var(--t1)]">Confirm Before Undo</span>
              <span className="text-[11px] text-[var(--t2)]">Prevents accidental ball undo taps</span>
            </div>
            <button
              onClick={() => {
                const next = !confirmUndo;
                setConfirmUndo(next);
                localStorage.setItem('setting_confirm_undo', String(next));
                triggerSaved();
              }}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${confirmUndo ? 'bg-[var(--ok)]' : 'bg-[var(--well)] border border-[var(--bd)]'}`}
              aria-label="Toggle Confirm Undo"
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${confirmUndo ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {/* Left-Handed Keypad */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--well)]/50 border border-[var(--bd)]">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[var(--t1)]">Left-Handed RunPad</span>
              <span className="text-[11px] text-[var(--t2)]">Mirror button layout for left thumb</span>
            </div>
            <button
              onClick={() => {
                const next = !leftHanded;
                setLeftHanded(next);
                localStorage.setItem('setting_left_handed', String(next));
                triggerSaved();
              }}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${leftHanded ? 'bg-[var(--ok)]' : 'bg-[var(--well)] border border-[var(--bd)]'}`}
              aria-label="Toggle Left Handed Keypad"
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${leftHanded ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>
        </section>

        {/* 3. Export & Share */}
        <section className="card glass-card rounded-2xl p-3.5 sm:p-4 border border-[var(--bd)] shadow-sm bg-[var(--card)] flex flex-col gap-3 w-full">
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--bd)]">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[var(--warn)]/15 text-[var(--warn)]">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-[var(--t1)] uppercase tracking-wide">
                Export &amp; Share
              </h2>
              <span className="text-[11px] text-[var(--t2)]">Match summary PNG dimensions &amp; format</span>
            </div>
          </div>

          {/* Image Resolution */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--well)]/50 border border-[var(--bd)]">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[var(--t1)]">Export Image Resolution</span>
              <span className="text-[11px] text-[var(--t2)]">Full HD landscape (16:9)</span>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setImageResolution('1920');
                  localStorage.setItem('setting_export_res', '1920');
                  triggerSaved();
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${imageResolution === '1920' ? 'bg-[var(--pri)] text-white' : 'bg-[var(--well)] text-[var(--t2)]'}`}
              >
                1920px (FHD)
              </button>
              <button
                type="button"
                onClick={() => {
                  setImageResolution('1080');
                  localStorage.setItem('setting_export_res', '1080');
                  triggerSaved();
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${imageResolution === '1080' ? 'bg-[var(--pri)] text-white' : 'bg-[var(--well)] text-[var(--t2)]'}`}
              >
                1080px
              </button>
            </div>
          </div>

          {/* Include Footer Credit */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--well)]/50 border border-[var(--bd)]">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[var(--t1)]">Include Footer Credit</span>
              <span className="text-[11px] text-[var(--t2)]">Display developer &amp; app watermark</span>
            </div>
            <button
              onClick={() => {
                const next = !includeFooter;
                setIncludeFooter(next);
                localStorage.setItem('setting_footer_credit', String(next));
                triggerSaved();
              }}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${includeFooter ? 'bg-[var(--pri)]' : 'bg-[var(--well)] border border-[var(--bd)]'}`}
              aria-label="Toggle Footer Credit"
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${includeFooter ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {/* Date & Time Format */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--well)]/50 border border-[var(--bd)]">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[var(--t1)]">Time Format</span>
              <span className="text-[11px] text-[var(--t2)]">12-hour AM/PM vs 24-hour</span>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setTimeFormat('12h');
                  localStorage.setItem('setting_time_format', '12h');
                  triggerSaved();
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${timeFormat === '12h' ? 'bg-[var(--pri)] text-white' : 'bg-[var(--well)] text-[var(--t2)]'}`}
              >
                12h
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimeFormat('24h');
                  localStorage.setItem('setting_time_format', '24h');
                  triggerSaved();
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${timeFormat === '24h' ? 'bg-[var(--pri)] text-white' : 'bg-[var(--well)] text-[var(--t2)]'}`}
              >
                24h
              </button>
            </div>
          </div>
        </section>

        {/* 4. About */}
        <section className="card glass-card rounded-2xl p-3.5 sm:p-4 border border-[var(--bd)] shadow-sm bg-[var(--card)] flex flex-col gap-3 w-full">
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--bd)]">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[var(--pri)]/15 text-[var(--pri)]">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-[var(--t1)] uppercase tracking-wide">
                About SmartCricket
              </h2>
              <span className="text-[11px] text-[var(--t2)]">App version, developer, and feedback</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--well)]/50 border border-[var(--bd)]">
            <span className="text-xs font-bold text-[var(--t2)]">App Version</span>
            <span className="text-xs font-mono font-bold text-[var(--t1)]">v2.4.0 (Build 2026.11)</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--well)]/50 border border-[var(--bd)]">
            <span className="text-xs font-bold text-[var(--t2)]">Architect &amp; Developer</span>
            <span className="text-xs font-bold text-[var(--pri)]">Syed Maaz Alam</span>
          </div>

          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={() => setShowPrivacyModal(true)}
              className="btn s flex-1 text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Privacy Policy</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const email = 'maazalam.uet@gmail.com';
                const subject = encodeURIComponent('SmartCricket User Feedback');
                window.open(`mailto:${email}?subject=${subject}`, '_blank');
              }}
              className="btn p s flex-1 text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Send Feedback</span>
            </button>
          </div>
        </section>
      </div>

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md"
          onClick={() => setShowPrivacyModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 bg-[var(--card)] border border-[var(--bd)] shadow-2xl text-[var(--t1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5 text-[var(--ok)]" />
              <span>Privacy Policy</span>
            </h3>
            <p className="text-xs text-[var(--t2)] leading-relaxed mb-4">
              SmartCricket stores match records, team lineups, and ball-by-ball actions locally on your device (IndexedDB) and synchronizes encrypted match states to Google Cloud Firestore only when connected. We do not sell your data or display third-party advertisements.
            </p>
            <button
              onClick={() => setShowPrivacyModal(false)}
              className="btn p w-full text-xs font-bold"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
