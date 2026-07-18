/* ==========================================
   Register Screen Component
========================================== */
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  ScrollView,
  useColorScheme,
  Modal,
  KeyboardAvoidingView,
  Animated,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import ThriftlyLogo from "../../components/ThriftlyLogo";
import CustomInput from "../../components/CustomInput";
import CustomButton from "../../components/CustomButton";
import CustomText from "../../components/CustomText";
import Panel from "../../components/Panel";
import Header from "../../components/Header";
import { MaterialIcons, FontAwesome } from "@expo/vector-icons";
import { useToast } from "../../components/Toast";
import { t } from "../../utils/translator";
import api from "../../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STUDY_PROGRAMS = [
  "Teknologi Rekayasa Pemeliharaan Alat Berat",
  "Teknologi Rekayasa Logistik",
  "Teknologi Rekayasa Perangkat Lunak",
  "Pembuatan Peralatan dan Perkakas Produksi",
  "Teknik Produksi dan Proses Manufaktur",
  "Teknologi Konstruksi Bangunan Gedung",
  "Mesin Otomotif",
  "Mekatronika",
  "Manajemen Informatika",
];

const UNIQUE_STUDY_PROGRAMS = [...new Set(STUDY_PROGRAMS)];

export default function RegisterScreen({ onNavigateToLogin, onRegisterSuccess, language = "id" }) {
  const { showToast } = useToast();
  const [step, setStep] = useState(1);

  const [idUser, setIdUser] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [name, setName] = useState("");
  const [studyProgram, setStudyProgram] = useState("");
  const [phone, setPhone] = useState("");

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(25)).current;
  const step1X = useRef(new Animated.Value(0)).current;
  const step2X = useRef(new Animated.Value(500)).current;
  const checkPop1 = useRef(new Animated.Value(1)).current;
  const shiftAnim = useRef(new Animated.Value(0)).current;

  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const phoneRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    // Entry animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 30,
        useNativeDriver: true,
      }),
    ]).start();

    const showSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => {
        Animated.spring(shiftAnim, {
          toValue: -40,
          useNativeDriver: true,
          speed: 14,
          bounciness: 2,
        }).start();
      }
    );

    const hideSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        Animated.spring(shiftAnim, {
          toValue: 0,
          useNativeDriver: true,
          speed: 14,
          bounciness: 2,
        }).start();
      }
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [shiftAnim]);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const styles = getStyles(theme, isDark);

  useEffect(() => {
    if (step === 1) {
      Animated.parallel([
        Animated.spring(step1X, { toValue: 0, tension: 50, friction: 9, useNativeDriver: true }),
        Animated.spring(step2X, { toValue: 500, tension: 50, friction: 9, useNativeDriver: true }),
      ]).start();
      checkPop1.setValue(1);
    } else {
      Animated.parallel([
        Animated.spring(step1X, { toValue: -500, tension: 50, friction: 9, useNativeDriver: true }),
        Animated.spring(step2X, { toValue: 0, tension: 50, friction: 9, useNativeDriver: true }),
      ]).start();

      checkPop1.setValue(0.3);
      Animated.spring(checkPop1, {
        toValue: 1,
        tension: 100,
        friction: 6,
        useNativeDriver: true,
      }).start();
    }
  }, [step]);

  const handleNextStep1 = () => {
    setErrors({});
    let localErrors = {};

    if (!idUser.trim()) {
      localErrors.idUser = t("NIM wajib diisi", language);
    } else if (idUser.trim().length > 15) {
      localErrors.idUser = t("NIM maksimal 15 karakter", language);
    }

    const jsEmailRegex = /^[a-zA-Z0-9]+@polytechnic\.astra\.ac\.id$/;
    if (!email.trim()) {
      localErrors.email = t("Email AstraTech wajib diisi", language);
    } else if (!jsEmailRegex.test(email.trim())) {
      localErrors.email = t("Format email harus [NIM]@polytechnic.astra.ac.id", language);
    } else if (email.length > 100) {
      localErrors.email = t("Email maksimal 100 karakter", language);
    }

    if (!password) {
      localErrors.password = t("Kata sandi wajib diisi", language);
    } else if (password.length < 8) {
      localErrors.password = t("Kata sandi minimal 8 karakter", language);
    }

    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    setStep(2);
  };

  const handleRegister = async () => {
    setErrors({});
    let localErrors = {};

    if (!name.trim()) {
      localErrors.name = t("Nama lengkap wajib diisi", language);
    } else if (name.length > 100) {
      localErrors.name = t("Nama maksimal 100 karakter", language);
    }

    if (!studyProgram) {
      localErrors.studyProgram = t("Program studi wajib diisi", language);
    }

    if (!phone.trim()) {
      localErrors.phone = t("Nomor telepon wajib diisi", language);
    } else if (phone.length > 15) {
      localErrors.phone = t("Nomor telepon maksimal 15 karakter", language);
    }

    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    setLoading(true);

    try {
      const data = await api.auth.register({
        idUser: idUser.trim(),
        name: name.trim(),
        email: email.trim(),
        studyProgram,
        password,
        phone: phone.trim(),
      });

      if (data.status === "SUCCESS") {
        const profile = {
          name: name.trim(),
          npm: idUser.trim(),
          major: studyProgram,
          email: email.trim(),
          phone: phone.trim(),
          class: "PAI Cikarang",
        };
        await AsyncStorage.setItem(`profile_${idUser.trim()}`, JSON.stringify(profile));

        setLoading(false);
        showToast(t("Pendaftaran Berhasil! Silakan masuk.", language), "success");
        if (onRegisterSuccess) onRegisterSuccess();
      } else {
        setLoading(false);
        showToast(t(data.message || "Gagal melakukan registrasi", language), "danger");
      }
    } catch (err) {
      setLoading(false);
      console.log(err);
      let errMsg = "Terjadi kesalahan saat pendaftaran. Silakan coba beberapa saat lagi.";
      if (err.message && (err.message.includes("Network Error") || err.message.includes("timeout"))) {
        errMsg = "Koneksi ke server gagal. Pastikan server Spring Boot Anda sudah aktif dan berada di Wi-Fi yang sama!";
      } else if (err.response) {
        const status = err.response.status;
        const data = err.response.data;
        if (data && (data.message || data.error) && (data.message || data.error) !== "No message available") {
          errMsg = data.message || data.error;
        } else if (status === 400) {
          errMsg = "Data pendaftaran tidak valid atau NIM/Email sudah terdaftar.";
        } else if (status === 403) {
          errMsg = "Akses ditolak oleh server pendaftaran.";
        } else if (status === 404) {
          errMsg = "Alamat server pendaftaran tidak ditemukan. Hubungi tim pengembang.";
        } else if (status >= 500) {
          errMsg = "Server database Spring Boot sedang mengalami gangguan (500). Hubungi admin!";
        }
      }
      showToast(t(errMsg, language), "danger");
    }
  };

  const filteredPrograms = UNIQUE_STUDY_PROGRAMS.filter((program) =>
    program.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.background}
      />

      {/* Header with back button */}
      <Header
        title={t("Daftar Akun", language)}
        showBack={true}
        onBack={onNavigateToLogin}
      />

      <View style={styles.orbsContainer} pointerEvents="none">
        <View style={[styles.orb, styles.orbTopLeft]} />
        <View style={[styles.orb, styles.orbMiddleRight]} />
        <View style={[styles.orb, styles.orbBottomLeft]} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scrollContent, { justifyContent: "center" }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          scrollEnabled={true}
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { translateY: shiftAnim }], width: "100%" }}>
            <Panel style={styles.formContainer}>
              <View style={styles.logoWrapper}>
                <View style={styles.logoCircle} />
                <View style={styles.logoSvgContainer}>
                  <ThriftlyLogo size={88} darkMode={isDark} />
                </View>
              </View>

              <CustomText type="h1" style={styles.brandText}>
                <Text style={{ color: isDark ? "#FFFFFF" : Colors.primary.blue500 }}>THRIFT</Text>
                <Text style={{ color: Colors.primary.yellow500 }}>LY</Text>
              </CustomText>

              {/* Stepper */}
              <View style={styles.stepperContainer}>
                <View style={styles.stepConnectorLineBg}>
                  <View style={[styles.stepConnectorLineFill, { width: step > 1 ? "100%" : "0%" }]} />
                </View>

                <View style={styles.stepNodeContainer}>
                  {step > 1 && <View style={styles.glowRing} />}
                  <View
                    style={[
                      styles.stepNodeCircle,
                      step === 1 ? styles.activeNode : (step > 1 ? styles.completedNode : styles.inactiveNode)
                    ]}
                  >
                    {step > 1 ? (
                      <Animated.View style={{ transform: [{ scale: checkPop1 }] }}>
                        <MaterialIcons name="check" size={14} color="#FFFFFF" />
                      </Animated.View>
                    ) : (
                      <Text style={[styles.stepNodeText, step === 1 ? styles.activeNodeText : styles.inactiveNodeText]}>
                        1
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.stepLabel, step === 1 ? styles.activeLabel : (step > 1 ? styles.completedLabel : styles.inactiveLabel)]}>
                    {t("Akun", language)}
                  </Text>
                </View>

                <View style={styles.stepNodeContainer}>
                  <View style={[styles.stepNodeCircle, step === 2 ? styles.activeNode : styles.inactiveNode]}>
                    <Text style={[styles.stepNodeText, step === 2 ? styles.activeNodeText : styles.inactiveNodeText]}>
                      2
                    </Text>
                  </View>
                  <Text style={[styles.stepLabel, step === 2 ? styles.activeLabel : styles.inactiveLabel]}>
                    {t("Profil", language)}
                  </Text>
                </View>
              </View>

              <View style={{ overflow: "hidden", minHeight: 330, width: "100%" }}>
                {/* Step 1 */}
                <Animated.View style={{ transform: [{ translateX: step1X }], width: "100%", display: step === 1 ? "flex" : "none" }}>
                  <CustomInput
                    label={t("NIM", language)}
                    placeholder={t("Masukkan NIM Anda", language)}
                    value={idUser}
                    onChangeText={(text) => {
                      setIdUser(text);
                      if (errors.idUser) setErrors((prev) => ({ ...prev, idUser: null }));
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => emailRef.current?.focus()}
                    error={errors.idUser}
                    icon={<FontAwesome name="tag" size={16} color={theme.text.secondary} />}
                  />

                  <CustomInput
                    ref={emailRef}
                    label={t("Email AstraTech", language)}
                    placeholder={t("contoh: nim@polytechnic.astra.ac.id", language)}
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    error={errors.email}
                    icon={<MaterialIcons name="email" size={16} color={theme.text.secondary} />}
                  />

                  <CustomInput
                    ref={passwordRef}
                    label={t("Kata Sandi", language)}
                    placeholder={t("Minimal 8 karakter", language)}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
                    }}
                    isPassword={true}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    blurOnSubmit={true}
                    error={errors.password}
                    icon={<MaterialIcons name="lock" size={16} color={theme.text.secondary} />}
                  />

                  <CustomButton
                    title={t("Lanjut", language)}
                    onPress={handleNextStep1}
                    type="primary"
                    style={styles.submitBtn}
                  />
                </Animated.View>

                {/* Step 2 */}
                <Animated.View style={{ transform: [{ translateX: step2X }], position: "absolute", top: 0, width: "100%", display: step === 2 ? "flex" : "none" }}>
                  <CustomInput
                    label={t("Nama Lengkap", language)}
                    placeholder={t("Masukkan nama lengkap Anda", language)}
                    value={name}
                    onChangeText={(text) => {
                      setName(text);
                      if (errors.name) setErrors((prev) => ({ ...prev, name: null }));
                    }}
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="next"
                    blurOnSubmit={true}
                    error={errors.name}
                    icon={<MaterialIcons name="person" size={16} color={theme.text.secondary} />}
                  />

                  <View style={styles.selectContainer}>
                    <Text style={[styles.selectLabel, { color: theme.text.secondary }]}>
                      {t("Program Studi", language)}
                    </Text>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setModalVisible(true)}
                      style={[
                        styles.selectWrapper,
                        {
                          backgroundColor: isDark ? Colors.dark.background : "#F9FAFB",
                          borderColor: errors.studyProgram ? Colors.semantic.error.main : theme.border,
                        },
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.selectText,
                          { color: studyProgram ? theme.text.primary : theme.text.placeholder },
                        ]}
                      >
                        {studyProgram || t("Pilih Program Studi", language)}
                      </Text>
                      <MaterialIcons name="expand-more" size={18} color={theme.text.secondary} />
                    </TouchableOpacity>
                    {errors.studyProgram && (
                      <Text style={styles.errorText}>{errors.studyProgram}</Text>
                    )}
                  </View>

                  <CustomInput
                    ref={phoneRef}
                    label={t("Nomor Telepon", language)}
                    placeholder={t("Masukkan nomor telepon aktif", language)}
                    value={phone}
                    onChangeText={(text) => {
                      setPhone(text);
                      if (errors.phone) setErrors((prev) => ({ ...prev, phone: null }));
                    }}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    blurOnSubmit={true}
                    error={errors.phone}
                    icon={<MaterialIcons name="phone" size={16} color={theme.text.secondary} />}
                  />

                  <View style={styles.step2Buttons}>
                    <CustomButton
                      title={t("Kembali", language)}
                      onPress={() => setStep(1)}
                      type="secondary"
                      style={styles.backBtn}
                    />
                    <CustomButton
                      title={t("Daftar Sekarang", language)}
                      onPress={handleRegister}
                      type="primary"
                      loading={loading}
                      style={styles.registerBtn}
                    />
                  </View>
                </Animated.View>
              </View>

              <View style={styles.dividerWrapper}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t("atau", language)}</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.loginWrapper}>
                <Text style={styles.loginLabel}>{t("Sudah punya akun?", language)}</Text>
                <TouchableOpacity activeOpacity={0.7} onPress={onNavigateToLogin}>
                  <Text style={styles.loginLink}>{t("Masuk Sekarang", language)}</Text>
                </TouchableOpacity>
              </View>
            </Panel>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal Program Studi */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text.heading }]}>
              {t("Pilih Program Studi", language)}
            </Text>

            <CustomInput
              placeholder={t("Cari program studi...", language)}
              value={searchQuery}
              onChangeText={setSearchQuery}
              icon={<MaterialIcons name="search" size={16} color={theme.text.secondary} />}
              style={{ marginBottom: 12 }}
            />

            <ScrollView style={styles.modalScroll}>
              {filteredPrograms.length > 0 ? (
                filteredPrograms.map((program) => (
                  <TouchableOpacity
                    key={program}
                    activeOpacity={0.7}
                    style={[styles.modalOption, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      setStudyProgram(program);
                      setModalVisible(false);
                      setSearchQuery("");
                      if (errors.studyProgram) {
                        setErrors((prev) => ({ ...prev, studyProgram: null }));
                      }
                    }}
                  >
                    <Text style={[styles.optionText, { color: theme.text.primary }]}>
                      {program}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: theme.text.secondary }]}>
                    {t("Program studi tidak ditemukan", language)}
                  </Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setModalVisible(false);
                setSearchQuery("");
              }}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelBtnText}>{t("Batal", language)}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = (theme, isDark) => {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingVertical: 32,
      paddingTop: 40,
      paddingBottom: Platform.OS === "ios" ? 100 : 80,
    },
    orbsContainer: { ...StyleSheet.absoluteFillObject, overflow: "hidden", zIndex: 0 },
    orb: { position: "absolute", borderRadius: 150, opacity: isDark ? 0.08 : 0.06 },
    orbTopLeft: { width: 320, height: 320, borderRadius: 160, backgroundColor: Colors.primary.blue500, top: -60, left: -90 },
    orbMiddleRight: { width: 260, height: 260, borderRadius: 130, backgroundColor: Colors.primary.yellow500, top: "32%", right: -80 },
    orbBottomLeft: { width: 200, height: 200, borderRadius: 100, backgroundColor: "#A855F7", bottom: -60, left: -40 },
    logoWrapper: { position: "absolute", top: -55, alignSelf: "center", width: 110, height: 55, zIndex: 20 },
    logoCircle: { position: "absolute", width: 110, height: 55, borderTopLeftRadius: 55, borderTopRightRadius: 55, backgroundColor: theme.surface, borderWidth: 1.5, borderBottomWidth: 0, borderColor: theme.border, zIndex: 10 },
    logoSvgContainer: { position: "absolute", top: 11, width: 88, height: 88, alignSelf: "center", alignItems: "center", justifyContent: "center", zIndex: 15 },
    brandText: { fontFamily: "Barlow_900Black", fontSize: 28, letterSpacing: -1, textAlign: "center", marginTop: -15, marginBottom: 20 },
    formContainer: { paddingTop: 65, zIndex: 10, marginHorizontal: 4, width: "100%", position: "relative" },
    stepperContainer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", position: "relative", width: "100%", paddingHorizontal: 40, marginBottom: 24 },
    stepConnectorLineBg: { position: "absolute", left: 85, right: 85, top: 15, height: 2, backgroundColor: theme.border, borderRadius: 2, zIndex: 1 },
    stepConnectorLineFill: { height: "100%", backgroundColor: Colors.primary.blue500, borderRadius: 2 },
    stepNodeContainer: { alignItems: "center", zIndex: 2, position: "relative" },
    glowRing: { position: "absolute", top: -6, left: "50%", marginLeft: -22, width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.semantic.success.main, opacity: 0.15 },
    stepNodeCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: "center", justifyContent: "center", backgroundColor: theme.surface },
    activeNode: { borderColor: Colors.primary.blue500, backgroundColor: Colors.primary.blue500 },
    completedNode: { borderColor: Colors.semantic.success.main, backgroundColor: Colors.semantic.success.main, shadowColor: Colors.semantic.success.main, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 5, elevation: 4 },
    inactiveNode: { borderColor: theme.border, backgroundColor: theme.surface },
    stepNodeText: { fontFamily: "Barlow_700Bold", fontSize: 13, color: theme.text.placeholder },
    activeNodeText: { color: "#FFFFFF" },
    inactiveNodeText: { color: theme.text.placeholder },
    stepLabel: { fontFamily: "Barlow_700Bold", fontSize: 11, marginTop: 6, color: theme.text.placeholder },
    activeLabel: { color: Colors.primary.blue500 },
    completedLabel: { color: Colors.semantic.success.main },
    inactiveLabel: { color: theme.text.placeholder },
    selectContainer: { marginBottom: 16, width: "100%" },
    selectLabel: { fontFamily: "Barlow_700Bold", fontSize: 12, marginBottom: 6 },
    selectWrapper: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, height: 48 },
    selectText: { fontFamily: "Barlow_500Medium", fontSize: 14, flex: 1, marginRight: 10 },
    errorText: { fontFamily: "Barlow_500Medium", fontSize: 11, color: Colors.semantic.error.main, marginTop: 4, marginLeft: 4 },
    submitBtn: { marginTop: 12, width: "100%" },
    step2Buttons: { flexDirection: "row", gap: 12, marginTop: 12, width: "100%" },
    backBtn: { flex: 1 },
    registerBtn: { flex: 2 },
    dividerWrapper: { flexDirection: "row", alignItems: "center", marginVertical: 20, width: "100%" },
    dividerLine: { flex: 1, height: 1, backgroundColor: theme.border },
    dividerText: { fontFamily: "Barlow_500Medium", fontSize: 13, color: theme.text.secondary, paddingHorizontal: 16 },
    loginWrapper: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 4, width: "100%", marginTop: 4 },
    loginLabel: { fontFamily: "Barlow_500Medium", fontSize: 14, color: theme.text.secondary },
    loginLink: { fontFamily: "Barlow_700Bold", fontSize: 14, color: Colors.primary.blue500 },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
    modalContent: { borderRadius: 24, borderWidth: 1.5, width: "100%", maxHeight: "80%", padding: 24, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 15, elevation: 10 },
    modalTitle: { fontFamily: "Barlow_700Bold", fontSize: 18, marginBottom: 16, textAlign: "center" },
    modalScroll: { marginBottom: 16, maxHeight: 280 },
    modalOption: { paddingVertical: 14, borderBottomWidth: 1, justifyContent: "center" },
    optionText: { fontFamily: "Barlow_500Medium", fontSize: 14 },
    emptyContainer: { paddingVertical: 24, alignItems: "center", justifyContent: "center" },
    emptyText: { fontFamily: "Barlow_500Medium", fontSize: 14 },
    cancelBtn: { height: 48, borderRadius: 14, backgroundColor: Colors.semantic.error.main, alignItems: "center", justifyContent: "center" },
    cancelBtnText: { fontFamily: "Barlow_700Bold", fontSize: 14, color: "#FFFFFF" },
  });
};
