/* ==========================================
   Notification Helper Utility
   Memicu Pop-Up Banner Notifikasi Melayang di Layar HP (Support Expo Go iOS & Android)
========================================== */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';



import AsyncStorage from '@react-native-async-storage/async-storage';
import en from '../localization/en';
import id from '../localization/id';

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
 * Menterjemahkan judul & isi notifikasi secara dinamis sesuai bahasa aktif (ID/EN).
 */
export const triggerLocalNotification = async (rawTitle, rawBody, data = {}) => {
  try {
    const notifGlobal = await AsyncStorage.getItem('notifGlobal');
    if (notifGlobal === 'false') return;

    await registerNotificationChannelAsync();

    const lang = (await AsyncStorage.getItem('appLanguage')) || 'id';
    const dict = lang === 'en' ? en : id;

    let title = rawTitle;
    let body = rawBody;

    const lowerTitle = (rawTitle || '').toLowerCase();
    if (lowerTitle.includes('baru') || lowerTitle.includes('new')) {
      title = dict['notif_type.new_order_title'] || rawTitle;
      const name = (rawBody || '')
        .replace(/telah mengajukan pesanan COD baru untuk produk Anda\./gi, '')
        .replace(/has requested a new COD order for your product\./gi, '')
        .trim();
      body = (dict['notif_type.new_order_msg'] || rawBody).replace('%{name}', name);
    } else if (lowerTitle.includes('diterima') || lowerTitle.includes('accepted')) {
      title = dict['notif_type.accepted_title'] || rawTitle;
      const name = (rawBody || '')
        .replace(/telah menerima pesanan COD Anda\. Silakan hubungi via WhatsApp\./gi, '')
        .replace(/has accepted your COD order\. Please contact via WhatsApp\./gi, '')
        .trim();
      body = (dict['notif_type.accepted_msg'] || rawBody).replace('%{name}', name);
    } else if (lowerTitle.includes('ditolak') || lowerTitle.includes('rejected')) {
      title = dict['notif_type.rejected_title'] || rawTitle;
      const name = (rawBody || '')
        .replace(/telah menolak pesanan COD Anda\./gi, '')
        .replace(/has rejected your COD order\./gi, '')
        .trim();
      body = (dict['notif_type.rejected_msg'] || rawBody).replace('%{name}', name);
    } else if (lowerTitle.includes('dibatalkan') || lowerTitle.includes('cancelled')) {
      title = dict['notif_type.cancelled_title'] || rawTitle;
      const name = (rawBody || '')
        .replace(/telah membatalkan pesanan COD\./gi, '')
        .replace(/has cancelled the COD order\./gi, '')
        .trim();
      body = (dict['notif_type.cancelled_msg'] || rawBody).replace('%{name}', name);
    } else if (lowerTitle.includes('selesai') || lowerTitle.includes('completed')) {
      title = dict['notif_type.completed_title'] || rawTitle;
      body = dict['notif_type.completed_msg'] || rawBody;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: null,
    });
  } catch (error) {
    void 0;
  }
};
