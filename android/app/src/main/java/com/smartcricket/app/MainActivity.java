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
import com.getcapacitor.BridgeActivity;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                WebSettings settings = webView.getSettings();
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setAllowFileAccess(true);
                webView.setLayerType(WebView.LAYER_TYPE_HARDWARE, null);

                // Add direct native JS interface for saving/sharing scorecards in APK
                webView.addJavascriptInterface(new ScorecardNativeBridge(), "ScorecardBridge");

                // DownloadListener to intercept data/blob URLs
                webView.setDownloadListener(new DownloadListener() {
                    @Override
                    public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                        saveBase64Image(url, "SmartCricket_Scorecard.png");
                    }
                });
            }
        } catch (Exception ignored) {}
    }

    private void saveBase64Image(String dataUrl, String fileName) {
        try {
            if (dataUrl != null && dataUrl.startsWith("data:image")) {
                String base64Data = dataUrl.substring(dataUrl.indexOf(",") + 1);
                byte[] imageBytes = Base64.decode(base64Data, Base64.DEFAULT);

                Uri savedUri = null;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.Images.Media.DISPLAY_NAME, fileName);
                    values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
                    values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/SmartCricket");

                    Uri collection = MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
                    savedUri = getContentResolver().insert(collection, values);
                    if (savedUri != null) {
                        try (OutputStream out = getContentResolver().openOutputStream(savedUri)) {
                            out.write(imageBytes);
                        }
                    }
                } else {
                    File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "SmartCricket");
                    if (!dir.exists()) dir.mkdirs();
                    File file = new File(dir, fileName);
                    try (FileOutputStream out = new FileOutputStream(file)) {
                        out.write(imageBytes);
                    }
                    savedUri = Uri.fromFile(file);
                }

                runOnUiThread(() -> {
                    Toast.makeText(MainActivity.this, "Scorecard saved to Gallery / Pictures!", Toast.LENGTH_LONG).show();
                });

                if (savedUri != null) {
                    Intent shareIntent = new Intent(Intent.ACTION_SEND);
                    shareIntent.setType("image/png");
                    shareIntent.putExtra(Intent.EXTRA_STREAM, savedUri);
                    shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivity(Intent.createChooser(shareIntent, "Save or Share Scorecard"));
                }
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
    }
}
