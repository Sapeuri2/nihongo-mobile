package io.github.sapeuri2.nihongo;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.TextStyle;
import java.util.Iterator;
import java.util.Locale;

/**
 * Widget Kanji. L'accueil de l'appli calcule un planning d'un mois et l'envoie ici (setWidgetKanji) :
 * { jours: { "AAAA-MM-JJ": { nouveaux: [3 kanji], rappel: kanji } }, fiches: { kanji: { k, sens, on, kun, lecon } } }.
 * Le widget affiche le jour en cours (qui change à 6 h) sans ouvrir l'appli, même hors ligne.
 */
public class KanjiWidget extends AppWidgetProvider {
    private static final String PREFS = "widget";
    private static final String CLE = "kanji";
    private static final int HEURE = 6;
    private static final String KANJI_URL = "https://sapeuri2.github.io/nihongo-kanji/#/lecon/";

    private static final int[] CASES = { R.id.case0, R.id.case1, R.id.case2, R.id.case3 };
    private static final int[] K = { R.id.k0, R.id.k1, R.id.k2, R.id.k3 };
    private static final int[] LECT = { R.id.lect0, R.id.lect1, R.id.lect2, R.id.lect3 };
    private static final int[] SENS = { R.id.sens0, R.id.sens1, R.id.sens2, R.id.sens3 };

    /** Planning reçu de l'accueil : enregistré, puis widgets redessinés. */
    public static void enregistrer(Context ctx, String json) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(CLE, json).apply();
        rafraichir(ctx);
    }

    public static void rafraichir(Context ctx) {
        AppWidgetManager m = AppWidgetManager.getInstance(ctx);
        int[] ids = m.getAppWidgetIds(new ComponentName(ctx, KanjiWidget.class));
        if (ids.length > 0) new KanjiWidget().onUpdate(ctx, m, ids);
    }

    /** Jour du widget : avant 6 h, c'est encore la veille. */
    static String jourDuWidget() {
        return LocalDateTime.now().minusHours(HEURE).toLocalDate().toString();
    }

    @Override
    public void onUpdate(Context ctx, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, vue(ctx));
        programmer(ctx);
    }

    @Override
    public void onEnabled(Context ctx) {
        programmer(ctx);
    }

    /** Réveil vers 6 h pour changer de jour (pas besoin d'alarme exacte : quelques minutes près suffisent). */
    private static void programmer(Context ctx) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        Intent i = new Intent(ctx, KanjiWidget.class).setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        int[] ids = AppWidgetManager.getInstance(ctx).getAppWidgetIds(new ComponentName(ctx, KanjiWidget.class));
        i.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
        PendingIntent pi = PendingIntent.getBroadcast(ctx, 6, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        LocalDateTime prochain = LocalDate.now().atTime(HEURE, 1);
        if (!prochain.isAfter(LocalDateTime.now())) prochain = prochain.plusDays(1);
        long t = prochain.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
        am.setWindow(AlarmManager.RTC, t, 15 * 60 * 1000L, pi);
    }

    private static RemoteViews vue(Context ctx) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_kanji);
        v.setOnClickPendingIntent(R.id.racine, ouvrir(ctx, MainActivity.ACCUEIL, 100));
        String jour = jourDuWidget();
        LocalDate d = LocalDate.parse(jour);
        v.setTextViewText(R.id.date, d.getDayOfMonth() + " " + d.getMonth().getDisplayName(TextStyle.SHORT, Locale.FRENCH));
        JSONObject plan = lire(ctx);
        JSONObject j = plan == null ? null : jourDans(plan.optJSONObject("jours"), jour);
        JSONObject fiches = plan == null ? null : plan.optJSONObject("fiches");
        if (j == null || fiches == null) {
            v.setViewVisibility(R.id.cases, View.GONE);
            v.setViewVisibility(R.id.vide, View.VISIBLE);
            return v;
        }
        v.setViewVisibility(R.id.cases, View.VISIBLE);
        v.setViewVisibility(R.id.vide, View.GONE);
        JSONArray nouveaux = j.optJSONArray("nouveaux");
        String rappel = j.optString("rappel", "");
        for (int i = 0; i < 4; i++) {
            String k = i < 3 ? (nouveaux != null && i < nouveaux.length() ? nouveaux.optString(i) : "") : rappel;
            JSONObject f = k.isEmpty() ? null : fiches.optJSONObject(k);
            if (f == null) { v.setViewVisibility(CASES[i], View.INVISIBLE); continue; }
            v.setViewVisibility(CASES[i], View.VISIBLE);
            v.setTextViewText(K[i], k);
            String kun = f.optString("kun", ""), on = f.optString("on", "");
            v.setTextViewText(LECT[i], !kun.isEmpty() && !on.isEmpty() ? kun + " · " + on : kun + on);
            v.setTextViewText(SENS[i], f.optString("sens", ""));
            v.setOnClickPendingIntent(CASES[i], ouvrir(ctx, KANJI_URL + f.optString("lecon", ""), 101 + i));
        }
        v.setViewVisibility(R.id.etiquette_rappel, rappel.isEmpty() ? View.INVISIBLE : View.VISIBLE);
        return v;
    }

    /** Le jour demandé, sinon le dernier jour planifié avant lui (l'appli n'a pas été ouverte depuis longtemps). */
    static JSONObject jourDans(JSONObject jours, String jour) {
        if (jours == null) return null;
        if (jours.has(jour)) return jours.optJSONObject(jour);
        String meilleur = null;
        for (Iterator<String> it = jours.keys(); it.hasNext(); ) {
            String k = it.next();
            if (k.compareTo(jour) <= 0 && (meilleur == null || k.compareTo(meilleur) > 0)) meilleur = k;
        }
        return meilleur == null ? null : jours.optJSONObject(meilleur);
    }

    private static JSONObject lire(Context ctx) {
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        try { return new JSONObject(p.getString(CLE, "")); } catch (Exception e) { return null; }
    }

    private static PendingIntent ouvrir(Context ctx, String url, int code) {
        Intent i = new Intent(ctx, MainActivity.class)
            .putExtra(MainActivity.EXTRA_URL, url)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(ctx, code, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
