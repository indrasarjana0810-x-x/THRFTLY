// src/screens/auth/ForgotPasswordScreen.js

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
import { MaterialIcons } from "@expo/vector-icons";
import { useToast } from "../../components/Toast";
import { t } from "../../utils/translator";
import api from "../../services/api";

export default function ForgotPasswordScreen({ onNavigateToLogin, language = "id" }) {
  const { showToast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [nim, setNim] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});

  const otpRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  const scrollRef = useRef(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(25)).current;
  const step1X = useRef(new Animated.Value(0)).current;
  const step2X = useRef(new Animated.Value(500)).current;
  const step3X = useRef(new Animated.Value(500)).current;
  const shiftAnim = useRef(new Animated.Value(0)).current;
  const checkPop1 = useRef(new Animated.Value(1)).current;
  const checkPop2 = useRef(new Animated.Value(1)).current;

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;
  const styles = getStyles(theme, isDark);

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

    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => Animated.spring(shiftAnim, { toValue: -40, useNativeDriver: true, speed: 14, bounciness: 2 }).start()
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => Animated.spring(shiftAnim, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 2 }).start()
    );
    return () => { showSub.remove(); hideSub.remove(); };
  }, [shiftAnim]);

  useEffect(() => {
    if (step === 1) {
      Animated.parallel([
        Animated.spring(step1X, { toValue: 0, tension: 50, friction: 9, useNativeDriver: true }),
        Animated.spring(step2X, { toValue: 500, tension: 50, friction: 9, useNativeDriver: true }),
        Animated.spring(step3X, { toValue: 500, tension: 50, friction: 9, useNativeDriver: true }),
      ]).start();
      checkPop1.setValue(1);
      checkPop2.setValue(1);
    } else if (step === 2) {
      Animated.parallel([
        Animated.spring(step1X, { toValue: -500, tension: 50, friction: 9, useNativeDriver: true }),
        Animated.spring(step2X, { toValue: 0, tension: 50, friction: 9, useNativeDriver: true }),
        Animated.spring(step3X, { toValue: 500, tension: 50, friction: 9, useNativeDriver: true }),
      ]).start();
      checkPop1.setValue(0.3);
      Animated.spring(checkPop1, { toValue: 1, tension: 100, friction: 6, useNativeDriver: true }).start();
      checkPop2.setValue(1);
    } else {
      Animated.parallel([
        Animated.spring(step1X, { toValue: -500, tension: 50, friction: 9, useNativeDriver: true }),
        Animated.spring(step2X, { toValue: -500, tension: 50, friction: 9, useNativeDriver: true }),
        Animated.spring(step3X, { toValue: 0, tension: 50, friction: 9, useNativeDriver: true }),
      ]).start();
      checkPop2.setValue(0.3);
      Animated.spring(checkPop2, { toValue: 1, tension: 100, friction: 6, useNativeDriver: true }).start();
    }
  }, [step]);

  const handleRequestOtp = async () => {
    setErrors({});
    if (!nim.trim()) {
      setErrors({ nim: t("NIM atau Email wajib diisi", language) });
      return;
    }
    setLoading(true);
    try {
      const data = await api.auth.forgotPassword(nim.trim());
      if (data.status === "SUCCESS") {
        setLoading(false);
        showToast(t("Kode OTP berhasil dikirim! Cek log konsol server.", language), "success");
        setStep(2);
      } else {
        setLoading(false);
        showToast(t(data.message || "Email/NIM tidak terdaftar", language), "danger");
      }
    } catch (err) {
      setLoading(false);
      console.log(err);
      let errMsg = "Gagal meminta kode OTP. Silakan coba beberapa saat lagi.";
      if (err.message && (err.message.includes("Network Error") || err.message.includes("timeout"))) {
        errMsg = "Koneksi ke server gagal. Pastikan server Spring Boot Anda sudah aktif dan berada di Wi-Fi yang sama!";
      } else if (err.response) {
        const status = err.response.status;
        const data = err.response.data;
        if (status === 400) {
          errMsg = "NIM atau Email tidak terdaftar di sistem kami.";
        } else if (status >= 500) {
          errMsg = "Server database Spring Boot sedang mengalami gangguan (500). Hubungi admin!";
        } else if (data && (data.message || data.error)) {
          const rawMsg = data.message || data.error;
          if (rawMsg !== "No message available") {
            errMsg = rawMsg;
          }
        }
      }
      showToast(t(errMsg, language), "danger");
    }
  };

  const handleVerifyOtp = async () => {
    setErrors({});
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setErrors({ otpCode: t("Masukkan 6 digit kode OTP", language) });
      return;
    }
    setLoading(true);
    try {
      const data = await api.auth.verifyOtp(nim.trim(), otpCode.trim());
      if (data.status === "SUCCESS") {
        setLoading(false);
        showToast(t("Verifikasi OTP sukses!", language), "success");
        setStep(3);
      } else {
        setLoading(false);
        showToast(t(data.message || "Kode OTP salah atau kedaluwarsa", language), "danger");
      }
    } catch (err) {
      setLoading(false);
      console.log(err);
      let errMsg = "Gagal memverifikasi OTP. Silakan coba beberapa saat lagi.";
      if (err.message && (err.message.includes("Network Error") || err.message.includes("timeout"))) {
        errMsg = "Koneksi ke server gagal. Pastikan server Spring Boot Anda sudah aktif dan berada di Wi-Fi yang sama!";
      } else if (err.response) {
        const status = err.response.status;
        const data = err.response.data;
        if (status === 400) {
          errMsg = "Kode OTP salah atau sudah kedaluwarsa. Silakan periksa kembali.";
        } else if (status >= 500) {
          errMsg = "Server database Spring Boot sedang mengalami gangguan (500). Hubungi admin!";
        } else if (data && (data.message || data.error)) {
          const rawMsg = data.message || data.error;
          if (rawMsg !== "No message available") {
            errMsg = rawMsg;
          }
        }
      }
      showToast(t(errMsg, language), "danger");
    }
  };

  const handleResetPassword = async () => {
    setErrors({});
    let localErrors = {};
    if (!newPassword) {
      localErrors.newPassword = t("Kata sandi baru wajib diisi", language);
    } else if (newPassword.length < 8) {
      localErrors.newPassword = t("Kata sandi minimal 8 karakter", language);
    }
    if (newPassword !== confirmPassword) {
      localErrors.confirmPassword = t("Konfirmasi kata sandi tidak cocok", language);
    }
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }
    setLoading(true);
    try {
      const data = await api.auth.resetPassword(nim.trim(), otpCode.trim(), newPassword);
      if (data.status === "SUCCESS") {
        setLoading(false);
        showToast(t("Kata sandi berhasil diperbarui!", language), "success");
        onNavigateToLogin();
      } else {
        setLoading(false);
        showToast(t(data.message || "Gagal mengatur ulang kata sandi", language), "danger");
      }
    } catch (err) {
      setLoading(false);
      console.log(err);
      let errMsg = "Gagal memperbarui kata sandi. Silakan coba beberapa saat lagi.";
      if (err.message && (err.message.includes("Network Error") || err.message.includes("timeout"))) {
        errMsg = "Koneksi ke server gagal. Pastikan server Spring Boot Anda sudah aktif dan berada di Wi-Fi yang sama!";
      } else if (err.response) {
        const status = err.response.status;
        const data = err.response.data;
        if (status === 400) {
          errMsg = "Kode OTP tidak valid atau kata sandi baru tidak memenuhi syarat.";
        } else if (status >= 500) {
          errMsg = "Server database Spring Boot sedang mengalami gangguan (500). Hubungi admin!";
        } else if (data && (data.message || data.error)) {
          const rawMsg = data.message || data.error;
          if (rawMsg !== "No message available") {
            errMsg = rawMsg;
          }
        }
      }
      showToast(t(errMsg, language), "danger");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />

      {/* Header with back button */}
      <Header
        title={t("Lupa Sandi", language)}
        showBack={true}
        onBack={onNavigateToLogin}
      />

      <View style={styles.orbsContainer} pointerEvents="none">
        <View style={[styles.orb, styles.orbTopLeft]} />
        <View style={[styles.orb, styles.orbMiddleRight]} />
        <View style={[styles.orb, styles.orbBottomLeft]} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}>
        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={[styles.scrollContent, { justifyContent: "center" }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="always" scrollEnabled={true}>
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
                <View style={styles.stepConnectorLineContainer} pointerEvents="none">
                  <View style={styles.lineSegment}>
                    {step > 1 && <View style={styles.stepConnectorLineFill} />}
                  </View>
                  <View style={styles.lineGap} />
                  <View style={styles.lineSegment}>
                    {step > 2 && <View style={styles.stepConnectorLineFill} />}
                  </View>
                </View>

                {/* Node 1 */}
                <View style={styles.stepNodeContainer}>
                  {step > 1 && <View style={styles.glowRing} />}
                  <View style={[styles.stepNodeCircle, step === 1 ? styles.activeNode : (step > 1 ? styles.completedNode : styles.inactiveNode)]}>
                    {step > 1 ? (
                      <Animated.View style={{ transform: [{ scale: checkPop1 }] }}>
                        <MaterialIcons name="check" size={14} color="#FFFFFF" />
                      </Animated.View>
                    ) : (
                      <Text style={[styles.stepNodeText, step === 1 ? styles.activeNodeText : styles.inactiveNodeText]}>1</Text>
                    )}
                  </View>
                  <Text style={[styles.stepLabel, step === 1 ? styles.activeLabel : (step > 1 ? styles.completedLabel : styles.inactiveLabel)]}>{t("Akun", language)}</Text>
                </View>

                {/* Node 2 */}
                <View style={styles.stepNodeContainer}>
                  {step > 2 && <View style={styles.glowRing} />}
                  <View style={[styles.stepNodeCircle, step === 2 ? styles.activeNode : (step > 2 ? styles.completedNode : styles.inactiveNode)]}>
                    {step > 2 ? (
                      <Animated.View style={{ transform: [{ scale: checkPop2 }] }}>
                        <MaterialIcons name="check" size={14} color="#FFFFFF" />
                      </Animated.View>
                    ) : (
                      <Text style={[styles.stepNodeText, step === 2 ? styles.activeNodeText : styles.inactiveNodeText]}>2</Text>
                    )}
                  </View>
                  <Text style={[styles.stepLabel, step === 2 ? styles.activeLabel : (step > 2 ? styles.completedLabel : styles.inactiveLabel)]}>OTP</Text>
                </View>

                {/* Node 3 */}
                <View style={styles.stepNodeContainer}>
                  <View style={[styles.stepNodeCircle, step === 3 ? styles.activeNode : styles.inactiveNode]}>
                    <Text style={[styles.stepNodeText, step === 3 ? styles.activeNodeText : styles.inactiveNodeText]}>3</Text>
                  </View>
                  <Text style={[styles.stepLabel, step === 3 ? styles.activeLabel : styles.inactiveLabel]}>{t("Sandi", language)}</Text>
                </View>
              </View>

              <View style={{ overflow: "hidden", minHeight: 310, width: "100%" }}>
                {/* Step 1 */}
                <Animated.View style={{ transform: [{ translateX: step1X }], width: "100%" }}>
                  <CustomInput
                    label={t("NIM atau Email AstraTech", language)}
                    placeholder={t("Masukkan NIM / Email", language)}
                    value={nim}
                    onChangeText={(text) => { setNim(text); if (errors.nim) setErrors((prev) => ({ ...prev, nim: null })); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    blurOnSubmit={true}
                    error={errors.nim}
                    icon={<MaterialIcons name="email" size={16} color={theme.text.secondary} />}
                  />
                  <CustomButton title={t("Kirim OTP", language)} onPress={handleRequestOtp} type="primary" loading={loading} style={styles.submitBtn} />
                </Animated.View>

                {/* Step 2 */}
                <Animated.View style={{ transform: [{ translateX: step2X }], position: "absolute", top: 0, width: "100%" }}>
                  <CustomInput
                    ref={otpRef}
                    label={t("Kode OTP (6 Digit)", language)}
                    placeholder={t("Masukkan 6 digit kode", language)}
                    value={otpCode}
                    onChangeText={(text) => { setOtpCode(text); if (errors.otpCode) setErrors((prev) => ({ ...prev, otpCode: null })); }}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    blurOnSubmit={true}
                    error={errors.otpCode}
                    icon={<MaterialIcons name="security" size={16} color={theme.text.secondary} />}
                  />
                  <View style={styles.stepButtons}>
                    <CustomButton title={t("Batal", language)} onPress={() => setStep(1)} type="secondary" style={styles.backBtn} />
                    <CustomButton title={t("Verifikasi", language)} onPress={handleVerifyOtp} type="primary" loading={loading} style={styles.actionBtn} />
                  </View>
                </Animated.View>

                {/* Step 3 */}
                <Animated.View style={{ transform: [{ translateX: step3X }], position: "absolute", top: 0, width: "100%" }}>
                  <CustomInput
                    ref={passwordRef}
                    label={t("Kata Sandi Baru", language)}
                    placeholder={t("Minimal 8 karakter", language)}
                    value={newPassword}
                    onChangeText={(text) => { setNewPassword(text); if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: null })); }}
                    isPassword={true}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                    error={errors.newPassword}
                    icon={<MaterialIcons name="lock" size={16} color={theme.text.secondary} />}
                  />
                  <CustomInput
                    ref={confirmPasswordRef}
                    label={t("Konfirmasi Kata Sandi", language)}
                    placeholder={t("Ulangi kata sandi baru", language)}
                    value={confirmPassword}
                    onChangeText={(text) => { setConfirmPassword(text); if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: null })); }}
                    isPassword={true}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    blurOnSubmit={true}
                    onSubmitEditing={() => Keyboard.dismiss()}
                    error={errors.confirmPassword}
                    icon={<MaterialIcons name="check-box" size={16} color={theme.text.secondary} />}
                  />
                  <CustomButton title={t("Perbarui Sandi", language)} onPress={handleResetPassword} type="primary" loading={loading} style={styles.submitBtn} />
                </Animated.View>
              </View>

              <View style={styles.loginLinkWrapper}>
                <Text style={styles.loginLabel}>{t("Ingat kata sandi Anda?", language)}</Text>
                <TouchableOpacity activeOpacity={0.7} onPress={onNavigateToLogin}>
                  <Text style={styles.loginLink}>{t("Masuk Sekarang", language)}</Text>
                </TouchableOpacity>
              </View>
            </Panel>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (theme, isDark) => {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background },
    scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 32, paddingTop: 40, paddingBottom: Platform.OS === "ios" ? 100 : 80 },
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
    stepperContainer: { flexDirection: "row", alignItems: "center", justifyContext: "space-between", position: "relative", width: "100%", paddingHorizontal: 40, marginBottom: 24 },
    stepConnectorLineContainer: { position: "absolute", left: 85, right: 85, top: 15, height: 2, flexDirection: "row", justifyContent: "space-between", zIndex: 1 },
    lineSegment: { flex: 1, height: "100%", backgroundColor: theme.border, borderRadius: 2, overflow: "hidden" },
    lineGap: { width: 58 },
    stepConnectorLineFill: { width: "100%", height: "100%", backgroundColor: Colors.primary.blue500, borderRadius: 2 },
    glowRing: { position: "absolute", top: -6, left: "50%", marginLeft: -22, width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.semantic.success.main, opacity: 0.15 },
    stepNodeContainer: { alignItems: "center", zIndex: 2, position: "relative" },
    stepNodeCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: "center", justifyContext: "center", backgroundColor: theme.surface },
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
    submitBtn: { marginTop: 12, width: "100%" },
    stepButtons: { flexDirection: "row", gap: 12, marginTop: 12, width: "100%" },
    backBtn: { flex: 1 },
    actionBtn: { flex: 2 },
    loginLinkWrapper: { flexDirection: "row", justifyContext: "center", alignItems: "center", gap: 4, width: "100%", marginTop: 24 },
    loginLabel: { fontFamily: "Barlow_500Medium", fontSize: 14, color: theme.text.secondary },
    loginLink: { fontFamily: "Barlow_700Bold", fontSize: 14, color: Colors.primary.blue500 },
  });
};
