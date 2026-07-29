/* ==========================================
   Komponen Layar Komponen Layar Beranda
========================================== */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  useColorScheme,
  FlatList,
  Dimensions,
  Animated,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
  LayoutAnimation,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { selectAuthUser } from '../store/slices/authSlice';
import Colors from '../constants/colors';
import { Shadows } from '../constants/styles';
import ProductCard from '../components/ProductCard';
import EmptyState from '../components/EmptyState';
import CustomText from '../components/CustomText';
import CustomAlert from '../components/CustomAlert';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useLanguage } from '../localization/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import api from '../services/api';

/* ==========================================
   Komponen Layar Data Dummy (Khusus Mahasiswa)
========================================== */

const SMART_FILTERS = [
  { id: 'semua', labelId: 'home.filter_all', label: 'Semua', icon: 'grid', color: Colors.primary.blue500 },
  { id: 'terdekat', labelId: 'home.filter_near', label: 'Terdekat', icon: 'location', color: Colors.primary.blue500 },
  { id: 'termurah', labelId: 'home.filter_cheap', label: 'Termurah', icon: 'wallet', color: Colors.primary.blue500 },
  { id: 'mulus', labelId: 'home.filter_good', label: 'Terbaik', icon: 'ribbon', color: Colors.primary.blue500 },
];

// Data dummy LATEST_ITEMS telah dihapus

/* ==========================================
   Komponen Layar Komponen Layar Utama
========================================== */
/**
 * HomeScreen
 * Halaman beranda utama aplikasi.
 * Menampilkan hero banner, menu cepat, dan daftar produk terpopuler.
 */
