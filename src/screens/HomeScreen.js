// src/screens/HomeScreen.js
// Thriftly — Master Navigation Shell (Production-Ready Auto Light & Dark Mode)

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Platform,
  useColorScheme,
  Animated,
  Dimensions,
  Alert,
  BackHandler,
  ToastAndroid,
  Linking,
  Modal,
  LogBox,
  NativeModules,
  RefreshControl,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "../constants/Colors";
import * as Notifications from "expo-notifications";
import { Ionicons } from "@expo/vector-icons";
import Config from "../services/config";

const resolveImageUrl = (url) => {
  if (!url) return "https://images.unsplash.com/photo-1542291026-7eec264c27ff";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("file://")) {
    return url;
  }
  const host = Config.BASE_URL.replace("/api", "");
  return `${host}${url}`;
};

// Ignore expo-notifications warnings/errors inside Expo Go
LogBox.ignoreLogs(["expo-notifications"]);

// Configure Expo notifications behavior
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (e) {
  console.log("expo-notifications setNotificationHandler not supported in Expo Go:", e.message);
}
// Import secondary tab screens
import ExploreScreen from "./ExploreScreen";
import SellScreen from "./SellScreen";
import WishlistScreen from "./WishlistScreen";
import ProfileScreen from "./ProfileScreen";
import DetailScreen from "./DetailScreen";
import { t, preFetchTranslations } from "../utils/translator";
import api from "../services/api";

const { width: screenWidth } = Dimensions.get("window");

