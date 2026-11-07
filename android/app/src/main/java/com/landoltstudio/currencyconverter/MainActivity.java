package com.landoltstudio.currencyconverter;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.res.AssetManager;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.TextView;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends Activity {

    static final String VIRTUAL_HOST = "appassets.local";
    static final String START_URL = "https://" + VIRTUAL_HOST + "/index.html";

    private FrameLayout rootLayout;
    private WebView webView;
    private Object backCallback;          // OnBackInvokedCallback (Android 13+)
    private boolean backCallbackRegistered;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            rootLayout = new FrameLayout(this);
            setContentView(rootLayout);

            setupEdgeToEdgeInsets();
            applySystemBarsTheme();

            initWebView(savedInstanceState);
        } catch (Throwable t) {
            showFallbackError(t);
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void initWebView(Bundle savedInstanceState) {
        if (rootLayout == null) return;
        rootLayout.removeAllViews();

        boolean isDark = isNightMode();
        rootLayout.setBackgroundColor(Color.parseColor(isDark ? "#141b26" : "#ffffff"));

        webView = new WebView(this);
        rootLayout.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        webView.setBackgroundColor(Color.parseColor(isDark ? "#0a1019" : "#eef3fa"));
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setTextZoom(100);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        final Context appContext = getApplicationContext();
        final AssetManager assetManager = appContext.getAssets();

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                try {
                    if (request == null) return null;
                    Uri uri = request.getUrl();
                    if (uri != null && VIRTUAL_HOST.equalsIgnoreCase(uri.getHost())) {
                        String path = uri.getPath();
                        if (path == null || path.isEmpty() || "/".equals(path)) {
                            path = "index.html";
                        } else if (path.startsWith("/")) {
                            path = path.substring(1);
                        }
                        Map<String, String> headers = new HashMap<>();
                        headers.put("Access-Control-Allow-Origin", "*");
                        headers.put("Cache-Control", "no-store");
                        try {
                            InputStream stream = assetManager.open(path);
                            String mime = getMimeType(path);
                            String encoding = isTextMime(mime) ? "UTF-8" : null;
                            return new WebResourceResponse(mime, encoding, 200, "OK", headers, stream);
                        } catch (Throwable notFound) {
                            InputStream empty = new ByteArrayInputStream(new byte[0]);
                            return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", headers, empty);
                        }
                    }
                } catch (Throwable ignored) {
                }
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (request == null) return false;
                Uri uri = request.getUrl();
                if (uri == null) return false;

                String scheme = uri.getScheme();
                String host = uri.getHost();

                if ("https".equalsIgnoreCase(scheme) && VIRTUAL_HOST.equalsIgnoreCase(host)) {
                    return false;
                }

                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                } catch (Throwable ignored) {
                }
                return true;
            }

            @Override
            public void doUpdateVisitedHistory(WebView view, String url, boolean isReload) {
                super.doUpdateVisitedHistory(view, url, isReload);
                // Appelé à chaque ouverture/fermeture de panneau (history.pushState / back)
                updateBackCallback();
            }

            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                // Empêche Android de fermer l'application si le processus WebView en arrière-plan est recyclé
                try {
                    if (webView != null) {
                        if (rootLayout != null) {
                            rootLayout.removeView(webView);
                        }
                        webView.destroy();
                        webView = null;
                    }
                    initWebView(null);
                } catch (Throwable ignored) {
                }
                return true;
            }
        });

        // Toujours repartir de la page d'accueil : devises et taux sont gardés dans localStorage.
        // (Restaurer l'historique de la WebView ramenait des panneaux « fantômes » au bouton Retour.)
        webView.loadUrl(START_URL);
        updateBackCallback();
    }

    private void showFallbackError(Throwable t) {
        try {
            TextView tv = new TextView(this);
            tv.setGravity(Gravity.CENTER);
            tv.setPadding(48, 48, 48, 48);
            tv.setTextColor(Color.DKGRAY);
            tv.setTextSize(15f);
            tv.setText("Android WebView Error:\n" + t.getClass().getSimpleName() + "\n" + t.getMessage());
            setContentView(tv);
        } catch (Throwable ignored) {
        }
    }

    private void setupEdgeToEdgeInsets() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && rootLayout != null) {
            try {
                rootLayout.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
                    @Override
                    public WindowInsets onApplyWindowInsets(View v, WindowInsets windowInsets) {
                        try {
                            int types = WindowInsets.Type.systemBars()
                                    | WindowInsets.Type.displayCutout()
                                    | WindowInsets.Type.ime();
                            Insets bars = windowInsets.getInsets(types);
                            v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                            // Ces marges sont déjà appliquées ci-dessus : on les transmet à ZÉRO à la WebView.
                            // Sinon les WebView récentes (version 136+) les ré-appliquent elles-mêmes
                            // (env(safe-area-inset-*) + clavier) => espaces vides en double en haut et en bas.
                            return new WindowInsets.Builder(windowInsets)
                                    .setDisplayCutout(null)
                                    .setInsets(types, Insets.NONE)
                                    .build();
                        } catch (Throwable ignored) {
                        }
                        return windowInsets;
                    }
                });
            } catch (Throwable ignored) {
            }
        }
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        applySystemBarsTheme();
        try {
            boolean isDark = isNightMode();
            if (rootLayout != null) {
                rootLayout.setBackgroundColor(Color.parseColor(isDark ? "#141b26" : "#ffffff"));
            }
            if (webView != null) {
                webView.setBackgroundColor(Color.parseColor(isDark ? "#0a1019" : "#eef3fa"));
            }
        } catch (Throwable ignored) {
        }
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        try {
            if (webView != null && webView.canGoBack()) {
                webView.goBack();
                return;
            }
        } catch (Throwable ignored) {
        }
        super.onBackPressed();
    }

    // Depuis Android 16 (targetSdk 36), onBackPressed() n'est plus appelé : sans ceci, le geste
    // Retour quittait l'app au lieu de fermer le panneau ouvert. On n'intercepte le Retour que
    // lorsqu'un panneau est ouvert (la page a alors un historique à dépiler) ; le reste du temps,
    // le système garde son comportement et son animation normale de retour à l'accueil.
    private void updateBackCallback() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return;
        try {
            boolean needed = webView != null && webView.canGoBack();
            if (needed == backCallbackRegistered) return;
            if (backCallback == null) {
                backCallback = new OnBackInvokedCallback() {
                    @Override
                    public void onBackInvoked() {
                        handleBack();
                    }
                };
            }
            OnBackInvokedDispatcher dispatcher = getOnBackInvokedDispatcher();
            if (needed) {
                dispatcher.registerOnBackInvokedCallback(
                        OnBackInvokedDispatcher.PRIORITY_DEFAULT, (OnBackInvokedCallback) backCallback);
            } else {
                dispatcher.unregisterOnBackInvokedCallback((OnBackInvokedCallback) backCallback);
            }
            backCallbackRegistered = needed;
        } catch (Throwable ignored) {
        }
    }

    private void handleBack() {
        try {
            if (webView != null && webView.canGoBack()) {
                webView.goBack();
                return;
            }
        } catch (Throwable ignored) {
        }
        // Plus rien à fermer : comportement standard (l'app passe en arrière-plan)
        updateBackCallback();
        moveTaskToBack(true);
    }

    @Override
    protected void onDestroy() {
        try {
            if (webView != null) {
                if (rootLayout != null) {
                    rootLayout.removeView(webView);
                }
                webView.destroy();
                webView = null;
            }
        } catch (Throwable ignored) {
        }
        super.onDestroy();
    }

    private boolean isNightMode() {
        // Avant Android 10, la WebView ne connaît pas le mode sombre : la page reste claire,
        // les barres doivent donc rester claires aussi.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return false;
        try {
            int nightModeFlags = getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
            return nightModeFlags == Configuration.UI_MODE_NIGHT_YES;
        } catch (Throwable ignored) {
            return false;
        }
    }

    @SuppressWarnings("deprecation")
    private void applySystemBarsTheme() {
        try {
            Window window = getWindow();
            if (window == null) return;
            boolean isDark = isNightMode();
            int statusColor = Color.parseColor(isDark ? "#141b26" : "#ffffff");
            int navColor = Color.parseColor(isDark ? "#141b26" : "#ffffff");
            window.setStatusBarColor(statusColor);
            window.setNavigationBarColor(navColor);

            View decor = window.getDecorView();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                WindowInsetsController controller = decor != null ? decor.getWindowInsetsController() : window.getInsetsController();
                if (controller != null) {
                    int mask = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                            | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                    controller.setSystemBarsAppearance(isDark ? 0 : mask, mask);
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && decor != null) {
                int flags = decor.getSystemUiVisibility();
                if (!isDark) {
                    flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                    }
                } else {
                    flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                    }
                }
                decor.setSystemUiVisibility(flags);
            }
        } catch (Throwable ignored) {
        }
    }

    static boolean isTextMime(String mime) {
        return mime.startsWith("text/") || "application/javascript".equals(mime) || "application/json".equals(mime) || "image/svg+xml".equals(mime);
    }

    static String getMimeType(String path) {
        if (path.endsWith(".html")) return "text/html";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".js")) return "application/javascript";
        if (path.endsWith(".json")) return "application/json";
        if (path.endsWith(".svg")) return "image/svg+xml";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".ico")) return "image/x-icon";
        return "application/octet-stream";
    }
}
