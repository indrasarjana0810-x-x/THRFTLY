/* ==========================================
   Login Screen Component
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
  KeyboardAvoidingView,
  Keyboard,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import ThriftlyLogo from "../../components/ThriftlyLogo";
import CustomInput from "../../components/CustomInput";
import CustomButton from "../../components/CustomButton";
import CustomText from "../../components/CustomText";
import Panel from "../../components/Panel";
import { MaterialIcons } from "@expo/vector-icons";
import { useToast } from "../../components/Toast";
import { t } from "../../utils/translator";
import api from "../../services/api";

export default function LoginScreen({ onLogin, onNavigateToRegister, onNavigateToForgotPassword, language = "id", setLanguage }) {
  const { showToast } = useToast();
  const [nim, setNim] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef(null);
  const scrollRef = useRef(null);

  // Animation values
  const shiftAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(25)).current;

  useEffect(() => {
    // Screen entry animation
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

  const handleLogin = async () => {
    setErrors({});
    let localErrors = {};

    if (!nim.trim()) {
      localErrors.nim = t("NIM atau Email wajib diisi", language);
    }
    if (!password) {
      localErrors.password = t("Kata sandi wajib diisi", language);
    }

    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    setLoading(true);

    try {
      const data = await api.auth.login(nim.trim(), password);
      
      if (data.status === "SUCCESS") {
        setLoading(false);
        showToast(t("Login Berhasil!", language), "success");
        
        // Delay navigation so the user can see the Toast on the Login screen first
        setTimeout(() => {
          if (onLogin) onLogin({ nim: nim.trim(), token: data.token });
        }, 1500);
      } else {
        setLoading(false);
        showToast(t(data.message || "Gagal masuk. NIM/Email atau sandi salah.", language), "danger");
      }
    } catch (err) {
      setLoading(false);
      console.log(err);
      let errMsg = "Terjadi kesalahan saat masuk. Silakan coba beberapa saat lagi.";
      if (err.message && (err.message.includes("Network Error") || err.message.includes("timeout"))) {
        errMsg = "Koneksi ke server gagal. Pastikan server Spring Boot Anda sudah aktif dan berada di Wi-Fi yang sama!";
      } else if (err.response) {
        const status = err.response.status;
        const data = err.response.data;
        if (status === 401) {
          errMsg = "NIM/Email atau Kata Sandi salah. Silakan periksa kembali!";
        } else if (status === 403) {
          errMsg = "Akses ditolak. Anda tidak memiliki izin untuk masuk.";
        } else if (status === 404) {
          errMsg = "Alamat server login tidak ditemukan. Hubungi tim pengembang.";
        } else if (status >= 500) {
          errMsg = "Server database Spring Boot sedang mengalami gangguan (500). Hubungi admin!";
        } else if (data && (data.message || data.error)) {
          const rawMsg = data.message || data.error;
          if (rawMsg !== "No message available" && rawMsg !== "Unauthorized") {
            errMsg = rawMsg;
          }
        }
      }
      showToast(t(errMsg, language), "danger");
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

      {/* Language Switcher Button on top right */}
      {setLanguage && (
        <TouchableOpacity
          style={styles.langBtn}
          onPress={() => setLanguage(language === "id" ? "en" : "id")}
          activeOpacity={0.8}
        >
          <Text style={styles.langBtnText}>{language === "id" ? "ID" : "EN"}</Text>
        </TouchableOpacity>
      )}

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

              <CustomInput
                label={t("NIM atau Email AstraTech", language)}
                placeholder={t("NIM / Email AstraTech", language)}
                value={nim}
                onChangeText={(text) => {
                  setNim(text);
                  if (errors.nim) setErrors((prev) => ({ ...prev, nim: null }));
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => {
                  setTimeout(() => {
                    passwordRef.current?.focus();
                  }, 100);
                }}
                error={errors.nim}
                icon={<MaterialIcons name="person" size={16} color={theme.text.secondary} />}
              />

              <CustomInput
                ref={passwordRef}
                label={t("Kata Sandi", language)}
                placeholder={t("Masukkan kata sandi", language)}
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
                onSubmitEditing={() => Keyboard.dismiss()}
                error={errors.password}
                icon={<MaterialIcons name="lock" size={16} color={theme.text.secondary} />}
              />

              <TouchableOpacity
                style={styles.forgotBtn}
                activeOpacity={0.7}
                onPress={onNavigateToForgotPassword}
              >
                <Text style={styles.forgotText}>{t("Lupa Kata Sandi?", language)}</Text>
              </TouchableOpacity>

              <CustomButton
                title={t("Masuk", language)}
                onPress={handleLogin}
                type="primary"
                loading={loading}
                style={styles.submitBtn}
              />

              <View style={styles.dividerWrapper}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t("atau", language)}</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.registerWrapper}>
                <Text style={styles.registerLabel}>{t("Belum punya akun?", language)}</Text>
                <TouchableOpacity activeOpacity={0.7} onPress={onNavigateToRegister}>
                  <Text style={styles.registerLink}>{t("Daftar Sekarang", language)}</Text>
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
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    langBtn: {
      position: "absolute",
      top: Platform.OS === "ios" ? 16 : 48,
      right: 20,
      backgroundColor: isDark ? "#2A2A3E" : "#E8F0FF",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      zIndex: 100,
    },
    langBtnText: {
      fontFamily: "Barlow_700Bold",
      fontSize: 12,
      color: Colors.primary.blue500,
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
      backgroundColor: "#A855F7",
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
      fontFamily: "Barlow_900Black",
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
      position: "relative",
    },
    forgotBtn: {
      alignSelf: "flex-end",
      marginBottom: 20,
    },
    forgotText: {
      fontFamily: "Barlow_700Bold",
      fontSize: 12,
      color: Colors.primary.blue500,
    },
    submitBtn: {
      width: "100%",
      shadowColor: Colors.primary.blue500,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.35 : 0.2,
      shadowRadius: 8,
      elevation: 4,
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
      fontFamily: "Barlow_500Medium",
      fontSize: 13,
      color: theme.text.secondary,
      paddingHorizontal: 16,
    },
    registerWrapper: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 4,
      width: "100%",
    },
    registerLabel: {
      fontFamily: "Barlow_500Medium",
      fontSize: 14,
      color: theme.text.secondary,
    },
    registerLink: {
      fontFamily: "Barlow_700Bold",
      fontSize: 14,
      color: Colors.primary.blue500,
    },
  });
};