export default function HomeScreen({
  onLogout,
  currentUser,
  userThemeMode,
  setUserThemeMode,
  isDark,
  theme,
  language,
  setLanguage,
}) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState("home");
  const [previousTab, setPreviousTab] = useState("home");
  const [selectedItem, setSelectedItem] = useState(null);
  const [exploreCategory, setExploreCategory] = useState("0");
  const [autoFocusSearch, setAutoFocusSearch] = useState(false);
  const [wishlist, setWishlist] = useState([]);
  const [activeHost, setActiveHost] = useState("https://thriftly.id");
  const [items, setItems] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);

  const fetchItems = async () => {
    try {
      const data = await api.items.getAll();
      if (data) {
        setItems(data);
      }
    } catch (error) {
      console.log("Error fetching items:", error);
    }
  };

  const fetchWishlist = async () => {
    try {
      const data = await api.wishlist.get();
      if (data) {
        setWishlist(data);
      }
    } catch (error) {
      console.log("Error fetching wishlist:", error);
    }
  };


  // Ref untuk menyimpan jumlah notifikasi sebelumnya (mendeteksi booking baru)
  // Nilai awal -1 artinya belum pernah fetch sama sekali
  const prevNotifCountRef = useRef(-1);

  const fetchNotificationsAndAlert = async () => {
    // Ambil booking notifications (transaksi penjualan) — masing-masing isolated
    let bookingNotifs = [];
    try {
      const salesData = await api.transactions.getSales();
      if (salesData) {
        bookingNotifs = salesData.map((trans) => ({
          id: trans.id,
          type: "booking",
          title: "Booking COD Baru!",
          message: `${trans.buyer} ingin membeli "${trans.title}" Anda.`,
          details: trans.meetingNote || "Tidak ada catatan lokasi",
          buyerName: trans.buyer,
          buyerPhone: trans.buyerPhone,
          itemId: trans.itemId,
          status: trans.status === "Pending" ? "pending" : trans.status === "Success" ? "accepted" : "declined",
          time: trans.date,
        }));
      }
    } catch (salesErr) {
      // getSales gagal (500/403) — skip, jangan blokir laporan
    }

    // Ambil laporan masuk untuk penjual — isolated
    let reportNotifs = [];
    try {
      const reportsData = await api.reports.getForSeller();
      if (reportsData) {
        reportNotifs = reportsData.map((r) => ({
          id: `report-${r.id}`,
          type: "report",
          title: "🚩 Laporan Masuk",
          message: `Iklan "${r.itemTitle}" dilaporkan: "${r.reason}".`,
          details: `Dilaporkan pada ${r.date}`,
          itemId: r.itemId,
          status: r.itemStatus === "Suspended" ? "suspended" : "reported",
          time: r.date,
        }));
      }
    } catch (reportErr) {
      // getForSeller gagal (tabel belum ada / 500) — skip
    }

    // Gabungkan dan update state
    const allNotifs = [...bookingNotifs, ...reportNotifs];

    const pendingCount = bookingNotifs.filter(n => n.status === "pending").length
                       + reportNotifs.filter(n => n.status === "reported").length;
    const prevCount = prevNotifCountRef.current;

    if (prevCount >= 0 && pendingCount > prevCount) {
      const newCount = pendingCount - prevCount;
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "🔔 Notifikasi Thriftly",
            body: `Ada ${newCount} notifikasi baru untuk Anda.`,
            sound: true,
          },
          trigger: null,
        });
      } catch (notifErr) { /* abaikan jika tidak tersedia */ }
    }

    prevNotifCountRef.current = pendingCount;
    if (allNotifs.length > 0 || prevCount === -1) {
      setNotifications(allNotifs);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchItems();
      fetchWishlist();
      fetchNotificationsAndAlert();

      // Polling setiap 15 detik untuk notifikasi real-time
      const pollingInterval = setInterval(() => {
        fetchNotificationsAndAlert();
      }, 15000);

      // Bersihkan interval saat komponen unmount / user logout
      return () => clearInterval(pollingInterval);
    }
  }, [currentUser]);
  const [customAlert, setCustomAlert] = useState({
    visible: false,
    title: "",
    message: "",
    buttons: [],
    type: "info",
  });

  const showAlert = (title, message, buttons = [], type = "info") => {
    setCustomAlert({
      visible: true,
      title,
      message,
      buttons: buttons.length > 0 ? buttons : [{ text: "OK" }],
      type,
    });
  };
  const lastBackPress = useRef(0);

  // Pre-fetch translations for all feed items, categories, tabs, and menus in the background when language is not Indonesian
  useEffect(() => {
    if (language !== "id" && items && items.length > 0) {
      const textsToPreFetch = [
        // Home Tab & Notifications
        "Tips Nego via WhatsApp",
        "Bisa Nego via\nWhatsApp",
        "Langsung chat penjual buat deal harga",
        "Coba Nego",
        "Semua Kategori",
        "Elektronik",
        "Buku & Diktat",
        "Pakaian",
        "Kos & Sewa",
        "Alat Tulis",
        "Keranjang Belanja",
        "Notifikasi Transaksi",
        "Belum Ada Penjualan",
        "Iklan barang Anda yang diubah statusnya menjadi Terjual akan muncul di sini.",
        "Belum Ada Notifikasi",
        "Setiap ada tawaran masuk dari pembeli akan muncul di sini.",
        "Tolak",
        "Terima & WA",
        "✓ Disetujui (Hubungi WA)",
        "✕ Ditolak",
        "Booking COD Baru!",
        "Budi S. mengajukan booking untuk Buku Kalkulus Purcel Anda.",
        "Lokasi: Gazebo TRPL 💻 | Waktu: Selesai Kuliah (17:00)",

        // Explore Tab
        "Jelajahi Barang Thrift Terbaik",
        "Cari barang kuliah, kosan, dll...",
        "Paling Dicari",
        "Filter Kategori",
        "Kondisi",
        "Semua Kondisi",
        "Baru",
        "Sangat Baik (Like New)",
        "Baik (Good)",
        "Cukup (Fair)",
        "Terapkan Filter",
        "Reset Filter",
        "Tidak ada barang ditemukan",
        "Coba cari kata kunci lain",

        // Sell Tab
        "Pasang Iklan Baru",
        "Mulai Jual Barangmu",
        "Nama Barang",
        "Pilih Kategori",
        "Harga (Rp)",
        "Deskripsi Barang",
        "Nomor WhatsApp Aktif",
        "Pilih Foto",
        "Ambil Foto",
        "Pilih dari Galeri",
        "Pasang Iklan Sekarang",
        "Barang berhasil diiklankan!",
        "Gagal memposting barang.",

        // Wishlist Tab
        "Wishlist Anda",
        "Belum Ada Wishlist",
        "Klik ikon hati pada barang yang Anda sukai untuk menyimpannya di sini.",

        // Profile Tab
        "Pengaturan Akun",
        "Riwayat Transaksi",
        "Bantuan & Dukungan",
        "Syarat & Ketentuan",
        "Hubungi Admin",
        "Keluar Akun",
        "Versi Aplikasi",
        "Bersihkan Cache",
        "Nama Lengkap",
        "Program Studi",
        "Kelas / Kampus",
        "Email Mahasiswa",
        "Nomor Telepon",
        "Simpan Pengaturan",
        "Hubungi Layanan Admin",
        "Jika Anda mengalami kendala atau membutuhkan bantuan, hubungi kami via WhatsApp:",
        "Beri Penilaian",
        "Beri Rating",
        "Kirim Penilaian",
        "Belum dinilai",
        "Belum dinilai pembeli",
        
        // Utility & Security and sub-screens
        "Utilitas & Keamanan",
        "Pusat Akun",
        "Ubah profil, email, sandi",
        "Iklan Saya",
        "Kelola barang yang Anda jual",
        "Riwayat Transaksi",
        "Daftar pembelian & penjualan",
        "Pengaturan",
        "Ubah tema dan bahasa",
        "Hubungi Admin Kampus",
        "Butuh bantuan transaksi?",
        "Syarat & Ketentuan",
        "Aturan transaksi Thriftly",
        "Mode Tema",
        "Sistem",
        "Terang",
        "Gelap",
        "Bahasa Aplikasi",
        "Notifikasi",
        "Notifikasi Transaksi",
        "Status booking COD & penjualan",
        "Notifikasi Chat",
        "Pemberitahuan pesan obrolan masuk",
        "Keamanan & Akun",
        "Ubah Kata Sandi",
        "Fitur ubah kata sandi sedang dalam pengembangan.",
        "Hapus Akun Permanen",
        "Menghapus seluruh data akun Thriftly Anda secara permanen.",
        "Apakah Anda yakin ingin menghapus akun Anda secara permanen? Tindakan ini tidak dapat dibatalkan.",
        "Hapus Akun",
        "Batal",
      ];
      
      items.forEach(item => {
        if (item.title) textsToPreFetch.push(item.title);
        if (item.description) textsToPreFetch.push(item.description);
        if (item.condition) textsToPreFetch.push(item.condition);
        if (item.category) textsToPreFetch.push(item.category);
        if (item.seller) textsToPreFetch.push(item.seller);
      });

      preFetchTranslations(textsToPreFetch, language);
    }
  }, [items, language]);

  // Request native local notification permissions and configure channel
  useEffect(() => {
    async function requestPermissionsAndConfigureChannel() {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== "granted") {
          return;
        }

        // Configure Android channel for heads-up alerts (important!)
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#FF231F7A",
          });
        }
      } catch (error) {
        console.log("expo-notifications permissions/channel setup not supported in Expo Go:", error.message);
      }
    }
    requestPermissionsAndConfigureChannel();
  }, []);




  // Animasi Bottom Nav
  const indexAnim = useRef(new Animated.Value(0)).current;
  const stretchAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Tab scaling bounce anims
  const tabScales = [
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current, // Center button
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
  ];

  const NAV_TABS = [
    { id: "home", label: t("Beranda", language), index: 0 },
    { id: "explore", label: t("Jelajahi", language), index: 1 },
    { id: "sell", isCenter: true, index: 2 },
    { id: "wishlist", label: t("Wishlist", language), index: 3 },
    { id: "profile", label: t("Profil", language), index: 4 },
  ];

  // Dynamic Layout Math
  const horizontalPadding = 32;
  const navWidth = screenWidth - horizontalPadding;
  const tabWidth = navWidth / 5;
  // Handle Android Hardware Back Button (with double press exit)
  useEffect(() => {
    const handleBackPress = () => {
      if (activeTab === "detail") {
        setActiveTab(previousTab || "home");
        return true; // Intercept press, do not exit app
      }

      // Go back to home tab if on any other tab
      if (activeTab !== "home") {
        setActiveTab("home");
        return true;
      }

      // Double press exit logic on main tabs
      const now = Date.now();
      if (now - lastBackPress.current < 2000) {
        BackHandler.exitApp(); // Force exit explicitly on Android
        return true;
      }

      lastBackPress.current = now;
      if (Platform.OS === "android") {
        ToastAndroid.show("Tekan sekali lagi untuk keluar", ToastAndroid.SHORT);
      }
      return true; // Prevent default app exit
    };

    const subscription = BackHandler.addEventListener("hardwareBackPress", handleBackPress);

    return () => {
      subscription.remove();
    };
  }, [activeTab, previousTab]);

  // Handle Deep Linking (thriftly://product/<id>)
  useEffect(() => {
    const handleUrl = (url) => {
      if (!url) return;
      
      const productMatch = url.match(/product\/([^?/]+)/);
      if (productMatch && productMatch[1]) {
        const productId = productMatch[1];
        const matchedItem = items.find((itm) => String(itm.id) === String(productId));
        if (matchedItem) {
          setPreviousTab(activeTab);
          setSelectedItem(matchedItem);
          setActiveTab("detail");
        } else {
          showAlert(
            t("Tidak Ditemukan", language),
            t("Tautan produk yang dibagikan tidak valid atau sudah tidak ada.", language),
            [{ text: "OK" }],
            "warning"
          );
        }
      }
    };

    Linking.getInitialURL()
      .then((url) => {
        if (url) handleUrl(url);
      })
      .catch((err) => console.log("Linking error:", err));

    const subscription = Linking.addEventListener("url", (event) => {
      if (event.url) handleUrl(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [items, activeTab, language]);

  // Detect active host from JavaScript bundle source URL (localtunnel, ngrok, or production domain)
  useEffect(() => {
    try {
      const scriptURL = NativeModules.SourceCode?.scriptURL;
      if (scriptURL) {
        const match = scriptURL.match(/^(https?):\/\/([^/]+)/);
        if (match) {
          const protocol = match[1];
          const host = match[2];
          if (!host.includes("thriftly.id")) {
            setActiveHost(`${protocol}://${host}`);
          }
        }
      }
    } catch (err) {
      console.log("Host detection error:", err);
    }
  }, []);

  useEffect(() => {
    let targetIndex = 0;
    switch (activeTab) {
      case "home":
        targetIndex = 0;
        break;
      case "explore":
        targetIndex = 1;
        break;
      case "sell":
        targetIndex = 2;
        break;
      case "wishlist":
        targetIndex = 3;
        break;
      case "profile":
        targetIndex = 4;
        break;
      case "detail":
        targetIndex = -1;
        break;
    }

    Animated.parallel([
      Animated.spring(indexAnim, {
        toValue: targetIndex,
        useNativeDriver: Platform.OS !== 'web',
        friction: 8,
        tension: 40,
      }),
      Animated.sequence([
        Animated.timing(stretchAnim, {
          toValue: 1.3,
          duration: 100,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(stretchAnim, {
          toValue: 1,
          friction: 5,
          useNativeDriver: Platform.OS !== 'web',
        })
      ]),
      Animated.spring(rotateAnim, {
        toValue: activeTab === "sell" ? 1 : 0,
        useNativeDriver: Platform.OS !== 'web',
        friction: 7,
        tension: 42,
      })
    ]).start();
  }, [activeTab]);

  const handleTabPress = (tabId, index) => {
    if (tabId === "sell" && activeTab === "sell") {
      // Toggle back to the previous active tab
      setActiveTab(previousTab || "home");
      return;
    }

    if (activeTab !== tabId) {
      if (activeTab !== "detail") {
        setPreviousTab(activeTab);
      }
    }

    // If user clicked Sell tab, reset transition categories to default Explore
    if (tabId === "explore") {
      setExploreCategory("0");
    }
    setActiveTab(tabId);

    // Icon scale bounce effect
    tabScales[index].setValue(0.85);
    Animated.spring(tabScales[index], {
      toValue: 1.15,
      friction: 4,
      tension: 40,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      Animated.spring(tabScales[index], {
        toValue: 1,
        friction: 3,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    });
  };

  const handleNavigateToExplore = (catId = "0", autoFocus = false) => {
    setExploreCategory(catId);
    setAutoFocusSearch(autoFocus);
    setActiveTab("explore");
  };

  const handlePressProduct = (item) => {
    setPreviousTab(activeTab);
    setSelectedItem(item);
    setActiveTab("detail");
  };

  const handleAddToCart = (item) => {
    if (cart.some((cartItem) => cartItem.id === item.id)) {
      showAlert(
        t("Sudah di Keranjang", language),
        t("Barang ini sudah ada di dalam keranjang belanja Anda!", language),
        [],
        "warning"
      );
      return;
    }
    setCart((prev) => [...prev, item]);
    showAlert(
      t("Sukses", language),
      language === "en"
        ? `"${item.title}" added to your cart!`
        : `"${item.title}" berhasil dimasukkan ke keranjang belanja!`,
      [],
      "success"
    );
  };

  const handleRemoveFromCart = (itemId) => {
    setCart((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleCartCheckout = () => {
    if (cart.length === 0) return;
    
    // Mark items as booked
    cart.forEach((item) => {
      handleBookItem(item.id, "Booked");
    });
    
    // Clear cart
    setCart([]);
    
    showAlert(
      t("Booking Berhasil", language),
      t("Semua barang di keranjang Anda berhasil dibooking! Silakan cek detail transaksi dan hubungi penjual via WhatsApp.", language),
      [],
      "success"
    );
  };

  const handleBookItem = async (itemId, status = "Booked") => {
    try {
      if (status === "Booked") {
        await api.transactions.book(itemId, "Janjian COD Kampus 🍜");
        await fetchItems();
        await fetchNotifications();
        
        showAlert(
          t("Booking Berhasil", language),
          t("Barang berhasil dibooking! Silakan hubungi penjual via WhatsApp.", language),
          [],
          "success"
        );
      } else {
        await api.items.updateStatus(itemId, status);
        await fetchItems();
      }
    } catch (err) {
      console.log("Failed to sync booking status to backend:", err);
      const errMsg = err.response?.data || t("Terjadi kesalahan saat memproses booking.", language);
      showAlert(t("Gagal Booking", language), errMsg, [], "danger");
    }
  };

  const handleAcceptNotification = async (notif) => {
    // Validation: If it is a mock notification (starts with 'n'), handle locally
    if (notif.id && notif.id.toString().startsWith("n")) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, status: "accepted" } : n))
      );
      const message = `Halo ${notif.buyerName}, saya menyetujui penawaran COD Anda untuk barang "${items.find(i => i.id === notif.itemId)?.title || "produk"}". Sampai jumpa di lokasi sesuai jadwal!`;
      const url = `whatsapp://send?phone=${notif.buyerPhone}&text=${encodeURIComponent(message)}`;
      Linking.canOpenURL(url).then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Linking.openURL(`https://wa.me/${notif.buyerPhone}?text=${encodeURIComponent(message)}`);
        }
      });
      return;
    }

    try {
      const response = await api.transactions.updateStatus(notif.id, "Success");
      if (response.status === "SUCCESS") {
        await fetchNotifications();
        await fetchItems();
        
        const message = `Halo ${notif.buyerName}, saya menyetujui penawaran COD Anda untuk barang "${items.find(i => i.id === notif.itemId)?.title || "produk"}". Sampai jumpa di lokasi sesuai jadwal!`;
        const url = `whatsapp://send?phone=${notif.buyerPhone}&text=${encodeURIComponent(message)}`;
        Linking.canOpenURL(url).then((supported) => {
          if (supported) {
            Linking.openURL(url);
          } else {
            Linking.openURL(`https://wa.me/${notif.buyerPhone}?text=${encodeURIComponent(message)}`);
          }
        });
      }
    } catch (err) {
      console.log("Failed to accept booking on backend:", err);
    }
  };

  const handleDeclineNotification = async (notifId) => {
    // Validation: If it is a mock notification (starts with 'n'), handle locally
    if (notifId && notifId.toString().startsWith("n")) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, status: "declined" } : n))
      );
      return;
    }

    try {
      const response = await api.transactions.updateStatus(notifId, "Cancelled");
      if (response.status === "SUCCESS") {
        await fetchNotifications();
        await fetchItems();
      }
    } catch (err) {
      console.log("Failed to decline booking on backend:", err);
    }
  };

  const handleRefresh = async () => {
    await fetchItems();
    await fetchWishlist();
    await fetchNotifications();
  };

  const toggleWishlist = async (itemId) => {
    try {
      const data = await api.wishlist.toggle(itemId);
      if (data.status === "SUCCESS") {
        if (data.action === "added") {
          setWishlist((prev) => [...prev, itemId]);
        } else {
          setWishlist((prev) => prev.filter((id) => id !== itemId));
        }
      }
    } catch (error) {
      console.log("Failed to toggle wishlist on backend:", error);
    }
  };

  const handleAddItem = async (newItem) => {
    try {
      const data = await api.items.create({
        title: newItem.title,
        description: newItem.description || "Tidak ada deskripsi",
        price: newItem.price,
        condition: newItem.condition,
        categoryId: newItem.categoryId,
        locationName: newItem.location || "Kantin Kampus",
        latitude: newItem.latitude || null,
        longitude: newItem.longitude || null,
        images: newItem.images || [],
      });
      if (data.status === "SUCCESS") {
        await fetchItems();
      }
    } catch (error) {
      console.log("Failed to post new item to backend database:", error);
    }
  };

  // Nav indicator interpolation
  const indicatorTranslateX = indexAnim.interpolate({
    inputRange: [-1, 0, 1, 2, 3, 4],
    outputRange: [
      -tabWidth, // Slide out left
      6,
      tabWidth + 6,
      2 * tabWidth + 6,
      3 * tabWidth + 6,
      4 * tabWidth + 6,
    ],
  });

  // Fade out bottom background capsule on Center button (Index 2) or Detail (-1)
  const indicatorOpacity = indexAnim.interpolate({
    inputRange: [-1, 0, 1, 1.9, 2, 2.1, 3, 4],
    outputRange: [0, 1, 1, 0, 0, 0, 1, 1],
  });

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "135deg"],
  });

  const styles = getStyles(theme, isDark, tabWidth, insets);

  // User Stats computed for profile
  const userStats = {
    activeListings: items.filter(
      (item) => item.sellerNim === currentUser?.nim && item.status === "Available"
    ).length,
    soldListings: items.filter(
      (item) => item.sellerNim === currentUser?.nim && item.status === "Sold"
    ).length,
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.background}
      />

      {/* ── Persisten Header ── */}
      {activeTab !== "detail" && (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.logo}>THRIFTLY</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => setShowNotifications(true)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="notifications-outline"
                size={24}
                color={isDark ? "#FFFFFF" : "#000000"}
              />
              {notifications.some((n) => n.status === "pending") && (
                <View style={styles.notificationDot} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={() => setShowCart(true)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="cart-outline"
                size={24}
                color={isDark ? "#FFFFFF" : "#000000"}
              />
              {cart.length > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cart.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Main Screens Container ── */}
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1, display: activeTab === "home" ? "flex" : "none" }}>
          <HomeTabContent
            items={items}
            wishlist={wishlist}
            toggleWishlist={toggleWishlist}
            theme={theme}
            isDark={isDark}
            onNavigateToExplore={(catId) => handleNavigateToExplore(catId, false)}
            onPressSearch={() => handleNavigateToExplore("0", true)}
            onPressProduct={handlePressProduct}
            visible={activeTab === "home"}
            language={language}
            showAlert={showAlert}
            onRefresh={handleRefresh}
          />
        </View>

        <View style={{ flex: 1, display: activeTab === "explore" ? "flex" : "none" }}>
          <ExploreScreen
            items={items}
            wishlist={wishlist}
            toggleWishlist={toggleWishlist}
            theme={theme}
            isDark={isDark}
            initialCategory={exploreCategory}
            onPressProduct={handlePressProduct}
            autoFocusSearch={autoFocusSearch}
            onSearchFocused={() => setAutoFocusSearch(false)}
            visible={activeTab === "explore"}
            language={language}
          />
        </View>

        <View style={{ flex: 1, display: activeTab === "sell" ? "flex" : "none" }}>
          <SellScreen
            onAddItem={handleAddItem}
            theme={theme}
            isDark={isDark}
            visible={activeTab === "sell"}
            showAlert={showAlert}
            language={language}
          />
        </View>

        <View style={{ flex: 1, display: activeTab === "wishlist" ? "flex" : "none" }}>
          <WishlistScreen
            items={items}
            wishlist={wishlist}
            toggleWishlist={toggleWishlist}
            theme={theme}
            isDark={isDark}
            onNavigateToExplore={() => handleNavigateToExplore("0")}
            onPressProduct={handlePressProduct}
            visible={activeTab === "wishlist"}
            language={language}
          />
        </View>

        <View style={{ flex: 1, display: activeTab === "profile" ? "flex" : "none" }}>
          <ProfileScreen
            theme={theme}
            isDark={isDark}
            userStats={userStats}
            items={items}
            setItems={setItems}
            userThemeMode={userThemeMode}
            setUserThemeMode={setUserThemeMode}
            language={language}
            setLanguage={setLanguage}
            onLogout={onLogout}
            visible={activeTab === "profile"}
            currentUser={currentUser}
          />
        </View>

        {activeTab === "detail" && selectedItem && (
          <DetailScreen
            item={selectedItem}
            activeHost={activeHost}
            onBack={() => {
              setActiveTab(previousTab || "home");
              setSelectedItem(null);
            }}
            theme={theme}
            isDark={isDark}
            isWishlisted={wishlist.includes(selectedItem.id)}
            onWishlistPress={() => toggleWishlist(selectedItem.id)}
            onBookItem={handleBookItem}
            isOwner={selectedItem?.sellerNim === currentUser?.nim}
            onChangeStatus={(status) => handleBookItem(selectedItem.id, status)}
            onAddToCart={handleAddToCart}
            showAlert={showAlert}
            language={language}
          />
        )}
      </View>

      {/* ── Bottom Navigation ── */}
      {activeTab !== "detail" && (
        <View style={styles.bottomNav}>
          {NAV_TABS.map((tab) => {
            const isActive = activeTab === tab.id;

            if (tab.isCenter) {
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={styles.navCenterBtn}
                  onPress={() => handleTabPress(tab.id, tab.index)}
                  activeOpacity={0.8}
                >
                  <Animated.View
                    style={[
                      styles.navCenterCircle,
                      {
                        transform: [
                          { scale: tabScales[tab.index] },
                          { rotate: spin },
                        ],
                      },
                    ]}
                  >
                    <Ionicons name="add" size={28} color="#FFFFFF" />
                  </Animated.View>
                </TouchableOpacity>
              );
            }

            // Determine icon name based on ID
            let iconName = "";
            if (tab.id === "home") iconName = isActive ? "home" : "home-outline";
            else if (tab.id === "explore") iconName = isActive ? "search" : "search-outline";
            else if (tab.id === "wishlist") iconName = isActive ? "bookmark" : "bookmark-outline";
            else if (tab.id === "profile") iconName = isActive ? "person" : "person-outline";

            return (
              <TouchableOpacity
                key={tab.id}
                style={styles.navTab}
                onPress={() => handleTabPress(tab.id, tab.index)}
                activeOpacity={0.8}
              >
                <Animated.View
                  style={{
                    alignItems: "center",
                    transform: [{ scale: tabScales[tab.index] }],
                    position: "relative",
                  }}
                >
                  <Ionicons
                    name={iconName}
                    size={20} // Spec: Tab icon: 20px
                    color={isActive ? (isDark ? Colors.primary.yellow500 : Colors.primary.blue500) : theme.text.placeholder}
                  />
                  <Text
                    style={[styles.navLabel, isActive && styles.navLabelActive]}
                  >
                    {tab.label}
                  </Text>
                  {isActive && <View style={styles.navActiveDot} />}
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}



      {/* Render Notification Modal */}
      <NotificationModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        onAccept={handleAcceptNotification}
        onDecline={handleDeclineNotification}
        theme={theme}
        isDark={isDark}
        language={language}
      />

      {/* Render Cart Modal */}
      <CartModal
        visible={showCart}
        onClose={() => setShowCart(false)}
        cart={cart}
        onRemoveItem={handleRemoveFromCart}
        onCheckout={handleCartCheckout}
        theme={theme}
        isDark={isDark}
        language={language}
      />

      {/* Render Custom Premium Alert Modal */}
      <CustomAlertModal
        visible={customAlert.visible}
        onClose={() => setCustomAlert((prev) => ({ ...prev, visible: false }))}
        title={customAlert.title}
        message={customAlert.message}
        buttons={customAlert.buttons}
        type={customAlert.type}
        theme={theme}
        isDark={isDark}
      />
    </View>
  );
}

// ─── HOME TAB CONTENT SUBCOMPONENT ───────────────────────────────────────────
function HomeTabContent({
  items,
  wishlist,
  toggleWishlist,
  theme,
  isDark,
  onNavigateToExplore,
  onPressSearch,
  onPressProduct,
  visible,
  language,
  showAlert,
  onRefresh: onRefreshProp,
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(0.93)).current;
  const heroFade = useRef(new Animated.Value(0)).current;

  const [refreshing, setRefreshing] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      if (onRefreshProp) {
        await onRefreshProp();
      }
    } catch (e) {
      console.log(e);
    } finally {
      setRefreshing(false);
    }
  }, [onRefreshProp]);
  const heroScrollRef = useRef(null);
  const [heroWidth, setHeroWidth] = useState(screenWidth - 32);

  const HERO_CATEGORIES = [
    { 
      id: "whatsapp-tip", 
      label: "TIPS THRIFTLY", 
      sub: "Bisa Nego via\nWhatsApp", 
      desc: "Langsung chat penjual buat deal harga", 
      icon: "💬", 
      bg: "#0066FF", 
      accent: "#0066FF",
      btnText: "Coba Nego", 
      isTip: true 
    },
    { id: "1", label: "Elektronik",      sub: "Laptop, HP & gadget",       icon: "💻", bg: isDark ? "#1a365d" : "#2b6cb0", accent: "#2B6CB0", btnText: "Jelajahi" },
    { id: "2", label: "Buku & Referensi",sub: "Buku kuliah & pelajaran",  icon: "📚", bg: isDark ? "#7b341e" : "#c05621", accent: "#C05621", btnText: "Jelajahi" },
    { id: "3", label: "Pakaian",         sub: "Fashion & aksesoris",      icon: "👕", bg: isDark ? "#22543d" : "#2f855a", accent: "#2F855A", btnText: "Jelajahi" },
  ];

  // Auto-scroll hero carousel every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      const next = (heroIndex + 1) % HERO_CATEGORIES.length;
      heroScrollRef.current?.scrollTo({ x: next * heroWidth, animated: true });
      setHeroIndex(next);
    }, 4000);
    return () => clearInterval(timer);
  }, [heroIndex, heroWidth]);

  // Set up animation values for category chips
  const categoryScales = useRef(
    [0, 1, 2, 3, 4, 5].map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      heroScale.setValue(0.93);
      heroFade.setValue(0);
      categoryScales.forEach((scaleVal) => scaleVal.setValue(0));

      Animated.parallel([
        Animated.spring(fadeAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 30,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(heroScale, {
          toValue: 1,
          friction: 6,
          tension: 35,
          delay: 150,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(heroFade, {
          toValue: 1,
          duration: 350,
          delay: 150,
          useNativeDriver: Platform.OS !== 'web',
        }),
        ...categoryScales.map((scaleVal, index) =>
          Animated.spring(scaleVal, {
            toValue: 1,
            friction: 6,
            tension: 40,
            delay: index * 60 + 200,
            useNativeDriver: Platform.OS !== 'web',
          })
        ),
      ]).start();
    }
  }, [visible]);

  const CATEGORIES = [
    { id: "0", label: "Semua Kategori", icon: "🌐" },
    { id: "2", label: "Buku & Diktat", icon: "📚" },
    { id: "1", label: "Elektronik", icon: "💻" },
    { id: "3", label: "Pakaian", icon: "👕" },
    { id: "4", label: "Kos & Sewa", icon: "🏠" },
    { id: "5", label: "Alat Tulis", icon: "✏️" },
  ];

  const styles = getHomeContentStyles(theme, isDark);

  return (
    <Animated.ScrollView
      style={[
        styles.scrollView,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[Colors.primary.blue500]}
          tintColor={isDark ? "#FFFFFF" : Colors.primary.blue500}
        />
      }
    >
      {/* ── Search Bar (Non-editable, links to Explore) ── */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPressSearch}
        style={styles.searchBarWrapper}
      >
        <Text style={styles.searchIcon}>🔍</Text>
        <Text style={styles.searchTextPlaceholder}>{t("Cari barang bekas...", language)}</Text>
      </TouchableOpacity>

      {/* ── Hero Category Carousel ── */}
      <Animated.View
        style={[styles.heroBanner, { opacity: heroFade, transform: [{ scale: heroScale }] }]}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w && w > 0) {
            setHeroWidth(w);
          }
        }}
      >
        <ScrollView
          ref={heroScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / heroWidth);
            setHeroIndex(idx);
          }}
          style={{ width: heroWidth, height: 190 }}
        >
          {HERO_CATEGORIES.map((cat) => {
            const count = cat.id === "0" ? items.length : items.filter((i) => i.categoryId === cat.id).length;
            return (
              <TouchableOpacity
                key={cat.id}
                activeOpacity={0.88}
                style={[styles.heroSlide, { width: heroWidth, backgroundColor: cat.bg }]}
                onPress={() => {
                  if (cat.isTip) {
                    showAlert(
                      t("Tips Thriftly", language),
                      t("Ketuk tombol 'Hubungi Penjual' di halaman detail barang untuk langsung chat via WhatsApp!", language),
                      [],
                      "info"
                    );
                  } else {
                    onNavigateToExplore(cat.id);
                  }
                }}
              >
                {/* Decorative circles */}
                <View style={[styles.heroCircle1, { backgroundColor: cat.accent + "55" }]} />
                <View style={[styles.heroCircle2, { backgroundColor: cat.accent + "33" }]} />

                {/* Left side: text, sub, badge */}
                <View style={styles.heroSlideLeft}>
                  <View>
                    {cat.isTip ? (
                      <>
                        <Text style={{ color: "#FFD600", fontSize: 11, fontFamily: "Barlow_900Black", letterSpacing: 0.5, marginBottom: 4 }}>
                          {t(cat.label, language)}
                        </Text>
                        <Text style={styles.heroSlideSubTitle}>
                          {t(cat.sub, language)}
                        </Text>
                        <Text style={{ color: "#E0F2FE", fontSize: 12, fontFamily: "Barlow_500Medium", marginTop: 2 }}>
                          {t(cat.desc, language)}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.heroSlideLabel}>{t(cat.label, language)}</Text>
                        <Text style={styles.heroSlideSub}>{t(cat.sub, language)}</Text>
                        <View style={styles.heroSlideBadge}>
                          <Text style={styles.heroSlideBadgeText}>{count} {t("barang tersedia", language)}</Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>

                {/* Right side: Emoji inside heroImageBox */}
                <View style={styles.heroImageBox}>
                  <Text style={{ fontSize: 64, marginTop: 15 }}>{cat.icon}</Text>
                </View>

                {/* Absolute Button (Nike notch style) */}
                <View style={styles.heroSlideBtnWrapperAbsolute}>
                  <View style={[styles.heroSlideBtnBlack, { backgroundColor: cat.bg }]}>
                    <Text style={styles.heroSlideBtnTextWhite}>{t(cat.btnText || "Jelajahi", language)}</Text>
                    <Text style={[styles.heroSlideBtnTextWhite, { fontSize: 13, marginLeft: 2 }]}>{">>"}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Dot Indicators */}
        <View style={styles.heroDots}>
          {HERO_CATEGORIES.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => {
                heroScrollRef.current?.scrollTo({ x: i * heroWidth, animated: true });
                setHeroIndex(i);
              }}
            >
              <View
                style={[
                  styles.heroDot,
                  i === heroIndex && styles.heroDotActive,
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* ── Categories Scroll ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryScrollContent}
      >
        {CATEGORIES.map((cat, idx) => (
          <Animated.View
            key={cat.id}
            style={{ transform: [{ scale: categoryScales[idx] }] }}
          >
            <TouchableOpacity
              style={[
                styles.categoryChip,
                cat.id === "0" && styles.categoryChipActive
              ]}
              onPress={() => onNavigateToExplore(cat.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.categoryEmoji}>{cat.icon}</Text>
              <Text style={[
                styles.categoryChipText,
                cat.id === "0" && styles.categoryChipTextActive
              ]}>
                {t(cat.label, language)}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </ScrollView>

      {/* ── Section 1 (Bisa COD Kampus) ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t("Bisa COD Kampus", language)}</Text>
        <TouchableOpacity onPress={() => onNavigateToExplore("0")}>
          <Text style={[styles.sectionLink, { color: Colors.primary.blue500 }]}>
            {t("Lihat Semua", language)} {">"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 6 }}
      >
        {items.filter(item => item.status !== "Sold" && (item.id.startsWith("ITM") || item.id === "9" || item.id === "10" || item.id === "11" || item.id === "1" || item.id === "7" || item.id === "8")).map((item, idx) => (
          <HomeProductCard
            key={item.id}
            item={item}
            theme={theme}
            isDark={isDark}
            isWishlisted={wishlist.includes(item.id)}
            onWishlistPress={() => toggleWishlist(item.id)}
            onPress={() => onPressProduct(item)}
            index={idx}
            horizontal={true}
            language={language}
          />
        ))}
      </ScrollView>

      {/* ── Section 2 (Di Bawah 50rb) ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t("Di Bawah 50rb", language)}</Text>
        <TouchableOpacity onPress={() => onNavigateToExplore("0")}>
          <Text style={[styles.sectionLink, { color: Colors.primary.blue500 }]}>
            {t("Lihat Semua", language)} {">"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 6 }}
      >
        {items.filter(item => {
          const numericPrice = typeof item.price === "string" ? parseInt(item.price.replace(/[^\d]/g, ""), 10) : Number(item.price);
          return item.status !== "Sold" && (numericPrice || 0) <= 50000;
        }).map((item, idx) => (
          <HomeProductCard
            key={item.id}
            item={item}
            theme={theme}
            isDark={isDark}
            isWishlisted={wishlist.includes(item.id)}
            onWishlistPress={() => toggleWishlist(item.id)}
            onPress={() => onPressProduct(item)}
            index={idx}
            language={language}
          />
        ))}
      </ScrollView>

      {/* Padding space bottom */}
      <View style={{ height: 80 }} />
    </Animated.ScrollView>
  );
}

// ─── HOME ANIMATED PRODUCT CARD ──────────────────────────────────────────────────
function HomeProductCard({
  item,
  theme,
  isDark,
  isWishlisted,
  onWishlistPress,
  onPress,
  index,
  horizontal = false,
  language = "id",
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(30)).current;
  const cardScale = useRef(new Animated.Value(0.9)).current;
  const heartScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardFade, {
        toValue: 1,
        duration: 350,
        delay: Math.min(index * 80 + 300, 800),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(cardSlide, {
        toValue: 0,
        friction: 7,
        tension: 35,
        delay: Math.min(index * 80 + 300, 800),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 7,
        tension: 40,
        delay: Math.min(index * 80 + 300, 800),
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  const handleHeartPress = () => {
    heartScale.setValue(0.5);
    Animated.spring(heartScale, {
      toValue: 1.5,
      friction: 3,
      tension: 40,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      Animated.spring(heartScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    });
    onWishlistPress();
  };

  const styles = getCardStyles(theme, isDark);

  return (
    <Animated.View
      style={[
        horizontal ? styles.horizontalCardWrapper : styles.cardWrapper,
        {
          opacity: cardFade,
          transform: [{ translateY: cardSlide }, { scale: cardScale }],
        },
      ]}
    >
      <Animated.View style={{ flex: 1, transform: [{ scale }] }}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={onPress}
          style={styles.card}
        >
          {/* Floating Status Badge at top-left */}
          <View
            style={[
              styles.statusBadgeFloating,
              {
                backgroundColor:
                  item.status === "Available"
                    ? Colors.semantic.success.light
                    : item.status === "Booked"
                      ? Colors.semantic.warning.light
                      : Colors.semantic.error.light,
              },
            ]}
          >
            <Text
              style={[
                styles.statusTextFloating,
                {
                  color:
                    item.status === "Available"
                      ? Colors.semantic.success.dark
                      : item.status === "Booked"
                        ? Colors.semantic.warning.dark
                        : Colors.semantic.error.dark,
                },
              ]}
            >
              {item.status === "Available"
                ? t("Tersedia", language)
                : item.status === "Booked"
                  ? "Booked"
                  : t("Terjual", language)}
            </Text>
          </View>

          {/* Floating Wishlist Button at top-right (bookmark styled) */}
          <TouchableOpacity
            style={styles.wishlistBtnFloating}
            onPress={handleHeartPress}
            activeOpacity={0.8}
          >
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <Ionicons
                name={isWishlisted ? "bookmark" : "bookmark-outline"}
                size={14}
                color={isWishlisted ? Colors.primary.yellow500 : "#FFFFFF"}
              />
            </Animated.View>
          </TouchableOpacity>

          <View
            style={[
              styles.imagePlaceholder,
              {
                backgroundColor: isDark
                  ? "#2C2C2E"
                  : "#ECECEC",
              },
            ]}
          >
            {item.images && item.images.length > 0 ? (
              <Image
                source={{ uri: resolveImageUrl(item.images[0]) }}
                style={{ width: "100%", height: "100%", borderRadius: 12 }}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.imageIcon}>{item.imageEmoji || "📦"}</Text>
            )}
          </View>

          <View style={styles.cardBody}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            
            <Text style={styles.conditionLoc} numberOfLines={1}>
              {t(item.condition, language)} · 📍 {t(item.location || "COD Kampus", language)}
            </Text>

            <Text style={styles.price}>{item.price}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

// ─── INITIAL DUMMY ITEMS ──────────────────────────────────────────────────────────
const INITIAL_ITEMS = [
  {
    id: "1",
    title: "Laptop ASUS VivoBook S14",
    price: "Rp 5.500.000",
    condition: "Seperti Baru",
    status: "Available",
    seller: "Rizky Fauzi",
    isHot: true,
    categoryId: "1",
    imageEmoji: "💻",
    location: "COD Kantin Kampus",
  },
  {
    id: "101",
    title: "Kabel HDMI Ugreen 2 Meter",
    price: "Rp 45.000",
    condition: "Sangat Baik",
    status: "Booked",
    seller: "Rizky Fauzi",
    isHot: false,
    categoryId: "1",
    imageEmoji: "🔌",
    location: "COD Parkiran",
  },
  {
    id: "102",
    title: "Buku Pemrograman JS Modern",
    price: "Rp 90.000",
    condition: "Baik",
    status: "Sold",
    seller: "Rizky Fauzi",
    isHot: false,
    categoryId: "2",
    imageEmoji: "📘",
    location: "COD Perpus",
  },
  {
    id: "2",
    title: "Paket Buku Teknik Mesin Sem. 3",
    price: "Rp 175.000",
    condition: "Baik",
    status: "Available",
    seller: "Ahmad S.",
    isHot: false,
    categoryId: "2",
    imageEmoji: "📚",
    location: "COD Kantin",
  },
  {
    id: "3",
    title: "Kalkulator Casio FX-991EX",
    price: "Rp 280.000",
    condition: "Sangat Baik",
    status: "Booked",
    seller: "Siti R.",
    isHot: false,
    categoryId: "1",
    imageEmoji: "🧮",
    location: "COD Perpustakaan",
  },
  {
    id: "4",
    title: "Mechanical Keyboard Leopold",
    price: "Rp 850.000",
    condition: "Seperti Baru",
    status: "Available",
    seller: "Kevin N.",
    isHot: true,
    categoryId: "1",
    imageEmoji: "⌨️",
    location: "COD Gazebo TRPL",
  },
  {
    id: "5",
    title: "Jaket Kampus Poltek Astra",
    price: "Rp 120.000",
    condition: "Baik",
    status: "Available",
    seller: "Budi S.",
    isHot: false,
    categoryId: "3",
    imageEmoji: "🧥",
    location: "COD Gedung A",
  },
  {
    id: "6",
    title: "Mouse Logitech MX Master 3",
    price: "Rp 650.000",
    condition: "Sangat Baik",
    status: "Available",
    seller: "Andi P.",
    isHot: false,
    categoryId: "1",
    imageEmoji: "🖱️",
    location: "COD Gazebo",
  },
  {
    id: "7",
    title: "Kemeja Flanel Uniqlo Navy",
    price: "Rp 180.000",
    condition: "Sangat Baik",
    status: "Available",
    seller: "Rizky Fauzi",
    isHot: false,
    categoryId: "3",
    imageEmoji: "👕",
    location: "COD Kantin Kampus",
  },
  {
    id: "8",
    title: "Sepatu Nike Air Max 90 Black",
    price: "Rp 750.000",
    condition: "Baik",
    status: "Available",
    seller: "Kevin N.",
    isHot: true,
    categoryId: "3",
    imageEmoji: "👟",
    location: "COD Parkiran",
  },
  {
    id: "9",
    title: "Kipas Angin Miyako Kos",
    price: "Rp 85.000",
    condition: "Baik",
    status: "Available",
    seller: "Siti R.",
    isHot: false,
    categoryId: "4",
    imageEmoji: "🌀",
    location: "COD Kantin Kampus",
  },
  {
    id: "10",
    title: "Helm Bogo Retro Hitam",
    price: "Rp 110.000",
    condition: "Ada Lecet Dikit",
    status: "Available",
    seller: "Budi S.",
    isHot: false,
    categoryId: "3",
    imageEmoji: "🪖",
    location: "COD Parkiran",
  },
  {
    id: "11",
    title: "Meja Belajar Lipat",
    price: "Rp 35.000",
    condition: "Sangat Baik",
    status: "Available",
    seller: "Ahmad S.",
    isHot: false,
    categoryId: "4",
    imageEmoji: "🪑",
    location: "COD Perpustakaan",
  },
  {
    id: "12",
    title: "Binder Kuliah B5 Kulit",
    price: "Rp 40.000",
    condition: "Sangat Baik",
    status: "Available",
    seller: "Andi P.",
    isHot: false,
    categoryId: "5",
    imageEmoji: "📓",
    location: "COD Kelas",
  },
  {
    id: "13",
    title: "Set Pensil Gambar Faber-Castell",
    price: "Rp 35.000",
    condition: "Seperti Baru",
    status: "Available",
    seller: "Siti R.",
    isHot: false,
    categoryId: "5",
    imageEmoji: "✏️",
    location: "COD Perpustakaan",
  },
  {
    id: "14",
    title: "Buku Tulis Campus Pack (5 Pcs)",
    price: "Rp 25.000",
    condition: "Baru",
    status: "Available",
    seller: "Ahmad S.",
    isHot: false,
    categoryId: "5",
    imageEmoji: "📝",
    location: "COD Kelas",
  },
  {
    id: "15",
    title: "Headphone Sony WH-CH510",
    price: "Rp 350.000",
    condition: "Sangat Baik",
    status: "Available",
    seller: "Kevin N.",
    isHot: false,
    categoryId: "1",
    imageEmoji: "🎧",
    location: "COD Gedung B",
  },
  {
    id: "16",
    title: "Novel Bumi - Tere Liye",
    price: "Rp 50.000",
    condition: "Baik",
    status: "Available",
    seller: "Budi S.",
    isHot: false,
    categoryId: "2",
    imageEmoji: "📖",
    location: "COD Gazebo",
  }
];

// ─── MASTER SHELL STYLES ───────────────────────────────────────────────────────
const getStyles = (theme, isDark, tabWidth, insets) => {
  const shadowColor = isDark ? "#000000" : Colors.primary.blue500;
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.background, // Spec: theme.background (bukan surface)
      paddingHorizontal: 20,
      paddingTop: insets.top > 0 ? insets.top + 8 : 12,
      paddingBottom: 10, // Spec: height: auto (paddingVertical: 10)
      borderBottomWidth: 0, // Spec: tidak ada border
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    logo: {
      fontSize: 22,
      fontFamily: "Barlow_900Black", // Spec: Logo font size 22px weight 900
      color: theme.text.heading,
      letterSpacing: -0.5,
    },
    logoDot: {
      width: 7, // Spec: 7x7px
      height: 7, // Spec: 7x7px
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
      position: "relative",
    },
    notificationDot: {
      position: "absolute",
      top: 2,
      right: 2,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#EF4444",
    },
    cartBadge: {
      position: "absolute",
      top: -2,
      right: -2,
      width: 15,
      height: 15,
      borderRadius: 7.5,
      backgroundColor: "#EF4444",
      alignItems: "center",
      justifyContent: "center",
    },
    cartBadgeText: {
      color: "#FFFFFF",
      fontSize: 8,
      fontFamily: "Barlow_900Black",
      textAlign: "center",
      lineHeight: 11,
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
      fontSize: 13,
      fontFamily: "Barlow_700Bold",
      color: Colors.primary.blue500,
    },

    // Bottom Navigation Bar
    bottomNav: {
      position: "absolute",
      bottom: Platform.OS === "ios" ? 28 : 16,
      left: 20,
      right: 20,
      flexDirection: "row",
      backgroundColor: theme.surface,
      borderRadius: 36,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: 10,
      paddingHorizontal: 12,
      alignItems: "center",
      justifyContent: "space-between",
      shadowColor: shadowColor,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.45 : 0.08,
      shadowRadius: 16,
      elevation: 8,
      zIndex: 10,
    },
    navTab: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 4,
      zIndex: 2,
    },
    navIcon: {
      fontSize: 22,
      color: theme.text.placeholder,
    },
    navIconActive: {
      color: isDark ? Colors.primary.yellow500 : Colors.primary.blue500,
    },
    navLabel: {
      fontSize: 9, // Spec: Tab label: 9px
      fontFamily: "Barlow_600SemiBold", // Spec: weight 600
      color: theme.text.placeholder,
      marginTop: 2,
    },
    navLabelActive: {
      color: isDark ? Colors.primary.yellow500 : Colors.primary.blue500, // Spec: Active color light->blue500, dark->yellow500
    },
    navActiveDot: {
      width: 4, // Spec: Active dot 4x4px
      height: 4,
      borderRadius: 2, // Spec: borderRadius 2
      backgroundColor: isDark ? Colors.primary.yellow500 : Colors.primary.blue500,
      position: "absolute",
      bottom: -6, // Spec: absolute bottom -6
    },
    navCenterBtn: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 3,
      marginTop: -16, // Float the center button slightly above the capsule
    },
    navCenterCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: Colors.primary.blue500, // Spec: Background: primary.blue500
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 0, // Centered inside the floating bar
      ...Platform.select({
        ios: {
          shadowColor: Colors.primary.blue500, // Spec: Shadow: blue500 opacity 0.45, radius 10
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
        },
        android: {
          shadowColor: Colors.primary.blue500,
          elevation: 6,
        },
      }),
    },
    navCenterIcon: {
      fontSize: 28,
      color: "#1A1A2E",
      fontFamily: "Barlow_900Black",
      lineHeight: 32,
    },
  });
};

// ─── HOME CONTENT SUBCOMPONENT STYLES ─────────────────────────────────────────
const getHomeContentStyles = (theme, isDark) => {
  return StyleSheet.create({
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 120,
    },
    searchBarWrapper: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.surface,
      marginHorizontal: 16,
      marginTop: 14,
      marginBottom: 4,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 50,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 8,
    },
    searchIcon: {
      fontSize: 16,
      color: theme.text.placeholder,
    },
    searchTextPlaceholder: {
      fontSize: 14,
      color: theme.text.placeholder,
      flex: 1,
    },
    heroBanner: {
      marginHorizontal: 16,
      marginTop: 14,
      marginBottom: 8,
      borderRadius: 28,
      overflow: "hidden",
      height: 210,
    },
    heroSlide: {
      flexDirection: "row",
      alignItems: "stretch",
      borderRadius: 28,
      paddingTop: 18,
      paddingBottom: 18,
      paddingHorizontal: 18,
      height: 190,
      overflow: "hidden",
      position: "relative",
    },
    heroCircle1: {
      position: "absolute",
      width: 160,
      height: 160,
      borderRadius: 80,
      top: -50,
      right: -30,
    },
    heroCircle2: {
      position: "absolute",
      width: 100,
      height: 100,
      borderRadius: 50,
      bottom: -30,
      right: 40,
    },
    heroSlideLeft: {
      flex: 1.3,
      justifyContent: "space-between",
      paddingTop: 2,
      paddingBottom: 0,
      paddingRight: 8,
      zIndex: 2,
    },
    heroSlideLabel: {
      color: "#FFFFFF",
      fontSize: 19,
      fontWeight: "800",
      letterSpacing: -0.5,
      marginBottom: 2,
    },
    heroSlideSub: {
      color: "rgba(255,255,255,0.7)",
      fontSize: 11.5,
      fontWeight: "500",
      marginBottom: 10,
    },
    heroSlideSubTitle: {
      color: "#FFFFFF",
      fontSize: 22,
      fontFamily: "Barlow_900Black",
      lineHeight: 28,
      marginBottom: 4,
    },
    heroSlideBadge: {
      backgroundColor: "rgba(255,255,255,0.18)",
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 4,
      alignSelf: "flex-start",
    },
    heroSlideBadgeText: {
      color: "#F5F7FA",
      fontSize: 10.5,
      fontWeight: "700",
    },
    heroSlideBtnWrapperAbsolute: {
      position: "absolute",
      bottom: -7,
      left: 29,
      backgroundColor: theme.background,
      padding: 8,
      borderRadius: 50,
      zIndex: 10,
    },
    heroSlideBtnBlack: {
      backgroundColor: "#000000",
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: 50,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    heroSlideBtnTextWhite: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 0.2,
    },
    heroSlideBtnArrowWhite: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "800",
    },
    heroImageBox: {
      flex: 1,
      alignItems: "center",
    },
    categoryScroll: {
      marginBottom: 4,
    },
    categoryScrollContent: {
      paddingHorizontal: 16,
      gap: 8,
    },
    categoryChip: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 50,
      backgroundColor: theme.surface,
      borderWidth: 1.5,
      borderColor: theme.border,
      gap: 6,
    },
    categoryChipActive: {
      backgroundColor: Colors.primary.blue500,
      borderColor: Colors.primary.blue500,
    },
    categoryEmoji: {
      fontSize: 14,
    },
    categoryChipText: {
      fontSize: 13,
      fontFamily: "Barlow_600SemiBold",
      color: theme.text.secondary,
    },
    categoryChipTextActive: {
      color: "#FFFFFF",
    },
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
      fontFamily: "Barlow_800ExtraBold",
      color: theme.text.heading,
      letterSpacing: -0.3,
    },
    sectionLink: {
      fontSize: 13,
      fontFamily: "Barlow_600SemiBold",
      color: isDark ? "#FFFFFF" : Colors.primary.blue500,
    },
    productGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: 16, // Spec: 16px padding
      gap: 16, // Spec: 16px gap
    },
    // ── Dots indicators ──
    heroDots: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 6,
      position: "absolute",
      bottom: 8,
      width: "100%",
    },
    heroDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: isDark ? "#555" : "#CCCCCC",
    },
    heroDotActive: {
      width: 18,
      height: 6,
      borderRadius: 3,
      backgroundColor: Colors.primary.yellow500,
    },
  });
};

