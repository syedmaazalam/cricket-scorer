import React, { useState, useEffect } from 'react';
import {
  Palette,
  Smartphone,
  Share2,
  Info,
  RefreshCw,
  ChevronDown,
  CheckCircle2,
  Shield,
  Mail,
  Download,
  ExternalLink,
  Sparkles,
  Award
} from 'lucide-react';
import { CURRENT_APP_VERSION } from '../components/UpdateNotificationBanner.jsx';

function Switch({ checked, onChange, ariaLabel }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      className={`w-12 h-6 rounded-full transition-colors duration-200 relative p-0.5 shrink-0 focus:outline-none focus:ring-2 focus:ring-[var(--pri)]/40 ${
        checked ? 'bg-[var(--pri)]' : 'bg-[var(--well)] border border-[var(--bd)]'
      }`}
    >
      <div
        className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function AccordionSection({ id, title, subtitle, icon: Icon, iconColor, isOpen, onToggle, children }) {
  return (
    <div className="w-full rounded-2xl border border-[var(--bd)] bg-[var(--card)] shadow-sm overflow-hidden transition-all duration-200">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full p-3.5 sm:p-4 flex items-center justify-between gap-3 text-left hover:bg-[var(--well)]/40 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            style={{ backgroundColor: `color-mix(in srgb, ${iconColor} 18%, transparent)`, color: iconColor }}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          >
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-[var(--t1)]">
              {title}
            </h2>
            <p className="text-[11px] text-[var(--t2)] truncate">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center bg-[var(--well)] text-[var(--t2)] transition-transform duration-200 ${
              isOpen ? 'rotate-180' : 'rotate-0'
            }`}
          >
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="px-3.5 sm:px-4 pb-4 pt-1 border-t border-[var(--bd)] flex flex-col gap-3 animate-in fade-in duration-150">
          {children}
        </div>
      )}
    </div>
  );
}

export default function Settings({ onBack }) {
  // Accordion State: 5 Dropdowns (Appearance, Scoring, Export, About, Check for Update)
  const [openSections, setOpenSections] = useState({
    appearance: true,
    scoring: false,
    export: false,
    about: false,
    updates: false
  });

  const toggleSection = (sectionId) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

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
  const [autoNextOver, setAutoNextOver] = useState(() => localStorage.getItem('setting_auto_next_over') !== 'false');

  // Export & Share Settings
  const [imageResolution, setImageResolution] = useState(() => localStorage.getItem('setting_export_res') || '1920');
  const [includeMvp, setIncludeMvp] = useState(() => localStorage.getItem('setting_include_mvp') !== 'false');
  const [includeFooter, setIncludeFooter] = useState(() => localStorage.getItem('setting_footer_credit') !== 'false');
  const [timeFormat, setTimeFormat] = useState(() => localStorage.getItem('setting_time_format') || '12h');

  // Check for Updates State
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null);

  // Toast and Modals
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

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

  const triggerSaved = () => {
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 1600);
  };

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

  // Check for updates via GitHub Release API
  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateStatus(null);
    try {
      const res = await fetch('https://api.github.com/repos/syedmaazalam/cricket-scorer/releases/latest');
      if (res.ok) {
        const release = await res.json();
        const latestTag = release.tag_name || `v${CURRENT_APP_VERSION}`;
        const cleanTag = latestTag.replace(/^v/i, '').trim();
        const isLatest = cleanTag === CURRENT_APP_VERSION || cleanTag <= CURRENT_APP_VERSION;
        setUpdateStatus({
          isLatest,
          latestVersion: latestTag,
          apkUrl: release.assets?.[0]?.browser_download_url || `https://github.com/syedmaazalam/cricket-scorer/releases/download/v${CURRENT_APP_VERSION}/SmartCricket.apk`,
          publishedAt: release.published_at ? new Date(release.published_at).toLocaleDateString() : 'November 2026'
        });
      } else {
        setUpdateStatus({
          isLatest: true,
          latestVersion: `v${CURRENT_APP_VERSION}`,
          apkUrl: `https://github.com/syedmaazalam/cricket-scorer/releases/download/v${CURRENT_APP_VERSION}/SmartCricket.apk`
        });
      }
    } catch (err) {
      setUpdateStatus({
        isLatest: true,
        latestVersion: `v${CURRENT_APP_VERSION}`,
        apkUrl: `https://github.com/syedmaazalam/cricket-scorer/releases/download/v${CURRENT_APP_VERSION}/SmartCricket.apk`
      });
    } finally {
      setCheckingUpdate(false);
    }
  };

  return (
    <div
      style={{ color: 'var(--t1)' }}
      className="w-full max-w-3xl mx-auto px-1 sm:px-3 py-2 select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--bd)] px-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif font-black tracking-tight text-[var(--t1)]">
            Settings
          </h1>
          <p className="text-[11px] sm:text-xs text-[var(--t2)] mt-0.5 font-medium">
            Customize app appearance, scoring behavior, export formats, and updates
          </p>
        </div>
        {showSavedToast && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs font-bold animate-in fade-in duration-150">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Saved</span>
          </div>
        )}
      </div>

      {/* 5 Collapsible Accordion Dropdowns */}
      <div className="flex flex-col gap-3.5 w-full">
        {/* 1. APPEARANCE ACCORDION */}
        <AccordionSection
          id="appearance"
          title="Appearance"
          subtitle="Theme mode, glass blur, and motion"
          icon={Palette}
          iconColor="var(--pri)"
          isOpen={openSections.appearance}
          onToggle={toggleSection}
        >
          {/* Theme Mode Selector */}
          <div className="flex flex-col gap-1.5 pt-1">
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

          {/* Frosted Glass Blur */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--well)]/50 border border-[var(--bd)]">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[var(--t1)]">Frosted Glass Blur</span>
              <span className="text-[11px] text-[var(--t2)]">Disable on slower mobile devices</span>
            </div>
            <Switch
              checked={glassBlur}
              onChange={handleBlurToggle}
              ariaLabel="Toggle Frosted Glass Blur"
            />
          </div>

          {/* Reduce Motion */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--well)]/50 border border-[var(--bd)]">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[var(--t1)]">Reduce Motion</span>
              <span className="text-[11px] text-[var(--t2)]">Minimizes orb drifts and animations</span>
            </div>
            <Switch
              checked={reduceMotion}
              onChange={handleReduceMotionToggle}
              ariaLabel="Toggle Reduce Motion"
            />
          </div>

          {/* Text Size Scale */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--well)]/50 border border-[var(--bd)]">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[var(--t1)]">Text Scale</span>
              <span className="text-[11px] text-[var(--t2)]">Standard or larger typography</span>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => handleTextSizeChange('normal')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  textSize === 'normal' ? 'bg-[var(--pri)] text-white' : 'bg-[var(--well)] text-[var(--t2)]'
                }`}
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => handleTextSizeChange('large')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  textSize === 'large' ? 'bg-[var(--pri)] text-white' : 'bg-[var(--well)] text-[var(--t2)]'
                }`}
              >
                Large
              </button>
            </div>
          </div>
        </AccordionSection>

        {/* 2. SCORING ACCORDION */}
        <AccordionSection
          id="scoring"
          title="Scoring"
          subtitle="Keypad comfort, haptics, and match flow"
          icon={Smartphone}
          iconColor="var(--ok)"
          isOpen={openSections.scoring}
          onToggle={toggleSection}
        >
          {/* Keep Screen Awake */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--well)]/50 border border-[var(--bd)] pt-1">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[var(--t1)]">Keep Screen Awake</span>
              <span className="text-[11px] text-[var(--t2)]">Prevents phone sleep while scoring match</span>
            </div>
            <Switch
              checked={keepAwake}
              onChange={handleKeepAwakeToggle}
              ariaLabel="Toggle Keep Screen Awake"
            />
          </div>

          {/* Haptic Vibration */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--well)]/50 border border-[var(--bd)]">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[var(--t1)]">Haptic Vibration on Tap</span>
              <span className="text-[11px] text-[var(--t2)]">Physical vibration click on each ball</span>
            </div>
            <Switch
              checked={hapticFeedback}
              onChange={() => {
                const next = !hapticFeedback;
                setHapticFeedback(next);
                localStorage.setItem('setting_haptics', String(next));
                if (next && typeof navigator !== 'undefined' && navigator.vibrate) {
                  try { navigator.vibrate(25); } catch (_) {}
                }
                triggerSaved();
              }}
              ariaLabel="Toggle Haptic Feedback"
            />
          </div>

          {/* Confirm Undo */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--well)]/50 border border-[var(--bd)]">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[var(--t1)]">Confirm Before Undo</span>
              <span className="text-[11px] text-[var(--t2)]">Prevents accidental ball undo taps</span>
            </div>
            <Switch
              checked={confirmUndo}
              onChange={() => {
                const next = !confirmUndo;
                setConfirmUndo(next);
                localStorage.setItem('setting_confirm_undo', String(next));
                triggerSaved();
              }}
              ariaLabel="Toggle Confirm Before Undo"
            />
          </div>

          {/* Left-Handed RunPad */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--well)]/50 border border-[var(--bd)]">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[var(--t1)]">Left-Handed RunPad</span>
              <span className="text-[11px] text-[var(--t2)]">Mirror button layout for left thumb</span>
            </div>
            <Switch
              checked={leftHanded}
              onChange={() => {
                const next = !leftHanded;
                setLeftHanded(next);
                localStorage.setItem('setting_left_handed', String(next));
                triggerSaved();
              }}
              ariaLabel="Toggle Left-Handed RunPad"
            />
          </div>

          {/* Auto Next Over Prompt */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--well)]/50 border border-[var(--bd)]">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[var(--t1)]">Auto Next Over Prompt</span>
              <span className="text-[11px] text-[var(--t2)]">Automatically open bowler change on 6th ball</span>
            </div>
            <Switch
              checked={autoNextOver}
              onChange={() => {
                const next = !autoNextOver;
                setAutoNextOver(next);
                localStorage.setItem('setting_auto_next_over', String(next));
                triggerSaved();
              }}
              ariaLabel="Toggle Auto Next Over Prompt"
            />
          </div>
        </AccordionSection>

        {/* 3. EXPORT ACCORDION */}
        <AccordionSection
          id="export"
          title="Export"
          subtitle="Scorecard image dimensions, MVP, and layout"
          icon={Share2}
          iconColor="var(--warn)"
          isOpen={openSections.export}
          onToggle={toggleSection}
        >
          {/* Image Resolution */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--well)]/50 border border-[var(--bd)] pt-1">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[var(--t1)]">Export Image Resolution</span>
              <span className="text-[11px] text-[var(--t2)]">4K UHD / Full HD landscape (16:9)</span>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setImageResolution('4k');
                  localStorage.setItem('setting_export_res', '4k');
                  triggerSaved();
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  imageResolution === '4k' ? 'bg-[var(--pri)] text-white' : 'bg-[var(--well)] text-[var(--t2)]'
                }`}
              >
                4K UHD
              </button>
              <button
                type="button"
                onClick={() => {
                  setImageResolution('1920');
                  localStorage.setItem('setting_export_res', '1920');
                  triggerSaved();
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  imageResolution === '1920' ? 'bg-[var(--pri)] text-white' : 'bg-[var(--well)] text-[var(--t2)]'
                }`}
              >
                1920px
              </button>
            </div>
          </div>

          {/* Include Top Performer / MVP on Scorecard */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--well)]/50 border border-[var(--bd)]">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[var(--t1)]">Show Top Performer · MVP</span>
              <span className="text-[11px] text-[var(--t2)]">Include player of the match highlight card</span>
            </div>
            <Switch
              checked={includeMvp}
              onChange={() => {
                const next = !includeMvp;
                setIncludeMvp(next);
                localStorage.setItem('setting_include_mvp', String(next));
                triggerSaved();
              }}
              ariaLabel="Toggle Include MVP on Scorecard"
            />
          </div>

          {/* Include App Watermark */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--well)]/50 border border-[var(--bd)]">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[var(--t1)]">Include App Watermark</span>
              <span className="text-[11px] text-[var(--t2)]">Show SmartCricket crest in export footer</span>
            </div>
            <Switch
              checked={includeFooter}
              onChange={() => {
                const next = !includeFooter;
                setIncludeFooter(next);
                localStorage.setItem('setting_footer_credit', String(next));
                triggerSaved();
              }}
              ariaLabel="Toggle Footer Watermark"
            />
          </div>

          {/* Time Format */}
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
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  timeFormat === '12h' ? 'bg-[var(--pri)] text-white' : 'bg-[var(--well)] text-[var(--t2)]'
                }`}
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
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  timeFormat === '24h' ? 'bg-[var(--pri)] text-white' : 'bg-[var(--well)] text-[var(--t2)]'
                }`}
              >
                24h
              </button>
            </div>
          </div>
        </AccordionSection>

        {/* 4. ABOUT ACCORDION (Exclusively where developer name appears) */}
        <AccordionSection
          id="about"
          title="About"
          subtitle="Version, architect info, and feedback"
          icon={Info}
          iconColor="var(--pri)"
          isOpen={openSections.about}
          onToggle={toggleSection}
        >
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--well)]/50 border border-[var(--bd)] pt-1">
            <span className="text-xs font-bold text-[var(--t2)]">App Version</span>
            <span className="text-xs font-mono font-bold text-[var(--t1)]">v{CURRENT_APP_VERSION} (Build 2026.11)</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--well)]/50 border border-[var(--bd)]">
            <span className="text-xs font-bold text-[var(--t2)]">Architect &amp; Developer</span>
            <span className="text-xs font-bold text-[var(--pri)]">Syed Maaz Alam</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--well)]/50 border border-[var(--bd)]">
            <span className="text-xs font-bold text-[var(--t2)]">Rules Engine</span>
            <span className="text-xs font-bold text-[var(--ok)]">MCC Laws of Cricket Compliant</span>
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
        </AccordionSection>

        {/* 5. CHECK FOR UPDATE ACCORDION */}
        <AccordionSection
          id="updates"
          title="Check for Update"
          subtitle="Verify latest APK build &amp; new features"
          icon={RefreshCw}
          iconColor="#38BDF8"
          isOpen={openSections.updates}
          onToggle={toggleSection}
        >
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--well)]/50 border border-[var(--bd)] pt-1">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[var(--t1)]">Installed Version</span>
              <span className="text-[11px] text-[var(--t2)]">Official Android release</span>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-[var(--well)] border border-[var(--bd)] text-xs font-mono font-bold text-[var(--pri)]">
              v{CURRENT_APP_VERSION}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--well)]/30 border border-[var(--bd)] flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--t1)]">Release Channel</span>
              <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                GitHub Official
              </span>
            </div>

            {updateStatus && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-2 text-xs font-semibold text-emerald-400 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>SmartCricket is up to date ({updateStatus.latestVersion})</span>
              </div>
            )}

            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={handleCheckUpdate}
                disabled={checkingUpdate}
                className="btn p s flex-1 text-xs font-bold flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? 'animate-spin' : ''}`} />
                <span>{checkingUpdate ? 'Checking Server...' : 'Check for Updates'}</span>
              </button>
              <a
                href={`https://github.com/syedmaazalam/cricket-scorer/releases/download/v${CURRENT_APP_VERSION}/SmartCricket.apk`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn s flex-1 text-xs font-bold flex items-center justify-center gap-2 bg-[var(--well)] hover:bg-[var(--bd)] text-[var(--t1)]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Latest APK</span>
              </a>
            </div>
          </div>
        </AccordionSection>
      </div>

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
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
