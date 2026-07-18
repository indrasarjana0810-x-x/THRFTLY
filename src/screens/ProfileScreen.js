// src/screens/ProfileScreen.js
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  TextInput,
  SafeAreaView,
  Platform,
  Linking,
  Alert,
  BackHandler,
  Modal,
  Image,
} from "react-native";
import Colors from "../constants/Colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { t } from "../utils/translator";
import api from "../services/api";

const screenHeight = Dimensions.get("window").height;

export default function ProfileScreen({
  theme,
  isDark,
  userStats = {},
  items = [],
  setItems = () => { },
  userThemeMode = "system",
  setUserThemeMode = () => { },
  language = "id",
  setLanguage = () => { },
  onLogout,
  visible,
  currentUser,
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const avatarScale = useRef(new Animated.Value(0.5)).current;
  const avatarPulse = useRef(new Animated.Value(1)).current;
  const headerSlide = useRef(new Animated.Value(40)).current;

  // Staggered menu item animations (6 menu items + 1 logout = 7)
  const menuAnims = useRef(
    Array.from({ length: 7 }, () => ({
      fade: new Animated.Value(0),
      slide: new Animated.Value(25),
    }))
  ).current;

  // Active subscreen: null | 'listings' | 'history' | 'settings' | 'admin' | 'terms'
  const [activeSubScreen, setActiveSubScreen] = useState(null);
  const [renderedSubScreen, setRenderedSubScreen] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [sales, setSales] = useState([]);
  const [sellerReports, setSellerReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  const fetchHistory = async () => {
    try {
      const purchasesData = await api.transactions.getPurchases();
      const salesData = await api.transactions.getSales();
      if (purchasesData) setPurchases(purchasesData);
      if (salesData) setSales(salesData);
    } catch (err) {
      console.log("Failed to fetch transaction history:", err);
    }
  };

  // Custom panel transition states
  const subScreenAnim = useRef(new Animated.Value(screenHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(35)).current;

  // Profile editable states
  const [profileName, setProfileName] = useState("Rizky Fauzi");
  const [profileImage, setProfileImage] = useState(null);
  const [profileNPM, setProfileNPM] = useState("0320240085");
  const [profileClass, setProfileClass] = useState("PAI Cikarang");
  const [profileMajor, setProfileMajor] = useState("D4 Teknologi Rekayasa Perangkat Lunak");
  const [profileEmail, setProfileEmail] = useState("rizky.fauzi@student.astra.ac.id");
  const [profilePhone, setProfilePhone] = useState("+62 812-3456-7890");

  // Local temp states for editing profile
  const [editName, setEditName] = useState("");
  const [editNPM, setEditNPM] = useState("");
  const [editClass, setEditClass] = useState("");
  const [editMajor, setEditMajor] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");

  // Preferences settings (Notifications)
  const [notifTx, setNotifTx] = useState(true);
  const [notifChat, setNotifChat] = useState(true);

  // Transaction history tab: 'sales' | 'purchases'
  const [historyTab, setHistoryTab] = useState("sales");

  // Ratings feature states
  const [ratingsDb, setRatingsDb] = useState({});
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [ratingValue, setRatingValue] = useState(5);
  const [selectedItemForRating, setSelectedItemForRating] = useState(null);

  // Custom Premium Alert Modal State
  const [customAlert, setCustomAlert] = useState({
    visible: false,
    title: "",
    message: "",
    buttons: [],
    type: "info",
  });

  // ── States untuk Edit Barang (Suspended / Normal) ──
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [editItemId, setEditItemId] = useState(null);
  const [editItemTitle, setEditItemTitle] = useState("");
  const [editItemPrice, setEditItemPrice] = useState("");
  const [editItemDesc, setEditItemDesc] = useState("");
  const [editItemCategory, setEditItemCategory] = useState("1");
  const [editItemCondition, setEditItemCondition] = useState("Sangat Baik");
  const [editItemImages, setEditItemImages] = useState([]); // array base64/uri
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const handleStartEditItem = async (itemId) => {
    try {
      // Ambil list lengkap barang milik penjual (termasuk yang disuspend)
      const myItems = await api.items.getSellerItems();
      const target = myItems.find((itm) => itm.id === itemId);
      
      if (!target) {
        showAlert("Error", "Data barang tidak ditemukan.", [], "danger");
        return;
      }
      
      setEditItemId(itemId);
      setEditItemTitle(target.title || "");
      const rawPrice = target.price ? target.price.replace(/[^\d]/g, "") : "0";
      const formattedPrice = rawPrice === "0" ? "" : rawPrice.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      setEditItemPrice(formattedPrice);
      setEditItemDesc(target.description || "");
      setEditItemCategory(target.categoryId || "1");
      setEditItemCondition(target.condition || "Sangat Baik");
      setEditItemImages(target.images || []);
      setShowEditItemModal(true);
    } catch (err) {
      console.log("Error loading item for edit:", err);
      showAlert("Error", "Gagal memuat data barang untuk diedit.", [], "danger");
    }
  };

  const handleSelectEditImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showAlert("Izin Ditolak", "Aplikasi memerlukan izin galeri untuk mengunggah foto.", [], "warning");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        let base64Str = asset.base64;
        
        // Fallback jika base64 kosong (terutama di beberapa platform Web)
        if (!base64Str && asset.uri) {
          try {
            const res = await fetch(asset.uri);
            const blob = await res.blob();
            base64Str = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result.split(",")[1]);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          } catch (e) {
            console.log("Error converting image:", e);
          }
        }
        
        if (base64Str) {
          setEditItemImages([{ uri: asset.uri, base64: base64Str }]);
        }
      }
    } catch (err) {
      console.log("Error picking image:", err);
    }
  };

  const handleSaveItemEdit = async () => {
    if (!editItemTitle.trim()) {
      showAlert("Judul Kosong", "Judul barang harus diisi!", [], "warning");
      return;
    }
    const cleanPriceStr = editItemPrice.replace(/\./g, "");
    const priceVal = parseFloat(cleanPriceStr);
    if (isNaN(priceVal) || priceVal <= 0) {
      showAlert("Harga Kosong", "Harga barang harus diisi dengan benar (min Rp 1.000)!", [], "warning");
      return;
    }
    if (!editItemDesc.trim() || editItemDesc.trim().length < 10) {
      showAlert("Deskripsi Kosong", "Deskripsi harus diisi minimal 10 karakter!", [], "warning");
      return;
    }
    if (editItemImages.length === 0) {
      showAlert("Foto Kosong", "Harap unggah minimal 1 foto barang yang valid!", [], "warning");
      return;
    }

    setIsSubmittingEdit(true);
    try {
      // 1. Simpan update ke backend. 
      // Kita pakai API update atau create yang disesuaikan.
      // Karena backend punya endpoint save, mari kirim item data baru
      const cleanPrice = parseFloat(editItemPrice.replace(/\./g, ""));
      
      const payload = {
        title: editItemTitle.trim(),
        description: editItemDesc.trim(),
        price: cleanPrice,
        condition: editItemCondition,
        categoryId: editItemCategory,
        locationName: "Kantin Kampus 🍜",
        images: editItemImages.map((img) => img.base64 ? `data:image/jpeg;base64,${img.base64}` : img).filter(Boolean),
      };

      // Panggil API update di backend
      await api.items.update(editItemId, payload);

      // 2. Reset (Hapus) data laporan dari database
      await api.reports.reset(editItemId);

      setShowEditItemModal(false);
      showAlert("✅ Sukses Perbaikan", "Iklan berhasil diperbaiki dan telah aktif kembali di marketplace publik!", [], "success");
      
      // Refresh list items
      if (setItems) {
        const updated = await api.items.getAll();
        if (updated) setItems(updated);
      }
      
      // Refresh seller reports jika sedang membuka tab reports
      if (activeSubScreen === "reports") {
        const updatedReports = await api.reports.getForSeller();
        setSellerReports(updatedReports || []);
      }
    } catch (err) {
      console.log("Error saving edit:", err);
      showAlert("Gagal", "Gagal menyimpan perubahan. Coba lagi.", [], "danger");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const showAlert = (title, message, buttons = [], type = "info") => {
    setCustomAlert({
      visible: true,
      title,
      message,
      buttons: buttons.length > 0 ? buttons : [{ text: "OK", onPress: () => { } }],
      type,
    });
  };

  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      avatarScale.setValue(0.5);
      headerSlide.setValue(40);
      menuAnims.forEach((anim) => {
        anim.fade.setValue(0);
        anim.slide.setValue(25);
      });

      // 1. Screen entry
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 7,
          tension: 30,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();

      // 2. Avatar bounce in
      Animated.spring(avatarScale, {
        toValue: 1,
        friction: 4,
        tension: 40,
        delay: 200,
        useNativeDriver: Platform.OS !== 'web',
      }).start();

      // 3. Header card slide
      Animated.spring(headerSlide, {
        toValue: 0,
        friction: 6,
        tension: 25,
        delay: 100,
        useNativeDriver: Platform.OS !== 'web',
      }).start();

      // 4. Staggered menu items
      menuAnims.forEach((anim, idx) => {
        Animated.parallel([
          Animated.timing(anim.fade, {
            toValue: 1,
            duration: 300,
            delay: 350 + idx * 80,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.spring(anim.slide, {
            toValue: 0,
            friction: 6,
            tension: 30,
            delay: 350 + idx * 80,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ]).start();
      });
    }

    // 5. Avatar breathing pulse loop
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(avatarPulse, {
          toValue: 1.06,
          duration: 1800,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(avatarPulse, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [visible]);

  // Load profile dynamically based on currentUser.nim
  useEffect(() => {
    async function loadUserProfile() {
      if (!currentUser || !currentUser.nim) return;
      try {
        const storedRatings = await AsyncStorage.getItem("thriftly_ratings");
        if (storedRatings) {
          setRatingsDb(JSON.parse(storedRatings));
        }

        const stored = await AsyncStorage.getItem(`profile_${currentUser.nim}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          setProfileName(parsed.name || "Mahasiswa Astra");
          setProfileImage(parsed.profileImage || null);
          setProfileNPM(parsed.npm || currentUser.nim);
          setProfileClass(parsed.class || "PAI Cikarang");
          setProfileMajor(parsed.major || "D4 Teknologi Rekayasa Perangkat Lunak");
          setProfileEmail(parsed.email || `${currentUser.nim}@polytechnic.astra.ac.id`);
          setProfilePhone(parsed.phone || "+62 812-3456-7890");
        } else {
          // If no local profile exists yet (first time login from BE), initialize default
          const defaultProfile = {
            name: "Mahasiswa Astra",
            profileImage: null,
            npm: currentUser.nim,
            class: "PAI Cikarang",
            major: "D4 Teknologi Rekayasa Perangkat Lunak",
            email: `${currentUser.nim}@polytechnic.astra.ac.id`,
            phone: "+62 812-3456-7890",
          };
          await AsyncStorage.setItem(`profile_${currentUser.nim}`, JSON.stringify(defaultProfile));
          setProfileName(defaultProfile.name);
          setProfileImage(null);
          setProfileNPM(defaultProfile.npm);
          setProfileClass(defaultProfile.class);
          setProfileMajor(defaultProfile.major);
          setProfileEmail(defaultProfile.email);
          setProfilePhone(defaultProfile.phone);
        }
      } catch (err) {
        console.warn("Failed to load user profile", err);
      }
    }
    if (visible && currentUser) {
      loadUserProfile();
    }
  }, [visible, currentUser]);

  // Animate custom panel slides on change
  useEffect(() => {
    if (activeSubScreen !== null) {
      setRenderedSubScreen(activeSubScreen);
      contentFade.setValue(0);
      contentSlide.setValue(35);
      Animated.parallel([
        Animated.spring(subScreenAnim, {
          toValue: 0,
          friction: 8,
          tension: 45,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(contentSlide, {
          toValue: 0,
          friction: 7,
          tension: 35,
          delay: 100,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(contentFade, {
          toValue: 1,
          duration: 300,
          delay: 100,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(subScreenAnim, {
          toValue: screenHeight,
          friction: 8,
          tension: 45,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start((result) => {
        if (result.finished) {
          setRenderedSubScreen(null);
        }
      });
    }
  }, [activeSubScreen]);

  // Handle Android hardware back press when subscreen or custom alert is active
  useEffect(() => {
    const onBackPress = () => {
      if (customAlert.visible) {
        setCustomAlert((prev) => ({ ...prev, visible: false }));
        return true;
      }
      if (activeSubScreen !== null) {
        setActiveSubScreen(null);
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress
    );

    return () => {
      subscription.remove();
    };
  }, [activeSubScreen, customAlert.visible]);

  // Compute stats dynamically
  const activeCount = items.filter(
    (item) =>
      item.sellerNim === currentUser?.nim &&
      (item.status === "Available" || item.status === "Booked")
  ).length;
  const soldCount = items.filter(
    (item) => item.sellerNim === currentUser?.nim && item.status === "Sold"
  ).length;

  const menuItems = [
    { id: "settings", icon: "👤", label: "Pusat Akun", sub: "Ubah profil, email, sandi" },
    { id: "listings", icon: "📦", label: "Iklan Saya", sub: "Kelola barang yang Anda jual" },
    { id: "reports", icon: "🚩", label: "Laporan Masuk", sub: "Laporan pada iklan Anda" },
    { id: "history", icon: "💸", label: "Riwayat Transaksi", sub: "Daftar pembelian & penjualan" },
    { id: "preferences", icon: "⚙️", label: "Pengaturan", sub: "Ubah tema dan bahasa" },
    { id: "admin", icon: "💬", label: "Hubungi Admin Kampus", sub: "Butuh bantuan transaksi?" },
    { id: "terms", icon: "🛡️", label: "Syarat & Ketentuan", sub: "Aturan transaksi Thriftly" },
  ];

  const handleMenuPress = (item) => {
    if (item.id === "listings") {
      setActiveSubScreen("listings");
    } else if (item.id === "reports") {
      setReportsLoading(true);
      api.reports.getForSeller()
        .then((data) => setSellerReports(data || []))
        .catch(() => setSellerReports([]))
        .finally(() => setReportsLoading(false));
      setActiveSubScreen("reports");
    } else if (item.id === "history") {
      fetchHistory();
      setActiveSubScreen("history");
    } else if (item.id === "settings") {
      setEditName(profileName);
      setEditNPM(profileNPM);
      setEditClass(profileClass);
      setEditMajor(profileMajor);
      setEditEmail(profileEmail);
      setEditPhone(profilePhone);
      setActiveSubScreen("settings");
    } else if (item.id === "preferences") {
      setActiveSubScreen("preferences");
    } else if (item.id === "admin") {
      setActiveSubScreen("admin");
    } else if (item.id === "terms") {
      setActiveSubScreen("terms");
    }
  };

  const handleSaveSettings = async () => {
    if (!editName.trim() || !editNPM.trim()) {
      showAlert(
        t("Peringatan", language),
        t("Nama dan NPM tidak boleh kosong.", language),
        [],
        "warning"
      );
      return;
    }

    // Save to backend SQL Server database
    try {
      await api.auth.updateProfile({
        name: editName.trim(),
        studyProgram: editMajor.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
        profileUrl: profileImage,
      });
    } catch (err) {
      console.log("Failed to sync profile to backend database:", err);
    }

    setProfileName(editName);
    setProfileNPM(editNPM);
    setProfileClass(editClass);
    setProfileMajor(editMajor);
    setProfileEmail(editEmail);
    setProfilePhone(editPhone);

    // Save changes to AsyncStorage
    if (currentUser && currentUser.nim) {
      try {
        const stored = await AsyncStorage.getItem(`profile_${currentUser.nim}`);
        const parsed = stored ? JSON.parse(stored) : {};
        const updatedProfile = {
          ...parsed,
          name: editName.trim(),
          npm: editNPM.trim(),
          class: editClass.trim(),
          major: editMajor.trim(),
          email: editEmail.trim(),
          phone: editPhone.trim(),
        };
        await AsyncStorage.setItem(`profile_${currentUser.nim}`, JSON.stringify(updatedProfile));
      } catch (err) {
        console.warn("Failed to save edited profile", err);
      }
    }

    setActiveSubScreen(null);
    showAlert(
      t("Berhasil", language),
      t("Pengaturan akun berhasil disimpan!", language),
      [],
      "success"
    );
  };

  const handleClearCache = () => {
    showAlert(
      t("Bersihkan Cache", language),
      t("Apakah Anda yakin ingin menghapus cache aplikasi?", language),
      [
        { text: t("Batal", language), style: "cancel" },
        {
          text: t("Bersihkan", language),
          onPress: () => {
            showAlert(
              t("Berhasil", language),
              t("Cache aplikasi berhasil dibersihkan!", language),
              [],
              "success"
            );
          }
        }
      ],
      "warning"
    );
  };

  const updateProfileImage = async (uri) => {
    setProfileImage(uri);
    if (currentUser && currentUser.nim) {
      try {
        const stored = await AsyncStorage.getItem(`profile_${currentUser.nim}`);
        const parsed = stored ? JSON.parse(stored) : {};
        parsed.profileImage = uri;
        await AsyncStorage.setItem(`profile_${currentUser.nim}`, JSON.stringify(parsed));
        showAlert(t("Berhasil", language), t("Foto profil berhasil diperbarui!", language), [], "success");
      } catch (err) {
        console.warn("Failed to save avatar path", err);
      }
    }
  };

  const handleLaunchCamera = async (cameraType) => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        showAlert(t("Akses Ditolak", language), t("Akses kamera tidak diizinkan.", language), [], "warning");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        cameraType: cameraType === "front" ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await updateProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.warn("Camera error:", error);
      showAlert(t("Gagal", language), t("Gagal membuka kamera.", language), [], "danger");
    }
  };

  const handleLaunchGallery = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        showAlert(t("Akses Ditolak", language), t("Akses galeri tidak diizinkan.", language), [], "warning");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await updateProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.warn("Gallery error:", error);
      showAlert(t("Gagal", language), t("Gagal membuka galeri.", language), [], "danger");
    }
  };

  const handleEditAvatar = () => {
    showAlert(
      t("Ubah Foto Profil", language),
      t("Pilih tindakan untuk memperbarui foto profil Anda.", language),
      [
        {
          text: t("Kamera", language),
          onPress: () => handleLaunchCamera("back")
        },
        {
          text: t("Galeri Foto", language),
          onPress: handleLaunchGallery
        },
        {
          text: t("Batal", language),
          style: "cancel"
        }
      ],
      "info"
    );
  };

  const handleOpenRatingModal = (item) => {
    setSelectedItemForRating(item);
    setRatingValue(5);
    setRatingModalVisible(true);
  };

  const handleSubmitRating = async () => {
    if (!selectedItemForRating) return;
    try {
      const updatedRatings = {
        ...ratingsDb,
        [selectedItemForRating.id]: {
          rating: ratingValue,
          date: new Date().toLocaleDateString("id-ID"),
        }
      };
      setRatingsDb(updatedRatings);
      await AsyncStorage.setItem("thriftly_ratings", JSON.stringify(updatedRatings));
      setRatingModalVisible(false);
      setSelectedItemForRating(null);
      showAlert(t("Terima Kasih", language), t("Penilaian Anda berhasil disimpan!", language), [], "success");
    } catch (err) {
      console.warn("Failed to save rating", err);
      showAlert(t("Gagal", language), t("Terjadi kesalahan saat menyimpan rating.", language), [], "danger");
    }
  };

  const handleUpdateStatus = async (itemId, newStatus) => {
    try {
      await api.items.updateStatus(itemId, newStatus);
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, status: newStatus } : item
        )
      );
    } catch (err) {
      console.log("Failed to update status on backend:", err);
    }
  };

  const handleDeleteItem = (itemId) => {
    showAlert(
      t("Hapus Iklan", language),
      t("Apakah Anda yakin ingin menghapus iklan barang ini?", language),
      [
        { text: t("Batal", language), style: "cancel" },
        {
          text: t("Hapus", language),
          style: "destructive",
          onPress: async () => {
            try {
              await api.items.delete(itemId);
              setItems((prev) => prev.filter((item) => item.id !== itemId));
              showAlert(
                t("Berhasil", language),
                t("Iklan berhasil dihapus!", language),
                [],
                "success"
              );
            } catch (err) {
              console.log("Failed to delete item from backend:", err);
            }
          },
        },
      ],
      "danger"
    );
  };

  const handleContactLink = (type, value) => {
    let url = "";
    if (type === "whatsapp") {
      url = `https://wa.me/${value.replace(/[^0-9]/g, "")}?text=Halo%20Admin%20Thriftly%2C%20saya%20butuh%20bantuan...`;
    } else if (type === "email") {
      url = `mailto:${value}?subject=Bantuan%20Thriftly`;
    }
    if (url) {
      Linking.openURL(url).catch(() =>
        showAlert("Error", t("Gagal membuka aplikasi eksternal.", language), [], "danger")
      );
    }
  };

  const styles = getStyles(theme, isDark);

  // Render Subscreen Content inside the Panel
  const renderSubScreenContent = () => {
    if (renderedSubScreen === "reports") {
      return (
        <View style={styles.subContent}>
          {/* Header info */}
          <View style={{
            backgroundColor: isDark ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.06)",
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}>
            <Text style={{ fontSize: 22 }}>🚩</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontFamily: "Barlow_700Bold", color: "#EF4444" }}>
                Laporan Masuk
              </Text>
              <Text style={{ fontSize: 12, fontFamily: "Barlow_400Regular", color: theme.text.secondary, marginTop: 2 }}>
                {sellerReports.length > 0
                  ? `${sellerReports.length} laporan diterima pada iklan Anda`
                  : "Tidak ada laporan pada iklan Anda"}
              </Text>
            </View>
          </View>

          {reportsLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>⏳</Text>
              <Text style={styles.emptyTitle}>Memuat laporan...</Text>
            </View>
          ) : sellerReports.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={styles.emptyTitle}>{t("Tidak Ada Laporan", language)}</Text>
              <Text style={styles.emptySub}>
                {t("Semua iklan Anda berjalan dengan baik. Tidak ada laporan masuk.", language)}
              </Text>
            </View>
          ) : (
            (() => {
              // Grouping sellerReports berdasarkan itemId
              const grouped = sellerReports.reduce((acc, report) => {
                const id = report.itemId;
                if (!acc[id]) {
                  acc[id] = {
                    itemId: id,
                    itemTitle: report.itemTitle,
                    itemStatus: report.itemStatus,
                    reports: []
                  };
                }
                acc[id].reports.push({
                  reason: report.reason,
                  detail: report.detail,
                  reporterName: report.reporterName,
                  date: report.date
                });
                return acc;
              }, {});

              const groupedList = Object.values(grouped);

              return groupedList.map((group, idx) => {
                const isSuspended = group.itemStatus === "Suspended";
                return (
                  <View
                    key={group.itemId || idx}
                    style={{
                      backgroundColor: theme.card,
                      borderRadius: 14,
                      padding: 16,
                      marginBottom: 16,
                      borderLeftWidth: 4,
                      borderLeftColor: isSuspended ? "#EF4444" : "#F59E0B",
                      shadowColor: "#000",
                      shadowOpacity: 0.06,
                      shadowRadius: 8,
                      shadowOffset: { width: 0, height: 2 },
                      elevation: 2,
                    }}
                  >
                    {/* Status badge & Judul Barang */}
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <View style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        backgroundColor: isSuspended ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)",
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 20,
                      }}>
                        <Text style={{ fontSize: 13 }}>{isSuspended ? "🚫" : "🚩"}</Text>
                        <Text style={{
                          fontSize: 12,
                          fontFamily: "Barlow_700Bold",
                          color: isSuspended ? "#EF4444" : "#F59E0B",
                        }}>
                          {isSuspended ? "Iklan Disuspend" : "Ada Laporan"}
                        </Text>
                      </View>
                    </View>

                    {/* Nama Barang */}
                    <Text style={{ fontSize: 16, fontFamily: "Barlow_800ExtraBold", color: theme.text.heading, marginBottom: 12 }}>
                      📦 {group.itemTitle}
                    </Text>

                    {/* Judul List Laporan */}
                    <Text style={{ fontSize: 11, fontFamily: "Barlow_700Bold", color: theme.text.placeholder, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                      Daftar Laporan Masuk ({group.reports.length})
                    </Text>

                    {/* Daftar alasan laporan */}
                    {group.reports.map((rpt, rIdx) => (
                      <View key={rIdx} style={{ marginBottom: 12 }}>
                        {/* 1. Kotak Alasan Laporan */}
                        <View style={{
                          backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                          borderRadius: 10,
                          padding: 12,
                          borderWidth: 1,
                          borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                          marginBottom: 6,
                        }}>
                          <Text style={{ fontSize: 11, fontFamily: "Barlow_700Bold", color: theme.text.placeholder, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                            Alasan Laporan
                          </Text>
                          <Text style={{ fontSize: 14, fontFamily: "Barlow_600SemiBold", color: theme.text.primary }}>
                            🚩 {rpt.reason}
                          </Text>
                        </View>

                        {/* 2. Kotak Komentar Pelapor (Hanya tampil jika ada komentar) */}
                        {rpt.detail ? (
                          <View style={{
                            backgroundColor: isDark ? "rgba(245,158,11,0.06)" : "rgba(245,158,11,0.03)",
                            borderRadius: 10,
                            padding: 12,
                            borderWidth: 1,
                            borderColor: isDark ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.1)",
                            marginBottom: 6,
                          }}>
                            <Text style={{ fontSize: 11, fontFamily: "Barlow_700Bold", color: "#F59E0B", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                              💬 Komentar Pelapor
                            </Text>
                            <Text style={{ fontSize: 13, fontFamily: "Barlow_500Medium", color: theme.text.secondary, fontStyle: "italic" }}>
                              "{rpt.detail}"
                            </Text>
                          </View>
                        ) : null}

                        {/* Info Tanggal */}
                        <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", paddingRight: 4 }}>
                          <Text style={{ fontSize: 11, fontFamily: "Barlow_400Regular", color: theme.text.placeholder }}>
                            📅 {rpt.date}
                          </Text>
                        </View>
                      </View>
                    ))}

                    {/* 1 Tombol perbaiki jika disuspend */}
                    {isSuspended && (
                      <View style={{
                        marginTop: 10,
                        backgroundColor: "rgba(239,68,68,0.06)",
                        borderRadius: 10,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: "rgba(239,68,68,0.15)",
                      }}>
                        <Text style={{ fontSize: 12, fontFamily: "Barlow_600SemiBold", color: "#EF4444", marginBottom: 8, lineHeight: 16 }}>
                          ⚠️ Iklan ini telah ditangguhkan secara otomatis. Klik tombol di bawah ini untuk mengisi ulang bagian bermasalah dan mengaktifkannya kembali.
                        </Text>
                        <TouchableOpacity
                          style={{
                            backgroundColor: "#EF4444",
                            paddingVertical: 10,
                            borderRadius: 10,
                            alignItems: "center",
                          }}
                          onPress={() => handleStartEditItem(group.itemId)}
                        >
                          <Text style={{ color: "#FFFFFF", fontFamily: "Barlow_700Bold", fontSize: 13 }}>
                            ✏️ Perbaiki Iklan
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              });
            })()
          )}
        </View>
      );
    }

    if (renderedSubScreen === "listings") {
      const myItems = items.filter((item) => item.sellerNim === currentUser?.nim);
      return (
        <View style={styles.subContent}>
          {myItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyTitle}>{t("Belum Ada Iklan", language)}</Text>
              <Text style={styles.emptySub}>
                {t("Barang yang Anda pasang lewat tab Sell akan muncul di sini.", language)}
              </Text>
            </View>
          ) : (
            myItems.map((item) => (
              <View key={item.id} style={styles.listingCard}>
                <View style={styles.listingHeader}>
                  <View style={styles.listingInfo}>
                    <Text style={styles.listingTitle}>{item.title}</Text>
                    <Text style={styles.listingPrice}>{item.price}</Text>
                    <Text style={styles.listingMeta}>
                      {t("Kondisi", language)}: {t(item.condition || "", language)} · {t("Kategori", language)}: {item.categoryId === "1" ? t("Elektronik", language) : item.categoryId === "2" ? t("Buku", language) : item.categoryId === "3" ? t("Pakaian", language) : item.categoryId === "4" ? t("Kos", language) : t("Lainnya", language)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    <TouchableOpacity
                      style={[styles.deleteBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)" }]}
                      onPress={() => handleStartEditItem(item.id)}
                    >
                      <Text style={styles.deleteBtnText}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteItem(item.id)}
                    >
                      <Text style={styles.deleteBtnText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.statusToggleContainer}>
                  <Text style={styles.statusLabel}>{t("Ubah Status:", language)}</Text>
                  <View style={styles.statusButtonsGroup}>
                    {["Available", "Booked", "Sold"].map((statusOption) => {
                      const isActiveStatus = item.status === statusOption;
                      let optionLabel = t("Tersedia", language);
                      let btnActiveColor = Colors.semantic.success.main;
                      if (statusOption === "Booked") {
                        optionLabel = "Booked";
                        btnActiveColor = Colors.semantic.warning.main;
                      } else if (statusOption === "Sold") {
                        optionLabel = t("Terjual", language);
                        btnActiveColor = Colors.semantic.error.main;
                      }

                      return (
                        <TouchableOpacity
                          key={statusOption}
                          style={[
                            styles.statusOptionBtn,
                            isActiveStatus && {
                              backgroundColor: btnActiveColor,
                              borderColor: btnActiveColor,
                            },
                          ]}
                          onPress={() => handleUpdateStatus(item.id, statusOption)}
                        >
                          <Text
                            style={[
                              styles.statusOptionText,
                              isActiveStatus && styles.statusOptionTextActive,
                            ]}
                          >
                            {optionLabel}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      );
    }

    if (renderedSubScreen === "history") {
      const soldItems = sales;
      const mockPurchases = purchases;

      return (
        <View style={styles.subContent}>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabBtn, historyTab === "sales" && styles.tabBtnActive]}
              onPress={() => setHistoryTab("sales")}
            >
              <Text style={[styles.tabText, historyTab === "sales" && styles.tabTextActive]}>
                {t("Penjualan", language)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, historyTab === "purchases" && styles.tabBtnActive]}
              onPress={() => setHistoryTab("purchases")}
            >
              <Text style={[styles.tabText, historyTab === "purchases" && styles.tabTextActive]}>
                {t("Pembelian", language)}
              </Text>
            </TouchableOpacity>
          </View>
          {historyTab === "sales" ? (
            soldItems.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>💸</Text>
                <Text style={styles.emptyTitle}>{t("Belum Ada Penjualan", language)}</Text>
                <Text style={styles.emptySub}>
                  {t("Iklan barang Anda yang diubah statusnya menjadi Terjual akan muncul di sini.", language)}
                </Text>
              </View>
            ) : (
              soldItems.map((item) => (
                <View key={item.id} style={styles.historyCard}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyCardTitle}>{item.title}</Text>
                      <Text style={styles.historyCardPrice}>{item.price}</Text>
                    </View>
                    {ratingsDb[item.id] ? (
                      <View style={styles.ratingBadge}>
                        <Text style={styles.ratingBadgeText}>⭐ {ratingsDb[item.id].rating}/5</Text>
                      </View>
                    ) : (
                      <View style={styles.noRatingBadge}>
                        <Text style={styles.noRatingBadgeText}>{t("Belum dinilai", language)}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.historyCardFooter}>
                    <Text style={styles.historyCardMeta}>{t("Sebagai: Penjual", language)}</Text>
                    <Text style={styles.historyStatusBadge}>{t("Selesai Jual", language)}</Text>
                  </View>
                </View>
              ))
            )
          ) : (
            mockPurchases.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>💸</Text>
                <Text style={styles.emptyTitle}>{t("Belum Ada Pembelian", language)}</Text>
                <Text style={styles.emptySub}>
                  {t("Barang yang Anda beli lewat COD akan muncul di sini.", language)}
                </Text>
              </View>
            ) : (
              mockPurchases.map((item) => (
                <View key={item.id} style={styles.historyCard}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyCardTitle}>{item.title}</Text>
                      <Text style={styles.historyCardPrice}>{item.price}</Text>
                    </View>
                    {ratingsDb[item.id] ? (
                      <View style={styles.ratingBadge}>
                        <Text style={styles.ratingBadgeText}>⭐ {ratingsDb[item.id].rating}/5</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.giveRatingBtn}
                        onPress={() => handleOpenRatingModal(item)}
                      >
                        <Text style={styles.giveRatingBtnText}>⭐ {t("Beri Rating", language)}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.historyCardMeta}>
                    {t("Penjual", language)}: {item.seller || ""} · {t("Tanggal", language)}: {item.date || ""}
                  </Text>
                  <View style={styles.historyCardFooter}>
                    <Text style={styles.historyCardMeta}>{t("Sebagai: Pembeli", language)}</Text>
                    <Text style={styles.historyStatusBadgeSelesai}>{t(item.status, language)}</Text>
                  </View>
                </View>
              ))
            )
          )}
        </View>
      );
    }

    if (renderedSubScreen === "settings") {
      return (
        <View style={styles.subContent}>
          <Text style={styles.fieldLabel}>{t("Nama Lengkap", language)}</Text>
          <TextInput
            style={styles.textInput}
            value={editName}
            onChangeText={setEditName}
            placeholder={t("Masukkan nama lengkap", language)}
            placeholderTextColor={theme.text.placeholder}
          />

          <Text style={styles.fieldLabel}>{t("NPM (Nomor Pokok Mahasiswa)", language)}</Text>
          <TextInput
            style={styles.textInput}
            value={editNPM}
            onChangeText={setEditNPM}
            keyboardType="numeric"
            placeholder={t("Masukkan NPM", language)}
            placeholderTextColor={theme.text.placeholder}
          />

          <Text style={styles.fieldLabel}>{t("Program Studi", language)}</Text>
          <TextInput
            style={styles.textInput}
            value={editMajor}
            onChangeText={setEditMajor}
            placeholder={t("Masukkan program studi", language)}
            placeholderTextColor={theme.text.placeholder}
          />

          <Text style={styles.fieldLabel}>{t("Kelas / Kampus", language)}</Text>
          <TextInput
            style={styles.textInput}
            value={editClass}
            onChangeText={setEditClass}
            placeholder={t("Contoh: PAI Cikarang", language)}
            placeholderTextColor={theme.text.placeholder}
          />

          <Text style={styles.fieldLabel}>{t("Alamat Email Mahasiswa", language)}</Text>
          <TextInput
            style={styles.textInput}
            value={editEmail}
            onChangeText={setEditEmail}
            keyboardType="email-address"
            placeholder={t("Masukkan email student", language)}
            placeholderTextColor={theme.text.placeholder}
          />

          <Text style={styles.fieldLabel}>{t("No. WhatsApp", language)}</Text>
          <TextInput
            style={styles.textInput}
            value={editPhone}
            onChangeText={setEditPhone}
            keyboardType="phone-pad"
            placeholder={t("Masukkan nomor whatsapp", language)}
            placeholderTextColor={theme.text.placeholder}
          />

          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSettings}>
            <Text style={styles.saveBtnText}>{t("Simpan Perubahan", language)}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (renderedSubScreen === "admin") {
      const contacts = [
        {
          type: "whatsapp",
          icon: "💬",
          name: t("Admin Kemahasiswaan Poltek", language),
          value: "+62 812-3456-7890",
          sub: t("Konsultasi COD & Pelaporan transaksi janggal", language),
        },
        {
          type: "email",
          icon: "📧",
          name: t("Helpdesk Thriftly Kampus", language),
          value: "support@thriftly.id",
          sub: t("Kritik, saran, & masukan pengembangan aplikasi", language),
        },
      ];

      return (
        <View style={styles.subContent}>
          <Text style={styles.helpText}>
            {t("Hubungi admin resmi Thriftly Politeknik Astra jika Anda mengalami kendala COD, penipuan, atau membutuhkan bantuan teknis lainnya.", language)}
          </Text>
          {contacts.map((c, i) => (
            <TouchableOpacity
              key={i}
              style={styles.contactCard}
              onPress={() => handleContactLink(c.type, c.value)}
              activeOpacity={0.8}
            >
              <View style={styles.contactIconContainer}>
                <Text style={styles.contactIcon}>{c.icon}</Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{c.name}</Text>
                <Text style={styles.contactVal}>{c.value}</Text>
                <Text style={styles.contactSub}>{c.sub}</Text>
              </View>
              <Text style={styles.contactActionBtn}>{t("Hubungi", language)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    if (renderedSubScreen === "terms") {
      const rules = [
        {
          title: t("1. Keanggotaan Mahasiswa", language),
          desc: t("Aplikasi ini eksklusif bagi mahasiswa aktif Politeknik Astra. Pengguna wajib menggunakan data nama, NPM, dan program studi yang asli.", language),
        },
        {
          title: t("2. Ketentuan Barang yang Dijual", language),
          desc: t("Barang bekas wajib milik pribadi, halal, dan dideskripsikan kondisinya secara jujur. Dilarang menjual barang tiruan (KW) tanpa menerangkan status aslinya.", language),
        },
        {
          title: t("3. Transaksi Aman (COD)", language),
          desc: t("Setiap transaksi disarankan dilakukan secara Cash on Delivery (COD) di area kampus Politeknik Astra Cikarang (seperti Gazebo, Kantin, Lobby) demi keamanan.", language),
        },
        {
          title: t("4. Larangan & Sanksi", language),
          desc: t("Dilarang memposting barang terlarang (senjata, obat ilegal, barang berbahaya). Akun yang terindikasi melakukan penipuan akan diblokir permanen.", language),
        },
      ];

      return (
        <View style={styles.subContent}>
          {rules.map((rule, i) => (
            <View key={i} style={styles.ruleBlock}>
              <Text style={styles.ruleTitle}>{rule.title}</Text>
              <Text style={styles.ruleDesc}>{rule.desc}</Text>
            </View>
          ))}
        </View>
      );
    }

    if (renderedSubScreen === "preferences") {
      return (
        <View style={styles.subContent}>
          {/* SECTION 1: PREFERENSI */}
          <Text style={styles.prefSectionTitle}>
            {t("Mode Tema", language)}
          </Text>
          <View style={styles.prefOptionGroup}>
            {[
              { id: "system", label: t("Sistem", language) },
              { id: "light", label: t("Terang", language) },
              { id: "dark", label: t("Gelap", language) },
            ].map((opt) => {
              const isSelected = userThemeMode === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.prefOptionBtn,
                    isSelected && styles.prefOptionBtnActive,
                  ]}
                  onPress={() => setUserThemeMode(opt.id)}
                >
                  <Text
                    style={[
                      styles.prefOptionText,
                      isSelected && styles.prefOptionTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.prefSectionTitle, { marginTop: 20 }]}>
            {t("Bahasa Aplikasi", language)}
          </Text>
          <View style={styles.prefOptionGroup}>
            {[
              { id: "id", label: "Bahasa Indonesia" },
              { id: "en", label: "English" },
            ].map((opt) => {
              const isSelected = language === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.prefOptionBtn,
                    isSelected && styles.prefOptionBtnActive,
                  ]}
                  onPress={() => setLanguage(opt.id)}
                >
                  <Text
                    style={[
                      styles.prefOptionText,
                      isSelected && styles.prefOptionTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* SECTION 2: NOTIFIKASI */}
          <Text style={[styles.prefSectionTitle, { marginTop: 20 }]}>
            {t("Notifikasi", language)}
          </Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>
                {t("Notifikasi Transaksi", language)}
              </Text>
              <Text style={styles.settingSubLabel}>
                {t("Status booking COD & penjualan", language)}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.customSwitch, notifTx ? styles.switchOn : styles.switchOff]}
              onPress={() => {
                const newVal = !notifTx;
                setNotifTx(newVal);
                saveSettingsData({ notifTx: newVal, notifChat });
              }}
            >
              <View style={[styles.switchThumb, notifTx ? styles.switchThumbOn : styles.switchThumbOff]} />
            </TouchableOpacity>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>
                {t("Notifikasi Chat", language)}
              </Text>
              <Text style={styles.settingSubLabel}>
                {t("Pemberitahuan pesan obrolan masuk", language)}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.customSwitch, notifChat ? styles.switchOn : styles.switchOff]}
              onPress={() => {
                const newVal = !notifChat;
                setNotifChat(newVal);
                saveSettingsData({ notifTx, notifChat: newVal });
              }}
            >
              <View style={[styles.switchThumb, notifChat ? styles.switchThumbOn : styles.switchThumbOff]} />
            </TouchableOpacity>
          </View>

          {/* SECTION 3: KEAMANAN & AKUN */}
          <Text style={[styles.prefSectionTitle, { marginTop: 20 }]}>
            {t("Keamanan & Akun", language)}
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.actionRow}
            onPress={() => showAlert(
              t("Ubah Kata Sandi", language),
              t("Fitur ubah kata sandi sedang dalam pengembangan.", language),
              [],
              "info"
            )}
          >
            <Text style={styles.actionRowText}>
              {t("Ubah Kata Sandi", language)}
            </Text>
            <Text style={styles.actionRowChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.actionRow}
            onPress={handleClearCache}
          >
            <Text style={styles.actionRowText}>
              {t("Bersihkan Cache Aplikasi", language)}
            </Text>
            <Text style={styles.actionRowChevron}>›</Text>
          </TouchableOpacity>

          {/* SECTION 4: HAPUS AKUN */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.actionRow, { borderBottomWidth: 0, marginTop: 15 }]}
            onPress={() => showAlert(
              t("Hapus Akun", language),
              t("Apakah Anda yakin ingin menghapus akun Anda secara permanen? Semua data akan dihapus.", language),
              [
                { text: t("Batal", language), style: "cancel" },
                {
                  text: t("Hapus", language),
                  style: "destructive",
                  onPress: () => showAlert(
                    t("Akun Terhapus", language),
                    t("Akun Anda telah berhasil dihapus.", language),
                    [],
                    "danger"
                  )
                }
              ],
              "danger"
            )}
          >
            <Text style={[styles.actionRowText, styles.dangerText]}>
              {t("Hapus Akun Permanen", language)}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  const getModalTitle = () => {
    switch (renderedSubScreen) {
      case "listings":
        return t("Iklan Saya", language);
      case "history":
        return t("Riwayat Transaksi", language);
      case "settings":
        return t("Pusat Akun", language);
      case "preferences":
        return t("Pengaturan", language);
      case "admin":
        return t("Hubungi Admin", language);
      case "terms":
        return t("Syarat & Ketentuan", language);
      default:
        return "";
    }
  };

  const renderRatingModal = () => {
    if (!selectedItemForRating) return null;

    return (
      <Modal
        visible={ratingModalVisible}
        transparent={true}
        statusBarTranslucent={true}
        animationType="fade"
        onRequestClose={() => setRatingModalVisible(false)}
      >
        <View style={styles.ratingModalOverlay}>
          <View style={[styles.ratingModalContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={styles.ratingModalTitle}>{t("Beri Penilaian", language)}</Text>
            <Text style={styles.ratingModalSubtitle}>{selectedItemForRating.title}</Text>

            {/* Stars Row */}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRatingValue(star)}
                  style={styles.starBtn}
                >
                  <Text style={[styles.starIcon, { color: star <= ratingValue ? "#FFD700" : (isDark ? "#3D3D5C" : "#E2E8F0") }]}>
                    ★
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.ratingValueText}>
              {ratingValue} {t("dari", language)} 5 Bintang
            </Text>

            {/* Buttons */}
            <View style={styles.ratingModalActions}>
              <TouchableOpacity
                style={[styles.ratingActionBtn, styles.ratingCancelBtn, { borderColor: theme.border }]}
                onPress={() => setRatingModalVisible(false)}
              >
                <Text style={styles.ratingCancelText}>{t("Batal", language)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ratingActionBtn, styles.ratingSubmitBtn]}
                onPress={handleSubmitRating}
              >
                <Text style={styles.ratingSubmitText}>{t("Kirim", language)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderCustomAlertModal = () => {
    if (!customAlert.visible) return null;

    const getAlertIcon = () => {
      switch (customAlert.type) {
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
      switch (customAlert.type) {
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

    const handleButtonPress = (btnOnPress) => {
      setCustomAlert((prev) => ({ ...prev, visible: false }));
      if (btnOnPress) {
        btnOnPress();
      }
    };

    const isColumn = customAlert.buttons.length > 2;

    return (
      <Modal
        visible={customAlert.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomAlert((prev) => ({ ...prev, visible: false }))}
      >
        <View style={styles.alertBackdrop}>
          <View style={styles.alertBox}>
            <View style={[styles.alertIconBg, { backgroundColor: getHeaderColor() + "20" }]}>
              <Text style={[styles.alertIconText, { color: getHeaderColor() }]}>
                {getAlertIcon()}
              </Text>
            </View>
            <Text style={styles.alertTitle}>{customAlert.title}</Text>
            <Text style={styles.alertMsg}>{customAlert.message}</Text>
            <View
              style={[
                styles.alertBtnGroup,
                isColumn
                  ? { flexDirection: "column", gap: 8 }
                  : { flexDirection: "row", gap: 10 },
              ]}
            >
              {customAlert.buttons.map((btn, index) => {
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
                    onPress={() => handleButtonPress(btn.onPress)}
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
  };

  return (
    <View style={styles.root}>
      {/* ── Modal Edit / Perbaiki Barang ── */}
      <Modal
        visible={showEditItemModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditItemModal(false)}
      >
        <View style={styles.alertBackdrop}>
          <View style={[styles.alertBox, { 
            width: "92%", 
            padding: 22, 
            maxHeight: "85%", 
            borderRadius: 20, 
            backgroundColor: isDark ? "#121212" : "#FFFFFF",
          }]}>
            {/* Header */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <Text style={{ fontSize: 18, fontFamily: "Barlow_800ExtraBold", color: theme.text.heading }}>
                ✏️ Perbaiki Detail Iklan
              </Text>
              <TouchableOpacity onPress={() => setShowEditItemModal(false)}>
                <Text style={{ fontSize: 20, color: theme.text.secondary }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={{ fontSize: 12, fontFamily: "Barlow_500Medium", color: theme.text.secondary, marginBottom: 18 }}>
                Silakan isi kembali bagian iklan yang dikosongkan agar iklan Anda dapat aktif kembali di marketplace.
              </Text>

              {/* Input Judul */}
              <Text style={{ fontSize: 11, fontFamily: "Barlow_700Bold", color: theme.text.placeholder, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                Judul Barang {editItemTitle === "" && <Text style={{ color: "#EF4444" }}>* Wajib Diisi Ulang</Text>}
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: editItemTitle === "" ? "#EF4444" : (isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)"),
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 14,
                  color: theme.text.primary,
                  backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                  marginBottom: 16,
                  fontFamily: "Barlow_500Medium",
                }}
                placeholder="Masukkan judul baru..."
                placeholderTextColor={theme.text.placeholder}
                value={editItemTitle}
                onChangeText={setEditItemTitle}
              />

              {/* Input Harga */}
              <Text style={{ fontSize: 11, fontFamily: "Barlow_700Bold", color: theme.text.placeholder, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                Harga Barang (Rp) {(parseFloat(editItemPrice.replace(/\./g, "")) <= 0 || editItemPrice === "") && <Text style={{ color: "#EF4444" }}>* Wajib Diisi Ulang</Text>}
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: (parseFloat(editItemPrice.replace(/\./g, "")) <= 0 || editItemPrice === "") ? "#EF4444" : (isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)"),
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 14,
                  color: theme.text.primary,
                  backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                  marginBottom: 16,
                  fontFamily: "Barlow_500Medium",
                }}
                placeholder="Masukkan harga baru..."
                placeholderTextColor={theme.text.placeholder}
                keyboardType="numeric"
                value={editItemPrice}
                onChangeText={(t) => {
                  const numeric = t.replace(/[^\d]/g, "");
                  const formatted = numeric.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                  setEditItemPrice(formatted);
                }}
              />

              {/* Input Deskripsi */}
              <Text style={{ fontSize: 11, fontFamily: "Barlow_700Bold", color: theme.text.placeholder, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                Deskripsi Barang {editItemDesc === "" && <Text style={{ color: "#EF4444" }}>* Wajib Diisi Ulang</Text>}
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: editItemDesc === "" ? "#EF4444" : (isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)"),
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 14,
                  color: theme.text.primary,
                  backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                  marginBottom: 16,
                  fontFamily: "Barlow_500Medium",
                  textAlignVertical: "top",
                  height: 100,
                }}
                placeholder="Jelaskan detail kondisi barang..."
                placeholderTextColor={theme.text.placeholder}
                multiline
                numberOfLines={4}
                value={editItemDesc}
                onChangeText={setEditItemDesc}
              />

              {/* Kategori Barang (Selector Chip) */}
              <Text style={{ fontSize: 11, fontFamily: "Barlow_700Bold", color: theme.text.placeholder, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                Kategori Barang
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                {[
                  { id: "1", label: "Elektronik" },
                  { id: "2", label: "Buku" },
                  { id: "3", label: "Pakaian" },
                  { id: "4", label: "Kos" },
                  { id: "5", label: "Lainnya" }
                ].map((cat) => {
                  const isSel = editItemCategory === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: isSel ? "#EF4444" : (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"),
                        backgroundColor: isSel ? "rgba(239,68,68,0.1)" : "transparent"
                      }}
                      onPress={() => setEditItemCategory(cat.id)}
                    >
                      <Text style={{ fontSize: 13, fontFamily: isSel ? "Barlow_700Bold" : "Barlow_500Medium", color: isSel ? "#EF4444" : theme.text.secondary }}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Kondisi Barang (Selector Chip) */}
              <Text style={{ fontSize: 11, fontFamily: "Barlow_700Bold", color: theme.text.placeholder, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                Kondisi Barang
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                {["Baru", "Sangat Baik", "Layak Pakai"].map((cond) => {
                  const isSel = editItemCondition === cond;
                  return (
                    <TouchableOpacity
                      key={cond}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: isSel ? "#EF4444" : (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"),
                        backgroundColor: isSel ? "rgba(239,68,68,0.1)" : "transparent"
                      }}
                      onPress={() => setEditItemCondition(cond)}
                    >
                      <Text style={{ fontSize: 13, fontFamily: isSel ? "Barlow_700Bold" : "Barlow_500Medium", color: isSel ? "#EF4444" : theme.text.secondary }}>
                        {cond}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Upload Foto */}
              <Text style={{ fontSize: 11, fontFamily: "Barlow_700Bold", color: theme.text.placeholder, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                Foto Barang {editItemImages.length === 0 && <Text style={{ color: "#EF4444" }}>* Wajib Diunggah Ulang</Text>}
              </Text>
              <TouchableOpacity
                style={{
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: editItemImages.length === 0 ? "#EF4444" : (isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)"),
                  borderRadius: 12,
                  padding: 16,
                  alignItems: "center",
                  backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                  marginBottom: 24,
                }}
                activeOpacity={0.7}
                onPress={handleSelectEditImage}
              >
                {editItemImages.length > 0 ? (
                  <View style={{ alignItems: "center" }}>
                    <Image
                      source={{ uri: editItemImages[0].uri || editItemImages[0] }}
                      style={{ width: 90, height: 90, borderRadius: 10, marginBottom: 8 }}
                    />
                    <Text style={{ fontSize: 12, fontFamily: "Barlow_600SemiBold", color: theme.text.secondary }}>
                      Ganti Foto Barang 📸
                    </Text>
                  </View>
                ) : (
                  <View style={{ alignItems: "center", paddingVertical: 10 }}>
                    <Text style={{ fontSize: 26, marginBottom: 6 }}>📸</Text>
                    <Text style={{ fontSize: 13, fontFamily: "Barlow_600SemiBold", color: theme.text.secondary }}>
                      Pilih Foto Baru dari Galeri
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Buttons */}
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
                  }}
                  onPress={() => setShowEditItemModal(false)}
                >
                  <Text style={{ fontFamily: "Barlow_700Bold", color: theme.text.primary, fontSize: 14 }}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#EF4444",
                  }}
                  onPress={handleSaveItemEdit}
                  disabled={isSubmittingEdit}
                >
                  <Text style={{ fontFamily: "Barlow_700Bold", color: "#FFFFFF", fontSize: 14 }}>
                    {isSubmittingEdit ? "Menyimpan..." : "Simpan & Aktifkan"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Animated.ScrollView
        style={[
          styles.container,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.profileHeaderCard, { transform: [{ translateY: headerSlide }] }]}>
          <View style={{ position: "relative" }}>
            <Animated.View style={[styles.avatarBorder, { transform: [{ scale: Animated.multiply(avatarScale, avatarPulse) }] }]}>
              <View style={styles.avatar}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>
                    {profileName ? profileName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() : "U"}
                  </Text>
                )}
              </View>
            </Animated.View>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.avatarEditBadge}
              onPress={handleEditAvatar}
            >
              <Text style={styles.avatarEditIcon}>📸</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.userName}>{profileName || ""}</Text>
          <Text style={styles.userSub}>NPM {profileNPM || ""} · {profileClass || ""}</Text>
          <Text style={styles.userMajor}>{profileMajor || ""}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statVal}>{activeCount}</Text>
              <Text style={styles.statLbl}>{t("Aktif", language)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statVal}>{soldCount}</Text>
              <Text style={styles.statLbl}>{t("Terjual", language)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statVal}>★ 4.9</Text>
              <Text style={styles.statLbl}>{t("Ulasan", language)}</Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.menuContainer}>
          <Text style={styles.menuSectionTitle}>
            {t("Utilitas & Keamanan", language)}
          </Text>

          {menuItems.map((item, index) => (
            <Animated.View
              key={item.id}
              style={{
                opacity: menuAnims[index].fade,
                transform: [{ translateX: menuAnims[index].slide }],
              }}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.menuItem}
                onPress={() => handleMenuPress(item)}
              >
                <View style={styles.menuIconContainer}>
                  <Text style={styles.menuIcon}>{item.icon}</Text>
                </View>
                <View style={styles.menuInfo}>
                  <Text style={styles.menuLabel}>{t(item.label, language)}</Text>
                  <Text style={styles.menuSub}>{t(item.sub, language)}</Text>
                </View>
                <Text style={styles.menuChevron}>›</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}

          <Animated.View
            style={{
              opacity: menuAnims[6].fade,
              transform: [{ translateX: menuAnims[6].slide }],
            }}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.menuItem, styles.logoutItem]}
              onPress={() =>
                showAlert(
                  t("Keluar Akun", language),
                  t("Apakah Anda yakin ingin keluar dari akun?", language),
                  [
                    { text: t("Batal", language), style: "cancel" },
                    {
                      text: t("Keluar", language),
                      onPress: () => {
                        if (onLogout) onLogout();
                      }
                    }
                  ],
                  "warning"
                )
              }
            >
              <View style={[styles.menuIconContainer, styles.logoutIconContainer]}>
                <Text style={styles.menuIcon}>🚪</Text>
              </View>
              <View style={styles.menuInfo}>
                <Text style={[styles.menuLabel, styles.logoutText]}>
                  {t("Keluar Akun", language)}
                </Text>
                <Text style={styles.menuSub}>
                  {t("Keluar dari sesi saat ini", language)}
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>

        <Text style={styles.footerVersion}>Thriftly v1.0.0 · Politeknik Astra Cikarang</Text>
      </Animated.ScrollView>

      <Modal
        visible={renderedSubScreen !== null}
        transparent={true}
        statusBarTranslucent={true}
        animationType="none"
        onRequestClose={() => setActiveSubScreen(null)}
      >
        <View style={{ flex: 1, position: "relative" }}>
          {renderedSubScreen !== null ? (
            <Animated.View
              style={[styles.backdropOverlay, { opacity: backdropOpacity }]}
              pointerEvents="none"
            />
          ) : null}

          <Animated.View
            style={[
              styles.slidePanel,
              {
                backgroundColor: theme.background,
                transform: [{ translateY: subScreenAnim }],
              },
            ]}
            pointerEvents={activeSubScreen === null ? "none" : "auto"}
          >
            <SafeAreaView style={styles.modalContainer}>
              <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => setActiveSubScreen(null)}
                >
                  <Text style={styles.backBtnText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>{getModalTitle()}</Text>
                <View style={{ width: 40 }} />
              </View>

              <ScrollView
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Animated.View
                  style={{
                    opacity: contentFade,
                    transform: [{ translateY: contentSlide }],
                  }}
                >
                  {renderSubScreenContent()}
                </Animated.View>
              </ScrollView>
            </SafeAreaView>
          </Animated.View>
        </View>
      </Modal>
      {renderCustomAlertModal()}
      {renderRatingModal()}
    </View>
  );
}

const getStyles = (theme, isDark) => {
  const shadowColor = isDark ? "#000000" : Colors.primary.blue500;
  const shadowOpacity = isDark ? 0.4 : 0.04;

  return StyleSheet.create({
    root: {
      flex: 1,
      position: "relative",
    },
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 100,
    },
    profileHeaderCard: {
      backgroundColor: theme.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: 24,
      paddingHorizontal: 16,
      alignItems: "center",
      shadowColor: shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: shadowOpacity,
      shadowRadius: 12,
      elevation: 4,
      marginBottom: 20,
    },
    avatarBorder: {
      width: 86,
      height: 86,
      borderRadius: 43,
      borderWidth: 3,
      borderColor: Colors.primary.blue500,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
    },
    avatar: {
      width: 74,
      height: 74,
      borderRadius: 37,
      backgroundColor: Colors.primary.blue100,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    avatarImage: {
      width: "100%",
      height: "100%",
      borderRadius: 37,
      resizeMode: "cover",
    },
    avatarText: {
      fontSize: 24,
      fontFamily: "Barlow_800ExtraBold",
      color: Colors.primary.blue500,
    },
    userName: {
      fontSize: 18,
      fontFamily: "Barlow_800ExtraBold",
      color: theme.text.heading,
      letterSpacing: -0.3,
    },
    userSub: {
      fontSize: 12,
      fontFamily: "Barlow_500Medium",
      color: theme.text.secondary,
      marginTop: 2,
    },
    userMajor: {
      fontSize: 11,
      fontFamily: "Barlow_500Medium",
      color: theme.text.placeholder,
      marginTop: 4,
      textAlign: "center",
    },
    statsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      marginTop: 20,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    statCol: {
      flex: 1,
      alignItems: "center",
    },
    statVal: {
      fontSize: 15,
      fontFamily: "Barlow_800ExtraBold",
      color: theme.text.heading,
    },
    statLbl: {
      fontSize: 11,
      fontFamily: "Barlow_500Medium",
      color: theme.text.secondary,
      marginTop: 2,
    },
    statDivider: {
      width: 1,
      height: 24,
      backgroundColor: theme.border,
    },
    menuContainer: {
      gap: 10,
    },
    menuSectionTitle: {
      fontSize: 13,
      fontFamily: "Barlow_700Bold",
      color: theme.text.placeholder,
      marginLeft: 4,
      marginBottom: 4,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 12,
    },
    menuIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: theme.background,
      alignItems: "center",
      justifyContent: "center",
    },
    menuIcon: {
      fontSize: 18,
    },
    menuInfo: {
      flex: 1,
      marginLeft: 12,
      gap: 2,
    },
    menuLabel: {
      fontSize: 13,
      fontFamily: "Barlow_700Bold",
      color: theme.text.heading,
    },
    menuSub: {
      fontSize: 11,
      fontFamily: "Barlow_500Medium",
      color: theme.text.secondary,
    },
    menuChevron: {
      fontSize: 22,
      color: theme.text.placeholder,
      marginRight: 6,
    },
    logoutItem: {
      marginTop: 10,
    },
    logoutIconContainer: {
      backgroundColor: isDark ? "#2A171C" : Colors.semantic.error.light,
    },
    logoutText: {
      color: Colors.semantic.error.main,
    },
    footerVersion: {
      fontSize: 10,
      fontFamily: "Barlow_500Medium",
      color: theme.text.placeholder,
      textAlign: "center",
      marginTop: 30,
      marginBottom: 20,
    },

    // ── PREMIUM SLIDE PANEL OVERLAY STYLES ──
    slidePanel: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 100,
    },
    backdropOverlay: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: "rgba(0, 0, 0, 0.4)",
      zIndex: 90,
    },
    modalContainer: {
      flex: 1,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
    },
    backBtn: {
      padding: 6,
    },
    backBtnText: {
      fontSize: 24,
      color: Colors.primary.blue500,
      fontFamily: "Barlow_700Bold",
    },
    modalTitle: {
      fontSize: 16,
      fontFamily: "Barlow_800ExtraBold",
      color: theme.text.heading,
    },
    modalScrollContent: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      paddingBottom: 40,
    },
    subContent: {
      gap: 16,
    },

    // Empty States
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 80,
      gap: 8,
    },
    emptyIcon: {
      fontSize: 50,
      marginBottom: 10,
    },
    emptyTitle: {
      fontSize: 16,
      fontFamily: "Barlow_800ExtraBold",
      color: theme.text.heading,
    },
    emptySub: {
      fontSize: 12,
      fontFamily: "Barlow_500Medium",
      color: theme.text.secondary,
      textAlign: "center",
      paddingHorizontal: 20,
      lineHeight: 18,
    },

    // Listings Card Styles
    listingCard: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 16,
      gap: 14,
    },
    listingHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    listingInfo: {
      flex: 1,
      gap: 2,
    },
    listingTitle: {
      fontSize: 14,
      fontFamily: "Barlow_700Bold",
      color: theme.text.heading,
    },
    listingPrice: {
      fontSize: 15,
      fontFamily: "Barlow_800ExtraBold",
      color: Colors.primary.blue500,
    },
    listingMeta: {
      fontSize: 11,
      fontFamily: "Barlow_500Medium",
      color: theme.text.placeholder,
      marginTop: 4,
    },
    deleteBtn: {
      padding: 8,
      backgroundColor: isDark ? "#2A171C" : Colors.semantic.error.light,
      borderRadius: 8,
    },
    deleteBtnText: {
      fontSize: 14,
    },
    statusToggleContainer: {
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingTop: 12,
      gap: 8,
    },
    statusLabel: {
      fontSize: 11,
      fontFamily: "Barlow_600SemiBold",
      color: theme.text.secondary,
    },
    statusButtonsGroup: {
      flexDirection: "row",
      gap: 8,
    },
    statusOptionBtn: {
      flex: 1,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      alignItems: "center",
      backgroundColor: theme.background,
    },
    statusOptionText: {
      fontSize: 11,
      fontFamily: "Barlow_700Bold",
      color: theme.text.secondary,
    },
    statusOptionTextActive: {
      color: "#FFFFFF",
    },

    // History styles
    tabContainer: {
      flexDirection: "row",
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 4,
      marginBottom: 8,
    },
    tabBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: "center",
    },
    tabBtnActive: {
      backgroundColor: Colors.primary.blue500,
    },
    tabText: {
      fontSize: 13,
      fontFamily: "Barlow_700Bold",
      color: theme.text.secondary,
    },
    tabTextActive: {
      color: "#FFFFFF",
    },
    historyCard: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 14,
      gap: 4,
    },
    historyCardTitle: {
      fontSize: 13,
      fontFamily: "Barlow_700Bold",
      color: theme.text.heading,
    },
    historyCardPrice: {
      fontSize: 14,
      fontFamily: "Barlow_800ExtraBold",
      color: theme.text.heading,
    },
    historyCardMeta: {
      fontSize: 11,
      fontFamily: "Barlow_500Medium",
      color: theme.text.placeholder,
    },
    historyCardFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderTopWidth: 0.5,
      borderTopColor: theme.border,
      marginTop: 8,
      paddingTop: 8,
    },
    historyStatusBadge: {
      fontSize: 10,
      fontFamily: "Barlow_700Bold",
      color: Colors.semantic.success.dark,
      backgroundColor: Colors.semantic.success.light,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      overflow: "hidden",
    },
    historyStatusBadgeSelesai: {
      fontSize: 10,
      fontFamily: "Barlow_700Bold",
      color: Colors.primary.blue500,
      backgroundColor: Colors.primary.blue100,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      overflow: "hidden",
    },

    // Account Form Inputs
    fieldLabel: {
      fontSize: 11,
      fontFamily: "Barlow_600SemiBold",
      color: theme.text.secondary,
      marginBottom: 6,
      marginLeft: 2,
    },
    textInput: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 13,
      fontFamily: "Barlow_500Medium",
      color: theme.text.heading,
      marginBottom: 8,
    },
    saveBtn: {
      backgroundColor: Colors.primary.blue500,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
      marginTop: 10,
    },
    saveBtnText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontFamily: "Barlow_700Bold",
    },

    // Help Contacts
    helpText: {
      fontSize: 12,
      fontFamily: "Barlow_500Medium",
      color: theme.text.secondary,
      lineHeight: 18,
      marginBottom: 10,
    },
    contactCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 12,
    },
    contactIconContainer: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: theme.background,
      alignItems: "center",
      justifyContent: "center",
    },
    contactIcon: {
      fontSize: 20,
    },
    contactInfo: {
      flex: 1,
      marginLeft: 12,
      gap: 1,
    },
    contactName: {
      fontSize: 12,
      fontFamily: "Barlow_700Bold",
      color: theme.text.heading,
    },
    contactVal: {
      fontSize: 13,
      fontFamily: "Barlow_800ExtraBold",
      color: Colors.primary.blue500,
    },
    contactSub: {
      fontSize: 10,
      fontFamily: "Barlow_500Medium",
      color: theme.text.placeholder,
      marginTop: 2,
    },
    contactActionBtn: {
      fontSize: 11,
      fontFamily: "Barlow_700Bold",
      color: Colors.primary.blue500,
      backgroundColor: Colors.primary.blue100,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      overflow: "hidden",
    },

    // T&C Rules
    ruleBlock: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 14,
      gap: 6,
    },
    ruleTitle: {
      fontSize: 13,
      fontFamily: "Barlow_700Bold",
      color: theme.text.heading,
    },
    ruleDesc: {
      fontSize: 12,
      fontFamily: "Barlow_500Medium",
      color: theme.text.secondary,
      lineHeight: 18,
    },
    // Preferences (Theme & Language) Styles
    prefSectionTitle: {
      fontSize: 14,
      fontFamily: "Barlow_700Bold",
      color: theme.text.heading,
      marginBottom: 8,
    },
    prefOptionGroup: {
      flexDirection: "row",
      gap: 10,
    },
    prefOptionBtn: {
      flex: 1,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      alignItems: "center",
      backgroundColor: isDark ? "#252538" : "#F8F9FA",
    },
    prefOptionBtnActive: {
      backgroundColor: Colors.primary.blue500,
      borderColor: Colors.primary.blue500,
    },
    prefOptionText: {
      fontSize: 13,
      fontFamily: "Barlow_600SemiBold",
      color: theme.text.secondary,
    },
    prefOptionTextActive: {
      color: "#FFFFFF",
    },
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
    settingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    settingInfo: {
      flex: 1,
      paddingRight: 10,
    },
    settingLabel: {
      fontSize: 13,
      fontFamily: "Barlow_700Bold",
      color: theme.text.heading,
    },
    settingSubLabel: {
      fontSize: 10,
      fontFamily: "Barlow_500Medium",
      color: theme.text.placeholder,
      marginTop: 2,
    },
    customSwitch: {
      width: 46,
      height: 26,
      borderRadius: 13,
      padding: 3,
      justifyContent: "center",
    },
    switchOn: {
      backgroundColor: Colors.primary.blue500,
    },
    switchOff: {
      backgroundColor: isDark ? "#3A3A4C" : "#E5E5EA",
    },
    switchThumb: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: "#FFFFFF",
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 2,
      elevation: 2,
    },
    switchThumbOn: {
      alignSelf: "flex-end",
    },
    switchThumbOff: {
      alignSelf: "flex-start",
    },
    actionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    actionRowText: {
      fontSize: 13,
      fontFamily: "Barlow_600SemiBold",
      color: theme.text.heading,
    },
    actionRowChevron: {
      fontSize: 18,
      color: theme.text.placeholder,
      fontFamily: "Barlow_600SemiBold",
    },
    dangerText: {
      color: Colors.semantic.error.main,
    },
    avatarEditBadge: {
      position: "absolute",
      bottom: 12,
      right: 0,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: Colors.primary.blue500,
      borderWidth: 2,
      borderColor: theme.surface,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 3,
    },
    avatarEditIcon: {
      fontSize: 12,
    },
    ratingBadge: {
      backgroundColor: isDark ? "#2C2C3E" : "#FEF3C7",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? "#4D4D6E" : "#FDE68A",
    },
    ratingBadgeText: {
      fontSize: 11,
      fontFamily: "Barlow_700Bold",
      color: isDark ? "#FBBF24" : "#D97706",
    },
    noRatingBadge: {
      backgroundColor: isDark ? "#1C1C28" : "#F3F4F6",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    noRatingBadgeText: {
      fontSize: 10,
      fontFamily: "Barlow_500Medium",
      color: theme.text.secondary,
    },
    giveRatingBtn: {
      backgroundColor: Colors.primary.blue500,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    giveRatingBtnText: {
      fontSize: 11,
      fontFamily: "Barlow_700Bold",
      color: "#FFFFFF",
    },
    ratingModalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    ratingModalContent: {
      width: "90%",
      borderRadius: 24,
      borderWidth: 1,
      padding: 24,
      alignItems: "center",
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 5,
    },
    ratingModalTitle: {
      fontSize: 18,
      fontFamily: "Barlow_800ExtraBold",
      color: theme.text.heading,
      marginBottom: 8,
    },
    ratingModalSubtitle: {
      fontSize: 13,
      fontFamily: "Barlow_600SemiBold",
      color: theme.text.secondary,
      textAlign: "center",
      marginBottom: 20,
    },
    starsRow: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 12,
      marginBottom: 12,
    },
    starBtn: {
      padding: 4,
    },
    starIcon: {
      fontSize: 36,
    },
    ratingValueText: {
      fontSize: 14,
      fontFamily: "Barlow_700Bold",
      color: theme.text.heading,
      marginBottom: 24,
    },
    ratingModalActions: {
      flexDirection: "row",
      gap: 12,
      width: "100%",
    },
    ratingActionBtn: {
      flex: 1,
      height: 44,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
    },
    ratingCancelBtn: {
      backgroundColor: "transparent",
    },
    ratingCancelText: {
      fontFamily: "Barlow_700Bold",
      fontSize: 14,
      color: theme.text.secondary,
    },
    ratingSubmitBtn: {
      backgroundColor: Colors.primary.blue500,
      borderColor: Colors.primary.blue500,
    },
    ratingSubmitText: {
      fontFamily: "Barlow_700Bold",
      fontSize: 14,
      color: "#FFFFFF",
    },
  });
};
