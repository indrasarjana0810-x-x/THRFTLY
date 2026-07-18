// src/utils/persistence.js
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  PROFILE: "thriftly_profile_data",
  SETTINGS: "thriftly_settings_data",
  LANGUAGE: "thriftly_language_data",
};

export const saveProfileData = async (profile) => {
  try {
    await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
  } catch (error) {
    console.error("Error saving profile data:", error);
  }
};

export const getProfileData = async () => {
  try {
    const data = await AsyncStorage.getItem(KEYS.PROFILE);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Error loading profile data:", error);
    return null;
  }
};

export const saveSettingsData = async (settings) => {
  try {
    await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error("Error saving settings data:", error);
  }
};

export const getSettingsData = async () => {
  try {
    const data = await AsyncStorage.getItem(KEYS.SETTINGS);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Error loading settings data:", error);
    return null;
  }
};

export const saveLanguageData = async (lang) => {
  try {
    await AsyncStorage.setItem(KEYS.LANGUAGE, lang);
  } catch (error) {
    console.error("Error saving language data:", error);
  }
};

export const getLanguageData = async () => {
  try {
    return await AsyncStorage.getItem(KEYS.LANGUAGE);
  } catch (error) {
    console.error("Error loading language data:", error);
    return null;
  }
};

export const saveUserSession = async (session) => {
  try {
    await AsyncStorage.setItem("thriftly_user_session", JSON.stringify(session));
  } catch (error) {
    console.error("Error saving user session:", error);
  }
};

export const getUserSession = async () => {
  try {
    const data = await AsyncStorage.getItem("thriftly_user_session");
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Error loading user session:", error);
    return null;
  }
};

export const removeUserSession = async () => {
  try {
    await AsyncStorage.removeItem("thriftly_user_session");
  } catch (error) {
    console.error("Error removing user session:", error);
  }
};
