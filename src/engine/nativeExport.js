import html2canvas from 'html2canvas';

/**
 * Robust image export helper for both Android APK (native WebView bridge) and Web browsers.
 * Accepts a base64/dataUrl string, an HTMLCanvasElement, or an HTMLElement (e.g. div).
 * Supports options.downloadOnly to guarantee direct download without opening the share sheet.
 * Supports options.shareOnly to trigger native share dialog directly.
 */
export async function exportAndSaveImage(target, fileName, title = 'Match Scorecard', options = {}) {
  const { downloadOnly = false, shareOnly = false } = options;
  try {
    let dataUrl = null;

    if (typeof target === 'string') {
      dataUrl = target;
    } else if (target && typeof target.toDataURL === 'function') {
      dataUrl = target.toDataURL('image/png');
    } else if (target && (target instanceof HTMLElement || target.nodeType === 1)) {
      // If a DOM element was passed, render it into a canvas first
      const renderedCanvas = await html2canvas(target, {
        useCORS: true,
        allowTaint: true,
        scale: 1,
        backgroundColor: '#F0F7FF',
        logging: false
      });
      dataUrl = renderedCanvas.toDataURL('image/png');
    } else {
      throw new Error('Unsupported image target for export');
    }

    if (!dataUrl || !dataUrl.startsWith('data:image')) {
      throw new Error('Invalid image data generated');
    }

    // 1. Check if running inside Android APK with our native bridge
    if (typeof window !== 'undefined' && window.ScorecardBridge?.saveImage) {
      window.ScorecardBridge.saveImage(dataUrl, fileName);
      return { success: true, native: true };
    }

    // 2. Web browser navigator.share with files (ONLY when share is explicitly requested, NEVER on downloadOnly)
    if (!downloadOnly && typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], fileName, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: title,
            text: `SmartCricket: ${title}`,
          });
          return { success: true, method: 'share' };
        }
      } catch (shareErr) {
        // User cancelled or share unhandled, fall through to download anchor if not shareOnly
        if (shareOnly) {
          return { success: false, method: 'share', cancelled: true };
        }
      }
    }

    // 3. Web browser standard anchor download (blob URL approach for reliable mobile download)
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = fileName;
      link.href = blobUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    } catch {
      // Fallback to direct data URL anchor
      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    return { success: true, native: false };
  } catch (err) {
    console.error('exportAndSaveImage error:', err);
    throw err;
  }
}

