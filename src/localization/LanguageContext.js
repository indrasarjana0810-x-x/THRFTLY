/* ==========================================
   Language Context (Localization)
========================================== */
/* ---------- Impor ---------- */
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import id from './id';
import en from './en';

const translations = { id, en };

const LanguageContext = createContext();

/**
 * LanguageProvider
 * Membungkus aplikasi untuk memberikan akses global ke kamus bahasa.
 * Dibuat dengan menerapkan materi W4 (Hooks: useContext).
 */
export const LanguageProvider = ({ children }) => {
  /* ---------- State Komponen ---------- */
  const [locale, setLocale] = useState('id'); // Default bahasa Indonesia

  // Load bahasa yang disimpan di penyimpanan lokal saat aplikasi pertama kali dibuka
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLang = await AsyncStorage.getItem('appLanguage');
        if (savedLang && translations[savedLang]) {
          setLocale(savedLang);
        }
      } catch (e) {
        void 0;
      }
    };
    loadLanguage();
  }, []);

  /* ---------- Fungsi Penanganan Aksi ---------- */
  const t = (key) => {
    // Return null instead of key so that inline fallbacks (e.g., t('key') || 'Default') work properly
    return translations[locale]?.[key] || null;
  };

  // Fungsi untuk mengganti bahasa secara instan (Real-time update) dan menyimpannya
  const switchLanguage = async (lang) => {
    if (translations[lang]) {
      setLocale(lang);
      try {
        await AsyncStorage.setItem('appLanguage', lang);
      } catch (e) {
        void 0;
      }
    }
  };

  /* ---------- Tampilan ---------- */
  return (
    <LanguageContext.Provider value={{ locale, t, switchLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

/**
 * useLanguage
 * Hook kustom agar komponen lain mudah mengakses kamus bahasa.
 */
export const useLanguage = () => useContext(LanguageContext);