// ─── CARD STYLES FOR HOME ─────────────────────────────────────────────────────
const getCardStyles = (theme, isDark) => {
  return StyleSheet.create({
    cardWrapper: {
      width: (screenWidth - 48) / 2, // Spec: (screenWidth - 48) / 2
      marginBottom: 16,
    },
    horizontalCardWrapper: {
      width: 156,
      marginRight: 12,
      marginBottom: 4,
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 18, // Spec: Border radius 18px
      borderWidth: 1, // Spec: Border 1px theme.border
      borderColor: theme.border,
      overflow: "hidden",
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.07, // Spec: opacity 0.07
          shadowRadius: 8, // Spec: radius 8
        },
        android: {
          elevation: 3, // Spec: elevation 3
        },
      }),
    },
    wishlistBtnFloating: {
      position: "absolute",
      top: 10,
      right: 10, // top-right
      zIndex: 5,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: "rgba(0, 0, 0, 0.45)", // dark glassmorphism
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 0.5,
      borderColor: "rgba(255, 255, 255, 0.15)",
    },
    statusBadgeFloating: {
      position: "absolute",
      top: 10,
      left: 10, // top-left
      zIndex: 5,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    statusTextFloating: {
      fontSize: 9,
      fontFamily: "Barlow_700Bold",
    },
    imagePlaceholder: {
      height: 120,
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    imageIcon: {
      fontSize: 48,
    },
    cardBody: {
      padding: 10,
    },
    title: {
      fontSize: 12,
      fontFamily: "Barlow_700Bold",
      color: theme.text.heading,
      lineHeight: 16,
    },
    conditionLoc: {
      fontSize: 10,
      fontFamily: "Barlow_500Medium",
      color: theme.text.secondary,
      marginTop: 2,
    },
    price: {
      fontSize: 13,
      fontFamily: "Barlow_900Black",
      color: Colors.primary.blue500, // Price is always blue500
      marginTop: 4,
    },
  });
};

