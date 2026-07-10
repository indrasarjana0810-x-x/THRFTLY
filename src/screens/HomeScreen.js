// src/screens/HomeScreen.js

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  useColorScheme,
  FlatList,
  Dimensions,
  Animated,
} from 'react-native';
import Colors from '../constants/colors';
import ProductCard from '../components/ProductCard';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

/* =====================================================================
   DUMMY DATA (Khusus Mahasiswa)
===================================================================== */

const QUICK_MENUS = [
  { id: '1', label: 'Terdekat', icon: 'map-marker-radius', color: Colors.semantic.success.main, bgLight: 'rgba(34, 197, 94, 0.08)', bgDark: 'rgba(34, 197, 94, 0.12)' },
  { id: '2', label: 'Bisa COD', icon: 'handshake-outline', color: Colors.primary.blue500, bgLight: 'rgba(56, 182, 255, 0.08)', bgDark: 'rgba(56, 182, 255, 0.12)' },
  { id: '3', label: 'Cuci Gudang', icon: 'package-variant', color: Colors.primary.yellow500, bgLight: 'rgba(255, 214, 0, 0.12)', bgDark: 'rgba(255, 214, 0, 0.15)' },
  { id: '4', label: 'Lulusan', icon: 'school-outline', color: Colors.semantic.error.main, bgLight: 'rgba(239, 68, 68, 0.08)', bgDark: 'rgba(239, 68, 68, 0.12)' },
];

const HERO_BANNERS = [
  {
    id: 'h1',
    tagline: 'KAMPUS HIGHLIGHT',
    title: 'Cuci Gudang Anak Kos Lulus!',
    desc: 'Kipas, Lemari, dan Setup Skripsi Murah',
    buttonText: 'Sikat Bos! ≫',
    emoji: '📦',
  },
  {
    id: 'h2',
    tagline: 'SEMESTER BARU',
    title: 'Cari Diktat Kuliah Murah',
    desc: 'Buku Kalkulus, Fisika, dan Jurnal Bekas',
    buttonText: 'Cari Buku ≫',
    emoji: '📚',
  },
  {
    id: 'h3',
    tagline: 'TIPS THRIFTLY',
    title: 'Bisa Nego via WhatsApp',
    desc: 'Langsung chat penjual buat deal harga',
    buttonText: 'Coba Nego ≫',
    emoji: '💬',
  },
];

const INFINITE_BANNERS = Array(100).fill(HERO_BANNERS).flat().map((item, index) => ({
  ...item,
  infiniteId: String(index),
}));

const LATEST_ITEMS = [
  {
    id: '1',
    title: 'Buku Kalkulus Purcell Ed. 9',
    price: 'Rp 150.000',
    condition: 'Baik',
    location: '1.5km',
    status: 'Available',
    imageEmoji: '📚',
    imageHeight: 180,
  },
  {
    id: '2',
    title: 'Kemeja Flanel Uniqlo Size L',
    price: 'Rp 80.000',
    condition: 'Seperti Baru',
    location: '800m',
    status: 'Available',
    imageEmoji: '👔',
    imageHeight: 130,
  },
  {
    id: '3',
    title: 'Monitor PC LG 19 inch (Buat Skripsi)',
    price: 'Rp 400.000',
    condition: 'Baik',
    location: 'COD Area Kos',
    status: 'Available',
    imageEmoji: '🖥️',
    imageHeight: 160,
  },
  {
    id: '4',
    title: 'Mouse Wireless Logitech M170',
    price: 'Rp 65.000',
    condition: 'Sangat Baik',
    location: '2.1km',
    status: 'Booked',
    imageEmoji: '🖱️',
    imageHeight: 200,
  },
];

/* =====================================================================
   MAIN SCREEN COMPONENT
===================================================================== */

