/* ==========================================
   Komponen Layar Notification
========================================== */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, useColorScheme, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/colors';
import CustomText from '../components/CustomText';
import Header from '../components/Header';
import CustomAlert from '../components/CustomAlert';
import EmptyState from '../components/EmptyState';
import { Shadows } from '../constants/styles';
import { useLanguage } from '../localization/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function NotificationScreen({ navigation }) {
  const { t, locale } = useLanguage();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  const styles = useMemo(() => getStyles(theme, isDark), [isDark]);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [expandedIds, setExpandedIds] = useState([]);
  const [notifPermAlertVisible, setNotifPermAlertVisible] = useState(false);
  const [deleteAlertVisible, setDeleteAlertVisible] = useState(false);

  const fetchNotifications = useCallback(async (isLoadMore = false, isRefreshing = false) => {
    if (loadingMore) return;

    let currentPage = 0;
    if (isLoadMore) {
      if (page + 1 >= totalPages) return;
      currentPage = page + 1;
      setLoadingMore(true);
    } else if (isRefreshing) {
      setRefreshing(true);
      currentPage = 0;
      setPage(0);
    } else {
      setLoading(true);
      currentPage = 0;
      setPage(0);
    }

    try {
      const res = await api.notifications.get({ page: currentPage, size: 10 });
      if (res && parseInt(res.status) === 200 && res.data) {
        if (isLoadMore) {
          setNotifications(prev => [...prev, ...(res.data.notifications || [])]);
        } else {
          setNotifications(res.data.notifications || []);
        }
        setPage(res.data.currentPage || 0);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (e) {
      void 0;
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [loadingMore, page, totalPages]);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
      requestNotificationPermission();
    }, [])
  );

  const requestNotificationPermission = async () => {
    try {
      const hasAsked = await AsyncStorage.getItem('hasAskedNotifPerm');
      if (hasAsked) return; // Sudah pernah ditanyakan, jangan pernah tampilkan lagi

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      if (existingStatus !== 'granted') {
        // Tampilkan murni Custom Modal bikinan kita sendiri
        setNotifPermAlertVisible(true);
      }
    } catch (error) {
      void 0;
    }
  };

  const handleConfirmNotificationPermission = async () => {
    setNotifPermAlertVisible(false);
    await AsyncStorage.setItem('hasAskedNotifPerm', 'true');
    await fetchAndSavePushToken();
  };

  const handleCancelNotificationPermission = async () => {
    setNotifPermAlertVisible(false);
    await AsyncStorage.setItem('hasAskedNotifPerm', 'true');
  };

  const fetchAndSavePushToken = async () => {
    try {
      // Avoid fetching token in Expo Go as it's no longer supported in SDK 53
      if (Constants.appOwnership === 'expo') {
        return;
      }

      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      if (!projectId) {
        return;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      if (tokenData && tokenData.data) {
        api.users.saveToken(tokenData.data).catch(() => { });
      }
    } catch (error) {
      // Silently ignore push token errors to prevent spamming logs in dev
    }
  };

  const onRefresh = useCallback(() => {
    fetchNotifications(false, true);
  }, [fetchNotifications]);

  const toggleSelection = (id) => {
    if (selectedIds.includes(id)) {
      const newSel = selectedIds.filter(i => i !== id);
      setSelectedIds(newSel);
      if (newSel.length === 0) {
        setIsSelectionMode(false);
      }
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handlePressCard = async (item) => {
    if (isSelectionMode) {
      toggleSelection(item.idNotif);
    } else {
      // Mark as read automatically when clicked
      if (!item.isRead) {
        handleMarkAsRead(item);
      }

      // Check if it's an order-related notification
      const isOrderRelated = [
        'Pesanan COD Baru',
        'Pesanan Diterima',
        'Pesanan Ditolak',
        'Pesanan Dibatalkan',
        'Transaksi Selesai'
      ].includes(item.title);

      if (isOrderRelated) {
        navigation.navigate('TransactionHistory');
      } else {
        // Expand/collapse logic for normal messages
        if (expandedIds.includes(item.idNotif)) {
          setExpandedIds(prev => prev.filter(id => id !== item.idNotif));
        } else {
          setExpandedIds(prev => [...prev, item.idNotif]);
        }
      }
    }
  };

  const handleMarkAsRead = async (item) => {
    if (!item.isRead) {
      try {
        await api.notifications.markAsRead(item.idNotif);
        setNotifications(prev => prev.map(n => n.idNotif === item.idNotif ? { ...n, isRead: true } : n));
      } catch (e) {
        void 0;
      }
    }
  };

  const handleLongPressCard = (item) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedIds([item.idNotif]);
    }
  };

  const markSelectedAsRead = async () => {
    try {
      await Promise.all(selectedIds.map(id => api.notifications.markAsRead(id)));
      setNotifications(prev => prev.map(n => selectedIds.includes(n.idNotif) ? { ...n, isRead: true } : n));
    } catch (e) {
      void 0;
    } finally {
      setIsSelectionMode(false);
      setSelectedIds([]);
    }
  };

  const deleteSelectedNotifications = async () => {
    try {
      setDeleteAlertVisible(false);
      await api.notifications.delete(selectedIds);
      setNotifications(prev => prev.filter(n => !selectedIds.includes(n.idNotif)));
    } catch (e) {
      void 0;
    } finally {
      setIsSelectionMode(false);
      setSelectedIds([]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === notifications.length && notifications.length > 0) {
      setSelectedIds([]);
      setIsSelectionMode(false);
    } else {
      setSelectedIds(notifications.map(n => n.idNotif));
    }
  };



  const renderSelectAllHeader = () => {
    if (!isSelectionMode) return null;
    const isAllSelected = selectedIds.length === notifications.length && notifications.length > 0;

    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 4 }}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={toggleSelectAll}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <View style={{
            width: 24, height: 24, borderRadius: 12, marginRight: 12,
            backgroundColor: isAllSelected ? Colors.primary.blue500 : theme.surface,
            borderWidth: 2, borderColor: isAllSelected ? Colors.primary.blue500 : theme.text.placeholder,
            alignItems: 'center', justifyContent: 'center'
          }}>
            {isAllSelected && <Ionicons name="checkmark" size={16} color={Colors.common.white} />}
          </View>
          <CustomText type="h3" style={{ color: theme.text.primary, fontSize: 16 }}>
            {isAllSelected ? (t('myitems.deselect_all') || 'Batal Semua') : (t('myitems.select_all') || 'Pilih Semua')}
          </CustomText>
        </TouchableOpacity>
        
        {selectedIds.length > 0 && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setDeleteAlertVisible(true)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.15)',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Ionicons name="trash-outline" size={16} color={Colors.semantic.error.main} />
            <CustomText type="body-bold" style={{ color: Colors.semantic.error.main, fontSize: 13 }}>
              {t('common.delete') || 'Hapus'}
            </CustomText>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderNotification = ({ item }) => {
    const isSelected = selectedIds.includes(item.idNotif);

    // Format tanggal sederhana, kalau mau bisa pakai moment.js atau date-fns
    const dateObj = new Date(item.createdDate || Date.now());
    const formattedDate = `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;

    let translatedTitle = item.title;
    let translatedMessage = item.message;

    if (item.title === 'Pesanan COD Baru') {
      translatedTitle = t('notif_type.new_order_title') || item.title;
      const name = item.message.replace(' telah mengajukan pesanan COD baru untuk produk Anda.', '');
      translatedMessage = (t('notif_type.new_order_msg') || item.message).replace('%{name}', name);
    } else if (item.title === 'Pesanan Diterima') {
      translatedTitle = t('notif_type.accepted_title') || item.title;
      const name = item.message.replace(' telah menerima pesanan COD Anda. Silakan hubungi via WhatsApp.', '');
      translatedMessage = (t('notif_type.accepted_msg') || item.message).replace('%{name}', name);
    } else if (item.title === 'Pesanan Ditolak') {
      translatedTitle = t('notif_type.rejected_title') || item.title;
      const name = item.message.replace(' telah menolak pesanan COD Anda.', '');
      translatedMessage = (t('notif_type.rejected_msg') || item.message).replace('%{name}', name);
    } else if (item.title === 'Pesanan Dibatalkan') {
      translatedTitle = t('notif_type.cancelled_title') || item.title;
      const name = item.message.replace(' telah membatalkan pesanan COD.', '');
      translatedMessage = (t('notif_type.cancelled_msg') || item.message).replace('%{name}', name);
    } else if (item.title === 'Transaksi Selesai') {
      translatedTitle = t('notif_type.completed_title') || item.title;
      translatedMessage = t('notif_type.completed_msg') || item.message;
    }

    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          {
            backgroundColor: isSelected ? (isDark ? '#1a2738' : '#f0f7ff') : theme.surface,
            borderColor: isSelected ? Colors.primary.blue500 : (isDark ? 'transparent' : theme.border),
            borderWidth: isSelected ? 2 : (isDark ? 0 : 1),
            transform: isSelected ? [{ scale: 0.98 }] : [{ scale: 1 }],
            ...(isDark ? {
              shadowColor: Colors.primary.blue500,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 10,
              elevation: 8,
            } : Shadows.primary)
          }
        ]}
        activeOpacity={0.9}
        onPress={() => handlePressCard(item)}
        onLongPress={() => handleLongPressCard(item)}
      >
        {isSelectionMode && (
          <View style={styles.checkboxContainer}>
            <View style={{
              width: 24, height: 24, borderRadius: 12,
              backgroundColor: isSelected ? Colors.primary.blue500 : theme.surface,
              borderWidth: 2, borderColor: isSelected ? Colors.primary.blue500 : theme.text.placeholder,
              alignItems: 'center', justifyContent: 'center'
            }}>
              {isSelected && <Ionicons name="checkmark" size={16} color={Colors.common.white} />}
            </View>
          </View>
        )}

        {!isSelectionMode && (
          <View style={styles.iconWrapper}>
            <Ionicons name="notifications-outline" size={20} color={Colors.primary.blue500} />
          </View>
        )}

        <View style={styles.contentContainer}>
          <View style={styles.titleRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              {!item.isRead && <View style={styles.unreadDot} />}
              <CustomText style={styles.title} type="body-bold" numberOfLines={1}>{translatedTitle}</CustomText>
            </View>
            <CustomText style={styles.timestamp} color={theme.text.tertiary} type="caption">{formattedDate}</CustomText>
          </View>
          
          <CustomText 
            style={styles.message} 
            color={theme.text.secondary} 
            numberOfLines={expandedIds.includes(item.idNotif) ? undefined : 2}
          >
            {translatedMessage}
          </CustomText>
          
          {!isSelectionMode && translatedMessage.length > 85 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 12, backgroundColor: isDark ? theme.surface : Colors.common.grey100 }}>
                <Ionicons 
                  name={expandedIds.includes(item.idNotif) ? "chevron-up" : "chevron-down"} 
                  size={16} 
                  color={theme.text.tertiary} 
                />
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Header
        title={t('notification.title') || 'Notifikasi'}
        noBorder={true}
      />
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary.blue500} />
        </View>
      ) : notifications.length === 0 ? (
        <EmptyState
          title={t('notification.empty_title') || 'Tidak Ada Notifikasi'}
          description={t('notification.empty_desc') || 'Anda belum memiliki notifikasi baru saat ini.'}
          icon="notifications"
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.idNotif}
          renderItem={renderNotification}
          ListHeaderComponent={renderSelectAllHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={() => fetchNotifications(true, false)}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator size="small" color={Colors.primary.blue500} style={{ padding: 20 }} />
            ) : (
              <View style={{ height: 20 }} />
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary.blue500]}
              tintColor={Colors.primary.blue500}
            />
          }
        />
      )}

      {isSelectionMode && (
        <View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          backgroundColor: theme.surface,
          paddingHorizontal: 20, paddingTop: 16, paddingBottom: 30,
          borderTopWidth: 1, borderColor: theme.border,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          ...(isDark ? {} : Shadows.medium)
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setIsSelectionMode(false);
                setSelectedIds([]);
              }}
              style={{ padding: 8, marginRight: 8, backgroundColor: theme.border, borderRadius: 20 }}
            >
              <Ionicons name="close" size={20} color={theme.text.primary} />
            </TouchableOpacity>
            <CustomText type="h3" style={{ color: theme.text.primary }}>
              {selectedIds.length} {t('myitems.selected') || 'terpilih'}
            </CustomText>
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={markSelectedAsRead}
            disabled={selectedIds.length === 0}
            style={{
              backgroundColor: selectedIds.length > 0 ? Colors.primary.blue500 : theme.border,
              paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
              flexDirection: 'row', alignItems: 'center', gap: 6
            }}
          >
            <Ionicons name="checkmark-done" size={16} color={selectedIds.length > 0 ? Colors.light.surface : theme.text.secondary} />
            <CustomText type="body-bold" style={{ color: selectedIds.length > 0 ? Colors.light.surface : theme.text.secondary }}>
              {t('notification.mark_all_read') || 'Tandai Dibaca'}
            </CustomText>
          </TouchableOpacity>
        </View>
      )}
      {/* --- PRE-PERMISSION NOTIFICATION ALERT --- */}
      <CustomAlert
        visible={notifPermAlertVisible}
        type="info"
        title={t('notification.perm_title') || 'Aktifkan Notifikasi'}
        message={t('notification.perm_msg') || 'THRIFTLY butuh izin notifikasi agar Anda tidak ketinggalan update pesanan dan pesan. Lanjutkan?'}
        showCancel
        confirmText={t('notification.perm_allow') || 'Izinkan'}
        cancelText={t('notification.perm_deny') || 'Tolak'}
        onConfirm={handleConfirmNotificationPermission}
        onCancel={handleCancelNotificationPermission}
        onClose={handleCancelNotificationPermission}
      />
      <CustomAlert
        visible={deleteAlertVisible}
        type="error"
        title={t('notification.delete_title') || 'Hapus Notifikasi'}
        message={(t('notification.delete_confirm') || 'Apakah Anda yakin ingin menghapus %{count} notifikasi?').replace('%{count}', selectedIds.length)}
        showCancel
        confirmText={t('common.yes_delete') || 'Ya, Hapus'}
        cancelText={t('common.cancel') || 'Batal'}
        onConfirm={deleteSelectedNotifications}
        onCancel={() => setDeleteAlertVisible(false)}
        onClose={() => setDeleteAlertVisible(false)}
      />
    </SafeAreaView>
  );
}

const getStyles = (theme, isDark) => StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 80, // Extra padding for bottom bar
  },
  notificationCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxContainer: {
    marginRight: 12,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: isDark ? 'rgba(45, 126, 222, 0.15)' : 'rgba(45, 126, 222, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    flex: 1,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  timestamp: {
    fontSize: 11,
    marginLeft: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary.blue500,
    marginRight: 8,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
  },
  actionButton: {
    backgroundColor: Colors.primary.blue500,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  }
});
