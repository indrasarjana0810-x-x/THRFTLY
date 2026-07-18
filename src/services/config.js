/* ==========================================
   API Configuration
========================================== */
import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

/**
 * getBaseUrl
 * Mengambil IP address host secara dinamis dari Metro Bundler untuk mempermudah testing di fisik/emulator.
 * Mengembalikan fallback statis jika tidak terdeteksi.
 */
const getBaseUrl = () => {
  // 1. Jika dijalankan di Web (Browser Laptop)
  if (Platform.OS === 'web') {
    console.log("🔥 [Config] Running on Web. Using localhost API URL");
    return "http://localhost:8080/api";
  }

  try {
    // 2. Coba metode Expo Constants (Paling ampuh di Expo Go)
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

    // 3. Coba metode Native React Native (Jika project di-build murni)
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
  
  console.log("⚠️ [Config] Using fallback API URL (10.1.25.31)");
  return "http://10.1.25.31:8080/api"; // Updated current laptop IP on polman network
};

const Config = {
  BASE_URL: getBaseUrl(),
};

export default Config;
