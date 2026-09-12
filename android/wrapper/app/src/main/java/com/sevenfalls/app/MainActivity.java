package com.sevenfalls.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;

/**
 * Seven Falls — single-file game bundle in a WebView.
 * Assets are served from the https://appassets.androidplatform.net origin so the
 * game gets a real HTTPS origin instead of file://, with no file/content access.
 */
public class MainActivity extends AppCompatActivity {
    private static final String APP_HOST = "appassets.androidplatform.net";
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        webView = findViewById(R.id.webview);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);          // run state, bestiary, settings
        settings.setAllowFileAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMediaPlaybackRequiresUserGesture(false);   // chiptune starts on first tap anyway
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            settings.setSafeBrowsingEnabled(true);
        }
        webView.setBackgroundColor(0xFF000000);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setKeepScreenOn(true);                // a run should not dim mid-fight

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView.setWebViewClient(new WebViewClientCompat() {
            @Override
            public @Nullable WebResourceResponse shouldInterceptRequest(
                    WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (uri != null
                        && "https".equalsIgnoreCase(uri.getScheme())
                        && APP_HOST.equalsIgnoreCase(uri.getHost())) {
                    return false;
                }
                if (uri != null && "https".equalsIgnoreCase(uri.getScheme())) {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                }
                return true;
            }
        });

        webView.loadUrl("https://appassets.androidplatform.net/assets/seven-falls.html");
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
