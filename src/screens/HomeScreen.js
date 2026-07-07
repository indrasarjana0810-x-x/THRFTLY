// src/screens/HomeScreenNew.js
// Thriftly — Home Screen (Production-Ready Auto Light & Dark Mode)

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  Platform,
  useColorScheme, // Hook bawaan React Native untuk mendeteksi tema sistem HP
} from "react-native";
import Colors from "../constants/Colors";

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const [activeCategory, setActiveCategory] = useState("0");
  const [activeTab, setActiveTab] = useState("home");

  // ── DETEKSI TEMA SISTEM (Sama seperti OLX, Tokopedia, Instagram, dll.) ──
  const colorScheme = useColorScheme(); // Menghasilkan 'light' atau 'dark'
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  // Membuat style secara dinamis berdasarkan tema yang sedang aktif
  const styles = getStyles(theme, isDark);

  const NAV_TABS = [
    { id: "home", icon: "⊞", label: "Beranda" },
    { id: "explore", icon: "◎", label: "Jelajahi" },
    { id: "sell", icon: "+", label: "", isCenter: true },
    { id: "wishlist", icon: "♡", label: "Wishlist" },
    { id: "profile", icon: "○", label: "Profil" },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.background}
      />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.logo}>Thriftly</Text>
          <View style={styles.logoDot} />
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Text style={styles.headerIcon}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatarCircle}>
            <Text style={styles.avatarText}>R</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Search Bar ── */}
        <View style={styles.searchBarWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Cari barang bekas..."
            placeholderTextColor={theme.text.placeholder}
            editable={false}
          />
        </View>

        {/* ── Hero Banner ── */}
        <View style={styles.heroBanner}>
          <View style={styles.heroBannerLeft}>
            <Text style={styles.heroSubtitle}>Politeknik Astra · Cikarang</Text>
            <Text style={styles.heroTitle}>
              Jual & Beli{"\n"}Barang Bekas{"\n"}Kampus
            </Text>
            <TouchableOpacity style={styles.heroButton}>
              <Text style={styles.heroButtonText}>Jelajahi →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.heroBannerRight}>
            <Text style={styles.heroBannerEmoji}>🛍️</Text>
          </View>
        </View>

        {/* ── Categories ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                activeCategory === cat.id && styles.categoryChipActive,
              ]}
              onPress={() => setActiveCategory(cat.id)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  activeCategory === cat.id && styles.categoryChipTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Section Header ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Barang Terbaru</Text>
          <TouchableOpacity>
            <Text style={styles.sectionLink}>Lihat Semua</Text>
          </TouchableOpacity>
        </View>

        {/* ── Product Grid ── */}
        <View style={styles.productGrid}>
          {DUMMY_ITEMS.map((item) => (
            <View key={item.id} style={styles.productGridItem}>
              <ProductCard
                item={item}
                theme={theme}
                styles={styles}
                isDark={isDark}
              />
            </View>
          ))}
        </View>

        {/* Bottom padding buat nav bar */}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ── Bottom Navigation ── */}
      <View style={styles.bottomNav}>
        {NAV_TABS.map((tab) => {
          if (tab.isCenter) {
            return (
              <TouchableOpacity key={tab.id} style={styles.navCenterBtn}>
                <View style={styles.navCenterCircle}>
                  <Text style={styles.navCenterIcon}>{tab.icon}</Text>
                </View>
              </TouchableOpacity>
            );
          }
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.navTab}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.navIcon, isActive && styles.navIconActive]}>
                {tab.icon}
              </Text>
              <Text
                style={[styles.navLabel, isActive && styles.navLabelActive]}
              >
                {tab.label}
              </Text>
              {isActive && <View style={styles.navActiveDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

const StatusBadge = ({ status, styles }) => {
  const config = {
    Available: {
      bg: Colors.semantic.success.light,
      text: Colors.semantic.success.dark,
      label: "Tersedia",
    },
    Booked: {
      bg: Colors.semantic.warning.light,
      text: Colors.semantic.warning.dark,
      label: "Booked",
    },
    Sold: {
      bg: Colors.semantic.error.light,
      text: Colors.semantic.error.dark,
      label: "Terjual",
    },
  };
  const c = config[status] || config.Available;
  return (
    <View style={[styles.statusBadge, { backgroundColor: c.bg }]}>
      <Text style={[styles.statusBadgeText, { color: c.text }]}>{c.label}</Text>
    </View>
  );
};

const ProductCard = ({ item, theme, styles, isDark }) => (
  <TouchableOpacity activeOpacity={0.85} style={styles.productCard}>
    <View
      style={[
        styles.productImagePlaceholder,
        {
          backgroundColor: isDark ? Colors.dark.border : Colors.primary.blue100,
        },
      ]}
    >
      {item.isHot && (
        <View style={styles.hotBadge}>
          <Text style={styles.hotBadgeText}>HOT</Text>
        </View>
      )}
      <Text style={styles.productImageIcon}>📦</Text>
    </View>

    <View style={styles.productCardBody}>
      <Text style={styles.productTitle} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={styles.productCondition}>{item.condition}</Text>
      <Text style={styles.productPrice}>{item.price}</Text>
      <View style={styles.productCardFooter}>
        <StatusBadge status={item.status} styles={styles} />
        <TouchableOpacity style={styles.wishlistBtn}>
          <Text style={styles.wishlistIcon}>♡</Text>
        </TouchableOpacity>
      </View>
    </View>
  </TouchableOpacity>
);

// ─── Dummy Data ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: "0", label: "Semua" },
  { id: "1", label: "Elektronik" },
  { id: "2", label: "Buku" },
  { id: "3", label: "Pakaian" },
  { id: "4", label: "Kos" },
  { id: "5", label: "Alat Tulis" },
];

const DUMMY_ITEMS = [
  {
    id: "1",
    title: "Laptop ASUS VivoBook S14",
    price: "Rp 5.500.000",
    condition: "Seperti Baru",
    status: "Available",
    seller: "Rizky F.",
    isHot: true,
  },
  {
    id: "2",
    title: "Paket Buku Teknik Mesin Sem. 3",
    price: "Rp 175.000",
    condition: "Baik",
    status: "Available",
    seller: "Ahmad S.",
    isHot: false,
  },
  {
    id: "3",
    title: "Kalkulator Casio FX-991EX",
    price: "Rp 280.000",
    condition: "Sangat Baik",
    status: "Booked",
    seller: "Siti R.",
    isHot: false,
  },
  {
    id: "4",
    title: "Mechanical Keyboard Leopold",
    price: "Rp 850.000",
    condition: "Seperti Baru",
    status: "Available",
    seller: "Kevin N.",
    isHot: true,
  },
  {
    id: "5",
    title: "Jaket Kampus Poltek Astra",
    price: "Rp 120.000",
    condition: "Baik",
    status: "Available",
    seller: "Budi S.",
    isHot: false,
  },
  {
    id: "6",
    title: "Mouse Logitech MX Master 3",
    price: "Rp 650.000",
    condition: "Sangat Baik",
    status: "Available",
    seller: "Andi P.",
    isHot: false,
  },
];

// ─── DYNAMIC STYLES GENERATOR ──────────────────────────────────────────────────
// Fungsi ini menghasilkan style baru setiap kali tema HP berubah (Light <-> Dark)
const getStyles = (theme, isDark) => {
  const shadowColor = isDark ? "#000000" : Colors.primary.blue500;
  const shadowOpacity = isDark ? 0.4 : 0.06;

  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },

    // Header
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.surface,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    logo: {
      fontSize: 22,
      fontWeight: "800",
      color: Colors.primary.blue500,
      letterSpacing: -0.5,
    },
    logoDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: Colors.primary.yellow500,
      marginLeft: 2,
    },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    headerIconBtn: {
      padding: 4,
    },
    headerIcon: {
      fontSize: 20,
    },
    avatarCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: Colors.primary.blue100,
      borderWidth: 2,
      borderColor: Colors.primary.blue500,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: 14,
      fontWeight: "700",
      color: Colors.primary.blue500,
    },

    // Scroll
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 20,
    },

    // Search Bar
    searchBarWrapper: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.surface,
      marginHorizontal: 16,
      marginTop: 14,
      marginBottom: 4,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 50,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 8,
    },
    searchIcon: {
      fontSize: 16,
      color: theme.text.placeholder,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: theme.text.primary,
      padding: 0,
    },

    // Hero Banner (Tetap Biru)
    heroBanner: {
      flexDirection: "row",
      backgroundColor: Colors.primary.blue500,
      marginHorizontal: 16,
      marginVertical: 14,
      borderRadius: 20,
      padding: 20,
      overflow: "hidden",
      minHeight: 140,
    },
    heroBannerLeft: {
      flex: 1,
      justifyContent: "space-between",
    },
    heroSubtitle: {
      color: Colors.primary.blue200,
      fontSize: 11,
      fontWeight: "500",
      marginBottom: 6,
    },
    heroTitle: {
      color: "#FFFFFF",
      fontSize: 20,
      fontWeight: "800",
      lineHeight: 26,
      letterSpacing: -0.4,
      flex: 1,
    },
    heroButton: {
      backgroundColor: Colors.primary.yellow500,
      alignSelf: "flex-start",
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 50,
      marginTop: 12,
    },
    heroButtonText: {
      color: "#1A1A2E",
      fontSize: 13,
      fontWeight: "700",
    },
    heroBannerRight: {
      alignItems: "center",
      justifyContent: "center",
      paddingLeft: 10,
    },
    heroBannerEmoji: {
      fontSize: 62,
      opacity: 0.9,
    },

    // Categories
    categoryScroll: {
      marginBottom: 4,
    },
    categoryScrollContent: {
      paddingHorizontal: 16,
      gap: 8,
    },
    categoryChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 50,
      backgroundColor: theme.surface,
      borderWidth: 1.5,
      borderColor: theme.border,
    },
    categoryChipActive: {
      backgroundColor: Colors.primary.blue500,
      borderColor: Colors.primary.blue500,
    },
    categoryChipText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.text.secondary,
    },
    categoryChipTextActive: {
      color: "#FFFFFF",
    },

    // Section Header
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      marginTop: 16,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: theme.text.heading,
      letterSpacing: -0.3,
    },
    sectionLink: {
      fontSize: 13,
      fontWeight: "600",
      color: Colors.primary.blue500,
    },

    // Product Grid
    productGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: 12,
      gap: 10,
    },
    productGridItem: {
      width: "47.5%",
    },
    productCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: "hidden",
      shadowColor: shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: shadowOpacity,
      shadowRadius: 8,
      elevation: 3,
    },
    productImagePlaceholder: {
      height: 120,
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    productImageIcon: {
      fontSize: 40,
    },
    hotBadge: {
      position: "absolute",
      top: 8,
      left: 8,
      backgroundColor: Colors.primary.yellow500,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 50,
      zIndex: 1,
    },
    hotBadgeText: {
      fontSize: 10,
      fontWeight: "800",
      color: "#1A1A2E",
    },
    productCardBody: {
      padding: 10,
      gap: 3,
    },
    productTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.text.heading,
      lineHeight: 18,
    },
    productCondition: {
      fontSize: 11,
      color: theme.text.secondary,
      marginTop: 1,
    },
    productPrice: {
      fontSize: 14,
      fontWeight: "800",
      color: Colors.primary.blue500,
      marginTop: 3,
    },
    productCardFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 6,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 50,
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: "700",
    },
    wishlistBtn: {
      padding: 2,
    },
    wishlistIcon: {
      fontSize: 18,
      color: theme.text.placeholder,
    },

    // Bottom Navigation
    bottomNav: {
      flexDirection: "row",
      backgroundColor: theme.surface,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingBottom: Platform.OS === "ios" ? 20 : 8,
      paddingTop: 8,
      paddingHorizontal: 8,
    },
    navTab: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      paddingVertical: 4,
    },
    navIcon: {
      fontSize: 22,
      color: theme.text.placeholder,
    },
    navIconActive: {
      color: Colors.primary.blue500,
    },
    navLabel: {
      fontSize: 10,
      fontWeight: "500",
      color: theme.text.placeholder,
      marginTop: 2,
    },
    navLabelActive: {
      color: Colors.primary.blue500,
      fontWeight: "700",
    },
    navActiveDot: {
      position: "absolute",
      bottom: -4,
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: Colors.primary.blue500,
    },
    navCenterBtn: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    navCenterCircle: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: Colors.primary.yellow500,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: Colors.primary.yellow500,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 6,
    },
    navCenterIcon: {
      fontSize: 26,
      color: "#1A1A2E",
      fontWeight: "800",
      lineHeight: 28,
    },
  });
};
