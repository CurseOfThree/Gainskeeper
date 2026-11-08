package com.curseofthree.gainskeeper.wear;

import android.app.Activity;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import com.google.android.gms.wearable.DataEvent;
import com.google.android.gms.wearable.DataEventBuffer;
import com.google.android.gms.wearable.DataClient;
import com.google.android.gms.wearable.DataItem;
import com.google.android.gms.wearable.DataMapItem;
import com.google.android.gms.wearable.Node;
import com.google.android.gms.wearable.Wearable;

import org.json.JSONObject;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

/**
 * Gainskeeper on the wrist. Shows the phone's current set, lets you nudge weight and reps,
 * tick the set, and run the rest timer. All logging happens in the phone app; this just sends actions.
 */
public class MainActivity extends Activity implements DataClient.OnDataChangedListener, SensorEventListener {
    private static final int BG = Color.parseColor("#0F1215"), INK = Color.parseColor("#E8EBEE"), MUTED = Color.parseColor("#98A2AB"),
            BLUE = Color.parseColor("#7C9EFF"), BLUE_INK = Color.parseColor("#0B1430"), YELLOW = Color.parseColor("#F2B705"), RAISED = Color.parseColor("#1E242A");

    private final Handler ui = new Handler(Looper.getMainLooper());
    private JSONObject state = null;          // last state from the phone
    private String curKey = "";               // exercise/set the local edits belong to
    private double kg = Double.NaN; private int reps = -1; private boolean edited = false;
    private int hr = 0; private long lastHrSent = 0; private boolean hrAsked = false;
    private SensorManager sensors; private Sensor hrSensor; private boolean hrOn = false;
    private LinearLayout root;

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        ScrollView sv = new ScrollView(this);
        sv.setBackgroundColor(BG); sv.setFillViewport(true); sv.setVerticalScrollBarEnabled(false);
        root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL); root.setGravity(Gravity.CENTER_HORIZONTAL);
        int w = getResources().getDisplayMetrics().widthPixels;
        int padH = (int) (w * 0.12), padV = (int) (w * 0.10);
        root.setPadding(padH, padV, padH, padV);
        sv.addView(root, new ScrollView.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        setContentView(sv);
        sv.requestFocus(); // rotary bezel scrolls
        sensors = (SensorManager) getSystemService(SENSOR_SERVICE);
        hrSensor = sensors != null ? sensors.getDefaultSensor(Sensor.TYPE_HEART_RATE) : null;
        render();
    }

    @Override protected void onResume() {
        super.onResume();
        Wearable.getDataClient(this).addListener(this);
        Wearable.getDataClient(this).getDataItems(Uri.parse("wear://*/gk/state")).addOnSuccessListener(buf -> {
            long best = -1; JSONObject pick = null;
            for (DataItem it : buf) {
                try { com.google.android.gms.wearable.DataMap m = DataMapItem.fromDataItem(it).getDataMap();
                    long t = m.getLong("t"); if (t > best) { best = t; pick = new JSONObject(m.getString("json", "{}")); } } catch (Exception ignored) {}
            }
            buf.release();
            if (pick != null) applyState(pick);
        });
        send("{\"a\":\"hello\"}");
        ui.post(tick);
    }

    @Override protected void onPause() {
        super.onPause();
        Wearable.getDataClient(this).removeListener(this);
        ui.removeCallbacks(tick);
    }

    @Override protected void onDestroy() { super.onDestroy(); stopHr(); }

    @Override public void onDataChanged(DataEventBuffer events) {
        for (DataEvent ev : events) {
            if (ev.getType() != DataEvent.TYPE_CHANGED) continue;
            if (!"/gk/state".equals(ev.getDataItem().getUri().getPath())) continue;
            try { JSONObject o = new JSONObject(DataMapItem.fromDataItem(ev.getDataItem()).getDataMap().getString("json", "{}"));
                ui.post(() -> applyState(o)); } catch (Exception ignored) {}
        }
    }

    private void applyState(JSONObject o) {
        state = o;
        JSONObject cur = o.optJSONObject("cur");
        String key = cur == null ? "" : cur.optInt("i") + ":" + cur.optInt("j");
        if (!key.equals(curKey) || !edited) {
            curKey = key; edited = false;
            kg = cur == null ? Double.NaN : parseD(cur.optString("kg", ""));
            reps = cur == null ? -1 : parseI(cur.optString("reps", ""));
        }
        if (o.optBoolean("active")) { askHr(); startHr(); } else stopHr();
        render();
    }

    private final Runnable tick = new Runnable() { @Override public void run() {
        long end = state == null ? 0 : state.optLong("restEnd", 0);
        boolean resting = end > System.currentTimeMillis();
        if (resting) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        View t = root.findViewWithTag("countdown");
        if (t instanceof TextView && resting) ((TextView) t).setText(fmt(end - System.currentTimeMillis()));
        else if (t != null && !resting) render();
        ui.postDelayed(this, 250);
    }};

    // ---------- UI ----------
    private void render() {
        root.removeAllViews();
        if (state == null || !state.optBoolean("active")) {
            label("GAINSKEEPER", 13, MUTED, true);
            gap(10);
            label("Start a workout on your phone and it will show up here.", 15, INK, false);
            gap(10);
            label(state == null ? "Waiting for the phone" : "No workout running", 12, MUTED, false);
            return;
        }
        JSONObject cur = state.optJSONObject("cur");
        long end = state.optLong("restEnd", 0);
        String foot = state.optInt("done") + "/" + state.optInt("total") + " sets" + (hr > 0 ? "   ♥ " + hr : "");
        if (end > System.currentTimeMillis()) {
            label("REST", 13, MUTED, true);
            TextView c = label(fmt(end - System.currentTimeMillis()), 46, INK, true); c.setTag("countdown");
            if (cur != null) label("Next: " + cur.optString("name") + ", set " + cur.optInt("setNo"), 13, MUTED, false);
            gap(8);
            LinearLayout row = row();
            row.addView(pill("+30s", RAISED, INK, v -> send("{\"a\":\"plus30\"}")), weight());
            space(row, 8);
            row.addView(pill("Skip", RAISED, INK, v -> send("{\"a\":\"skip\"}")), weight());
            root.addView(row, fullW());
            gap(6); label(foot, 12, MUTED, false).setTag("foot");
            return;
        }
        if (cur == null) {
            label("ALL SETS DONE", 13, YELLOW, true); gap(6);
            label("Finish the workout on your phone.", 15, INK, false); gap(6); label(foot, 12, MUTED, false);
            return;
        }
        label("SET " + cur.optInt("setNo") + " OF " + cur.optInt("sets"), 12, MUTED, true);
        TextView n = label(cur.optString("name"), 17, INK, true); n.setMaxLines(2);
        gap(4);
        boolean timed = cur.optBoolean("timed");
        String unit = cur.optString("unit", "kg"); double step = cur.optDouble("step", 2.5);
        if (!timed) root.addView(stepper(Double.isNaN(kg) ? "–" : num(kg), unit,
                v -> { kg = Math.max(0, (Double.isNaN(kg) ? 0 : kg) - step); edited = true; render(); },
                v -> { kg = (Double.isNaN(kg) ? 0 : kg) + step; edited = true; render(); }), fullW());
        gap(4);
        root.addView(stepper(reps < 0 ? "–" : String.valueOf(reps), timed ? "sec" : "reps",
                v -> { reps = Math.max(0, (reps < 0 ? 0 : reps) - (timed ? 5 : 1)); edited = true; render(); },
                v -> { reps = (reps < 0 ? 0 : reps) + (timed ? 5 : 1); edited = true; render(); }), fullW());
        gap(8);
        Button done = pill("Done set", BLUE, BLUE_INK, v -> {
            try { JSONObject m = new JSONObject(); m.put("a", "done"); m.put("i", cur.optInt("i")); m.put("j", cur.optInt("j"));
                if (!Double.isNaN(kg)) m.put("kg", kg); if (reps >= 0) m.put("reps", reps); send(m.toString()); } catch (Exception ignored) {}
            edited = false; v.setEnabled(false); ((Button) v).setText("Logged");
        });
        done.setMinHeight(dp(52));
        root.addView(done, fullW());
        gap(6); label(foot, 12, MUTED, false).setTag("foot");
    }

    private LinearLayout stepper(String value, String unit, View.OnClickListener minus, View.OnClickListener plus) {
        LinearLayout r = row(); r.setGravity(Gravity.CENTER_VERTICAL);
        r.addView(round("−", minus));
        LinearLayout mid = new LinearLayout(this); mid.setOrientation(LinearLayout.VERTICAL); mid.setGravity(Gravity.CENTER);
        TextView v = text(value, 24, INK, true); TextView u = text(unit, 11, MUTED, false);
        mid.addView(v); mid.addView(u);
        r.addView(mid, weight());
        r.addView(round("+", plus));
        return r;
    }

    private Button round(String s, View.OnClickListener l) {
        Button b = new Button(this); b.setText(s); b.setTextColor(INK); b.setTextSize(TypedValue.COMPLEX_UNIT_SP, 22); b.setAllCaps(false);
        GradientDrawable g = new GradientDrawable(); g.setShape(GradientDrawable.OVAL); g.setColor(RAISED); b.setBackground(g);
        b.setPadding(0, 0, 0, 0); b.setOnClickListener(l);
        b.setLayoutParams(new LinearLayout.LayoutParams(dp(46), dp(46)));
        b.setContentDescription(s.equals("+") ? "Increase" : "Decrease");
        return b;
    }

    private Button pill(String s, int bg, int fg, View.OnClickListener l) {
        Button b = new Button(this); b.setText(s); b.setTextColor(fg); b.setAllCaps(false); b.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        b.setTypeface(Typeface.DEFAULT_BOLD);
        GradientDrawable g = new GradientDrawable(); g.setCornerRadius(dp(26)); g.setColor(bg); b.setBackground(g);
        b.setMinHeight(dp(44)); b.setOnClickListener(l); return b;
    }

    private TextView text(String s, int sp, int color, boolean bold) {
        TextView t = new TextView(this); t.setText(s); t.setTextColor(color); t.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        t.setGravity(Gravity.CENTER); if (bold) t.setTypeface(Typeface.DEFAULT_BOLD); return t;
    }
    private TextView label(String s, int sp, int color, boolean bold) { TextView t = text(s, sp, color, bold); root.addView(t, fullW()); return t; }
    private LinearLayout row() { LinearLayout r = new LinearLayout(this); r.setOrientation(LinearLayout.HORIZONTAL); r.setGravity(Gravity.CENTER); return r; }
    private void space(LinearLayout r, int d) { r.addView(new View(this), new LinearLayout.LayoutParams(dp(d), 1)); }
    private void gap(int d) { root.addView(new View(this), new LinearLayout.LayoutParams(1, dp(d))); }
    private LinearLayout.LayoutParams fullW() { return new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT); }
    private LinearLayout.LayoutParams weight() { return new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f); }
    private int dp(int d) { return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, d, getResources().getDisplayMetrics()); }
    private static String fmt(long ms) { long s = Math.max(0, (ms + 999) / 1000); return String.format(Locale.ROOT, "%d:%02d", s / 60, s % 60); }
    private static String num(double v) { return Math.abs(v - Math.rint(v)) < 0.001 ? String.valueOf((long) Math.rint(v)) : String.format(Locale.ROOT, "%.1f", v).replaceAll("\\.?0+$", ""); }
    private static double parseD(String s) { try { return s == null || s.isEmpty() ? Double.NaN : Double.parseDouble(s); } catch (Exception e) { return Double.NaN; } }
    private static int parseI(String s) { try { return s == null || s.isEmpty() ? -1 : Integer.parseInt(s.replaceAll("[^0-9]", "")); } catch (Exception e) { return -1; } }

    // ---------- messages to the phone ----------
    private void send(String json) {
        byte[] data = json.getBytes(StandardCharsets.UTF_8);
        Wearable.getNodeClient(this).getConnectedNodes().addOnSuccessListener(nodes -> {
            for (Node n : nodes) Wearable.getMessageClient(this).sendMessage(n.getId(), "/gk/action", data);
        });
    }

    // ---------- heart rate ----------
    private String hrPermission() { return Build.VERSION.SDK_INT >= 36 ? "android.permission.health.READ_HEART_RATE" : "android.permission.BODY_SENSORS"; }
    private void askHr() {
        if (hrAsked || hrSensor == null) return; hrAsked = true;
        if (checkSelfPermission(hrPermission()) != PackageManager.PERMISSION_GRANTED) requestPermissions(new String[]{hrPermission()}, 7);
    }
    @Override public void onRequestPermissionsResult(int code, String[] p, int[] r) { super.onRequestPermissionsResult(code, p, r); if (state != null && state.optBoolean("active")) startHr(); }
    private void startHr() {
        if (hrOn || hrSensor == null || checkSelfPermission(hrPermission()) != PackageManager.PERMISSION_GRANTED) return;
        hrOn = sensors.registerListener(this, hrSensor, SensorManager.SENSOR_DELAY_NORMAL);
    }
    private void stopHr() { if (hrOn && sensors != null) sensors.unregisterListener(this); hrOn = false; }
    @Override public void onSensorChanged(SensorEvent e) {
        if (e.values == null || e.values.length == 0) return; int v = Math.round(e.values[0]); if (v < 30 || v > 240) return;
        boolean changed = v != hr; hr = v;
        long now = System.currentTimeMillis();
        if (now - lastHrSent > 15000) { lastHrSent = now; send("{\"a\":\"hr\",\"bpm\":" + v + "}"); }
        if (changed && state != null) { View f = root.findViewWithTag("foot"); if (f instanceof TextView) ((TextView) f).setText(state.optInt("done") + "/" + state.optInt("total") + " sets   \u2665 " + hr); }
    }
    @Override public void onAccuracyChanged(Sensor s, int a) {}
}
