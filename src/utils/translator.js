// src/utils/translator.js
import AsyncStorage from "@react-native-async-storage/async-storage";

// Persistent Translation Cache System
const CACHE_KEY = "thriftly_translation_cache";
let translationCache = {};
const listeners = new Set();

// Load persisted cache on module initialization
AsyncStorage.getItem(CACHE_KEY)
  .then((data) => {
    if (data) {
      const parsed = JSON.parse(data);
      const cleaned = {};
      Object.keys(parsed).forEach(key => {
        const lastUnderscore = key.lastIndexOf('_');
        if (lastUnderscore !== -1) {
          const originalText = key.substring(0, lastUnderscore);
          // Only keep real translations, discard any failed placeholders (where value equals original text)
          if (parsed[key] && parsed[key] !== originalText) {
            cleaned[key] = parsed[key];
          }
        }
      });
      translationCache = cleaned;
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cleaned)).catch(() => {});
      // Trigger update for already mounted components
      listeners.forEach((l) => l());
    }
  })
  .catch((err) => console.warn("Failed to load translation cache:", err));

// Save cache helper (removes placeholders before saving)
const saveCache = () => {
  const toSave = {};
  Object.keys(translationCache).forEach(key => {
    const lastUnderscore = key.lastIndexOf('_');
    if (lastUnderscore !== -1) {
      const originalText = key.substring(0, lastUnderscore);
      if (translationCache[key] && translationCache[key] !== originalText) {
        toSave[key] = translationCache[key];
      }
    }
  });
  AsyncStorage.setItem(CACHE_KEY, JSON.stringify(toSave)).catch((err) =>
    console.warn("Failed to save translation cache:", err)
  );
};

const FAST_PATH_DICT = {
  en: {
    "Terima & WA": "Accept & WA",
    "Tolak": "Decline",
    "✓ Disetujui (Hubungi WA)": "✓ Approved (Contact WA)",
    "✕ Ditolak": "✕ Declined",
    "Notifikasi Transaksi": "Transaction Notifications",
    "Belum Ada Notifikasi": "No Notifications Yet",
    "Setiap ada tawaran masuk dari pembeli akan muncul di sini.": "Any incoming offers from buyers will appear here.",
    "Beri Penilaian": "Give Rating",
    "Beri Rating": "Rate",
    "Kirim Penilaian": "Submit Rating",
    "Belum dinilai": "Not yet rated",
    "Belum dinilai pembeli": "Not yet rated by buyer",
    "Masuk": "Log In",
    "Daftar": "Register",
    "Keluar Akun": "Log Out",
    "Batal": "Cancel",
  }
};

export const subscribeToTranslations = (listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const translateText = async (text, targetLang) => {
  if (!text) return "";
  try {
    // LibreTranslate public API endpoint (Cara 2)
    const response = await fetch("https://libretranslate.de/translate", {
      method: "POST",
      body: JSON.stringify({
        q: text,
        source: "auto",
        target: targetLang,
        format: "text"
      }),
      headers: { "Content-Type": "application/json" }
    });
    const data = await response.json();
    if (data && data.translatedText) {
      return data.translatedText;
    }
    throw new Error("LibreTranslate failed");
  } catch (error) {
    // Robust Fallback: Unofficial Google Translate API (gtx) which is fast and reliable
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
      const response = await fetch(url);
      const result = await response.json();
      return result[0].map(item => item[0]).join('');
    } catch (err) {
      console.warn("Fallback translator error:", err);
      return null; // Return null so we know it failed
    }
  }
};

export const t = (text, language) => {
  if (!text) return "";
  if (language === "id") return text;

  // Fast-path lookup for critical UI terms
  if (FAST_PATH_DICT[language] && FAST_PATH_DICT[language][text]) {
    return FAST_PATH_DICT[language][text];
  }

  const cacheKey = `${text}_${language}`;
  if (translationCache[cacheKey]) {
    return translationCache[cacheKey];
  }

  // Temporary placeholder to prevent infinite loops during rendering
  translationCache[cacheKey] = text;

  translateText(text, language)
    .then((translated) => {
      if (translated && translated !== text) {
        translationCache[cacheKey] = translated;
        saveCache(); // Persist the translation key-value permanently
        // Notify all subscribed components to force re-render
        listeners.forEach((l) => l());
      } else {
        // If translation failed or returned same text, remove placeholder so we can retry later
        delete translationCache[cacheKey];
      }
    })
    .catch((err) => {
      console.warn("Translation failed for:", text, err);
      delete translationCache[cacheKey];
    });

  return text;
};

export const preFetchTranslations = async (textsArray, targetLang) => {
  if (!textsArray || textsArray.length === 0 || targetLang === "id") return;
  
  const toTranslate = [];
  for (const text of textsArray) {
    if (!text || typeof text !== "string") continue;
    const trimmedText = text.trim();
    // Skip if it is in the fast-path dictionary
    if (FAST_PATH_DICT[targetLang] && FAST_PATH_DICT[targetLang][trimmedText]) {
      continue;
    }
    const cacheKey = `${trimmedText}_${targetLang}`;
    if (!translationCache[cacheKey]) {
      toTranslate.push(trimmedText);
    }
  }

  if (toTranslate.length === 0) return;

  // Process in small batches of 5 to avoid API rate limits
  const chunkSize = 5;
  for (let i = 0; i < toTranslate.length; i += chunkSize) {
    const chunk = toTranslate.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (text) => {
        const cacheKey = `${text}_${targetLang}`;
        // Temporarily block to avoid multiple calls for the same text
        translationCache[cacheKey] = text;
        try {
          const translated = await translateText(text, targetLang);
          if (translated && translated !== text) {
            translationCache[cacheKey] = translated;
          } else {
            delete translationCache[cacheKey];
          }
        } catch (e) {
          console.warn("Pre-fetch failed for:", text, e);
          delete translationCache[cacheKey];
        }
      })
    );
    saveCache();
    listeners.forEach((l) => l());
  }
};
