/* ==========================================
   Komponen ForgotPassword Screen
========================================== */
/* ---------- Impor ---------- */
import React, { useState, useRef, useEffect, useReducer } from "react";
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
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/colors";
import ThriftlyLogo from "../../components/ThriftlyLogo";
import CustomInput from "../../components/CustomInput";
import CustomButton from "../../components/CustomButton";
import CustomText from "../../components/CustomText";
import Panel from "../../components/Panel";
import { MaterialIcons } from "@expo/vector-icons";
import api from "../../services/api";
import { useToast } from "../../components/Toast";
import { useLanguage } from "../../localization/LanguageContext";

/* ==========================================
   useReducer State Manager
   Mengelola state form multi-step
========================================== */
const initialFormState = {
  step: 1,
  nim: "",
  otpCode: "",
  newPassword: "",
  confirmPassword: "",
  errors: {},
  loading: false,
};

function formReducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD':
      return {
        ...state,
        [action.field]: action.value,
        errors: { ...state.errors, [action.field]: null },
      };
    case 'SET_ERRORS':
      return { ...state, errors: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_STEP':
      return { ...state, step: action.payload, loading: false, errors: {} };
    case 'RESET':
      return initialFormState;
    default:
      return state;
  }
}

/**
 * ForgotPasswordScreen
 * Halaman untuk memulihkan kata sandi pengguna.
 * Menggunakan sistem verifikasi kode OTP 6 digit.
 */
