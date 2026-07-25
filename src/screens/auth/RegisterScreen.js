/* ==========================================
   Komponen Layar Daftar
========================================== */
/* ---------- Impor ---------- */
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
import Colors from "../../constants/colors";
import ThriftlyLogo from "../../components/ThriftlyLogo";
import CustomInput from "../../components/CustomInput";
import CustomButton from "../../components/CustomButton";
import CustomText from "../../components/CustomText";
import Panel from "../../components/Panel";
import SelectionModal from "../../components/SelectionModal";
import { MaterialIcons, FontAwesome } from "@expo/vector-icons";
import api from "../../services/api";
import { useToast } from "../../components/Toast";
import { useLanguage } from "../../localization/LanguageContext";

const STUDY_PROGRAM_KEYS = [
  { key: 'prodi.tr_alat_berat', dbValue: 'Teknologi Rekayasa Pemeliharaan Alat Berat' },
  { key: 'prodi.tr_logistik', dbValue: 'Teknologi Rekayasa Logistik' },
  { key: 'prodi.tr_rpl', dbValue: 'Teknologi Rekayasa Perangkat Lunak' },
  { key: 'prodi.perkakas_produksi', dbValue: 'Pembuatan Peralatan dan Perkakas Produksi' },
  { key: 'prodi.proses_manufaktur', dbValue: 'Teknik Produksi dan Proses Manufaktur' },
  { key: 'prodi.konstruksi_gedung', dbValue: 'Teknologi Konstruksi Bangunan Gedung' },
  { key: 'prodi.mesin_otomotif', dbValue: 'Mesin Otomotif' },
  { key: 'prodi.mekatronika', dbValue: 'Mekatronika' },
  { key: 'prodi.manajemen_informatika', dbValue: 'Manajemen Informatika' },
];

/**
 * RegisterScreen
 * Halaman pendaftaran mahasiswa baru.
 * Dilengkapi dengan validasi multi-step (Akun & Profil).
 */
