package io.github.sapeuri2.nihongo;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * L'appli : une page web plein écran sur sapeuri2.github.io (l'accueil nihongo-mobile, puis les 4 applis).
 * Même adresse pour tout → la progression et Ma liste sont partagées, et synchronisées par les Gists comme sur le web.
 * Les pages hors de sapeuri2.github.io s'ouvrent dans le navigateur.
 */
public class MainActivity extends Activity {
    public static final String ACCUEIL = "https://sapeuri2.github.io/nihongo-mobile/";
    public static final String EXTRA_URL = "url";
    private static final String HOTE = "sapeuri2.github.io";

    private WebView web;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle etat) {
        super.onCreate(etat);
        web = new WebView(this);
        web.setBackgroundColor(Color.TRANSPARENT);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setUserAgentString(s.getUserAgentString() + " NihongoApp/1");
        web.addJavascriptInterface(new Pont(), "NihongoAndroid");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (HOTE.equals(u.getHost())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignore) { }
                return true;
            }
        });
        setContentView(web);
        if (etat != null) web.restoreState(etat);
        else web.loadUrl(urlDe(getIntent()));
    }

    // Toucher un kanji du widget ouvre sa leçon.
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        String url = intent.getStringExtra(EXTRA_URL);
        if (url != null && web != null) web.loadUrl(url);
    }

    private static String urlDe(Intent intent) {
        String url = intent == null ? null : intent.getStringExtra(EXTRA_URL);
        return url != null && url.startsWith("https://" + HOTE + "/") ? url : ACCUEIL;
    }

    @Override
    protected void onSaveInstanceState(Bundle etat) {
        super.onSaveInstanceState(etat);
        web.saveState(etat);
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        web.setVisibility(View.VISIBLE);
    }

    @Override
    protected void onPause() {
        web.onPause();
        super.onPause();
    }

    /** Ce que les pages peuvent demander à l'appli (window.NihongoAndroid). */
    class Pont {
        @JavascriptInterface
        public void setWidgetKanji(String json) {
            KanjiWidget.enregistrer(MainActivity.this, json);
        }

        @JavascriptInterface
        public int version() {
            return 1;
        }
    }
}
