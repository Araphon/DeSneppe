package be.desneppe.kassa;

import android.util.Base64;
import android.view.WindowManager;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;

/**
 * Stuurt ruwe printerdata (ESC/POS of ZPL) via TCP naar een printer in het winkelnetwerk (standaard poort 9100)
 * en kan het scherm wakker houden. JavaScript-naam: "SneppePrinter".
 */
@CapacitorPlugin(name = "SneppePrinter")
public class SneppePrinterPlugin extends Plugin {

    @PluginMethod
    public void send(final PluginCall call) {
        final String host = call.getString("host");
        final String b64 = call.getString("data");
        final int port = call.getInt("port", 9100);
        final int timeout = call.getInt("timeoutMs", 8000);
        if (host == null || host.isEmpty() || b64 == null) {
            call.reject("Ongeldige printopdracht");
            return;
        }
        final byte[] data;
        try {
            data = Base64.decode(b64, Base64.DEFAULT);
        } catch (IllegalArgumentException e) {
            call.reject("Ongeldige printgegevens");
            return;
        }
        new Thread(() -> {
            try (Socket s = new Socket()) {
                s.connect(new InetSocketAddress(host, port), timeout);
                s.setSoTimeout(timeout);
                OutputStream o = s.getOutputStream();
                o.write(data);
                o.flush();
                Thread.sleep(250); // printer de tijd geven om alles in te lezen vóór het sluiten
                call.resolve();
            } catch (Exception e) {
                call.reject("Printer " + host + " niet bereikbaar: " + e.getMessage());
            }
        }).start();
    }

    @PluginMethod
    public void keepAwake(final PluginCall call) {
        final boolean aan = call.getBoolean("aan", true);
        getActivity().runOnUiThread(() -> {
            if (aan) getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            else getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            call.resolve();
        });
    }
}
