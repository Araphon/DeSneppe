package be.desneppe.kassa;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Eigen plugin registreren vóór de bridge start
        registerPlugin(SneppePrinterPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
