package com.harbor.tv;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;

public class MainActivity extends Activity {
  private static final String HARBOR_URL = "https://appassets.androidplatform.net/assets/index.html";
  private WebView webView;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    requestWindowFeature(Window.FEATURE_NO_TITLE);
    getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);

    webView = new WebView(this);
    webView.setBackgroundColor(Color.rgb(5, 2, 8));
    webView.setFocusable(true);
    webView.setFocusableInTouchMode(true);

    WebSettings settings = webView.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setDatabaseEnabled(false);
    settings.setAllowFileAccess(false);
    settings.setAllowFileAccessFromFileURLs(false);
    settings.setAllowUniversalAccessFromFileURLs(false);
    settings.setAllowContentAccess(false);
    settings.setMediaPlaybackRequiresUserGesture(false);
    settings.setSupportMultipleWindows(false);
    settings.setUserAgentString(settings.getUserAgentString() + " HarborTV/" + BuildConfig.VERSION_NAME);

    WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
      .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
      .build();

    webView.setWebViewClient(new WebViewClientCompat() {
      @Override
      public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        return assetLoader.shouldInterceptRequest(request.getUrl());
      }

      @Override
      public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        if (!request.isForMainFrame()) return false;
        String scheme = request.getUrl().getScheme();
        return !("https".equalsIgnoreCase(scheme) && "appassets.androidplatform.net".equalsIgnoreCase(request.getUrl().getHost()))
          && !"about".equalsIgnoreCase(scheme);
      }
    });
    webView.setWebChromeClient(new WebChromeClient() {
      @Override
      public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, android.os.Message resultMsg) {
        return false;
      }

      @Override
      public void onPermissionRequest(PermissionRequest request) {
        request.deny();
      }
    });

    setContentView(webView);
    hideSystemUi();
    webView.loadUrl(HARBOR_URL);
    webView.requestFocus();
  }

  private void hideSystemUi() {
    getWindow().getDecorView().setSystemUiVisibility(
      View.SYSTEM_UI_FLAG_FULLSCREEN
        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
        | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
    );
  }

  @Override
  public void onBackPressed() {
    if (webView == null) {
      super.onBackPressed();
      return;
    }
    webView.evaluateJavascript("(function () { var player = document.querySelector('#player-panel'); var detail = document.querySelector('#detail-panel'); var search = document.querySelector('#search-panel'); var open = (player && !player.hidden) || (detail && !detail.hidden) || (search && !search.hidden); if (open) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 4, bubbles: true })); return Boolean(open); }())", result -> {
      if (!"true".equals(result)) MainActivity.super.onBackPressed();
    });
  }

  @Override
  public boolean dispatchKeyEvent(KeyEvent event) {
    if (webView != null && event.getKeyCode() == KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE) {
      webView.evaluateJavascript("document.querySelector('video,audio')?.paused ? document.querySelector('video,audio')?.play() : document.querySelector('video,audio')?.pause()", null);
      return true;
    }
    return super.dispatchKeyEvent(event);
  }

  @Override
  protected void onResume() {
    super.onResume();
    if (webView != null) webView.onResume();
    hideSystemUi();
  }

  @Override
  protected void onPause() {
    if (webView != null) webView.onPause();
    super.onPause();
  }

  @Override
  protected void onDestroy() {
    if (webView != null) {
      webView.loadUrl("about:blank");
      webView.destroy();
      webView = null;
    }
    super.onDestroy();
  }
}