export default function HomeScreen({ navigation, onLogout }) {
  const user = useSelector(selectAuthUser);
  const { t, locale } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // State untuk Paginasi
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // State untuk Filter Pintar
  const [activeSmartFilter, setActiveSmartFilter] = useState('semua');
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermAlertVisible, setLocationPermAlertVisible] = useState(false);
  const [showSettingsAlertVisible, setShowSettingsAlertVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadItems = useCallback(async (isLoadMore = false, isRefreshing = false) => {
    if (loadingMore) return;
    
    let currentPage = 0;
    if (isLoadMore) {
      if (page + 1 >= totalPages) return;
      currentPage = page + 1;
      setLoadingMore(true);
    } else if (isRefreshing) {
      currentPage = 0;
      setPage(0);
    } else {
      currentPage = 0;
      setPage(0);
    }

    try {
      let sortByParam = undefined;
      let conditionParam = undefined;
      
      if (activeSmartFilter === 'terdekat') sortByParam = 'nearest';
      if (activeSmartFilter === 'termurah') sortByParam = 'cheapest';
      if (activeSmartFilter === 'mulus') conditionParam = 'Sangat Baik';

      const params = { 
        page: currentPage, 
        size: 10,
        sortBy: sortByParam,
        condition: conditionParam
      };
      
      if (activeSmartFilter === 'terdekat' && userLocation) {
        params.userLat = userLocation.latitude;
        params.userLng = userLocation.longitude;
      }

      const res = await api.items.getAll(params);
      if (res && parseInt(res.status) === 200 && res.data) {
        let fetchedItems = res.data.content || [];

        if (isLoadMore) {
          setItems(prev => [...prev, ...fetchedItems]);
        } else {
          setItems(fetchedItems);
        }
        setPage(res.data.currentPage || 0);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (error) {
      void 0;
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [activeSmartFilter, userLocation, page, totalPages, loadingMore]);

  // Auto refresh data & notifications whenever the screen comes into focus (e.g. back from DetailScreen)
  useFocusEffect(
    useCallback(() => {
      if (user) {
        api.notifications.get().then(res => {
          if (res && parseInt(res.status) === 200 && res.data) {
            setUnreadCount(res.data.unreadCount || 0);
          }
        }).catch(err => void 0);
      }
      loadItems(false);
    }, [user, loadItems])
  );

  useEffect(() => {
    // Memeriksa izin lokasi saat aplikasi dimuat agar ProductCard dapat menampilkan jarak yang akurat
    (async () => {
      try {
        let { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          let location = await Location.getCurrentPositionAsync({});
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        } else {
          // Menampilkan CustomAlert saat pertama dimuat untuk meminta izin akses lokasi jika belum pernah ditanya
          const hasAskedLoc = await AsyncStorage.getItem('hasAskedLocPerm');
          if (!hasAskedLoc) {
            setLocationPermAlertVisible(true);
          }
        }
      } catch (error) {
        void 0;
      }
    })();
  }, []); // Hanya dijalankan sekali saat komponen dimuat

  const handleSelectFilter = useCallback(async (filterId) => {
    if (filterId === 'terdekat') {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          if (!userLocation) {
            let location = await Location.getCurrentPositionAsync({});
            setUserLocation({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });
          }
          setActiveSmartFilter('terdekat');
        } else {
          setShowSettingsAlertVisible(true);
        }
      } catch (e) {
        void 0;
        setActiveSmartFilter('semua');
      }
    } else {
      setActiveSmartFilter(filterId);
    }
  }, [userLocation]);

  const handleConfirmLocationPermission = useCallback(async () => {
    setLocationPermAlertVisible(false);
    await AsyncStorage.setItem('hasAskedLocPerm', 'true');
    try {
      let { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } else {
        setUserLocation(null);
        if (!canAskAgain) {
          setShowSettingsAlertVisible(true);
        }
      }
    } catch (error) {
      setUserLocation(null);
    }
  }, []);

  const handleDismissLocationPermission = useCallback(async () => {
    setLocationPermAlertVisible(false);
    await AsyncStorage.setItem('hasAskedLocPerm', 'true');
    setUserLocation(null);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadItems(false, true);
  }, [loadItems]);

  const isCloseToBottom = ({ layoutMeasurement, contentOffset, contentSize }) => {
    const paddingToBottom = 50;
    return layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
  };

  // Carousel logic removed

  // Deteksi tema otomatis dari sistem HP
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  // W4 - useMemo: hitung styles sekali, tidak ulang tiap render kecuali tema berubah
  const styles = useMemo(() => getStyles(theme, isDark), [isDark]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />

      {/* 1. Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>
            <Text style={{ color: isDark ? Colors.light.surface : Colors.primary.blue500 }}>THRIFT</Text>
            <Text style={{ color: Colors.primary.yellow500 }}>LY</Text>
          </Text>
        </View>
        <View style={styles.headerActions}>
          {/* Notifications Icon */}
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => navigation.navigate('Notification')}
          >
            <Ionicons
              name="notifications-outline"
              size={24}
              color={isDark ? Colors.light.surface : Colors.primary.blue500}
            />
            {/* Notification counter badge */}
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. Smart Filters (Fixed at Top) */}
      <View style={[styles.quickMenuContainer, { paddingTop: 16, marginTop: 0, paddingBottom: 12, backgroundColor: theme.background }]}>
        {SMART_FILTERS.map((filter) => {
          const isSelected = activeSmartFilter === filter.id;
          return (
            <TouchableOpacity 
              key={filter.id} 
              style={styles.quickMenuItem} 
              activeOpacity={0.7}
              onPress={() => handleSelectFilter(filter.id)}
            >
              <View style={[
                styles.quickMenuIconBg, 
                { 
                  backgroundColor: isDark ? theme.surface : Colors.common.white,
                  borderWidth: 1,
                  borderColor: isDark ? theme.border : Colors.light.border,
                  ...Shadows.primary,
                  elevation: 2,
                },
                isSelected && {
                  backgroundColor: Colors.primary.blue500,
                  borderColor: Colors.primary.blue500,
                  shadowColor: Colors.primary.blue500,
                  shadowOpacity: 0.3,
                  elevation: 6,
                }
              ]}>
                <Ionicons 
                  name={isSelected ? filter.icon : `${filter.icon}-outline`} 
                  size={28} 
                  color={isSelected ? Colors.common.white : (isDark ? Colors.light.surface : filter.color)} 
                />
              </View>
              <Text style={[
                styles.quickMenuLabel,
                isSelected && { color: Colors.primary.blue500, fontFamily: 'Barlow-Bold' }
              ]}>
                {t(filter.labelId) || filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

        {/* 4. Main Feed: Terbaru / For You (Masonry) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {activeSmartFilter === 'semua' ? (t('home.recommended') || 'Rekomendasi Untuk Anda') : 
             activeSmartFilter === 'terdekat' ? (t('home.title_near') || 'Terdekat Dari Anda') :
             activeSmartFilter === 'termurah' ? (t('home.title_cheap') || 'Harga Termurah') : (t('home.title_good') || 'Pilihan Terbaik')}
          </Text>
        </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          items.length === 0 && { flexGrow: 1, justifyContent: 'center' }
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={({ nativeEvent }) => {
          if (isCloseToBottom(nativeEvent)) {
            loadItems(true);
          }
        }}
        scrollEventThrottle={400}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary.blue500]}
            tintColor={Colors.primary.blue500}
          />
        }
      >
        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={Colors.primary.blue500} />
          </View>
        ) : items.length === 0 ? (
          <EmptyState
            title={t('home.empty_recommended_title')}
            description={t('home.empty_recommended_desc')}
            icon="inbox"
          />
        ) : (
          <View style={styles.masonryContainer}>
            <View style={styles.masonryColumn}>
              {items.filter((_, i) => i % 2 === 0).map((item) => (
                <ProductCard
                  key={item.idItem || item.id}
                  item={item}
                  layout="masonry"
                  userLocation={userLocation}
                  onPress={() => navigation.navigate('Detail', { id: item.idItem || item.id })}
                  style={{ marginBottom: 16 }}
                />
              ))}
            </View>
            <View style={styles.masonryColumn}>
              {items.filter((_, i) => i % 2 !== 0).map((item) => (
                <ProductCard
                  key={item.idItem || item.id}
                  item={item}
                  layout="masonry"
                  userLocation={userLocation}
                  onPress={() => navigation.navigate('Detail', { id: item.idItem || item.id })}
                  style={{ marginBottom: 16 }}
                />
              ))}
            </View>
          </View>
        )}
        {loadingMore && (
          <View style={{ paddingVertical: 20, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={Colors.primary.blue500} />
          </View>
        )}

        {/* Jarak pemisah untuk menghindari tertutup bottom nav */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* --- PRE-PERMISSION LOCATION ALERT --- */}
      <CustomAlert
        visible={locationPermAlertVisible}
        type="info"
        title={t('home.loc_perm_title')}
        message={t('home.loc_perm_msg')}
        showCancel
        confirmText={t('common.allow')}
        cancelText={t('common.deny')}
        onConfirm={handleConfirmLocationPermission}
        onCancel={handleDismissLocationPermission}
        onClose={handleDismissLocationPermission}
      />

      {/* --- SETTINGS REQUIRED LOCATION ALERT --- */}
      <CustomAlert
        visible={showSettingsAlertVisible}
        type="warning"
        title={t('home.loc_denied_title') || 'Akses Lokasi Diperlukan'}
        message={t('home.loc_denied_msg') || 'Untuk menggunakan fitur lokasi terdekat, silakan izinkan akses lokasi di Pengaturan HP Anda.'}
        showCancel
        confirmText={t('common.open_settings') || 'Buka Pengaturan'}
        cancelText={t('profile.cancel') || 'Batal'}
        onConfirm={() => {
          setShowSettingsAlertVisible(false);
          Linking.openSettings();
        }}
        onCancel={() => setShowSettingsAlertVisible(false)}
        onClose={() => setShowSettingsAlertVisible(false)}
      />
    </SafeAreaView>
  );
}

/* ==========================================
   Komponen Layar Styles
========================================== */

const getStyles = (theme, isDark) => {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: 20,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.background,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 12,
    },
    logoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    logoText: {
      fontFamily: 'Barlow-Black',
      fontSize: 22,
      letterSpacing: -0.5,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    iconButton: {
      padding: 4,
      position: 'relative',
    },
    notificationBadge: {
      position: 'absolute',
      top: -2,
      right: -2,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: Colors.semantic.error.main,
      borderWidth: 1.5,
      borderColor: theme.background,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 3,
    },
    notificationBadgeText: {
      color: Colors.common.white,
      fontSize: 9,
      fontFamily: 'Barlow-Bold',
      textAlign: 'center',
      textAlignVertical: 'center',
      includeFontPadding: false,
      lineHeight: 12,
    },
    // Hero Carousel Styles Removed
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginTop: 28,
      marginBottom: 16,
    },
    sectionTitle: {
      fontFamily: 'Barlow-Black',
      fontSize: 18,
      color: theme.text.heading,
      letterSpacing: -0.4,
    },
    sectionLink: {
      fontFamily: 'Barlow-Bold',
      fontSize: 12,
      color: Colors.primary.blue500,
    },
    horizontalScroll: {
      marginBottom: 10,
    },
    horizontalScrollContent: {
      paddingHorizontal: 24,
      gap: 16,
    },
    quickMenuContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      marginTop: 24,
      marginBottom: 8,
    },
    quickMenuItem: {
      alignItems: 'center',
      width: 80,
    },
    quickMenuIconBg: {
      width: 56,
      height: 56,
      borderRadius: 20,
      marginBottom: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    quickMenuLabel: {
      fontFamily: 'Barlow-Medium',
      fontSize: 11, // Kecilin dikit biar muat 1 baris
      color: isDark ? Colors.dark.text.secondary : Colors.primary.blue500,
      textAlign: 'center',
    },
    masonryContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      justifyContent: 'space-between',
    },
    masonryColumn: {
      width: '48%', // Memberi ruang buat gap di tengah
    },
    /* ---------- Gaya Modal Izin Khusus ---------- */
    permissionOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
    },
    permissionBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.45)',
    },
    permissionCard: {
      width: '85%',
      maxWidth: 340,
      borderRadius: 24,
      borderWidth: 1,
      padding: 24,
      alignItems: 'center',
      elevation: 24,
      shadowColor: Colors.common.black,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
    },
    permissionIconBadge: {
      width: 64,
      height: 64,
      borderRadius: 32,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    permissionTitle: {
      textAlign: 'center',
      marginBottom: 8,
    },
    permissionDesc: {
      textAlign: 'center',
      marginBottom: 16,
      lineHeight: 20,
    },
    permissionFeatureBox: {
      width: '100%',
      borderRadius: 16,
      borderWidth: 1,
      padding: 14,
      marginBottom: 20,
    },
    permissionFeatureRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    permissionPrimaryBtn: {
      width: '100%',
      height: 48,
      borderRadius: 14,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    permissionSecondaryBtn: {
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
  });
};
