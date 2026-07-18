// src/screens/SellScreen.js
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

// Helper: konversi blob/URI ke base64 (hanya dipakai di Web jika picker tidak return base64)
const uriToBase64 = async (uri) => {
  if (!uri) return null;
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.log("uriToBase64 error:", e);
    return null;
  }
};
import Colors from "../constants/Colors";
import { t } from "../utils/translator";

export default function SellScreen({ onAddItem, theme, isDark, navigation, visible, showAlert, language = "id" }) {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [condition, setCondition] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      if (showAlert) {
        showAlert(t("Izin Ditolak", language), t("Maaf, kami memerlukan izin galeri untuk mengunggah foto.", language), [], "danger");
      } else {
        Alert.alert(t("Izin Ditolak", language), t("Maaf, kami memerlukan izin galeri untuk mengunggah foto.", language));
      }
      return;
    }

    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled) {
        const totalCount = images.length + result.assets.length;
        if (totalCount > 5) {
          if (showAlert) {
            showAlert(t("Batas Foto", language), t("Maksimal hanya boleh mengunggah 5 foto barang.", language), [], "warning");
          } else {
            Alert.alert(t("Batas Foto", language), t("Maksimal hanya boleh mengunggah 5 foto barang.", language));
          }
          return;
        }

        // Konversi semua gambar ke base64 (penting agar gambar bisa dikirim ke backend di Web)
        const selectedAssets = await Promise.all(
          result.assets.map(async (asset) => {
            let b64 = asset.base64;
            if (!b64) {
              b64 = await uriToBase64(asset.uri);
            }
            return { uri: asset.uri, base64: b64 };
          })
        );
        setImages(prev => [...prev, ...selectedAssets]);
      }
    } catch (err) {
      console.log("Error picking image:", err);
    }
  };

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const successScale = useRef(new Animated.Value(0.5)).current;
  const successFade = useRef(new Animated.Value(0)).current;
  const photoScale = useRef(new Animated.Value(0.8)).current;

  // Staggered form field animations (photo, title, category, condition, price, description, submit = 7)
  const formAnims = useRef(
    Array.from({ length: 7 }, () => ({
      fade: new Animated.Value(0),
      slide: new Animated.Value(20),
    }))
  ).current;

  const CATEGORIES = [
    { id: "1", label: "Elektronik", icon: "💻" },
    { id: "2", label: "Buku", icon: "📚" },
    { id: "3", label: "Pakaian", icon: "👕" },
    { id: "4", label: "Kos", icon: "🏠" },
    { id: "5", label: "Alat Tulis", icon: "✏️" },
  ];

  const CONDITIONS = ["Baru", "Seperti Baru", "Sangat Baik", "Baik", "Cukup"];

  useEffect(() => {
    if (visible) {
      // Reset values
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      photoScale.setValue(0.8);
      formAnims.forEach((anim) => {
        anim.fade.setValue(0);
        anim.slide.setValue(20);
      });

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 6.5,
          tension: 30,
          useNativeDriver: true,
        }),
      ]).start();

      // Photo upload bounce
      Animated.spring(photoScale, {
        toValue: 1,
        friction: 5,
        tension: 35,
        delay: 200,
        useNativeDriver: true,
      }).start();

      // Staggered form fields
      formAnims.forEach((anim, idx) => {
        Animated.parallel([
          Animated.timing(anim.fade, {
            toValue: 1,
            duration: 300,
            delay: 300 + idx * 70,
            useNativeDriver: true,
          }),
          Animated.spring(anim.slide, {
            toValue: 0,
            friction: 6,
            tension: 28,
            delay: 300 + idx * 70,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }
  }, [visible]);

  const formatPrice = (text) => {
    // Remove non-digits
    const clean = text.replace(/[^\d]/g, "");
    if (!clean) return "";
    return "Rp " + parseInt(clean, 10).toLocaleString("id-ID");
  };

  const handlePriceChange = (text) => {
    setPrice(formatPrice(text));
  };

  const handleSubmit = () => {
    if (!title || !price || !categoryId || !condition) {
      if (showAlert) {
        showAlert(t("Error", language), t("Harap isi semua kolom wajib!", language), [], "danger");
      } else {
        Alert.alert(t("Error", language), t("Harap isi semua kolom wajib!", language));
      }
      return;
    }

    if (title.trim().length < 3) {
      if (showAlert) {
        showAlert(t("Validation Error", language), t("Nama barang minimal harus 3 karakter.", language), [], "warning");
      } else {
        Alert.alert(t("Validation Error", language), t("Nama barang minimal harus 3 karakter.", language));
      }
      return;
    }

    const cleanPrice = parseFloat(price.replace(/[^\d]/g, ""));
    if (isNaN(cleanPrice) || cleanPrice < 1000) {
      if (showAlert) {
        showAlert(t("Validation Error", language), t("Harga minimal harus Rp 1.000.", language), [], "warning");
      } else {
        Alert.alert(t("Validation Error", language), t("Harga minimal harus Rp 1.000.", language));
      }
      return;
    }

    if (description.trim().length < 10) {
      if (showAlert) {
        showAlert(t("Validation Error", language), t("Deskripsi minimal harus 10 karakter.", language), [], "warning");
      } else {
        Alert.alert(t("Validation Error", language), t("Deskripsi minimal harus 10 karakter.", language));
      }
      return;
    }

    if (images.length === 0) {
      if (showAlert) {
        showAlert(t("Validation Error", language), t("Harap unggah minimal 1 foto barang.", language), [], "warning");
      } else {
        Alert.alert(t("Validation Error", language), t("Harap unggah minimal 1 foto barang.", language));
      }
      return;
    }

    setIsSubmitting(true);

    // Simulate database post with a small delay for premium UX feedback
    setTimeout(() => {
      const newItem = {
        title,
        price: cleanPrice,
        condition,
        categoryId,
        description,
        location: "Kantin Kampus 🍜",
        images: images.map(img => img.base64 ? `data:image/jpeg;base64,${img.base64}` : null).filter(Boolean),
      };

      onAddItem(newItem);
      setIsSubmitting(false);
      setShowSuccess(true);

      // Success scale spring animation
      Animated.parallel([
        Animated.spring(successScale, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(successFade, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1500);
  };

  const handleReset = () => {
    // Reset Form
    setTitle("");
    setPrice("");
    setCategoryId("");
    setCondition("");
    setDescription("");
    setImages([]);
    setShowSuccess(false);
    successScale.setValue(0.5);
    successFade.setValue(0);
  };

  const styles = getStyles(theme, isDark);

  if (showSuccess) {
    return (
      <Animated.View
        style={[
          styles.successContainer,
          { opacity: successFade },
        ]}
      >
        <Animated.View
          style={[
            styles.successCard,
            { transform: [{ scale: successScale }] },
          ]}
        >
          <View style={styles.successIconCircle}>
            <Text style={styles.successIconText}>✓</Text>
          </View>
          <Text style={styles.successTitle}>{t("Iklan Berhasil Dipasang!", language)}</Text>
          <Text style={styles.successSubtitle}>
            {t("Barang Anda sekarang terdaftar dan dapat dilihat oleh mahasiswa lain di kampus.", language)}
          </Text>
          <TouchableOpacity style={styles.successButton} onPress={handleReset}>
            <Text style={styles.successButtonText}>{t("Jual Barang Lain", language)}</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <Animated.ScrollView
        style={[
          styles.container,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>{t("Mulai Jual Barang", language)}</Text>
        <Text style={styles.screenSubtitle}>
          {t("Pasang iklan untuk barang bekas Anda di lingkungan kampus.", language)}
        </Text>

        {/* ── Image Upload & Preview ── */}
        <Animated.View style={{ transform: [{ scale: photoScale }], opacity: formAnims[0].fade }}>
          <TouchableOpacity activeOpacity={0.8} style={styles.photoUpload} onPress={handlePickImage}>
            <View style={styles.photoUploadInner}>
              <Text style={styles.photoUploadIcon}>📸</Text>
              <Text style={styles.photoUploadText}>{t("Tambah Foto Barang", language)}</Text>
              <Text style={styles.photoUploadSub}>
                {images.length > 0
                  ? `${images.length} ${t("foto terpilih", language)}`
                  : t("Maksimal 5 foto, format JPG/PNG", language)
                }
              </Text>
            </View>
          </TouchableOpacity>

          {images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagePreviewList}>
              {images.map((img, idx) => (
                <View key={idx} style={styles.imagePreviewContainer}>
                  <Image source={{ uri: img.uri }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => setImages(images.filter((_, i) => i !== idx))}
                  >
                    <Text style={styles.removeImageText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </Animated.View>

        {/* ── Form Fields ── */}
        <View style={styles.form}>
          {/* Title input */}
          <Animated.View style={{ opacity: formAnims[1].fade, transform: [{ translateY: formAnims[1].slide }] }}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t("Nama Barang *", language)}</Text>
              <TextInput
                style={styles.input}
                placeholder={t("Contoh: Kalkulator Casio FX-991EX", language)}
                placeholderTextColor={theme.text.placeholder}
                value={title}
                onChangeText={setTitle}
              />
            </View>
          </Animated.View>

          {/* Category Selector */}
          <Animated.View style={{ opacity: formAnims[2].fade, transform: [{ translateY: formAnims[2].slide }] }}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t("Kategori *", language)}</Text>
              <View style={styles.chipRow}>
                {CATEGORIES.map((cat) => {
                  const isSelected = categoryId === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setCategoryId(cat.id)}
                      style={[
                        styles.chip,
                        isSelected && styles.chipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && styles.chipTextActive,
                        ]}
                      >
                        {cat.icon} {t(cat.label, language)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </Animated.View>

          {/* Condition Selector */}
          <Animated.View style={{ opacity: formAnims[3].fade, transform: [{ translateY: formAnims[3].slide }] }}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t("Kondisi Barang *", language)}</Text>
              <View style={styles.chipRow}>
                {CONDITIONS.map((cond) => {
                  const isSelected = condition === cond;
                  return (
                    <TouchableOpacity
                      key={cond}
                      onPress={() => setCondition(cond)}
                      style={[
                        styles.chip,
                        isSelected && styles.chipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && styles.chipTextActive,
                        ]}
                      >
                        {t(cond, language)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </Animated.View>

          {/* Price Input */}
          <Animated.View style={{ opacity: formAnims[4].fade, transform: [{ translateY: formAnims[4].slide }] }}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t("Harga *", language)}</Text>
              <TextInput
                style={styles.input}
                placeholder="Rp 0"
                placeholderTextColor={theme.text.placeholder}
                keyboardType="numeric"
                value={price}
                onChangeText={handlePriceChange}
              />
            </View>
          </Animated.View>

          {/* Description Input */}
          <Animated.View style={{ opacity: formAnims[5].fade, transform: [{ translateY: formAnims[5].slide }] }}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t("Deskripsi (Opsional)", language)}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={t("Jelaskan kondisi barang secara detail (minus, kelengkapan, dll.)", language)}
                placeholderTextColor={theme.text.placeholder}
                multiline
                numberOfLines={4}
                value={description}
                onChangeText={setDescription}
                textAlignVertical="top"
              />
            </View>
          </Animated.View>

          {/* Submit button */}
          <Animated.View style={{ opacity: formAnims[6].fade, transform: [{ translateY: formAnims[6].slide }] }}>
            <TouchableOpacity
              style={[
                styles.submitBtn,
                isSubmitting && styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              <Text style={styles.submitBtnText}>
                {isSubmitting ? t("Memproses...", language) : t("Pasang Iklan Sekarang", language)}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (theme, isDark) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 130,
    },
    screenTitle: {
      fontSize: 22,
      fontFamily: "Barlow_800ExtraBold",
      color: theme.text.heading,
      letterSpacing: -0.5,
    },
    screenSubtitle: {
      fontSize: 13,
      fontFamily: "Barlow_500Medium",
      color: theme.text.secondary,
      marginTop: 4,
      marginBottom: 20,
    },
    photoUpload: {
      borderWidth: 2,
      borderColor: theme.border,
      borderStyle: "dashed",
      borderRadius: 16,
      height: 140,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.surface,
      marginBottom: 10,
    },
    imagePreviewList: {
      flexDirection: "row",
      marginTop: 10,
      marginBottom: 20,
    },
    imagePreviewContainer: {
      position: "relative",
      marginRight: 12,
    },
    imagePreview: {
      width: 80,
      height: 80,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    removeImageBtn: {
      position: "absolute",
      top: -6,
      right: -6,
      backgroundColor: "#FF3B30",
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 1.41,
    },
    removeImageText: {
      color: "#FFFFFF",
      fontSize: 10,
      fontWeight: "bold",
    },
    photoUploadInner: {
      alignItems: "center",
      justifyContent: "center",
    },
    photoUploadIcon: {
      fontSize: 32,
      marginBottom: 8,
    },
    photoUploadText: {
      fontSize: 14,
      fontFamily: "Barlow_700Bold",
      color: theme.text.heading,
    },
    photoUploadSub: {
      fontSize: 11,
      fontFamily: "Barlow_500Medium",
      color: theme.text.placeholder,
      marginTop: 4,
    },
    form: {
      gap: 18,
    },
    formGroup: {
      gap: 8,
    },
    label: {
      fontSize: 13,
      fontFamily: "Barlow_700Bold",
      color: theme.text.heading,
    },
    input: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 14,
      fontFamily: "Barlow_500Medium",
      color: theme.text.primary,
    },
    textArea: {
      height: 100,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    chip: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 50,
    },
    chipActive: {
      backgroundColor: theme.text.heading,
      borderColor: theme.text.heading,
    },
    chipText: {
      fontSize: 12,
      fontFamily: "Barlow_600SemiBold",
      color: theme.text.secondary,
    },
    chipTextActive: {
      color: isDark ? "#1A1A2E" : "#FFFFFF",
      fontFamily: "Barlow_700Bold",
    },
    submitBtn: {
      backgroundColor: Colors.primary.blue500,
      borderRadius: 50,
      paddingVertical: 15,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 10,
      shadowColor: Colors.primary.blue500,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    submitBtnDisabled: {
      backgroundColor: Colors.primary.blue300,
    },
    submitBtnText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontFamily: "Barlow_700Bold",
    },

    // Success Screen Styles
    successContainer: {
      flex: 1,
      backgroundColor: theme.background,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    successCard: {
      backgroundColor: theme.surface,
      borderRadius: 24,
      padding: 30,
      alignItems: "center",
      width: "100%",
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 6,
    },
    successIconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: Colors.semantic.success.light,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },
    successIconText: {
      fontSize: 32,
      color: Colors.semantic.success.main,
      fontFamily: "Barlow_700Bold",
    },
    successTitle: {
      fontSize: 18,
      fontFamily: "Barlow_800ExtraBold",
      color: theme.text.heading,
      textAlign: "center",
      marginBottom: 10,
    },
    successSubtitle: {
      fontSize: 13,
      fontFamily: "Barlow_500Medium",
      color: theme.text.secondary,
      textAlign: "center",
      lineHeight: 18,
      marginBottom: 24,
    },
    successButton: {
      backgroundColor: Colors.primary.blue500,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 50,
      width: "100%",
      alignItems: "center",
    },
    successButtonText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontFamily: "Barlow_700Bold",
    },
  });
};
