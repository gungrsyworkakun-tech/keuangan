import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.duitku.keuangan',
  appName: 'Duitku',
  webDir: 'dist',
  android: { allowMixedContent: false },
  // Permintaan jaringan lewat mesin HP (bukan WebView) supaya tidak terhalang aturan CORS saat bicara ke Apps Script
  plugins: { CapacitorHttp: { enabled: true } },
}
export default config