// ─── PRODUCT DETAIL MODAL SUBCOMPONENT ───────────────────────────────────────────
function ProductDetailModal({
  item,
  onClose,
  theme,
  isDark,
  isWishlisted,
  onWishlistPress,
}) {
  const slideAnim = useRef(new Animated.Value(Dimensions.get("window").height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const heartScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0.6,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [item]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: Dimensions.get("window").height,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleHeartPress = () => {
    heartScale.setValue(0.5);
    Animated.spring(heartScale, {
      toValue: 1.5,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start(() => {
      Animated.spring(heartScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }).start();
    });
    onWishlistPress();
  };

  const handleWhatsApp = () => {
    Alert.alert(
      "Hubungi Penjual",
      `Membuka WhatsApp ke penjual (${item.seller || "Rizky"}) untuk transaksi "${item.title}"...`
    );
  };

  // Emojis for categories
  const categoryEmojis = {
    "1": "💻",
    "2": "📚",
    "3": "👕",
    "4": "🏠",
    "5": "✏️",
  };
  const categoryNames = {
    "1": "Elektronik",
    "2": "Buku & Referensi",
    "3": "Pakaian & Aksesoris",
    "4": "Info Kos & Sewa",
    "5": "Alat Tulis & Kuliah",
  };

  const emoji = categoryEmojis[item.categoryId] || "📦";
  const catName = categoryNames[item.categoryId] || "Lain-lain";

  const defaultDesc = "Barang bekas berkualitas milik mahasiswa Politeknik Astra. Kondisi terawat dengan baik, fungsi 100% normal. Bisa COD di area kampus Cikarang atau sekitaran kos mahasiswa.";
  const descriptionText = item.description || defaultDesc;

  const styles = getDetailModalStyles(theme, isDark);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Semi-transparent backdrop */}
      <Animated.View
        style={[styles.backdrop, { opacity: fadeAnim }]}
        pointerEvents="auto"
      >
        <TouchableOpacity style={{ flex: 1 }} onPress={handleClose} />
      </Animated.View>

      {/* Slide up panel */}
      <Animated.View
        style={[styles.panel, { transform: [{ translateY: slideAnim }] }]}
        pointerEvents="auto"
      >
        {/* Header bar */}
        <View style={styles.panelHeader}>
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.panelHeaderTitle}>Detail Barang</Text>
          <TouchableOpacity style={styles.heartBtn} onPress={handleHeartPress}>
            <Animated.Text
              style={[
                styles.heartIcon,
                isWishlisted && styles.heartIconActive,
                { transform: [{ scale: heartScale }] },
              ]}
            >
              {isWishlisted ? "♥" : "♡"}
            </Animated.Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.panelScroll}>
          {/* Hero Emoji/Image representation */}
          <View
            style={[
              styles.imageContainer,
              {
                backgroundColor: isDark
                  ? Colors.dark.border
                  : Colors.primary.blue100,
              },
            ]}
          >
            {item.isHot && (
              <View style={styles.hotBadge}>
                <Text style={styles.hotBadgeText}>🔥 HOT</Text>
              </View>
            )}
            <Text style={styles.imageIcon}>{emoji}</Text>
          </View>

          {/* Core Info */}
          <View style={styles.infoSection}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{catName}</Text>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.price}>{item.price}</Text>

            <View style={styles.metaRow}>
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>Kondisi</Text>
                <Text style={styles.metaValue}>{item.condition}</Text>
              </View>
              <View style={styles.metaDivider} />
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>Status</Text>
                <Text
                  style={[
                    styles.metaValue,
                    {
                      color:
                        item.status === "Available"
                          ? Colors.semantic.success.main
                          : item.status === "Booked"
                            ? Colors.semantic.warning.main
                            : Colors.semantic.error.main,
                    },
                  ]}
                >
                  {item.status === "Available" ? "Tersedia" : item.status}
                </Text>
              </View>
            </View>
          </View>

          {/* Seller info */}
          <View style={styles.sellerSection}>
            <View style={styles.sellerAvatar}>
              <Text style={styles.sellerAvatarText}>🧑‍🎓</Text>
            </View>
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>{item.seller || "Penjual Mahasiswa"}</Text>
              <Text style={styles.sellerSub}>Politeknik Astra Cikarang</Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Deskripsi Barang</Text>
            <Text style={styles.descriptionText}>{descriptionText}</Text>
          </View>
        </ScrollView>

        {/* Action Button Footer */}
        <View style={styles.footerActions}>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={handleWhatsApp}
            activeOpacity={0.85}
          >
            <Text style={styles.chatButtonText}>Hubungi Penjual (WhatsApp)</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const getDetailModalStyles = (theme, isDark) => {
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "#000000",
      zIndex: 99,
    },
    panel: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: "85%",
      backgroundColor: theme.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      zIndex: 100,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: "hidden",
      paddingBottom: Platform.OS === "ios" ? 30 : 16,
    },
    panelHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    panelHeaderTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: theme.text.heading,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.background,
      alignItems: "center",
      justifyContent: "center",
    },
    closeBtnText: {
      fontSize: 14,
      fontWeight: "bold",
      color: theme.text.secondary,
    },
    heartBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.background,
      alignItems: "center",
      justifyContent: "center",
    },
    heartIcon: {
      fontSize: 20,
      color: theme.text.placeholder,
    },
    heartIconActive: {
      color: "#EF4444",
    },
    panelScroll: {
      padding: 20,
      gap: 20,
    },
    imageContainer: {
      width: "100%",
      height: 180,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    imageIcon: {
      fontSize: 72,
    },
    hotBadge: {
      position: "absolute",
      top: 12,
      left: 12,
      backgroundColor: isDark ? "#FFFFFF" : "#000000",
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 50,
      zIndex: 1,
    },
    hotBadgeText: {
      fontSize: 10,
      fontWeight: "800",
      color: isDark ? "#000000" : "#FFFFFF",
    },
    infoSection: {
      gap: 6,
    },
    categoryBadge: {
      backgroundColor: Colors.primary.blue100,
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    categoryBadgeText: {
      fontSize: 11,
      fontWeight: "700",
      color: Colors.primary.blue500,
    },
    title: {
      fontSize: 20,
      fontWeight: "800",
      color: theme.text.heading,
      letterSpacing: -0.5,
    },
    price: {
      fontSize: 22,
      fontWeight: "900",
      color: isDark ? "#FFFFFF" : Colors.primary.blue500,
      marginTop: 2,
    },
    metaRow: {
      flexDirection: "row",
      backgroundColor: theme.background,
      borderRadius: 14,
      padding: 12,
      marginTop: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    metaCol: {
      flex: 1,
      alignItems: "center",
    },
    metaLabel: {
      fontSize: 10,
      color: theme.text.placeholder,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    metaValue: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.text.heading,
      marginTop: 4,
    },
    metaDivider: {
      width: 1,
      height: "100%",
      backgroundColor: theme.border,
    },
    sellerSection: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 14,
    },
    sellerAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: Colors.primary.blue100,
      alignItems: "center",
      justifyContent: "center",
    },
    sellerAvatarText: {
      fontSize: 22,
    },
    sellerInfo: {
      marginLeft: 12,
      gap: 2,
    },
    sellerName: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.text.heading,
    },
    sellerSub: {
      fontSize: 11,
      color: theme.text.secondary,
    },
    descriptionSection: {
      gap: 8,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "800",
      color: theme.text.heading,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    descriptionText: {
      fontSize: 13,
      color: theme.text.primary,
      lineHeight: 18,
    },
    footerActions: {
      paddingHorizontal: 20,
      paddingTop: 10,
    },
    chatButton: {
      backgroundColor: Colors.primary.blue500,
      borderRadius: 14,
      paddingVertical: 15,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: Colors.primary.blue500,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    chatButtonText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "700",
    },
  });
};

