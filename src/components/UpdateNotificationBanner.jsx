import React, { useState, useEffect } from 'react';
import { Bell, ArrowDownToLine, X, AlertTriangle, Sparkles, ExternalLink } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config.js';

export const CURRENT_APP_VERSION = '1.0';
export const CURRENT_APP_VERSION_CODE = 1;

export default function UpdateNotificationBanner() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let unsubscribeFirestore = null;

    // Helper to evaluate and trigger banner if update is newer than current app
    const evaluateUpdate = (release) => {
      if (!release) return;

      const remoteCode = Number(release.versionCode || 0);
      const remoteName = String(release.versionName || '').trim();
      const isForce = Boolean(release.force);

      // Check if remote version is strictly newer
      const isNewerCode = remoteCode > CURRENT_APP_VERSION_CODE;
      const isNewerName = remoteName && remoteName !== CURRENT_APP_VERSION && remoteName > CURRENT_APP_VERSION;
      const isUpdateAvailable = isNewerCode || isNewerName || isForce;

      if (!isUpdateAvailable) {
        setIsVisible(false);
        return;
      }

      const storageKey = `dismissed_update_${remoteName || remoteCode}`;
      const wasDismissed = typeof localStorage !== 'undefined' ? localStorage.getItem(storageKey) : null;

      if (!wasDismissed || isForce) {
        const msg = release.alertMessage || `SmartCricket v${remoteName || remoteCode} is available! Update now for latest features.`;
        const url = release.apkUrl || 'https://github.com/syedmaazalam/cricket-scorer/releases/download/v1.0/SmartCricket.apk';
        setUpdateInfo({
          versionName: remoteName || `v${remoteCode}`,
          versionCode: remoteCode,
          alertMessage: msg,
          apkUrl: url,
          notes: release.notes || '',
          force: isForce
        });
        setIsVisible(true);

        // Also trigger native Android status bar notification
        try {
          if (window.ScorecardBridge?.notifyAppUpdate) {
            window.ScorecardBridge.notifyAppUpdate(
              `SmartCricket v${remoteName || remoteCode} Update`,
              msg,
              url
            );
          }
        } catch (e) {}
      }
    };

    // 1. Real-time Firebase Firestore listener for instant broadcasts from Admin
    try {
      if (db) {
        const releaseDocRef = doc(db, 'config', 'latestRelease');
        unsubscribeFirestore = onSnapshot(releaseDocRef, (snap) => {
          if (snap.exists()) {
            evaluateUpdate(snap.data());
          }
        }, (err) => {
          console.warn('Firestore update listener notice:', err);
        });
      }
    } catch (e) {
      console.warn('Could not attach Firestore release listener:', e);
    }

    // 2. Fallback check against GitHub Releases API
    const checkGitHubRelease = async () => {
      try {
        const res = await fetch('https://api.github.com/repos/syedmaazalam/cricket-scorer/releases/latest');
        if (res.ok) {
          const ghRelease = await res.json();
          const ghTag = (ghRelease.tag_name || '').replace(/^v/i, '').trim();
          if (ghTag && ghTag !== CURRENT_APP_VERSION && ghTag > CURRENT_APP_VERSION) {
            evaluateUpdate({
              versionName: ghTag,
              versionCode: 2,
              alertMessage: `New version ${ghRelease.tag_name} is published! Tap to download the update.`,
              apkUrl: ghRelease.assets?.[0]?.browser_download_url || 'https://github.com/syedmaazalam/cricket-scorer/releases/download/v1.0/SmartCricket.apk',
              notes: ghRelease.body || '',
              force: false
            });
          }
        }
      } catch (err) {
        // Offline or unconfigured GitHub API
      }
    };

    checkGitHubRelease();

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  const handleDismiss = () => {
    if (!updateInfo) return;
    if (!updateInfo.force) {
      const storageKey = `dismissed_update_${updateInfo.versionName || updateInfo.versionCode}`;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(storageKey, 'true');
      }
      setIsVisible(false);
    }
  };

  const handleUpdate = () => {
    if (!updateInfo) return;
    const downloadUrl = updateInfo.apkUrl || 'https://github.com/syedmaazalam/cricket-scorer/releases/download/v1.0/SmartCricket.apk';
    window.open(downloadUrl, '_system');
  };

  if (!isVisible || !updateInfo) return null;

  return (
    <div
      role="alert"
      className="fixed top-3 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-xl z-50 animate-in slide-in-from-top-4 duration-300"
    >
      <div
        style={{
          backgroundColor: 'var(--card)',
          borderColor: updateInfo.force ? 'var(--warn)' : 'var(--pri)',
          color: 'var(--t1)'
        }}
        className="rounded-2xl border-2 shadow-2xl p-3 sm:p-4 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5"
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            style={{
              backgroundColor: updateInfo.force ? 'rgba(245, 158, 11, 0.15)' : 'rgba(37, 99, 235, 0.15)',
              color: updateInfo.force ? '#F59E0B' : 'var(--pri)'
            }}
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          >
            {updateInfo.force ? (
              <AlertTriangle className="w-5 h-5 animate-pulse text-amber-500" />
            ) : (
              <Bell className="w-5 h-5 text-[var(--pri)]" />
            )}
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span
                style={{
                  backgroundColor: updateInfo.force ? '#F59E0B' : 'var(--pri)',
                  color: '#FFFFFF'
                }}
                className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider leading-none"
              >
                {updateInfo.force ? 'Mandatory Update' : `Version ${updateInfo.versionName} Available`}
              </span>
              <span className="text-[var(--t3)] text-xs font-semibold">• SmartCricket</span>
            </div>

            <p className="text-xs sm:text-sm font-semibold mt-1 leading-snug text-[var(--t1)]">
              {updateInfo.alertMessage}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0 justify-end">
          <button
            type="button"
            onClick={handleUpdate}
            style={{
              backgroundColor: 'var(--pri)',
              color: '#FFFFFF'
            }}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold shadow-md hover:opacity-90 active:scale-95 transition-all"
          >
            <ArrowDownToLine className="w-4 h-4" />
            <span>Update Now</span>
          </button>

          {!updateInfo.force && (
            <button
              type="button"
              onClick={handleDismiss}
              className="p-2 rounded-xl hover:bg-[var(--well)] text-[var(--t2)] hover:text-[var(--t1)] transition-colors"
              aria-label="Dismiss update"
            >
              <X className="w-4 h-4" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
