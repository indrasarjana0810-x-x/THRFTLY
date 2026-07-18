import React, { useState } from 'react';
import { ActivityIndicator, View, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Colors from './src/constants/Colors';
import {
  useFonts,
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
  Barlow_800ExtraBold,
  Barlow_900Black,
} from '@expo-google-fonts/barlow';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';
import SplashScreen from './src/screens/SplashScreen';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { ToastProvider } from './src/components/Toast';
import { getLanguageData, saveLanguageData, getUserSession, saveUserSession, removeUserSession } from './src/utils/persistence';
import { useEffect } from 'react';
import { subscribeToTranslations, preFetchTranslations } from './src/utils/translator';
import { setAuthToken } from './src/services/api';

// auth screen states: 'login' | 'register' | 'forgotPassword'
function MainApp() {
  const [showSplash, setShowSplash] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authScreen, setAuthScreen] = useState('login');
  const { userThemeMode, setUserThemeMode, isDark, theme } = useTheme();
  const [language, setLanguageState] = useState("id");
  const [, forceUpdate] = useState(0);

  const setLanguage = async (lang) => {
    setLanguageState(lang);
    await saveLanguageData(lang);
  };

  // Force re-render when dynamic translation updates
  useEffect(() => {
    return subscribeToTranslations(() => {
      forceUpdate((prev) => prev + 1);
    });
  }, []);

  // Pre-fetch auth screens translation keys when language changes
  useEffect(() => {
    if (language !== "id") {
      const authTexts = [
        "Selamat Datang!",
        "Masuk ke akun Thriftly Anda",
        "NIM atau Email Student",
        "NIM / Email Student",
        "NIM atau Email AstraTech",
        "NIM / Email AstraTech",
        "Kata Sandi",
        "Masukkan kata sandi",
        "Lupa Kata Sandi?",
        "Masuk",
        "Belum punya akun?",
        "Daftar Sekarang",
        "atau",
        "Login Berhasil!",
        "Gagal masuk. NIM/Email atau sandi salah.",
        "NIM atau Email wajib diisi",
        "Kata sandi wajib diisi",
        "Daftar Akun",
        "Buat akun Thriftly baru",
        "NIM (Nomor Induk Mahasiswa)",
        "Nama Lengkap",
        "Program Studi",
        "Pilih Program Studi",
        "Nomor Telepon",
        "Kata Sandi (Min. 8 karakter)",
        "Kembali ke Login",
        "Registrasi Berhasil",
        "Lupa Kata Sandi",
        "Masukkan NIM atau Email Student Anda untuk menerima kode verifikasi OTP",
        "Kirim Kode OTP",
        "Verifikasi OTP",
        "Masukkan 6 digit kode OTP yang dikirimkan ke Email Student Anda",
        "Atur Ulang Sandi",
        "Buat kata sandi baru Anda",
        "Kata Sandi Baru",
        "Ulangi Kata Sandi",
        "Simpan Sandi Baru",
      ];
      preFetchTranslations(authTexts, language);
    }
  }, [language]);

  // Load language settings and user session on mount
  useEffect(() => {
    async function initApp() {
      const persistedLang = await getLanguageData();
      if (persistedLang) {
        setLanguageState(persistedLang);
      }
      
      const session = await getUserSession();
      if (session && session.token) {
        setAuthToken(session.token);
        setCurrentUser(session);
        setIsLoggedIn(true);
      }
    }
    initApp();
  }, []);

  const [fontsLoaded] = useFonts({
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    Barlow_700Bold,
    Barlow_800ExtraBold,
    Barlow_900Black,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA' }}>
        <ActivityIndicator size="large" color="#2979FF" />
      </View>
    );
  }

  if (showSplash) {
    return (
      <SafeAreaProvider>
        <StatusBar style={isDark ? "light" : "dark"} />
        <SplashScreen onFinish={() => setShowSplash(false)} darkMode={isDark} />
      </SafeAreaProvider>
    );
  }

  const renderAuthScreen = () => {
    if (authScreen === 'register') {
      return (
        <RegisterScreen
          onNavigateToLogin={() => setAuthScreen('login')}
          onRegisterSuccess={() => setAuthScreen('login')}
          language={language}
        />
      );
    }
    if (authScreen === 'forgotPassword') {
      return (
        <ForgotPasswordScreen
          onNavigateToLogin={() => setAuthScreen('login')}
          language={language}
        />
      );
    }
    return (
      <LoginScreen
        onLogin={async (user) => {
          await saveUserSession(user);
          setAuthToken(user.token);
          setCurrentUser(user);
          setIsLoggedIn(true);
        }}
        onNavigateToRegister={() => setAuthScreen('register')}
        onNavigateToForgotPassword={() => setAuthScreen('forgotPassword')}
        theme={theme}
        isDark={isDark}
        language={language}
        setLanguage={setLanguage}
      />
    );
  };

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? "light" : "dark"} />
      {isLoggedIn ? (
        <HomeScreen
          onLogout={async () => {
            await removeUserSession();
            setAuthToken(null);
            setIsLoggedIn(false);
            setCurrentUser(null);
            setAuthScreen('login');
          }}
          currentUser={currentUser}
          userThemeMode={userThemeMode}
          setUserThemeMode={setUserThemeMode}
          isDark={isDark}
          theme={theme}
          language={language}
          setLanguage={setLanguage}
        />
      ) : (
        renderAuthScreen()
      )}
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <MainApp />
      </ToastProvider>
    </ThemeProvider>
  );
}
