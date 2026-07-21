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
const getBaseUrl = () => {
  try {
    // 1. Coba metode Expo Constants (Paling ampuh di Expo Go)
    const debuggerHost = 
      Constants.expoConfig?.hostUri || 
      Constants.manifest?.debuggerHost || 
      Constants.manifest2?.extra?.expoGo?.debuggerHost;
    
    if (debuggerHost) {
      const ipAddress = debuggerHost.split(':')[0];
      const url = `http://${ipAddress}:8080/api`;
      console.log("🔥 [Config] (Expo) Dynamic API URL:", url);
      return url;
    }

    // 2. Coba metode Native React Native (Jika project di-build murni)
    const scriptURL = NativeModules.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/http:\/\/([^:]+):/);
      if (match && match[1]) {
        const ipAddress = match[1];
        const url = `http://${ipAddress}:8080/api`;
        console.log("🔥 [Config] (Native) Dynamic API URL:", url);
        return url;
      }
    }
  } catch (error) {
    console.log("Gagal dapet IP otomatis:", error);
  }
  
  console.log("⚠️ [Config] Using fallback API URL");
  return "http://10.1.2.50:8080/api";
};

const Config = {
  BASE_URL: getBaseUrl(),
};

export default Config;
