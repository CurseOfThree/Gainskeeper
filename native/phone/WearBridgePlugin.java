package com.curseofthree.gainskeeper;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.wearable.MessageClient;
import com.google.android.gms.wearable.MessageEvent;
import com.google.android.gms.wearable.PutDataMapRequest;
import com.google.android.gms.wearable.PutDataRequest;
import com.google.android.gms.wearable.Wearable;
import java.nio.charset.StandardCharsets;

/**
 * Links the phone app to the Gainskeeper watch app.
 * Phone to watch: the current workout state as JSON in a synced data item (/gk/state).
 * Watch to phone: small JSON messages (/gk/action) such as done set, +30s, skip rest, heart rate.
 */
@CapacitorPlugin(name = "WearBridge")
public class WearBridgePlugin extends Plugin implements MessageClient.OnMessageReceivedListener {

    @Override
    public void load() {
        try { Wearable.getMessageClient(getContext()).addListener(this); } catch (Exception ignored) {}
    }

    @Override
    protected void handleOnDestroy() {
        try { Wearable.getMessageClient(getContext()).removeListener(this); } catch (Exception ignored) {}
    }

    @PluginMethod
    public void sendState(PluginCall call) {
        String json = call.getString("json", "{}");
        try {
            PutDataMapRequest r = PutDataMapRequest.create("/gk/state");
            r.getDataMap().putString("json", json);
            r.getDataMap().putLong("t", System.currentTimeMillis());
            PutDataRequest req = r.asPutDataRequest().setUrgent();
            Wearable.getDataClient(getContext()).putDataItem(req)
                .addOnSuccessListener(x -> call.resolve())
                .addOnFailureListener(e -> call.reject(String.valueOf(e.getMessage())));
        } catch (Exception e) {
            call.reject(String.valueOf(e.getMessage()));
        }
    }

    @PluginMethod
    public void status(PluginCall call) {
        try {
            Wearable.getNodeClient(getContext()).getConnectedNodes()
                .addOnSuccessListener(nodes -> { JSObject o = new JSObject(); o.put("nodes", nodes.size()); call.resolve(o); })
                .addOnFailureListener(e -> { JSObject o = new JSObject(); o.put("nodes", 0); o.put("error", String.valueOf(e.getMessage())); call.resolve(o); });
        } catch (Exception e) {
            JSObject o = new JSObject(); o.put("nodes", 0); o.put("error", String.valueOf(e.getMessage())); call.resolve(o);
        }
    }

    @Override
    public void onMessageReceived(MessageEvent ev) {
        if (!"/gk/action".equals(ev.getPath())) return;
        try {
            JSObject o = new JSObject(new String(ev.getData(), StandardCharsets.UTF_8));
            notifyListeners("action", o, true);
        } catch (Exception ignored) {}
    }
}
