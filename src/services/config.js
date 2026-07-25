/* ==========================================
   Konfigurasi API
========================================== */
import Constants from 'expo-constants';
import { NativeModules } from 'react-native';

/**
 * getBaseUrl
 * Mengambil IP address host secara dinamis dari Metro Bundler untuk mempermudah testing di fisik/emulator.
 * Mengembalikan fallback statis jika tidak terdeteksi.
 */
// ⚠️ Masukkan URL Cloudflare / Ngrok Tunnel di sini untuk testing beda jaringan (4G/5G/Wi-Fi lain)
// Kosongkan string '' jika ingin menggunakan IP lokal otomatis kembali.
const TUNNEL_URL = '';

const getBaseUrl = () => {
  if (TUNNEL_URL && TUNNEL_URL.trim() !== '') {
    void 0;
    return TUNNEL_URL;
  }

  try {
    // 1. Coba metode Expo Constants (Paling ampuh di Expo Go)
    const debuggerHost =
      Constants.expoConfig?.hostUri ||
      Constants.manifest?.debuggerHost ||
      Constants.manifest2?.extra?.expoGo?.debuggerHost;

    if (debuggerHost) {
      const ipAddress = debuggerHost.split(':')[0];
      const url = `http://${ipAddress}:8080/api`;
      void 0;
      return url;
    }

    // 2. Coba metode Native React Native (Jika project di-build murni)
    const scriptURL = NativeModules.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/http:\/\/([^:]+):/);
      if (match && match[1]) {
        const ipAddress = match[1];
        const url = `http://${ipAddress}:8080/api`;
        void 0;
        return url;
      }
    }
  } catch (error) {
    void 0;
  }

  void 0;
  return "http://10.146.92.207:8080/api";
};

const Config = {
  BASE_URL: getBaseUrl(),
};

export default Config;
