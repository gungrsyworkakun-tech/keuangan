package app.gudang.aplikasi;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PemasangPlugin.class); // harus sebelum super.onCreate
        super.onCreate(savedInstanceState);
    }
}