export default function RegisterScreen({ navigation }) {
  /* ---------- State & Ref Komponen ---------- */
  const { showToast } = useToast();
  const { t } = useLanguage();
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
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  const step1X = useRef(new Animated.Value(0)).current;
  const step2X = useRef(new Animated.Value(500)).current;
  const checkPop1 = useRef(new Animated.Value(1)).current;
  const shiftAnim = useRef(new Animated.Value(0)).current;
  
  // Animasi Sukses Pembayaran
  const bgScale = useRef(new Animated.Value(0)).current;
  const shortArmWidth = useRef(new Animated.Value(0)).current;
  const longArmHeight = useRef(new Animated.Value(0)).current;

  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const phoneRef = useRef(null);
  const scrollRef = useRef(null);

  /* ---------- Siklus Hidup & Animasi ---------- */
  useEffect(() => {
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

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  const styles = getStyles(theme, isDark);

  useEffect(() => {
    if (step === 1) {
      Animated.parallel([
        Animated.spring(step1X, {
          toValue: 0,
          tension: 50,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.spring(step2X, {
          toValue: 500,
          tension: 50,
          friction: 9,
          useNativeDriver: true,
        }),
      ]).start();
      checkPop1.setValue(1);
    } else {
      Animated.parallel([
        Animated.spring(step1X, {
          toValue: -500,
          tension: 50,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.spring(step2X, {
          toValue: 0,
          tension: 50,
          friction: 9,
          useNativeDriver: true,
        }),
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

  /* ---------- Logika Autentikasi ---------- */
  const handleNextStep1 = () => {
    setErrors({});
    let localErrors = {};

    if (!idUser.trim()) {
      localErrors.idUser = t('auth.nim_required') || "NIM wajib diisi";
    } else if (idUser.trim().length > 15) {
      localErrors.idUser = t('auth.nim_max') || "NIM maksimal 15 karakter";
    }

    const jsEmailRegex = /^[a-zA-Z0-9]+@polytechnic\.astra\.ac\.id$/;
    if (!email.trim()) {
      localErrors.email = t('auth.email_required') || "Email AstraTech wajib diisi";
    } else if (!jsEmailRegex.test(email.trim())) {
      localErrors.email = t('auth.email_format_error') || "Format email harus [NIM]@polytechnic.astra.ac.id";
    } else if (email.length > 100) {
      localErrors.email = t('auth.email_max') || "Email maksimal 100 karakter";
    }

    if (!password) {
      localErrors.password = t('auth.password_required') || "Kata sandi wajib diisi";
    } else if (password.length < 8) {
      localErrors.password = t('auth.password_min') || "Kata sandi minimal 8 karakter";
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
      localErrors.name = t('auth.name_required') || "Nama lengkap wajib diisi";
    } else if (name.length > 100) {
      localErrors.name = t('auth.name_max') || "Nama maksimal 100 karakter";
    }

    if (!studyProgram) {
      localErrors.studyProgram = t('auth.study_program_required') || "Program studi wajib diisi";
    }

    if (!phone.trim()) {
      localErrors.phone = t('auth.phone_required') || "Nomor telepon wajib diisi";
    } else if (phone.length > 15) {
      localErrors.phone = t('auth.phone_max') || "Nomor telepon maksimal 15 karakter";
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

      if (parseInt(data.status) === 201) {
        setSuccessModalVisible(true);
      } else {
        const serverMsg = data.message;
        showToast(t(`api.${serverMsg}`) || t('auth.register_failed') || "Gagal melakukan registrasi", "danger");
      }
    } catch (err) {
      void 0;
      let errMsg = t('auth.server_error') || "Gagal terhubung ke server Spring Boot Anda.";
      if (err.response && err.response.data) {
        let rawCode = err.response.data.message || err.response.data.error;
        errMsg = t(`api.${rawCode}`) || rawCode || errMsg;
      }
      showToast(errMsg, "danger");
    } finally {
      setLoading(false);
    }
  };


  /* ---------- Tampilan ---------- */
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

                <View style={styles.stepNodeContainer}>
                  <View
                    style={[
                      styles.stepNodeCircle,
                      step === 2 ? styles.activeNode : styles.inactiveNode
                    ]}
                  >
                    <Text style={[styles.stepNodeText, step === 2 ? styles.activeNodeText : styles.inactiveNodeText]}>
                      2
                    </Text>
                  </View>
                  <Text style={[styles.stepLabel, step === 2 ? styles.activeLabel : styles.inactiveLabel]}>
                    {t('auth.step_profile') || "Profil"}
                  </Text>
                </View>
              </View>

              <View style={{ overflow: "hidden", minHeight: 330, width: "100%" }}>
                <Animated.View style={{ transform: [{ translateX: step1X }], width: "100%" }}>
                  <CustomInput
                    label={t('auth.nim_label') || "NIM"}
                    placeholder={t('auth.nim_placeholder') || "Masukkan NIM Anda"}
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
                    iconName="finger-print"
                    isRequired={true}
                  />
 
                  <CustomInput
                    ref={emailRef}
                    label={t('auth.email_label') || "Email AstraTech"}
                    placeholder={t('auth.email_placeholder') || "contoh: nim@polytechnic.astra.ac.id"}
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
                    iconName="mail"
                    isRequired={true}
                  />
 
                  <CustomInput
                    ref={passwordRef}
                    label={t('auth.password_label') || "Kata Sandi"}
                    placeholder={t('auth.password_min_placeholder') || "Minimal 8 karakter"}
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
                    iconName="lock-closed"
                    isRequired={true}
                  />

                  <CustomButton
                    title={t('auth.next_btn') || "Lanjut"}
                    onPress={handleNextStep1}
                    type="primary"
                    style={styles.submitBtn}
                  />
                </Animated.View>

                <Animated.View style={{ transform: [{ translateX: step2X }], position: "absolute", top: 0, width: "100%" }}>
                  <CustomInput
                    label={t('auth.name_label') || "Nama Lengkap"}
                    placeholder={t('auth.name_placeholder') || "Masukkan nama lengkap Anda"}
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
                    iconName="person"
                    isRequired={true}
                  />
 
                  <View style={styles.selectContainer}>
                    <Text style={[styles.selectLabel, { color: theme.text.secondary }]}>
                      {t('auth.study_program_label') || "Program Studi"}
                      <Text style={{ color: Colors.semantic.error.main }}> *</Text>
                    </Text>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setModalVisible(true)}
                      style={[
                        styles.selectWrapper,
                        {
                          backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
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
                        {studyProgram || (t('auth.study_program_placeholder') || "Pilih Program Studi")}
                      </Text>
                      <MaterialIcons name="expand-more" size={18} color={theme.text.secondary} />
                    </TouchableOpacity>
                    {errors.studyProgram && (
                      <Text style={styles.errorText}>{errors.studyProgram}</Text>
                    )}
                  </View>
 
                  <CustomInput
                    ref={phoneRef}
                    label={t('auth.phone_label') || "Nomor Telepon"}
                    placeholder={t('auth.phone_placeholder') || "Masukkan nomor telepon aktif"}
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
                    iconName="call"
                    isRequired={true}
                  />

                  <View style={styles.step2Buttons}>
                    <CustomButton
                      title={t('auth.back_btn') || "Kembali"}
                      onPress={() => setStep(1)}
                      type="secondary"
                      style={styles.backBtn}
                    />
                    <CustomButton
                      title={t('auth.register_now') || "Daftar Sekarang"}
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
                <Text style={styles.dividerText}>{t('auth.or') || "atau"}</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.loginWrapper}>
                <Text style={styles.loginLabel}>{t('auth.have_account') || "Sudah punya akun?"}</Text>
                <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.loginLink}>{t('auth.login_now') || "Masuk Sekarang"}</Text>
                </TouchableOpacity>
              </View>
            </Panel>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <SelectionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={t('auth.study_program_title') || "Pilih Program Studi"}
        options={STUDY_PROGRAM_KEYS.map(prog => ({ id: prog.dbValue, label: t(prog.key) || prog.dbValue }))}
        onSelect={(selectedOption) => {
          setStudyProgram(selectedOption.id);
          setModalVisible(false);
          if (errors.studyProgram) {
            setErrors((prev) => ({ ...prev, studyProgram: null }));
          }
        }}
        searchable={true}
        searchPlaceholder={t('auth.search_study_program') || "Cari program studi..."}
      />

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
              {t('auth.register_success_title') || "Pendaftaran Berhasil!"}
            </CustomText>
            <CustomText style={styles.successMessage}>
              {t('auth.register_success_msg') || "Akun Anda telah berhasil dibuat. Silakan masuk untuk mulai menggunakan aplikasi."}
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

/* ---------- Gaya ---------- */
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
      paddingTop: 100,
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
      top: -55, // Setengah dari tinggi logo wrapper  //
      alignSelf: "center",
      width: 110,
      height: 55, // Setengah lingkaran  //
      zIndex: 20,
    },
    logoCircle: {
      position: "absolute",
      width: 110,
      height: 55, // Setengah lingkaran  //
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
      top: 11, // Tengahkan logo ukuran 88 terhadap tinggi lingkaran 110  //
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
      marginBottom: 20,
    },
    formContainer: {
      paddingTop: 65,
      zIndex: 10,
      marginHorizontal: 4,
      width: "100%",
      position: "relative", // Diperlukan untuk penempatan absolute logoWrapper  //
    },
    stepperContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      position: "relative",
      width: "100%",
      paddingHorizontal: 40,
      marginBottom: 24,
    },
    stepConnectorLineBg: {
      position: "absolute",
      left: 85,
      right: 85,
      top: 15,
      height: 2,
      backgroundColor: theme.border,
      borderRadius: 2,
      zIndex: 1,
    },
    stepConnectorLineFill: {
      height: "100%",
      backgroundColor: Colors.primary.blue500,
      borderRadius: 2,
    },
    stepNodeContainer: {
      alignItems: "center",
      zIndex: 2,
      position: "relative",
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
    selectContainer: {
      marginBottom: 16,
      width: "100%",
    },
    selectLabel: {
      fontFamily: "Barlow-Bold",
      fontSize: 12,
      marginBottom: 6,
    },
    selectWrapper: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderRadius: 12,
      borderWidth: 1.5,
      paddingHorizontal: 14,
      height: 48,
    },
    selectText: {
      fontFamily: "Barlow-Medium",
      fontSize: 14,
      flex: 1,
      marginRight: 10,
    },
    errorText: {
      fontFamily: "Barlow-Medium",
      fontSize: 11,
      color: Colors.semantic.error.main,
      marginTop: 4,
      marginLeft: 4,
    },
    submitBtn: {
      marginTop: 12,
      width: "100%",
    },
    step2Buttons: {
      flexDirection: "row",
      gap: 12,
      marginTop: 12,
      width: "100%",
    },
    backBtn: {
      flex: 1,
    },
    registerBtn: {
      flex: 2,
    },
    dividerWrapper: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 20,
      width: "100%",
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.border,
    },
    dividerText: {
      fontFamily: "Barlow-Medium",
      fontSize: 13,
      color: theme.text.secondary,
      paddingHorizontal: 16,
    },
    loginWrapper: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 4,
      width: "100%",
      marginTop: 4,
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
