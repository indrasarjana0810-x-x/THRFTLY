import React, { useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/colors';
import CustomText from '../components/CustomText';
import Header from '../components/Header';
import { Shadows } from '../constants/styles';
import { useLanguage } from '../localization/LanguageContext';

const getMockNotifications = (locale) => [
  {
    id: '1',
    title: locale === 'id' ? 'Pesanan Baru Masuk' : 'New Order Received',
    message: locale === 'id' 
      ? 'Seseorang ingin membeli "Buku Kalkulus Purcell". Silakan periksa dan tekan "Terima" untuk melanjutkan.'
      : 'Someone wants to buy "Buku Kalkulus Purcell". Please review and press "Accept" to proceed.',
    timestamp: locale === 'id' ? '2 menit yang lalu' : '2 minutes ago',
    read: false,
  },
  {
    id: '2',
    title: locale === 'id' ? 'Pesanan Diterima' : 'Order Accepted',
    message: locale === 'id'
      ? 'Penjual telah menerima pesanan "Kemeja Flanel Uniqlo". Silakan gunakan fitur WhatsApp untuk menentukan lokasi.'
      : 'The seller has accepted your order for "Kemeja Flanel Uniqlo". Please use WhatsApp to coordinate the location.',
    timestamp: locale === 'id' ? '3 jam yang lalu' : '3 hours ago',
    read: false,
  },
  {
    id: '3',
    title: locale === 'id' ? 'Pengingat Jadwal' : 'Schedule Reminder',
    message: locale === 'id'
      ? 'Anda memiliki jadwal transaksi "Earphone TWS Baseus" hari ini. Pastikan untuk mengonfirmasi lokasi.'
      : 'You have a transaction schedule for "Earphone TWS Baseus" today. Please ensure to confirm the location.',
    timestamp: locale === 'id' ? '1 hari yang lalu' : '1 day ago',
    read: true,
  },
  {
    id: '4',
    title: locale === 'id' ? 'Transaksi Selesai' : 'Transaction Completed',
    message: locale === 'id'
      ? 'Pembeli telah menyelesaikan transaksi "Jaket Varsity". Terima kasih telah menggunakan layanan kami.'
      : 'The buyer has completed the transaction for "Jaket Varsity". Thank you for using our services.',
    timestamp: locale === 'id' ? '2 hari yang lalu' : '2 days ago',
    read: true,
  },
];

export default function NotificationScreen({ navigation }) {
  const { t, locale } = useLanguage();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  const styles = useMemo(() => getStyles(theme, isDark), [isDark]);

  // Load notifications dynamically based on current locale (for mock purposes)
  const [notifications, setNotifications] = useState(() => getMockNotifications(locale));
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

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

  const handlePressCard = (item) => {
    if (isSelectionMode) {
      toggleSelection(item.id);
    } else {
      // Tandai satuan dibaca
      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, read: true } : n));
    }
  };

  const handleLongPressCard = (item) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedIds([item.id]);
    }
  };

  const markSelectedAsRead = () => {
    setNotifications(prev => prev.map(n => selectedIds.includes(n.id) ? { ...n, read: true } : n));
    setIsSelectionMode(false);
    setSelectedIds([]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === notifications.length) {
      setSelectedIds([]);
      setIsSelectionMode(false);
    } else {
      setSelectedIds(notifications.map(n => n.id));
    }
  };

  const HeaderRight = () => {
    if (isSelectionMode) {
      return (
        <TouchableOpacity onPress={() => { setIsSelectionMode(false); setSelectedIds([]); }}>
          <CustomText color={Colors.primary.blue500} type="body-bold">
            {locale === 'id' ? 'Batal' : 'Cancel'}
          </CustomText>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity onPress={() => setIsSelectionMode(true)}>
        <CustomText color={Colors.primary.blue500} type="body-bold">
          {locale === 'id' ? 'Pilih' : 'Select'}
        </CustomText>
      </TouchableOpacity>
    );
  };

  const renderSelectAllHeader = () => {
    if (!isSelectionMode) return null;
    const isAllSelected = selectedIds.length === notifications.length && notifications.length > 0;
    
    return (
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={toggleSelectAll}
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 }}
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
          {isAllSelected ? (locale === 'id' ? 'Batal Semua' : 'Deselect All') : (locale === 'id' ? 'Pilih Semua' : 'Select All')}
        </CustomText>
      </TouchableOpacity>
    );
  };

  const renderNotification = ({ item }) => {
    const isSelected = selectedIds.includes(item.id);
    
    return (
      <TouchableOpacity 
        style={[
          styles.notificationCard, 
          { 
            backgroundColor: theme.surface,
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
          },
          isSelected && { backgroundColor: isDark ? 'rgba(45, 126, 222, 0.15)' : 'rgba(45, 126, 222, 0.05)' }
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
              {!item.read && <View style={styles.unreadDot} />}
              <CustomText style={styles.title} type="body-bold" numberOfLines={1}>{item.title}</CustomText>
            </View>
            <CustomText style={styles.timestamp} color={theme.text.tertiary} type="caption">{item.timestamp}</CustomText>
          </View>
          <CustomText style={styles.message} color={theme.text.secondary} numberOfLines={2}>{item.message}</CustomText>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Header 
        title={locale === 'id' ? 'Notifikasi' : 'Notifications'} 
        noBorder={true}
        rightComponent={<HeaderRight />}
      />
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        ListHeaderComponent={renderSelectAllHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
      
      {isSelectionMode && selectedIds.length > 0 && (
        <View style={[styles.bottomBar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
          <CustomText type="body-bold" color={theme.text.primary}>
            {selectedIds.length} {locale === 'id' ? 'Terpilih' : 'Selected'}
          </CustomText>
          <TouchableOpacity style={styles.actionButton} onPress={markSelectedAsRead}>
            <CustomText color={Colors.common.white} type="body-bold">
              {locale === 'id' ? 'Tandai Dibaca' : 'Mark as Read'}
            </CustomText>
          </TouchableOpacity>
        </View>
      )}
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
  actionButton: {
    backgroundColor: Colors.primary.blue500,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  }
});