export default function HomeScreen({ onLogout }) {
  const [favorites, setFavorites] = useState([]);

  const flatListRef = useRef(null);
  const currentIndexRef = useRef(HERO_BANNERS.length * 50); // Mulai di tengah array (index 150)
  const scrollX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      // NOTE: Mengembalikan index ke posisi tengah jika mencapai akhir array
      if (currentIndexRef.current >= INFINITE_BANNERS.length - 1) {
        currentIndexRef.current = HERO_BANNERS.length * 50;
        if (flatListRef.current) {
          flatListRef.current.scrollToIndex({ index: currentIndexRef.current, animated: false });
        }
      }

      // Melanjutkan pergeseran animasi carousel
      setTimeout(() => {
        currentIndexRef.current += 1;
        if (flatListRef.current) {
          flatListRef.current.scrollToIndex({ index: currentIndexRef.current, animated: true });
        }
      }, 50);

    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Deteksi tema otomatis dari sistem HP
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  // Buat style dinamis berdasarkan tema
  const styles = getStyles(theme, isDark);

  const toggleFavorite = (id) => {
    if (favorites.includes(id)) {
      setFavorites(favorites.filter((favId) => favId !== id));
    } else {
      setFavorites([...favorites, id]);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />

      {/* 1. Header (Clean Mode: No Search Bar) */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>
            <Text style={{ color: isDark ? '#FFFFFF' : Colors.primary.blue500 }}>THRIFT</Text>
            <Text style={{ color: Colors.primary.yellow500 }}>LY</Text>
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton}>
            <MaterialIcons
              name="notifications-none"
              size={24}
              color={isDark ? '#FFFFFF' : Colors.primary.blue500}
            />
            {/* Red dot notification indicator */}
            <View style={styles.notificationDot} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <MaterialCommunityIcons
              name="cart-outline"
              size={24}
              color={isDark ? '#FFFFFF' : Colors.primary.blue500}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Hero Banner Carousel */}
        <View style={styles.heroCardContainer}>
          <View style={styles.heroCardBg}>
            <Animated.FlatList
              ref={flatListRef}
              data={INFINITE_BANNERS}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.infiniteId}
              initialScrollIndex={HERO_BANNERS.length * 50}
              getItemLayout={(data, index) => ({
                length: Dimensions.get('window').width - 48,
                offset: (Dimensions.get('window').width - 48) * index,
                index,
              })}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: false }
              )}
              scrollEventThrottle={16}
              onScrollToIndexFailed={(info) => {
                // WARNING: Menangani error out of range jika engine lambat merender index
                const wait = new Promise(resolve => setTimeout(resolve, 500));
                wait.then(() => {
                  if (flatListRef.current && info.index >= 0 && info.index < INFINITE_BANNERS.length) {
                    flatListRef.current.scrollToIndex({ index: info.index, animated: true });
                  }
                });
              }}
              onMomentumScrollEnd={(e) => {
                const newIndex = Math.round(
                  e.nativeEvent.contentOffset.x / (Dimensions.get('window').width - 48)
                );
                currentIndexRef.current = newIndex;
              }}
              renderItem={({ item }) => (
                <View style={styles.heroSlide}>
                  <View style={styles.heroLeft}>
                    <Text style={styles.heroTagline}>{item.tagline}</Text>
                    <Text style={styles.heroTitle}>{item.title}</Text>
                    <Text style={styles.heroDesc}>{item.desc}</Text>

                    <TouchableOpacity style={styles.heroDetailsBtnContainer} activeOpacity={0.8}>
                      <BlurView
                        intensity={40}
                        tint={isDark ? 'dark' : 'light'}
                        experimentalBlurMethod="dimezisBlurView"
                        style={styles.heroDetailsBtn}
                      >
                        <Text style={styles.heroDetailsBtnText}>{item.buttonText}</Text>
                      </BlurView>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.heroRight}>
                    <Text style={styles.heroProductEmoji}>{item.emoji}</Text>
                  </View>
                </View>
              )}
            />
          </View>

          {/* Carousel Dots di Luar Card */}
          <View style={styles.carouselDots}>
            {HERO_BANNERS.map((_, i) => {
              const cardWidth = Dimensions.get('window').width - 48;

              const inputRange = [];
              const widthOutputRange = [];
              const colorOutputRange = [];

              INFINITE_BANNERS.forEach((_, index) => {
                inputRange.push(index * cardWidth);
                if (index % HERO_BANNERS.length === i) {
                  widthOutputRange.push(16);
                  colorOutputRange.push(Colors.primary.yellow500);
                } else {
                  widthOutputRange.push(6);
                  colorOutputRange.push(isDark ? '#2E2E45' : '#D1D5DB');
                }
              });

              const dotWidth = scrollX.interpolate({
                inputRange,
                outputRange: widthOutputRange,
                extrapolate: 'clamp',
              });

              const dotColor = scrollX.interpolate({
                inputRange,
                outputRange: colorOutputRange,
                extrapolate: 'clamp',
              });

              return (
                <Animated.View
                  key={i}
                  style={[
                    styles.dot,
                    { width: dotWidth, backgroundColor: dotColor },
                  ]}
                />
              );
            })}
          </View>
        </View>

        {/* 3. Quick Menus (Pengganti Kategori) */}
        <View style={styles.quickMenuContainer}>
          {QUICK_MENUS.map((menu) => (
            <TouchableOpacity key={menu.id} style={styles.quickMenuItem} activeOpacity={0.7}>
              <View style={[styles.quickMenuIconBg, { backgroundColor: isDark ? menu.bgDark : menu.bgLight }]}>
                <MaterialCommunityIcons name={menu.icon} size={28} color={menu.color} />
              </View>
              <Text style={styles.quickMenuLabel}>{menu.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 4. Main Feed: Terbaru / For You (Masonry) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Rekomendasi</Text>
        </View>
        <View style={styles.masonryContainer}>
          <View style={styles.masonryColumn}>
            {LATEST_ITEMS.filter((_, i) => i % 2 === 0).map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                isFavorite={favorites.includes(item.id)}
                layout="masonry"
                onFavoritePress={() => toggleFavorite(item.id)}
                style={{ marginBottom: 16 }}
              />
            ))}
          </View>
          <View style={styles.masonryColumn}>
            {LATEST_ITEMS.filter((_, i) => i % 2 !== 0).map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                isFavorite={favorites.includes(item.id)}
                layout="masonry"
                onFavoritePress={() => toggleFavorite(item.id)}
                style={{ marginBottom: 16 }}
              />
            ))}
          </View>
        </View>

        {/* Jarak pemisah untuk menghindari tertutup bottom nav */}
        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* =====================================================================
   STYLES