export default function ForgotPasswordScreen({ navigation }) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  
  // Penggunaan useReducer
  const [formState, dispatchForm] = useReducer(formReducer, initialFormState);
  const { step, nim, otpCode, newPassword, confirmPassword, errors, loading } = formState;

  const setStep = (s) => dispatchForm({ type: 'SET_STEP', payload: s });
  const setLoading = (l) => dispatchForm({ type: 'SET_LOADING', payload: l });
  const setErrors = (errs) => dispatchForm({ type: 'SET_ERRORS', payload: errs });
  const setNim = (val) => dispatchForm({ type: 'SET_FIELD', field: 'nim', value: val });
  const setOtpCode = (val) => dispatchForm({ type: 'SET_FIELD', field: 'otpCode', value: val });
  const setNewPassword = (val) => dispatchForm({ type: 'SET_FIELD', field: 'newPassword', value: val });
  const setConfirmPassword = (val) => dispatchForm({ type: 'SET_FIELD', field: 'confirmPassword', value: val });

  /* ---------- State & Ref Komponen ---------- */
  const otpRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  const scrollRef = useRef(null);

  /* ---------- Nilai Animasi ---------- */
  const step1X = useRef(new Animated.Value(0)).current;
  const step2X = useRef(new Animated.Value(500)).current;
  const step3X = useRef(new Animated.Value(500)).current;
  const shiftAnim = useRef(new Animated.Value(0)).current;
  const checkPop1 = useRef(new Animated.Value(1)).current;
  const checkPop2 = useRef(new Animated.Value(1)).current;

  // Animasi Modal Sukses
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const bgScale = useRef(new Animated.Value(0)).current;
  const shortArmWidth = useRef(new Animated.Value(0)).current;
  const longArmHeight = useRef(new Animated.Value(0)).current;

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  const styles = getStyles(theme, isDark);

  /* ---------- Siklus Hidup & Efek ---------- */
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
      
      // Animasikan checkPop1 saja (Node 1 selesai) //
      checkPop1.setValue(0.3);
      Animated.spring(checkPop1, {
        toValue: 1,
        tension: 100,
        friction: 6,
        useNativeDriver: true,
      }).start();
      checkPop2.setValue(1);
    } else {
      Animated.parallel([
        Animated.spring(step1X, { toValue: -500, tension: 50, friction: 9, useNativeDriver: true }),
        Animated.spring(step2X, { toValue: -500, tension: 50, friction: 9, useNativeDriver: true }),
        Animated.spring(step3X, { toValue: 0, tension: 50, friction: 9, useNativeDriver: true }),
      ]).start();
      
      // Animasikan checkPop2 saja (Node 2 selesai)
      checkPop2.setValue(0.3);
      Animated.spring(checkPop2, {
        toValue: 1,
        tension: 100,
        friction: 6,
        useNativeDriver: true,
      }).start();
    }
  }, [step]);

  /* ---------- Penghindaran Keyboard ---------- */
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => {
        Animated.spring(shiftAnim, { toValue: -40, useNativeDriver: true, speed: 14, bounciness: 2 }).start();
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        Animated.spring(shiftAnim, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 2 }).start();
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [shiftAnim]);

  useEffect(() => {
    if (successModalVisible) {
      bgScale.setValue(0);
      shortArmWidth.setValue(0);
      longArmHeight.setValue(0);

      Animated.parallel([
        Animated.spring(bgScale, {
          toValue: 1,
          tension: 80,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(80),
          Animated.timing(shortArmWidth, {
            toValue: 24,
            duration: 70,
            useNativeDriver: false,
          }),
          Animated.timing(longArmHeight, {
            toValue: 40,
            duration: 110,
            useNativeDriver: false,
          })
        ])
      ]).start();
    }
  }, [successModalVisible, bgScale, shortArmWidth, longArmHeight]);

  /* ---------- Logika Autentikasi ---------- */
  // Request OTP
  const handleRequestOtp = async () => {
    setErrors({});
    if (!nim.trim()) {
      setErrors({ nim: t('auth.nim_email_required') || "NIM atau Email wajib diisi" });
      return;
    }

    setLoading(true);
    try {
      const data = await api.auth.forgotPassword(nim.trim());
      if (parseInt(data.status) === 200) {
        setStep(2);
      } else {
        showToast(t('auth.toast_email_not_found') || "NIM atau Email tidak terdaftar!", "danger");
      }
    } catch (err) {
      void 0;
      let errMsg = t('auth.toast_email_not_found') || "NIM atau Email tidak terdaftar!";
      if (err.response && err.response.data && err.response.data.message) {
        let rawCode = err.response.data.message;
        const localized = t(`api.${rawCode}`);
        if (localized && localized !== `api.${rawCode}`) {
          errMsg = localized;
        }
      }
      showToast(errMsg, "danger");
    } finally {
      setLoading(false);
    }
  };

  // Verifikasi OTP
  const handleVerifyOtp = async () => {
    setErrors({});
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setErrors({ otpCode: t('auth.otp_required') || "Masukkan 6 digit kode OTP" });
      return;
    }

    setLoading(true);
    try {
      const data = await api.auth.verifyOtp(nim.trim(), otpCode.trim());
      if (parseInt(data.status) === 200) {
        showToast(t('auth.toast_otp_verify_success') || "Verifikasi OTP sukses!", "success");
        setStep(3);
      } else {
        showToast(t('auth.toast_otp_verify_failed') || "Kode OTP salah atau kedaluwarsa!", "danger");
      }
    } catch (err) {
      void 0;
      let errMsg = t('auth.toast_otp_verify_failed') || "Kode OTP salah atau kedaluwarsa!";
      if (err.response && err.response.data && err.response.data.message) {
        let rawCode = err.response.data.message;
        const localized = t(`api.${rawCode}`);
        if (localized && localized !== `api.${rawCode}`) {
          errMsg = localized;
        }
      }
      showToast(errMsg, "danger");
    } finally {
      setLoading(false);
    }
  };

  // Reset Password
  const handleResetPassword = async () => {
    setErrors({});
    let localErrors = {};

    if (!newPassword) {
      localErrors.newPassword = t('auth.toast_new_password_required') || "Kata sandi baru wajib diisi";
    } else if (newPassword.length < 8) {
      localErrors.newPassword = t('auth.password_min_length') || "Kata sandi minimal 8 karakter";
    }

    if (!confirmPassword) {
      localErrors.confirmPassword = t('auth.confirm_password_required') || "Konfirmasi kata sandi wajib diisi";
    } else if (newPassword !== confirmPassword) {
      localErrors.confirmPassword = t('auth.toast_password_mismatch') || "Konfirmasi kata sandi tidak cocok";
    }

    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    setLoading(true);
    try {
      const data = await api.auth.resetPassword(nim.trim(), otpCode.trim(), newPassword);
      if (parseInt(data.status) === 200) {
        setSuccessModalVisible(true);
      } else {
        const serverMsg = data.message;
        showToast(t(`api.${serverMsg}`) || t('auth.toast_password_update_failed') || "Gagal mengatur ulang kata sandi", "danger");
      }
    } catch (err) {
      void 0;
      let errMsg = t('auth.toast_password_update_failed') || "Gagal memperbarui kata sandi.";
      if (err.response && err.response.data) {
        errMsg = err.response.data.message || err.response.data.error || errMsg;
      }
      showToast(errMsg, "danger");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={theme.background}
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
          contentContainerStyle={[
            styles.scrollContent,
            { justifyContent: "center" },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          scrollEnabled={true}
        >
          <Animated.View style={{ transform: [{ translateY: shiftAnim }], width: "100%" }}>
            <Panel style={styles.formContainer}>
              <View style={styles.logoWrapper}>
                <View style={styles.logoCircle} />
                <View style={styles.logoSvgContainer}>
                  <ThriftlyLogo size={88} darkMode={isDark} />
                </View>
              </View>

              <CustomText type="h1" style={styles.brandText}>
                <Text style={{ color: isDark ? Colors.light.surface : Colors.primary.blue500 }}>THRIFT</Text>
                <Text style={{ color: Colors.primary.yellow500 }}>LY</Text>
              </CustomText>

              {/* Stepper Node 3 Tahap Lupa Sandi */}
              <View style={styles.stepperContainer}>
                {/* Pembungkus Garis Konektor dengan Flexbox */}
                <View style={styles.stepConnectorLineContainer} pointerEvents="none">
                  <View style={styles.lineSegment}>
                    {step > 1 && <View style={styles.stepConnectorLineFill} />}
                  </View>
                  <View style={styles.lineGap} />
                  <View style={styles.lineSegment}>
                    {step > 2 && <View style={styles.stepConnectorLineFill} />}
                  </View>
                </View>
 
                {/* Node 1: Akun */}
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
                        <MaterialIcons name="check" size={14} color={Colors.light.surface} />
                      </Animated.View>
                    ) : (
                      <Text style={[styles.stepNodeText, step === 1 ? styles.activeNodeText : styles.inactiveNodeText]}>
                        1
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.stepLabel, step === 1 ? styles.activeLabel : (step > 1 ? styles.completedLabel : styles.inactiveLabel)]}>
                    {t('auth.step_account') || "Akun"}
                  </Text>
                </View>
 
                {/* Node 2: OTP */}
                <View style={styles.stepNodeContainer}>
                  {step > 2 && <View style={styles.glowRing} />}
                  <View
                    style={[
                      styles.stepNodeCircle,
                      step === 2 ? styles.activeNode : (step > 2 ? styles.completedNode : styles.inactiveNode)
                    ]}
                  >
                    {step > 2 ? (
                      <Animated.View style={{ transform: [{ scale: checkPop2 }] }}>
                        <MaterialIcons name="check" size={14} color={Colors.light.surface} />
                      </Animated.View>
                    ) : (
                      <Text style={[styles.stepNodeText, step === 2 ? styles.activeNodeText : styles.inactiveNodeText]}>
                        2
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.stepLabel, step === 2 ? styles.activeLabel : (step > 2 ? styles.completedLabel : styles.inactiveLabel)]}>
                    {t('auth.step_otp') || "OTP"}
                  </Text>
                </View>
 
                {/* Node 3: Sandi */}
                <View style={styles.stepNodeContainer}>
                  <View
                    style={[
                      styles.stepNodeCircle,
                      step === 3 ? styles.activeNode : styles.inactiveNode
                    ]}
                  >
                    <Text style={[styles.stepNodeText, step === 3 ? styles.activeNodeText : styles.inactiveNodeText]}>
                      3
                    </Text>
                  </View>
                  <Text style={[styles.stepLabel, step === 3 ? styles.activeLabel : styles.inactiveLabel]}>
                    {t('auth.step_password') || "Sandi"}
                  </Text>
                </View>
              </View>
 
              <View style={{ overflow: "hidden", minHeight: 310, width: "100%" }}>
                {/* ---------- STEP 1: Minta OTP ---------- */}
                <Animated.View style={{ transform: [{ translateX: step1X }], width: "100%" }}>
                  <CustomInput
                    label={t('auth.nim_email_label') || "NIM atau Email AstraTech"}
                    placeholder={t('auth.nim_email_placeholder2') || 'Masukkan NIM / Email'}
                    value={nim}
                    onChangeText={(text) => {
                      setNim(text);
                      if (errors.nim) setErrors((prev) => ({ ...prev, nim: null }));
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    blurOnSubmit={true}
                    error={errors.nim}
                    iconName="mail"
                    isRequired={true}
                  />
                  <CustomButton
                    title={t('auth.send_otp_btn') || 'Kirim OTP'}
                    onPress={handleRequestOtp}
                    type="primary"
                    loading={loading}
                    style={styles.submitBtn}
                  />
                </Animated.View>
 
                {/* ---------- STEP 2: Verifikasi OTP ---------- */}
                <Animated.View style={{ transform: [{ translateX: step2X }], position: "absolute", top: 0, width: "100%" }}>
                  <CustomInput
                    ref={otpRef}
                    label={t('auth.otp_label') || "Kode OTP (6 Digit)"}
                    placeholder={t('auth.otp_placeholder') || 'Masukkan 6 digit kode'}
                    value={otpCode}
                    onChangeText={(text) => {
                      setOtpCode(text);
                      if (errors.otpCode) setErrors((prev) => ({ ...prev, otpCode: null }));
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    blurOnSubmit={true}
                    error={errors.otpCode}
                    iconName="shield-checkmark"
                    isRequired={true}
                  />
                  <View style={styles.stepButtons}>
                    <CustomButton
                      title={t('auth.cancel_btn') || 'Batal'}
                      onPress={() => setStep(1)}
                      type="secondary"
                      style={styles.backBtn}
                    />
                    <CustomButton
                      title={t('auth.verify_btn') || 'Verifikasi'}
                      onPress={handleVerifyOtp}
                      type="primary"
                      loading={loading}
                      style={styles.actionBtn}
                    />
                  </View>
                </Animated.View>
 
                {/* ---------- STEP 3: Reset Password ---------- */}
                <Animated.View style={{ transform: [{ translateX: step3X }], position: "absolute", top: 0, width: "100%" }}>
                  <CustomInput
                    ref={passwordRef}
                    label={t('auth.new_password_label') || "Kata Sandi Baru"}
                    placeholder={t('auth.password_min_placeholder') || 'Minimal 8 karakter'}
                    value={newPassword}
                    onChangeText={(text) => {
                      setNewPassword(text);
                      if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: null }));
                    }}
                    isPassword={true}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                    error={errors.newPassword}
                    iconName="lock-closed"
                    isRequired={true}
                  />
                  <CustomInput
                    ref={confirmPasswordRef}
                    label={t('auth.confirm_password_label') || "Konfirmasi Kata Sandi"}
                    placeholder={t('auth.confirm_password_placeholder') || 'Ulangi kata sandi baru'}
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: null }));
                    }}
                    isPassword={true}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    blurOnSubmit={true}
                    onSubmitEditing={() => Keyboard.dismiss()}
                    error={errors.confirmPassword}
                    iconName="checkmark-circle"
                    isRequired={true}
                  />
                  <CustomButton
                    title={t('auth.update_password_btn') || 'Perbarui Sandi'}
                    onPress={handleResetPassword}
                    type="primary"
                    loading={loading}
                    style={styles.submitBtn}
                  />
                </Animated.View>
              </View>
 
              <View style={styles.loginLinkWrapper}>
                <Text style={styles.loginLabel}>{t('auth.remember_password') || 'Ingat kata sandi Anda?'}</Text>
                <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.loginLink}>{t('auth.login_now') || 'Masuk Sekarang'}</Text>
                </TouchableOpacity>
              </View>
            </Panel>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <Modal
        visible={successModalVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconWrapper}>
              <Animated.View style={[styles.successIconBg, { transform: [{ scale: bgScale }] }]}>
                {/* DRAW-ITSELF CHECKMARK */}
                <View style={styles.drawCheckContainer}>
                  {/* Lengan Pendek (Kiri bawah ke vertex) */}
                  <Animated.View style={[styles.drawCheckShort, { width: shortArmWidth }]} />
                  {/* Lengan Panjang (Vertex ke atas kanan) */}
                  <Animated.View style={[styles.drawCheckLong, { height: longArmHeight }]} />
                </View>
              </Animated.View>
            </View>
            <CustomText type="h2" style={styles.successTitle}>
              {t('auth.toast_password_updated') || "Sandi Diperbarui!"}
            </CustomText>
            <CustomText style={styles.successMessage}>
              {t('auth.toast_password_updated_desc') || "Kata sandi Anda telah berhasil diubah. Silakan masuk dengan sandi baru Anda."}
            </CustomText>
            <CustomButton
              title={t('auth.continue_login_btn') || "Lanjut ke Login"}
              onPress={() => {
                setSuccessModalVisible(false);
                navigation.navigate('Login');
              }}
              type="primary"
              style={styles.successButton}
            />
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
 
