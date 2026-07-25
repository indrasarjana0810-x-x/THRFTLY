/* ==========================================
   Notification Helper Utility
   Memicu Pop-Up Banner Notifikasi Melayang di Layar HP (Support Expo Go iOS & Android)
========================================== */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Set handler agar alert dan sound aktif saat notifikasi dipicu
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * registerNotificationChannelAsync
 * Mendaftarkan channel notifikasi Android dengan importance MAX
 */
export async function registerNotificationChannelAsync() {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
      });
    } catch (e) {}
  }
}

/**
 * triggerLocalNotification
 * Memicu banner notifikasi melayang di layar atas HP secara langsung.
 * Berjalan 100% di Expo Go tanpa perlu build APK/IPA!
 */
export const triggerLocalNotification = async (title, body, data = {}) => {
  try {
    // 1. Pastikan Channel Android terdaftar dengan importance MAX
    await registerNotificationChannelAsync();

    // 2. Picu Notifikasi Lokal tanpa pernah memicu modal permission bawaan OS
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: null, // Langsung melayang di status bar detik ini juga
    });
  } catch (error) {
    void 0;
  }
};