===================================================================== */

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
      paddingBottom: 20,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.background,
      paddingHorizontal: 24,
      paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12,
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
    notificationDot: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: Colors.semantic.error.main,
      borderWidth: 1.5,
      borderColor: theme.background,
    },
    heroCardContainer: {
      marginTop: 10,
    },
    heroCardBg: {
      backgroundColor: isDark ? Colors.primary.blue700 : Colors.primary.blue500,
      marginHorizontal: 24,
      borderRadius: 24,
      minHeight: 160,
      overflow: 'hidden',
    },
    heroSlide: {
      flexDirection: 'row',
      width: Dimensions.get('window').width - 48,
      padding: 24,
    },
    heroLeft: {
      flex: 1.3,
      justifyContent: 'center',
    },
    heroTagline: {
      fontFamily: 'Barlow-Bold',
      fontSize: 10,
      color: Colors.primary.yellow500,
      letterSpacing: 1.5,
      marginBottom: 6,
    },
    heroTitle: {
      fontFamily: 'Barlow-Black',
      fontSize: 22,
      color: '#FFFFFF',
      letterSpacing: -0.5,
      lineHeight: 26,
    },
    heroDesc: {
      fontFamily: 'Barlow-Regular',
      fontSize: 11,
      color: 'rgba(255, 255, 255, 0.85)',
      marginTop: 6,
      lineHeight: 16,
    },
    heroDetailsBtnContainer: {
      alignSelf: 'flex-start',
      marginTop: 16,
      borderRadius: 50,
      overflow: 'hidden',
    },
    heroDetailsBtn: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    heroDetailsBtnText: {
      fontFamily: 'Barlow-Bold',
      fontSize: 11,
      color: '#FFFFFF',
    },
    heroRight: {
      flex: 0.7,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroProductEmoji: {
      fontSize: 60,
    },
    carouselDots: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
      marginTop: 12,
    },
    dot: {
      height: 6,
      borderRadius: 3,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 24,
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
      color: isDark ? '#E5E7EB' : Colors.primary.blue500,
      textAlign: 'center',
    },
    masonryContainer: {
      flexDirection: 'row',
      paddingHorizontal: 24,
      justifyContent: 'space-between',
    },
    masonryColumn: {
      width: '47.5%', // Memberi ruang buat gap di tengah
    },
  });
};
