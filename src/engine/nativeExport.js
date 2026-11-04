/**
 * Robust image export helper for both Android APK (native WebView bridge) and Web browsers.
 * Inside the APK, window.ScorecardBridge writes the image directly to device storage (Gallery/Pictures)
 * and opens the Android native share/save dialog.
 */
export async function exportAndSaveImage(canvasOrDataUrl, fileName, title = 'Match Scorecard') {
  try {
    const dataUrl =
      typeof canvasOrDataUrl === 'string'
        ? canvasOrDataUrl
        : canvasOrDataUrl.toDataURL('image/png');

    // 1. Check if running inside Android APK with our native bridge
    if (typeof window !== 'undefined' && window.ScorecardBridge?.saveImage) {
      window.ScorecardBridge.saveImage(dataUrl, fileName);
      return { success: true, native: true };
    }

    // 2. Web browser navigator.share with files (if supported)
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
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
        // Fall through to download anchor
      }
    }

    // 3. Web browser standard anchor download
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return { success: true, native: false };
  } catch (err) {
    console.error('exportAndSaveImage error:', err);
    throw err;
  }
}