// ─── NOTIFICATION MODAL SUBCOMPONENT ───────────────────────────────────────────
// ─── NOTIFICATION MODAL SUBCOMPONENT ───────────────────────────────────────────
function NotificationModal({
  visible,
  onClose,
  notifications,
  onAccept,
  onDecline,
  theme,
  isDark,
  language = "id",
}) {
  const slideAnim = useRef(new Animated.Value(Dimensions.get("window").height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0.6,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: Dimensions.get("window").height,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const styles = getNotificationStyles(theme, isDark);

  return (
    <Modal visible={visible} transparent={true} statusBarTranslucent={true} animationType="none" onRequestClose={handleClose}>
      <View style={{ flex: 1 }} pointerEvents="box-none">
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <TouchableOpacity style={{ flex: 1 }} onPress={handleClose} />
        </Animated.View>

        {/* Panel */}
        <Animated.View style={[styles.panel, { transform: [{ translateY: slideAnim }] }]}>
          {/* Accent Drag Handle */}
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>

          <View style={styles.panelHeader}>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.panelHeaderTitle}>{t("Notifikasi Transaksi", language)}</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {notifications.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🔔</Text>
                <Text style={styles.emptyTitle}>{t("Belum Ada Notifikasi", language)}</Text>
                <Text style={styles.emptySubtitle}>
                  {t("Setiap ada tawaran masuk dari pembeli akan muncul di sini.", language)}
                </Text>
              </View>
            ) : (
              notifications.map((notif) => {
                const isReport = notif.type === "report";
                const isSuspended = notif.status === "suspended";
                const cardStyle = [
                  styles.notifCard,
                  notif.status === "accepted" && styles.cardAccepted,
                  notif.status === "declined" && styles.cardDeclined,
                  isReport && { borderLeftWidth: 3, borderLeftColor: isSuspended ? "#EF4444" : "#F59E0B" },
                ];
                return (
                  <View key={notif.id} style={cardStyle}>
                    <View style={styles.notifHeaderRow}>
                      <View style={[
                        styles.notifBadgeCircle,
                        notif.status === "accepted" && styles.badgeAccepted,
                        notif.status === "declined" && styles.badgeDeclined,
                        isSuspended && { backgroundColor: "rgba(239,68,68,0.15)" },
                        isReport && !isSuspended && { backgroundColor: "rgba(245,158,11,0.15)" },
                      ]}>
                        <Text style={styles.notifBadgeEmoji}>
                          {isSuspended ? "🚫" : isReport ? "🚩" : notif.status === "accepted" ? "✓" : notif.status === "declined" ? "✕" : "📦"}
                        </Text>
                      </View>
                      <View style={styles.notifMeta}>
                        <Text style={[
                          styles.notifTitle,
                          isReport && { color: "#F59E0B" },
                        ]}>{t(notif.title, language)}</Text>
                        <Text style={styles.notifTime}>{notif.time}</Text>
                      </View>
                    </View>

                    <Text style={styles.notifMessage}>{t(notif.message, language)}</Text>
                    {notif.details && <Text style={styles.notifDetails}>{t(notif.details, language)}</Text>}

                    {notif.type === "booking" && notif.status === "pending" && (
                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={styles.declineBtn}
                          onPress={() => onDecline(notif.id)}
                        >
                          <Text style={styles.declineText}>{t("Tolak", language)}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.acceptBtn}
                          onPress={() => onAccept(notif)}
                        >
                          <Text style={styles.acceptText}>{t("Terima & WA", language)}</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {notif.status === "accepted" && (
                      <View style={styles.statusLabelRow}>
                        <Text style={styles.acceptedLabel}>{t("✓ Disetujui (Hubungi WA)", language)}</Text>
                      </View>
                    )}

                    {notif.status === "declined" && (
                      <View style={styles.statusLabelRow}>
                        <Text style={styles.declinedLabel}>{t("✕ Ditolak", language)}</Text>
                      </View>
                    )}

                    {isSuspended && (
                      <View style={[styles.statusLabelRow, { backgroundColor: "rgba(239,68,68,0.08)", borderRadius: 6, padding: 6 }]}>
                        <Text style={[styles.declinedLabel, { color: "#EF4444" }]}>🚫 Iklan telah disuspend otomatis</Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const getNotificationStyles = (theme, isDark) => {
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "#000000",
    },
    panel: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: "75%",
      backgroundColor: theme.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: "hidden",
      paddingBottom: Platform.OS === "ios" ? 30 : 16,
    },
    dragHandleContainer: {
      width: "100%",
      alignItems: "center",
      paddingVertical: 10,
    },
    dragHandle: {
      width: 40,
      height: 5,
      borderRadius: 3,
      backgroundColor: isDark ? "#3D3D5C" : "#E2E8F0",
    },
    panelHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    panelHeaderTitle: {
      fontSize: 15,
      fontFamily: "Barlow_800ExtraBold",
      color: theme.text.heading,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? "#242436" : "#EDF2F7",
      alignItems: "center",
      justifyContent: "center",
    },
    closeBtnText: {
      fontSize: 12,
      fontFamily: "Barlow_700Bold",
      color: theme.text.secondary,
    },
    scrollContent: {
      padding: 20,
      gap: 14,
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 80,
      gap: 12,
    },
    emptyIcon: {
      fontSize: 48,
    },
    emptyTitle: {
      fontSize: 16,
      fontFamily: "Barlow_700Bold",
      color: theme.text.heading,
    },
    emptySubtitle: {
      fontSize: 12,
      fontFamily: "Barlow_500Medium",
      color: theme.text.secondary,
      textAlign: "center",
      lineHeight: 18,
    },
    notifCard: {
      backgroundColor: theme.surface,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 10,
      elevation: 2,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
    },
    cardAccepted: {
      borderColor: Colors.semantic.success.main,
      backgroundColor: isDark ? "#122A1E" : "#F0FAF3",
    },
    cardDeclined: {
      opacity: 0.65,
      backgroundColor: isDark ? "#1E1E26" : "#F7FAFC",
      borderColor: theme.border,
    },
    notifHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    notifBadgeCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? "#293B5F" : Colors.primary.blue100,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeAccepted: {
      backgroundColor: isDark ? "#1B472E" : Colors.semantic.success.light,
    },
    badgeDeclined: {
      backgroundColor: isDark ? "#4A222C" : Colors.semantic.error.light,
    },
    notifBadgeEmoji: {
      fontSize: 16,
      fontFamily: "Barlow_700Bold",
      color: theme.text.heading,
    },
    notifMeta: {
      flex: 1,
      gap: 1,
    },
    notifTitle: {
      fontSize: 13,
      fontFamily: "Barlow_700Bold",
      color: theme.text.heading,
    },
    notifTime: {
      fontSize: 10,
      fontFamily: "Barlow_500Medium",
      color: theme.text.placeholder,
    },
    notifMessage: {
      fontSize: 12,
      fontFamily: "Barlow_500Medium",
      color: theme.text.primary,
      lineHeight: 18,
    },
    notifDetails: {
      fontSize: 11,
      fontFamily: "Barlow_600SemiBold",
      color: isDark ? "#FFFFFF" : Colors.primary.blue500,
      backgroundColor: isDark ? "rgba(41, 121, 255, 0.15)" : Colors.primary.blue100,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      alignSelf: "flex-start",
      overflow: "hidden",
    },
    actionRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 8,
    },
    declineBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 50,
      paddingVertical: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.background,
    },
    declineText: {
      color: theme.text.secondary,
      fontSize: 12,
      fontFamily: "Barlow_600SemiBold",
    },
    acceptBtn: {
      flex: 1.5,
      backgroundColor: Colors.primary.blue500,
      borderRadius: 50,
      paddingVertical: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    acceptText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontFamily: "Barlow_700Bold",
    },
    statusLabelRow: {
      marginTop: 6,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingTop: 8,
    },
    acceptedLabel: {
      fontSize: 11,
      fontFamily: "Barlow_700Bold",
      color: Colors.semantic.success.main,
    },
    declinedLabel: {
      fontSize: 11,
      fontFamily: "Barlow_700Bold",
      color: Colors.semantic.error.main,
    },
  });
};

// ─── CART MODAL SUBCOMPONENT ───────────────────────────────────────────────────
function CartModal({
  visible,
  onClose,
  cart,
  onRemoveItem,
  onCheckout,
  theme,
  isDark,
  language = "id",
}) {
  const slideAnim = useRef(new Animated.Value(Dimensions.get("window").height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0.6,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: Dimensions.get("window").height,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => {
      const priceNum = parseInt(item.price.replace(/[^\d]/g, ""), 10) || 0;
      return sum + priceNum;
    }, 0);
  };

  const formatPrice = (val) => {
    return "Rp " + val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const styles = getCartModalStyles(theme, isDark);

  return (
    <Modal visible={visible} transparent={true} statusBarTranslucent={true} animationType="none" onRequestClose={handleClose}>
      <View style={{ flex: 1 }} pointerEvents="box-none">
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <TouchableOpacity style={{ flex: 1 }} onPress={handleClose} />
        </Animated.View>

        {/* Panel */}
        <Animated.View style={[styles.panel, { transform: [{ translateY: slideAnim }] }]}>
          {/* Accent Drag Handle */}
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>

          <View style={styles.panelHeader}>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <Ionicons name="close" size={20} color={theme.text.secondary} />
            </TouchableOpacity>
            <Text style={styles.panelHeaderTitle}>{t("Keranjang Belanja", language)}</Text>
            <View style={{ width: 36 }} />
          </View>

          {cart.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="cart-outline" size={60} color={theme.text.placeholder} />
              <Text style={styles.emptyTitle}>{t("Keranjang Kosong", language)}</Text>
              <Text style={styles.emptySubtitle}>
                {t("Jelajahi barang thrift menarik dan masukkan ke keranjang belanja.", language)}
              </Text>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {cart.map((item) => (
                  <View key={item.id} style={styles.cartCard}>
                    <View style={styles.cartEmojiBox}>
                      <Text style={styles.cartEmoji}>{item.imageEmoji || "📦"}</Text>
                    </View>
                    <View style={styles.cartInfo}>
                      <Text style={styles.cartTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.cartCondition}>{item.condition}</Text>
                      <Text style={styles.cartPrice}>{item.price}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeCartBtn}
                      onPress={() => onRemoveItem(item.id)}
                    >
                      <Ionicons name="trash-outline" size={20} color={Colors.semantic.error.main} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>

              {/* Total & Checkout Area */}
              <View style={styles.checkoutFooter}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>{t("Total Harga", language)}</Text>
                  <Text style={styles.totalPrice}>{formatPrice(calculateTotal())}</Text>
                </View>
                <TouchableOpacity
                  style={styles.checkoutBtn}
                  onPress={() => {
                    onCheckout();
                    handleClose();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.checkoutBtnText}>{t("Booking COD Semua", language)}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const getCartModalStyles = (theme, isDark) => {
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "#000000",
    },
    panel: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: "75%",
      backgroundColor: theme.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: "hidden",
    },
    dragHandleContainer: {
      width: "100%",
      alignItems: "center",
      paddingVertical: 10,
    },
    dragHandle: {
      width: 40,
      height: 5,
      borderRadius: 3,
      backgroundColor: isDark ? "#3D3D5C" : "#E2E8F0",
    },
    panelHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    panelHeaderTitle: {
      fontSize: 15,
      fontFamily: "Barlow_800ExtraBold",
      color: theme.text.heading,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? "#242436" : "#EDF2F7",
      alignItems: "center",
      justifyContent: "center",
    },
    scrollContent: {
      padding: 20,
      gap: 12,
    },
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 40,
      paddingVertical: 80,
      gap: 12,
    },
    emptyTitle: {
      fontSize: 16,
      fontFamily: "Barlow_700Bold",
      color: theme.text.heading,
    },
    emptySubtitle: {
      fontSize: 12,
      fontFamily: "Barlow_500Medium",
      color: theme.text.secondary,
      textAlign: "center",
      lineHeight: 18,
    },
    cartCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.background,
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 12,
    },
    cartEmojiBox: {
      width: 50,
      height: 50,
      borderRadius: 10,
      backgroundColor: isDark ? "#2C2C2E" : "#ECECEC",
      alignItems: "center",
      justifyContent: "center",
    },
    cartEmoji: {
      fontSize: 24,
    },
    cartInfo: {
      flex: 1,
      gap: 2,
    },
    cartTitle: {
      fontSize: 13,
      fontFamily: "Barlow_700Bold",
      color: theme.text.heading,
    },
    cartCondition: {
      fontSize: 11,
      fontFamily: "Barlow_500Medium",
      color: theme.text.secondary,
    },
    cartPrice: {
      fontSize: 12,
      fontFamily: "Barlow_900Black",
      color: Colors.primary.blue500,
    },
    removeCartBtn: {
      padding: 8,
    },
    checkoutFooter: {
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      backgroundColor: theme.surface,
      gap: 16,
      paddingBottom: Platform.OS === "ios" ? 30 : 20,
    },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    totalLabel: {
      fontSize: 14,
      fontFamily: "Barlow_600SemiBold",
      color: theme.text.secondary,
    },
    totalPrice: {
      fontSize: 18,
      fontFamily: "Barlow_900Black",
      color: Colors.primary.blue500,
    },
    checkoutBtn: {
      backgroundColor: Colors.primary.blue500,
      borderRadius: 50,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    checkoutBtnText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontFamily: "Barlow_700Bold",
    },
  });
};

// ─── CUSTOM PREMIUM ALERT MODAL ────────────────────────────────────────────────
function CustomAlertModal({
  visible,
  onClose,
  title,
  message,
  buttons,
  type,
  theme,
  isDark,
}) {
  const getAlertIcon = () => {
    switch (type) {
      case "success":
        return "✨";
      case "warning":
        return "⚠️";
      case "danger":
        return "🚨";
      default:
        return "ℹ️";
    }
  };

  const getHeaderColor = () => {
    switch (type) {
      case "success":
        return Colors.semantic.success.main;
      case "warning":
        return Colors.semantic.warning.main;
      case "danger":
        return Colors.semantic.error.main;
      default:
        return Colors.primary.blue500;
    }
  };

  const isColumn = buttons && buttons.length > 2;
  const styles = getCustomAlertStyles(theme, isDark);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.alertBackdrop}>
        <View style={styles.alertBox}>
          <View style={[styles.alertIconBg, { backgroundColor: getHeaderColor() + "20" }]}>
            <Text style={[styles.alertIconText, { color: getHeaderColor() }]}>
              {getAlertIcon()}
            </Text>
          </View>
          <Text style={styles.alertTitle}>{title}</Text>
          <Text style={styles.alertMsg}>{message}</Text>
          <View
            style={[
              styles.alertBtnGroup,
              isColumn
                ? { flexDirection: "column", gap: 8 }
                : { flexDirection: "row", gap: 10 },
            ]}
          >
            {buttons && buttons.map((btn, index) => {
              const isDestructive = btn.style === "destructive";
              const isCancel = btn.style === "cancel";
              
              let btnStyle = styles.alertBtnDefault;
              let textStyle = styles.alertBtnTextDefault;

              if (isDestructive) {
                btnStyle = styles.alertBtnDestructive;
                textStyle = styles.alertBtnTextDestructive;
              } else if (isCancel) {
                btnStyle = styles.alertBtnCancel;
                textStyle = styles.alertBtnTextCancel;
              }

              return (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.8}
                  style={[
                    btnStyle,
                    isColumn ? { width: "100%", height: 44 } : { flex: 1, height: 44 }
                  ]}
                  onPress={() => {
                    onClose();
                    if (btn.onPress) btn.onPress();
                  }}
                >
                  <Text style={textStyle}>{btn.text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const getCustomAlertStyles = (theme, isDark) => {
  return StyleSheet.create({
    alertBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    alertBox: {
      width: "85%",
      backgroundColor: theme.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 24,
      alignItems: "center",
      gap: 12,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 5,
    },
    alertIconBg: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4,
    },
    alertIconText: {
      fontSize: 24,
      fontFamily: "Barlow_700Bold",
    },
    alertTitle: {
      fontSize: 16,
      fontFamily: "Barlow_800ExtraBold",
      color: theme.text.heading,
      textAlign: "center",
    },
    alertMsg: {
      fontSize: 13,
      fontFamily: "Barlow_500Medium",
      color: theme.text.secondary,
      textAlign: "center",
      lineHeight: 18,
      marginBottom: 10,
    },
    alertBtnGroup: {
      width: "100%",
      marginTop: 8,
    },
    alertBtnDefault: {
      backgroundColor: Colors.primary.blue500,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    alertBtnTextDefault: {
      fontSize: 13,
      fontFamily: "Barlow_700Bold",
      color: "#FFFFFF",
    },
    alertBtnCancel: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.background,
    },
    alertBtnTextCancel: {
      fontSize: 13,
      fontFamily: "Barlow_600SemiBold",
      color: theme.text.secondary,
    },
    alertBtnDestructive: {
      backgroundColor: Colors.semantic.error.main,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    alertBtnTextDestructive: {
      fontSize: 13,
      fontFamily: "Barlow_700Bold",
      color: "#FFFFFF",
    },
  });
};
