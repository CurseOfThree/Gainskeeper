package com.curseofthree.gainskeeper;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WearBridgePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
