package com.smartcricket.app;

import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.core.content.FileProvider;
import com.getcapacitor.BridgeActivity;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class MainActivity extends BridgeActivity {

    private String pendingDeepLinkCode = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleDeepLinkIntent(getIntent());
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                WebSettings settings = webView.getSettings();
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setAllowFileAccess(true);
                webView.setLayerType(WebView.LAYER_TYPE_HARDWARE, null);

                // Add direct native JS interface for saving/sharing scorecards and deep linking
                webView.addJavascriptInterface(new ScorecardNativeBridge(), "ScorecardBridge");

                // DownloadListener to intercept data/blob URLs
                webView.setDownloadListener(new DownloadListener() {
                    @Override
                    public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                        saveBase64Image(url, "SmartCricket_Scorecard.png");
                    }
                });

                // In case a deep link arrived during cold launch
                if (pendingDeepLinkCode != null) {
                    dispatchDeepLinkToWeb(pendingDeepLinkCode);
                }
            }
        } catch (Exception ignored) {}
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleDeepLinkIntent(intent);
    }

    private void handleDeepLinkIntent(Intent intent) {
        if (intent == null) return;
        Uri uri = intent.getData();
        if (uri == null) return;

        String matchCode = extractMatchCode(uri);
        if (matchCode != null && !matchCode.isEmpty()) {
            pendingDeepLinkCode = matchCode;
            dispatchDeepLinkToWeb(matchCode);
        }
    }

    private String extractMatchCode(Uri uri) {
        if (uri == null) return null;

        // 1. Check query parameters: ?watch=... or ?match=... or ?code=...
        String queryParam = uri.getQueryParameter("watch");
        if (queryParam == null) queryParam = uri.getQueryParameter("match");
        if (queryParam == null) queryParam = uri.getQueryParameter("code");
        if (queryParam != null && !queryParam.trim().isEmpty()) {
            return queryParam.trim().toUpperCase();
        }

        // 2. Check path segments: /match/{code} or /m/{code}
        String path = uri.getPath();
        if (path != null) {
            String[] segments = path.split("/");
            for (int i = 0; i < segments.length; i++) {
                if (("match".equalsIgnoreCase(segments[i]) || "m".equalsIgnoreCase(segments[i])) && (i + 1 < segments.length)) {
                    String candidate = segments[i + 1].trim();
                    if (!candidate.isEmpty()) {
                        return candidate.toUpperCase();
                    }
                }
            }
        }

        // 3. Custom scheme: smartcricket://match/{code}
        String host = uri.getHost();
        if ("match".equalsIgnoreCase(host) && path != null && path.length() > 1) {
            return path.substring(1).trim().toUpperCase();
        }

        return null;
    }

    private void dispatchDeepLinkToWeb(final String code) {
        if (code == null || code.isEmpty()) return;
        try {
            final WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null) {
                webView.post(new Runnable() {
                    @Override
                    public void run() {
                        String js = "try { " +
                                    "  if (window.handleDeepLink) { window.handleDeepLink('" + code + "'); } " +
                                    "  window.__pendingDeepLink = '" + code + "'; " +
                                    "  window.dispatchEvent(new CustomEvent('smartcricket:deeplink', { detail: { matchCode: '" + code + "' } })); " +
                                    "} catch(e) {}";
                        webView.evaluateJavascript(js, null);
                    }
                });
            }
        } catch (Exception ignored) {}
    }

    private void saveBase64Image(String dataUrl, String fileName) {
        try {
            if (dataUrl != null && dataUrl.contains(",")) {
                String base64Data = dataUrl.substring(dataUrl.indexOf(",") + 1);
                byte[] imageBytes = Base64.decode(base64Data, Base64.DEFAULT);

                // 1. Write to internal cache directory first
                File cacheDir = new File(getCacheDir(), "exports");
                if (!cacheDir.exists()) cacheDir.mkdirs();
                File cacheFile = new File(cacheDir, fileName);
                try (FileOutputStream out = new FileOutputStream(cacheFile)) {
                    out.write(imageBytes);
                }

                // 2. Save directly to MediaStore Gallery so user sees it in Photos / Gallery
                Uri savedMediaStoreUri = null;
                try {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.Images.Media.DISPLAY_NAME, fileName);
                    values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/SmartCricket");
                        values.put(MediaStore.Images.Media.IS_PENDING, 1);
                    }

                    Uri collection = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
                        ? MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
                        : MediaStore.Images.Media.EXTERNAL_CONTENT_URI;

                    savedMediaStoreUri = getContentResolver().insert(collection, values);
                    if (savedMediaStoreUri != null) {
                        try (OutputStream out = getContentResolver().openOutputStream(savedMediaStoreUri)) {
                            out.write(imageBytes);
                        }
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                            values.clear();
                            values.put(MediaStore.Images.Media.IS_PENDING, 0);
                            getContentResolver().update(savedMediaStoreUri, values, null, null);
                        }
                    }
                } catch (Exception galleryErr) {
                    // Non-fatal if gallery insert encounters OEM permission quirk
                }

                // 3. Obtain shareable content Uri via FileProvider or MediaStore
                Uri shareableUri = savedMediaStoreUri;
                if (shareableUri == null) {
                    shareableUri = FileProvider.getUriForFile(
                        MainActivity.this,
                        getPackageName() + ".fileprovider",
                        cacheFile
                    );
                }

                final Uri finalShareUri = shareableUri;
                runOnUiThread(() -> {
                    Toast.makeText(MainActivity.this, "Scorecard saved to Gallery / Pictures!", Toast.LENGTH_LONG).show();
                    if (finalShareUri != null) {
                        Intent shareIntent = new Intent(Intent.ACTION_SEND);
                        shareIntent.setType("image/png");
                        shareIntent.putExtra(Intent.EXTRA_STREAM, finalShareUri);
                        shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        startActivity(Intent.createChooser(shareIntent, "Share Scorecard"));
                    }
                });
            }
        } catch (Exception e) {
            runOnUiThread(() -> {
                Toast.makeText(MainActivity.this, "Could not save scorecard: " + e.getMessage(), Toast.LENGTH_SHORT).show();
            });
        }
    }

    class ScorecardNativeBridge {
        @JavascriptInterface
        public void saveImage(String dataUrl, String fileName) {
            saveBase64Image(dataUrl, fileName);
        }

        @JavascriptInterface
        public boolean isAndroidApp() {
            return true;
        }

        @JavascriptInterface
        public String getPendingDeepLink() {
            String code = pendingDeepLinkCode;
            pendingDeepLinkCode = null;
            return code != null ? code : "";
        }
    }
}
