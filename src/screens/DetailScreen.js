// src/screens/DetailScreen.js
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  Platform,
  Linking,
  Modal,
  Share,
  Image,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { t, translateText } from "../utils/translator";
import Config from "../services/config";
import api from "../services/api";

const resolveImageUrl = (url) => {
  if (!url) return "https://images.unsplash.com/photo-1542291026-7eec264c27ff";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("file://")) {
    return url;
  }
  const host = Config.BASE_URL.replace("/api", "");
  return `${host}${url}`;
};

const { width } = Dimensions.get("window");

export default function DetailScreen({
  item,
  activeHost = "https://thriftly.id",
  onBack,
  theme,
  isDark,
  isWishlisted,
  onWishlistPress,
  onBookItem,
  isOwner,
  onChangeStatus,
  onAddToCart,
  showAlert,
  language = "id",
}) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(45)).current;
  const heartScale = useRef(new Animated.Value(1)).current;
  const successScale = useRef(new Animated.Value(0.3)).current;

  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedLoc, setSelectedLoc] = useState("Kantin Kampus 🍜");
  const [selectedTime, setSelectedTime] = useState("Jam Istirahat Kuliah (12:00) ⏰");
  const [showSuccess, setShowSuccess] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState("");

  // State untuk fitur Laporan Iklan (Multi-select + Komentar)
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReasons, setReportReasons] = useState([]); // array menyimpan alasan terpilih
  const [reportDetail, setReportDetail] = useState(""); // komentar tambahan pelapor
  const [reportLoading, setReportLoading] = useState(false);

  const REPORT_REASONS = [
    "Masalah Judul",
    "Masalah Deskripsi",
    "Masalah Harga",
    "Masalah Foto",
  ];

  const handleToggleReason = (reason) => {
    if (reportReasons.includes(reason)) {
      setReportReasons(reportReasons.filter((r) => r !== reason));
    } else {
      setReportReasons([...reportReasons, reason]);
    }
  };

  const handleSubmitReport = async () => {
    if (reportReasons.length === 0) {
      if (showAlert) showAlert("Pilih Alasan", "Harap pilih minimal satu alasan laporan terlebih dahulu.", [], "warning");
      return;
    }
    setReportLoading(true);
    try {
      // Gabungkan alasan terpilih menjadi satu string dipisah koma
      const reasonsString = reportReasons.join(", ");
      const result = await api.reports.submit(item.id, reasonsString, reportDetail.trim());
      
      setShowReportModal(false);
      setReportReasons([]);
      setReportDetail("");
      
      const suspended = result?.itemSuspended === "true";
      if (showAlert) {
        showAlert(
          suspended ? "🚫 Iklan Disuspend" : "✅ Laporan Terkirim",
          result?.message || "Terima kasih! Laporan Anda telah kami terima.",
          [],
          suspended ? "warning" : "success"
        );
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "Gagal mengirim laporan. Coba lagi nanti.";
      if (err?.response?.status === 409) {
        if (showAlert) showAlert("Sudah Dilaporkan", "Anda sudah pernah melaporkan iklan ini sebelumnya.", [], "warning");
      } else {
        if (showAlert) showAlert("Gagal", msg, [], "danger");
      }
      setShowReportModal(false);
    } finally {
      setReportLoading(false);
    }
  };

  const [translatedTitle, setTranslatedTitle] = useState(item.title);
  const [translatedDesc, setTranslatedDesc] = useState(item.description || "");
  const [translatedCond, setTranslatedCond] = useState(item.condition || "");
  const [translatedLocState, setTranslatedLocState] = useState(item.codLocation || "");
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    async function performTranslation() {
      if (language === "en") {
        setIsTranslating(true);
        const titleText = await translateText(item.title, "en");
        const descText = await translateText(item.description || "Barang bekas berkualitas milik mahasiswa Politeknik Astra. Kondisi terawat dengan baik, fungsi 100% normal. Bisa COD di area kampus Cikarang atau sekitaran kos mahasiswa.", "en");
        const condText = await translateText(item.condition || "", "en");
        const locText = await translateText(item.codLocation || "", "en");
        
        setTranslatedTitle(titleText);
        setTranslatedDesc(descText);
        setTranslatedCond(condText);
        setTranslatedLocState(locText);
        setIsTranslating(false);
      } else {
        setTranslatedTitle(item.title);
        setTranslatedDesc(item.description || "Barang bekas berkualitas milik mahasiswa Politeknik Astra. Kondisi terawat dengan baik, fungsi 100% normal. Bisa COD di area kampus Cikarang atau sekitaran kos mahasiswa.");
        setTranslatedCond(item.condition || "");
        setTranslatedLocState(item.codLocation || "");
      }
    }
    performTranslation();
  }, [language, item]);

  const handleShare = async () => {
    try {
      const message = `Beli ${item.title} di Thriftly dengan harga ${item.price}!\n\nKondisi: ${item.condition}\nLokasi COD: Politeknik Astra Cikarang`;

      await Share.share({
        message: message,
        title: item.title,
      });
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const scrollX = useRef(new Animated.Value(0)).current;
  const thumbScales = [
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
  ];

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(45);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 7,
        tension: 35,
        useNativeDriver: true,
      }),
    ]).start();
  }, [item]);

  // Animate thumbnail border scale bounces when index changes
  const [uiIndex, setUiIndex] = useState(0);

  useEffect(() => {
    thumbScales.forEach((scale, idx) => {
      Animated.spring(scale, {
        toValue: idx === uiIndex ? 1.15 : 1.0,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }).start();
    });
  }, [uiIndex]);

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

  const basePriceNum = parseInt(item?.price?.replace(/[^0-9]/g, "")) || 0;

  const handleWhatsApp = () => {
    const phone = item.sellerPhone || "6281398224083";
    const totalPriceFormatted = `Rp ${(basePriceNum * quantity).toLocaleString("id-ID")}`;
    const message = `Halo ${item.seller}, saya tertarik membeli "${item.title}" sebanyak ${quantity} item dengan total harga ${totalPriceFormatted} yang Anda pasang di Thriftly. Apakah masih ada? Bisa COD di kampus?`;
    const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;

    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`);
      }
    }).catch(() => {
      Alert.alert("Eror", "Gagal membuka WhatsApp. Silakan hubungi penjual secara manual.");
    });
  };

  const handleConfirmBooking = () => {
    onBookItem(item.id, "Booked");
    setShowSuccess(true);

    Animated.spring(successScale, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      setShowSuccess(false);
      setShowBookingModal(false);
      onBack(); // Go back to listings screen to see updated badge
    }, 2200);
  };

  if (!item) return null;

  // Emojis and categories mappings
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
  const styles = getStyles(theme, isDark, insets);

  const [carouselWidth, setCarouselWidth] = useState(200);
  const scrollRef = useRef(null);

  const slides = (item.images && item.images.length > 0)
    ? item.images.map((imgUrl, idx) => ({ type: 'image', uri: imgUrl, label: `Foto ${idx + 1}` }))
    : [
        { type: 'emoji', emoji: emoji, label: "Utama" },
        { type: 'emoji', emoji: "📦", label: "Kotak" },
        { type: 'emoji', emoji: "✨", label: "Fisik" },
        { type: 'emoji', emoji: "📋", label: "Detail" },
        { type: 'emoji', emoji: "🔍", label: "Close-up" },
      ];

  // Auto-scroll carousel timer
  useEffect(() => {
    let timer = null;
    if (item && !showBookingModal && slides.length > 0) {
      timer = setInterval(() => {
        let nextIndex = (uiIndex + 1) % slides.length;
        scrollRef.current?.scrollTo({ x: nextIndex * carouselWidth, animated: true });
        setUiIndex(nextIndex);
      }, 3500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [uiIndex, carouselWidth, item, showBookingModal, slides.length]);

  const handleScroll = (event) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollOffset / carouselWidth);
    if (index !== uiIndex && index >= 0 && index < slides.length) {
      setUiIndex(index);
    }
  };

  const handleThumbnailPress = (idx) => {
    scrollRef.current?.scrollTo({ x: idx * carouselWidth, animated: true });
    setUiIndex(idx);
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.heroContainer}>
          {/* Main image wrapper with horizontal swiper */}
          <View
            style={styles.mainImageWrapper}
            onLayout={(e) => setCarouselWidth(e.nativeEvent.layout.width)}
          >
            <Animated.ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleScroll}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: false }
              )}
              scrollEventThrottle={16}
              style={{ width: "100%", height: "100%" }}
            >
              {slides.map((slide, idx) => (
                <View
                  key={idx}
                  style={{
                    width: carouselWidth,
                    height: 220,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {slide.type === 'image' ? (
                    <Image
                      source={{ uri: resolveImageUrl(slide.uri) }}
                      style={{ width: "90%", height: "100%", borderRadius: 16 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.imageIcon}>{slide.emoji}</Text>
                  )}
                </View>
              ))}
            </Animated.ScrollView>

            {/* Liquid Page Indicators (Dots) */}
            <View style={styles.dotsIndicatorRow}>
              {slides.map((_, idx) => {
                // Interpolate width to stretch dot into a capsule capsule as user scrolls
                const dotWidth = scrollX.interpolate({
                  inputRange: [
                    (idx - 1) * carouselWidth,
                    idx * carouselWidth,
                    (idx + 1) * carouselWidth,
                  ],
                  outputRange: [6, 16, 6],
                  extrapolate: "clamp",
                });

                const dotOpacity = scrollX.interpolate({
                  inputRange: [
                    (idx - 1) * carouselWidth,
                    idx * carouselWidth,
                    (idx + 1) * carouselWidth,
                  ],
                  outputRange: [0.3, 1, 0.3],
                  extrapolate: "clamp",
                });

                return (
                  <Animated.View
                    key={idx}
                    style={[
                      styles.dot,
                      {
                        width: dotWidth,
                        opacity: dotOpacity,
                      }
                    ]}
                  />
                );
              })}
            </View>
          </View>

          <View style={styles.previewStack}>
            {slides.map((slide, idx) => {
              const isSelected = idx === uiIndex;
              return (
                <Animated.View
                  key={idx}
                  style={{ transform: [{ scale: thumbScales[idx] || 1 }] }}
                >
                  <TouchableOpacity
                    style={[
                      styles.previewBox,
                      isSelected && { borderColor: isDark ? "#FFFFFF" : "#000000", borderWidth: 2 }
                    ]}
                    onPress={() => handleThumbnailPress(idx)}
                    activeOpacity={0.8}
                  >
                    {slide.type === 'image' ? (
                      <Image
                        source={{ uri: resolveImageUrl(slide.uri) }}
                        style={{ width: "100%", height: "100%", borderRadius: 8 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={[styles.previewBoxText, isSelected && { opacity: 1 }]}>
                        {slide.emoji}
                      </Text>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoSection}>
          {/* Badge Row (Orange "New" and Green "Discount/COD") */}
          <View style={styles.badgeRow}>
            {item.isHot && (
              <View style={[styles.badgePill, { backgroundColor: isDark ? "#FFFFFF" : "#000000" }]}>
                <Text style={[styles.badgePillText, { color: isDark ? "#000000" : "#FFFFFF" }]}>HOT ITEM 🔥</Text>
              </View>
            )}
            <View style={[styles.badgePill, { backgroundColor: "#10B981" }]}>
              <Text style={styles.badgePillText}>COD Kampus 🤝</Text>
            </View>
            {isOwner && (
              <View style={[styles.badgePill, { backgroundColor: isDark ? "#3A3A3C" : "#E5E5EA" }]}>
                <Text style={[styles.badgePillText, { color: isDark ? "#FFFFFF" : "#000000" }]}>Iklan Anda 🌟</Text>
              </View>
            )}
          </View>

          {/* Title and Heart Row */}
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailTitle}>{translatedTitle}</Text>
              <Text style={styles.detailSubtitle}>{catName} · Politeknik Astra</Text>
            </View>
            <TouchableOpacity onPress={handleHeartPress} activeOpacity={0.8} style={styles.detailHeartBtn}>
              <Animated.Text
                style={[
                  styles.detailHeartIcon,
                  isWishlisted && styles.detailHeartIconActive,
                  { transform: [{ scale: heartScale }] },
                ]}
              >
                {isWishlisted ? "♥" : "♡"}
              </Animated.Text>
            </TouchableOpacity>
          </View>

          {/* Meta Row (Condition & Status) */}
          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>{t("Kondisi", language)}</Text>
              <Text style={styles.metaValue}>{translatedCond}</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>{t("Status", language)}</Text>
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
                {item.status === "Available"
                  ? t("Tersedia", language)
                  : item.status === "Booked"
                    ? t("Sudah Dipesan", language)
                    : t("Terjual", language)}
              </Text>
            </View>
          </View>

          {/* Size Selector — only for clothing (categoryId 3) */}
          {item.categoryId === "3" && (
            <View style={styles.sizeSelectorWrap}>
              <Text style={styles.sizeLabel}>{t("Pilih Ukuran", language)}</Text>
              <View style={styles.sizeRow}>
                {["S", "M", "L", "XL", "XXL"].map((sz) => {
                  const isActive = selectedSize === sz;
                  return (
                    <TouchableOpacity
                      key={sz}
                      onPress={() => setSelectedSize(sz)}
                      activeOpacity={0.75}
                      style={[
                        styles.sizeChip,
                        isActive && styles.sizeChipActive,
                      ]}
                    >
                      <Text style={[
                        styles.sizeChipText,
                        isActive && styles.sizeChipTextActive,
                      ]}>{sz}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {selectedSize === "" && (
                <Text style={styles.sizeHint}>⚠️ Pilih ukuran terlebih dahulu</Text>
              )}
            </View>
          )}

          {/* Quantity & Price Stepper Row */}
          <View style={styles.qtyPriceRow}>
            <View style={styles.qtyContainer}>
              <Text style={styles.qtyLabel}>{t("Jumlah Porsi / Item", language)}</Text>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setQuantity((prev) => Math.max(1, prev - 1))}
                  activeOpacity={0.7}
                >
                  <Text style={styles.stepperBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.stepperVal}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setQuantity((prev) => prev + 1)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.stepperBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>{t("Total Harga", language)}</Text>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
                <Text style={styles.strikePrice}>
                  Rp {Math.round(basePriceNum * 1.25 * quantity).toLocaleString("id-ID")}
                </Text>
                <Text style={styles.priceValue}>
                  Rp {(basePriceNum * quantity).toLocaleString("id-ID")}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Seller Section */}
        <View style={styles.sellerSection}>
          <View style={styles.sellerAvatar}>
            <Text style={styles.sellerAvatarText}>🧑‍🎓</Text>
          </View>
          <View style={styles.sellerInfo}>
            <Text style={styles.sellerName}>{item.seller || "Penjual Mahasiswa"}</Text>
            <Text style={styles.sellerSub}>Politeknik Astra Cikarang</Text>
          </View>
        </View>

        {/* Description Section */}
        <View style={styles.descriptionSection}>
          <Text style={styles.sectionTitle}>{t("Deskripsi Barang", language)}</Text>
          <Text style={styles.descriptionText}>{translatedDesc}</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Persistent Bottom Action Bar */}
      {!isOwner && (
        <View style={styles.footer}>
          {item.status === "Sold" ? (
            <View style={styles.disabledFullBtn}>
              <Text style={styles.disabledFullBtnText}>Barang Sudah Terjual ✕</Text>
            </View>
          ) : item.status === "Booked" ? (
            <View style={styles.footerButtonsRow}>
              {/* WhatsApp circle icon button */}
              <TouchableOpacity
                style={styles.chatSecondaryBtn}
                onPress={handleWhatsApp}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-whatsapp" size={22} color={isDark ? "#FFFFFF" : "#25D366"} />
              </TouchableOpacity>
              <View style={styles.checkoutBtnDisabled}>
                <Ionicons name="bag-outline" size={16} color={theme.text.placeholder} style={{ marginRight: 6 }} />
                <Text style={styles.checkoutBtnDisabledText}>{t("Sudah Dibooking", language)}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.footerButtonsRow}>
              {/* WhatsApp circle icon button */}
              <TouchableOpacity
                style={styles.chatSecondaryBtn}
                onPress={handleWhatsApp}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-whatsapp" size={22} color={isDark ? "#FFFFFF" : "#25D366"} />
              </TouchableOpacity>

              {/* Add to Cart button */}
              <TouchableOpacity
                style={styles.cartSecondaryBtn}
                onPress={() => {
                  if (onAddToCart) {
                    onAddToCart(item);
                  }
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="cart-outline" size={22} color={isDark ? "#FFFFFF" : Colors.primary.blue500} />
              </TouchableOpacity>

              {/* Main CTA - full width */}
              <TouchableOpacity
                style={styles.checkoutBtn}
                onPress={() => setShowBookingModal(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="bag-outline" size={18} color={isDark ? "#000000" : "#FFFFFF"} style={{ marginRight: 8 }} />
                <Text style={styles.checkoutBtnText}>{t("Booking COD", language)}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* ── Booking COD Modal ── */}
      <Modal
        visible={showBookingModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBookingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {!showSuccess ? (
              <>
                <Text style={styles.modalTitle}>{t("Booking COD Kampus", language)}</Text>
                <Text style={styles.modalSubtitle}>
                  {t("Pilih lokasi dan waktu pertemuan di area Politeknik Astra Cikarang.", language)}
                </Text>

                {/* Location selector */}
                <Text style={styles.selectorLabel}>{t("Lokasi COD:", language)}</Text>
                <View style={styles.chipRow}>
                  {["Kantin Kampus 🍜", "Lobby Gedung A 🏛️", "Perpustakaan 📚", "Gazebo TRPL 💻", "Area Kos Astra 🏠"].map((loc) => {
                    const isSelected = selectedLoc === loc;
                    return (
                      <TouchableOpacity
                        key={loc}
                        onPress={() => setSelectedLoc(loc)}
                        style={[styles.chip, isSelected && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                          {loc}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Time selector */}
                <Text style={styles.selectorLabel}>{t("Waktu Pertemuan:", language)}</Text>
                <View style={styles.chipRow}>
                  {[
                    "Jam Istirahat (12:00) ⏰",
                    "Selesai Kuliah (17:00) ⏰",
                    "Sela Jam Kuliah ⏰",
                  ].map((time) => {
                    const isSelected = selectedTime === time;
                    return (
                      <TouchableOpacity
                        key={time}
                        onPress={() => setSelectedTime(time)}
                        style={[styles.chip, isSelected && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                          {time}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Confirm Buttons */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setShowBookingModal(false)}
                  >
                    <Text style={styles.cancelBtnText}>{t("Batal", language)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmBtn}
                    onPress={handleConfirmBooking}
                  >
                    <Text style={styles.confirmBtnText}>{t("Konfirmasi Booking", language)}</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.successContainer}>
                <Animated.View style={[styles.successIconCircle, { transform: [{ scale: successScale }] }]}>
                  <Text style={styles.successIconCheck}>✓</Text>
                </Animated.View>
                <Text style={styles.successTitle}>{t("Booking Berhasil!", language)}</Text>
                <Text style={styles.successSubtitle}>
                  {language === "en"
                    ? `The item has been booked for you. Please contact the seller via WhatsApp to coordinate COD at ${selectedLoc} at ${selectedTime}.`
                    : `Barang telah di-book untuk Anda. Silakan hubungi penjual via WhatsApp untuk koordinasi COD di ${selectedLoc} pada ${selectedTime}.`}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
      {/* ── Modal Laporan Iklan ── */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "80%", backgroundColor: isDark ? "#121212" : "#FFFFFF" }]}>
            {/* Header */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={[styles.modalTitle, { color: "#EF4444", fontSize: 18, fontFamily: "Barlow_800ExtraBold" }]}>🚩 Laporkan Iklan</Text>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <Ionicons name="close" size={24} color={theme.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 35 }}>
              <Text style={{ fontSize: 13, fontFamily: "Barlow_500Medium", color: theme.text.secondary, marginBottom: 12 }}>
                Pilih satu atau lebih alasan laporan untuk iklan ini:
              </Text>

              {/* Alasan sebagai chip/pilihan (Multi-Select) */}
              {REPORT_REASONS.map((reason) => {
                const isSelected = reportReasons.includes(reason);
                return (
                  <TouchableOpacity
                    key={reason}
                    style={[
                      styles.reasonChip,
                      isSelected && styles.reasonChipSelected,
                      { paddingVertical: 11, borderRadius: 10, marginBottom: 8 }
                    ]}
                    onPress={() => handleToggleReason(reason)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isSelected ? "checkbox" : "square-outline"}
                      size={19}
                      color={isSelected ? "#EF4444" : theme.text.secondary}
                      style={{ marginRight: 10 }}
                    />
                    <Text style={[
                      styles.reasonChipText,
                      isSelected && { color: "#EF4444", fontWeight: "700" },
                    ]}>
                      {reason}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* Input Komentar Laporan (vdetail) */}
              <Text style={{ fontSize: 12, fontFamily: "Barlow_700Bold", color: theme.text.placeholder, textTransform: "uppercase", marginTop: 14, marginBottom: 6 }}>
                Komentar / Detail Laporan
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)",
                  borderRadius: 10,
                  padding: 12,
                  color: theme.text.primary,
                  backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                  fontFamily: "Barlow_500Medium",
                  fontSize: 13,
                  textAlignVertical: "top",
                  height: 80,
                  marginBottom: 12,
                }}
                placeholder="Tuliskan detail masalah barang..."
                placeholderTextColor={theme.text.placeholder}
                multiline
                numberOfLines={3}
                value={reportDetail}
                onChangeText={setReportDetail}
              />

              {/* Info box */}
              <View style={[styles.reportInfoBox, { marginTop: 4, marginBottom: 20 }]}>
                <Ionicons name="information-circle-outline" size={16} color={theme.text.secondary} />
                <Text style={styles.reportInfoText}>
                  Iklan akan langsung ditangguhkan jika terbukti melanggar standar. Penyalahgunaan fitur ini dapat berakibat sanksi akun.
                </Text>
              </View>

              {/* Tombol Kirim */}
              <TouchableOpacity
                style={[
                  styles.reportSubmitBtn,
                  (reportReasons.length === 0 || reportLoading) && { opacity: 0.5 },
                  { borderRadius: 12, paddingVertical: 14 }
                ]}
                onPress={handleSubmitReport}
                disabled={reportReasons.length === 0 || reportLoading}
                activeOpacity={0.85}
              >
                <Text style={styles.reportSubmitBtnText}>
                  {reportLoading ? "Mengirim..." : "Kirim Laporan"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Floating Header Overlay */}
      <View style={[styles.floatingHeader, { paddingTop: insets.top > 0 ? insets.top + 8 : 14 }]}>
        <TouchableOpacity style={styles.floatingBackBtn} onPress={onBack} activeOpacity={0.8}>
          <Text style={styles.floatingBackText}>←</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {/* Tombol Laporkan — hanya untuk pembeli (bukan pemilik barang) */}
          {!isOwner && (
            <TouchableOpacity
              style={[styles.floatingShareBtn, { backgroundColor: "rgba(239,68,68,0.15)" }]}
              activeOpacity={0.8}
              onPress={() => { setShowReportModal(true); setReportReasons([]); setReportDetail(""); }}
            >
              <Text style={{ fontSize: 16 }}>🚩</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.floatingShareBtn} activeOpacity={0.8} onPress={handleShare}>
            <Text style={styles.floatingShareText}>🔗</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const getStyles = (theme, isDark, insets) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    // Floating Header Overlay styled like Nike App (transparent background)
    floatingHeader: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      zIndex: 10,
      elevation: 10,
    },
    floatingBackBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(0, 0, 0, 0.75)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.1)",
    },
    floatingBackText: {
      fontSize: 20,
      fontFamily: "Barlow_700Bold",
      color: "#FFFFFF",
      marginTop: -2,
    },
    floatingShareBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(0, 0, 0, 0.75)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.1)",
    },
    floatingShareText: {
      fontSize: 16,
      color: "#FFFFFF",
    },
    // Layout Elements
    scrollContent: {
      paddingBottom: 110,
    },
    // Hero container containing giant image (left) + thumbnails (right)
    heroContainer: {
      flexDirection: "row",
      backgroundColor: isDark ? "#1C1C1E" : "#F2F2F7",
      borderBottomLeftRadius: 36,
      borderBottomRightRadius: 36,
      paddingHorizontal: 16,
      paddingTop: insets.top > 0 ? insets.top + 60 : 70,
      paddingBottom: 24,
      alignItems: "center",
      gap: 16,
    },
    mainImageWrapper: {
      flex: 1.2,
      height: 220,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#2C2C2E" : "#FFFFFF",
      borderRadius: 24,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.2 : 0.05,
      shadowRadius: 8,
      elevation: 4,
    },
    imageIcon: {
      fontSize: 100,
    },
    previewStack: {
      flex: 0.35,
      gap: 10,
      justifyContent: "center",
      alignItems: "center",
    },
    previewBox: {
      width: 40,
      height: 40,
      backgroundColor: isDark ? "#2C2C2E" : "#FFFFFF",
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: theme.border,
    },
    previewBoxText: {
      fontSize: 16,
      opacity: 0.5,
    },
    dotsIndicatorRow: {
      position: "absolute",
      bottom: 12,
      flexDirection: "row",
      alignSelf: "center",
      gap: 6,
      zIndex: 5,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: isDark ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.2)",
    },
    dotActive: {
      width: 14,
      backgroundColor: isDark ? "#FFFFFF" : "#000000",
    },
    // Info section styling
    infoSection: {
      paddingHorizontal: 20,
      paddingTop: 24,
      gap: 16,
    },
    badgeRow: {
      flexDirection: "row",
      gap: 8,
      flexWrap: "wrap",
    },
    badgePill: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 50, // Spec: pill / chip borderRadius 50
    },
    badgePillText: {
      fontSize: 10,
      fontFamily: "Barlow_700Bold", // Spec: Micro: 10px weight 700
      color: "#FFFFFF",
      textTransform: "uppercase",
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      justifyContent: "space-between",
    },
    detailTitle: {
      fontSize: 22,
      fontFamily: "Barlow_900Black", // Spec: Title weight 900
      color: theme.text.heading,
      letterSpacing: -0.5,
      lineHeight: 28,
    },
    detailSubtitle: {
      fontSize: 13,
      fontFamily: "Barlow_500Medium",
      color: theme.text.secondary,
      marginTop: 4,
    },
    detailHeartBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: theme.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.surface,
    },
    detailHeartIcon: {
      fontSize: 20,
      color: theme.text.placeholder,
    },
    detailHeartIconActive: {
      color: "#EF4444",
    },
    // Meta data card info row
    metaRow: {
      flexDirection: "row",
      backgroundColor: theme.surface,
      borderRadius: 18,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    metaCol: {
      flex: 1,
      alignItems: "center",
    },
    metaLabel: {
      fontSize: 9,
      fontFamily: "Barlow_800ExtraBold",
      color: theme.text.placeholder,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    metaValue: {
      fontSize: 14,
      fontFamily: "Barlow_700Bold",
      color: theme.text.heading,
      marginTop: 4,
    },
    metaDivider: {
      width: 1,
      height: "100%",
      backgroundColor: theme.border,
    },
    // Size Selection Component
    sizeSection: {
      gap: 12,
      marginTop: 8,
    },
    sizeHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    sizeTitle: {
      fontSize: 13,
      fontFamily: "Barlow_800ExtraBold",
      color: theme.text.heading,
    },
    sizeGuideText: {
      fontSize: 11,
      fontFamily: "Barlow_700Bold",
      color: theme.text.secondary,
      textDecorationLine: "underline",
    },
    sizeChipsRow: {
      flexDirection: "row",
      gap: 8,
    },
    sizeChip: {
      flex: 1,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.surface,
      borderWidth: 1.5,
      borderColor: theme.border,
      alignItems: "center",
      justifyContent: "center",
    },
    sizeChipActive: {
      backgroundColor: theme.text.heading,
      borderColor: theme.text.heading,
    },
    sizeChipText: {
      fontSize: 12,
      fontFamily: "Barlow_700Bold",
      color: theme.text.primary,
    },
    sizeChipTextActive: {
      color: isDark ? "#1A1A2E" : "#FFFFFF",
    },
    // Stepper & Price Row
    qtyPriceRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 8,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    qtyContainer: {
      gap: 8,
    },
    qtyLabel: {
      fontSize: 11,
      fontFamily: "Barlow_800ExtraBold",
      color: theme.text.placeholder,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    stepper: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7",
      borderRadius: 20,
      paddingHorizontal: 4,
      paddingVertical: 4,
      gap: 12,
    },
    stepperBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.surface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.border,
    },
    stepperBtnText: {
      fontSize: 16,
      fontFamily: "Barlow_700Bold",
      color: theme.text.heading,
    },
    stepperVal: {
      fontSize: 13,
      fontFamily: "Barlow_700Bold",
      color: theme.text.heading,
      minWidth: 16,
      textAlign: "center",
    },
    priceContainer: {
      alignItems: "flex-end",
      gap: 4,
    },
    priceLabel: {
      fontSize: 11,
      fontFamily: "Barlow_800ExtraBold",
      color: theme.text.placeholder,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    strikePrice: {
      fontSize: 12,
      color: theme.text.placeholder,
      textDecorationLine: "line-through",
      fontFamily: "Barlow_500Medium",
    },
    priceValue: {
      fontSize: 20,
      fontFamily: "Barlow_900Black", // Harga selalu weight 900
      color: Colors.primary.blue500, // Harga selalu warna blue500
    },
    // Seller Info Card
    sellerSection: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      padding: 14,
      marginHorizontal: 20,
      marginTop: 20,
    },
    sellerAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7",
      alignItems: "center",
      justifyContent: "center",
    },
    sellerAvatarText: {
      fontSize: 20,
    },
    sellerInfo: {
      marginLeft: 12,
    },
    sellerName: {
      fontSize: 13,
      fontFamily: "Barlow_700Bold",
      color: theme.text.heading,
    },
    sellerSub: {
      fontSize: 11,
      fontFamily: "Barlow_500Medium",
      color: theme.text.secondary,
      marginTop: 2,
    },
    // Description text
    descriptionSection: {
      gap: 10,
      paddingHorizontal: 20,
      marginTop: 24,
    },
    sectionTitle: {
      fontSize: 11,
      fontFamily: "Barlow_800ExtraBold",
      color: theme.text.placeholder,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    descriptionText: {
      fontSize: 13,
      fontFamily: "Barlow_500Medium",
      color: theme.text.primary,
      lineHeight: 19,
    },
    // Actions Footer
    footer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: insets.bottom > 0 ? insets.bottom + 10 : 22,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: isDark ? 0.45 : 0.12,
      shadowRadius: 20,
      elevation: 20,
    },
    footerButtonsRow: {
      flexDirection: "row",
      gap: 12,
      alignItems: "center",
    },
    chatSecondaryBtn: {
      width: 52,
      height: 52,
      borderRadius: 26,
      flexDirection: "row",
      borderWidth: 1.5,
      borderColor: isDark ? "rgba(255,255,255,0.3)" : "#E0E0E0",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#2C2C2E" : "#F5F5F5",
    },
    cartSecondaryBtn: {
      width: 52,
      height: 52,
      borderRadius: 26,
      flexDirection: "row",
      borderWidth: 1.5,
      borderColor: isDark ? "rgba(255,255,255,0.3)" : "#E0E0E0",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#2C2C2E" : "#F5F5F5",
    },
    chatSecondaryText: {
      color: isDark ? "#FFFFFF" : "#000000",
      fontSize: 13,
      fontFamily: "Barlow_700Bold",
    },
    checkoutBtn: {
      flex: 1,
      flexDirection: "row",
      backgroundColor: Colors.primary.blue500, // Spec: tombol utama background: primary.blue500
      borderRadius: 50, // Spec: tombol utama borderRadius: 50
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    checkoutBtnText: {
      color: "#FFFFFF", // Spec: tombol utama text color: #FFFFFF
      fontSize: 15,
      fontFamily: "Barlow_700Bold",
    },
    checkoutBtnDisabled: {
      flex: 1,
      flexDirection: "row",
      backgroundColor: Colors.primary.blue300,
      borderRadius: 50,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    checkoutBtnDisabledText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontFamily: "Barlow_700Bold",
    },
    disabledFullBtn: {
      backgroundColor: Colors.primary.blue300,
      borderRadius: 50,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    disabledFullBtnText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontFamily: "Barlow_700Bold",
    },
    // Owner Actions Footer
    ownerFooter: {
      gap: 8,
    },
    ownerFooterLabel: {
      fontSize: 10,
      fontFamily: "Barlow_800ExtraBold",
      color: theme.text.placeholder,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      textAlign: "center",
    },
    ownerStatusRow: {
      flexDirection: "row",
      gap: 8,
    },
    ownerStatusBtn: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: 50, // Spec: all CTA / status badges borderRadius 50
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.surface,
    },
    ownerStatusBtnActive: {
      borderColor: Colors.primary.blue500,
      backgroundColor: Colors.primary.blue500,
    },
    ownerStatusText: {
      fontSize: 11,
      fontFamily: "Barlow_600SemiBold",
      color: theme.text.secondary,
    },
    ownerStatusTextActive: {
      color: "#FFFFFF",
    },
    // Modal & Chips elements (campus locations, meeting slots)
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: insets.bottom > 0 ? insets.bottom + 20 : 30,
    },
    modalTitle: {
      fontSize: 18,
      fontFamily: "Barlow_800ExtraBold",
      color: theme.text.heading,
      textAlign: "center",
    },
    modalSubtitle: {
      fontSize: 12,
      fontFamily: "Barlow_500Medium",
      color: theme.text.secondary,
      textAlign: "center",
      marginTop: 4,
      marginBottom: 14,
    },
    selectorLabel: {
      fontSize: 11,
      fontFamily: "Barlow_700Bold",
      color: theme.text.placeholder,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginTop: 10,
      marginBottom: 8,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginBottom: 12,
    },
    chip: {
      backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7",
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 50, // Spec: category chip borderRadius 50
      borderWidth: 1.5,
      borderColor: "transparent",
    },
    chipActive: {
      borderColor: theme.text.heading,
      backgroundColor: theme.text.heading,
    },
    chipText: {
      fontSize: 11,
      color: theme.text.secondary,
      fontFamily: "Barlow_600SemiBold",
    },
    chipTextActive: {
      color: isDark ? "#1A1A2E" : "#FFFFFF",
      fontFamily: "Barlow_700Bold",
    },
    modalActions: {
      flexDirection: "row",
      gap: 12,
      marginTop: 16,
    },
    cancelBtn: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: theme.border,
      borderRadius: 50, // Spec: cancelBtn borderRadius 50
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    cancelBtnText: {
      color: theme.text.secondary,
      fontSize: 12,
      fontFamily: "Barlow_700Bold",
    },
    confirmBtn: {
      flex: 1.5,
      backgroundColor: Colors.primary.blue500, // Spec: confirm CTA background blue500
      borderRadius: 50, // Spec: confirm CTA borderRadius 50
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    confirmBtnText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontFamily: "Barlow_700Bold",
    },
    successContainer: {
      alignItems: "center",
      paddingVertical: 20,
    },
    successIconCircle: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: Colors.semantic.success.light, // Use semantic success token
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
    },
    successIconCheck: {
      color: Colors.semantic.success.main, // Use semantic success token
      fontSize: 28,
      fontFamily: "Barlow_700Bold",
    },
    successTitle: {
      fontSize: 18,
      fontFamily: "Barlow_800ExtraBold",
      color: theme.text.heading,
    },
    successSubtitle: {
      fontSize: 12,
      fontFamily: "Barlow_500Medium",
      color: theme.text.secondary,
      textAlign: "center",
      marginTop: 8,
      lineHeight: 18,
    },
    // ── Size Selector (Pakaian only) ──
    sizeSelectorWrap: {
      paddingTop: 16,
      paddingBottom: 4,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      gap: 10,
    },
    sizeLabel: {
      fontSize: 13,
      fontFamily: "Barlow_800ExtraBold",
      color: theme.text.heading,
      letterSpacing: -0.2,
    },
    sizeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    sizeChip: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: isDark ? "#444" : "#E0E0E0",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#1C1C1E" : "#F5F5F5",
    },
    sizeChipActive: {
      backgroundColor: theme.text.heading,
      borderColor: theme.text.heading,
    },
    sizeChipText: {
      fontSize: 13,
      fontFamily: "Barlow_700Bold",
      color: isDark ? "#AAAAAA" : "#555555",
    },
    sizeChipTextActive: {
      color: isDark ? "#1A1A2E" : "#FFFFFF",
    },
    sizeHint: {
      fontSize: 11,
      color: Colors.semantic.warning.main,
      fontFamily: "Barlow_600SemiBold",
      marginTop: 2,
    },
    // ── Report Modal Styles ──
    reasonChip: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 11,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
      marginBottom: 8,
      backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
    },
    reasonChipSelected: {
      borderColor: "#EF4444",
      backgroundColor: "rgba(239,68,68,0.08)",
    },
    reasonChipText: {
      fontSize: 14,
      fontFamily: "Barlow_500Medium",
      color: theme.text.primary,
      flex: 1,
    },
    reportInfoBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
      borderRadius: 8,
      padding: 12,
      marginTop: 12,
      marginBottom: 16,
    },
    reportInfoText: {
      fontSize: 11,
      fontFamily: "Barlow_400Regular",
      color: theme.text.secondary,
      flex: 1,
      lineHeight: 16,
    },
    reportSubmitBtn: {
      backgroundColor: "#EF4444",
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
    },
    reportSubmitBtnText: {
      fontSize: 15,
      fontFamily: "Barlow_700Bold",
      color: "#FFFFFF",
      letterSpacing: 0.3,
    },
  });
};