const getStyles = (theme, isDark) => {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingVertical: 32,
      paddingTop: 100, // Menurunkan posisi form
      paddingBottom: Platform.OS === "ios" ? 100 : 80,
    },
    orbsContainer: {
      ...StyleSheet.absoluteFillObject,
      overflow: "hidden",
      zIndex: 0,
    },
    orb: {
      position: "absolute",
      borderRadius: 150,
      opacity: isDark ? 0.08 : 0.06,
    },
    orbTopLeft: {
      width: 320,
      height: 320,
      borderRadius: 160,
      backgroundColor: Colors.primary.blue500,
      top: -60,
      left: -90,
    },
    orbMiddleRight: {
      width: 260,
      height: 260,
      borderRadius: 130,
      backgroundColor: Colors.primary.yellow500,
      top: "32%",
      right: -80,
    },
    orbBottomLeft: {
      width: 200,
      height: 200,
      borderRadius: 100,
      backgroundColor: Colors.primary.blue500,
      bottom: -60,
      left: -40,
    },
    logoWrapper: {
      position: "absolute",
      top: -55,
      alignSelf: "center",
      width: 110,
      height: 55,
      zIndex: 20,
    },
    logoCircle: {
      position: "absolute",
      width: 110,
      height: 55,
      borderTopLeftRadius: 55,
      borderTopRightRadius: 55,
      backgroundColor: theme.surface,
      borderWidth: 1.5,
      borderBottomWidth: 0,
      borderColor: theme.border,
      zIndex: 10,
    },
    logoSvgContainer: {
      position: "absolute",
      top: 11,
      width: 88,
      height: 88,
      alignSelf: "center",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 15,
    },
    brandText: {
      fontFamily: "Barlow-Black",
      fontSize: 28,
      letterSpacing: -1,
      textAlign: "center",
      marginTop: -15,
      marginBottom: 20, // Diperbesar sedikit karena subtitle dihapus  //
    },
    stepperContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      position: "relative",
      width: "100%",
      paddingHorizontal: 40, // Disamakan dengan Register //
      marginBottom: 24,
    },
    stepConnectorLineContainer: {
      position: "absolute",
      left: 85,
      right: 85,
      top: 15,
      height: 2,
      flexDirection: "row",
      justifyContent: "space-between",
      zIndex: 1,
    },
    lineSegment: {
      flex: 1,
      height: "100%",
      backgroundColor: theme.border,
      borderRadius: 2,
      overflow: "hidden",
    },
    lineGap: {
      width: 58, // 32 lebar lingkaran + 13 gap kiri + 13 gap kanan //
    },
    stepConnectorLineFill: {
      width: "100%",
      height: "100%",
      backgroundColor: Colors.primary.blue500,
      borderRadius: 2,
    },
    glowRing: {
      position: "absolute",
      top: -6, // Menempatkan lingkaran 44px di tengah-tengah bulatan 32px
      left: "50%",
      marginLeft: -22, // Setengah dari lebar (44 / 2) untuk centering sempurna
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: Colors.semantic.success.main,
      opacity: 0.15,
    },
    stepNodeContainer: {
      alignItems: "center",
      zIndex: 2,
      position: "relative",
    },
    stepNodeCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.surface,
    },
    activeNode: {
      borderColor: Colors.primary.blue500,
      backgroundColor: Colors.primary.blue500,
    },
    completedNode: {
      borderColor: Colors.semantic.success.main,
      backgroundColor: Colors.semantic.success.main,
      shadowColor: Colors.semantic.success.main,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 5,
      elevation: 4,
    },
    inactiveNode: {
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    stepNodeText: {
      fontFamily: "Barlow-Bold",
      fontSize: 13,
      color: theme.text.placeholder,
    },
    activeNodeText: {
      color: Colors.light.surface,
    },
    inactiveNodeText: {
      color: theme.text.placeholder,
    },
    stepLabel: {
      fontFamily: "Barlow-Bold",
      fontSize: 11,
      marginTop: 6,
      color: theme.text.placeholder,
    },
    activeLabel: {
      color: Colors.primary.blue500,
    },
    completedLabel: {
      color: Colors.semantic.success.main,
    },
    inactiveLabel: {
      color: theme.text.placeholder,
    },
    formContainer: {
      paddingTop: 65,
      zIndex: 10,
      marginHorizontal: 4,
      width: "100%",
      position: "relative",
    },
    submitBtn: {
      marginTop: 12,
      width: "100%",
    },
    stepButtons: {
      flexDirection: "row",
      gap: 12,
      marginTop: 12,
      width: "100%",
    },
    backBtn: {
      flex: 1,
    },
    actionBtn: {
      flex: 2,
    },
    loginLinkWrapper: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 4,
      width: "100%",
      marginTop: 24,
    },
    loginLabel: {
      fontFamily: "Barlow-Medium",
      fontSize: 14,
      color: theme.text.secondary,
    },
    loginLink: {
      fontFamily: "Barlow-Bold",
      fontSize: 14,
      color: Colors.primary.blue500,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
      zIndex: 1000,
    },
    successModalContent: {
      width: "100%",
      backgroundColor: theme.surface,
      borderRadius: 24,
      padding: 32,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 8,
    },
    successIconWrapper: {
      marginBottom: 32,
      alignItems: "center",
      justifyContent: "center",
      height: 80,
    },
    successIconBg: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: Colors.semantic.success.main,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: Colors.semantic.success.main,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 3,
    },
    drawCheckContainer: {
      width: 24,
      height: 40,
      transform: [{ rotate: "45deg" }],
      marginTop: -5,
      marginLeft: -5,
    },
    drawCheckShort: {
      position: "absolute",
      bottom: 0,
      left: 0,
      height: 5,
      backgroundColor: Colors.light.surface,
      borderRadius: 3,
    },
    drawCheckLong: {
      position: "absolute",
      bottom: 0,
      right: 0,
      width: 5,
      backgroundColor: Colors.light.surface,
      borderRadius: 3,
    },
    successTitle: {
      fontFamily: "Barlow-Bold",
      fontSize: 22,
      color: theme.text.primary,
      marginBottom: 12,
      textAlign: "center",
    },
    successMessage: {
      fontFamily: "Barlow-Medium",
      fontSize: 14,
      color: theme.text.secondary,
      textAlign: "center",
      marginBottom: 32,
      lineHeight: 22,
    },
    successButton: {
      width: "100%",
    }
  });
};
