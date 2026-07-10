/* ==========================================
   Login Screen Component
========================================== */
/* ---------- Imports ---------- */
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  ScrollView,
  useColorScheme,
  KeyboardAvoidingView,
  Keyboard,
  Animated,
} from "react-native";
import Colors from "../../constants/colors";
import ThriftlyLogo from "../../components/ThriftlyLogo";
import CustomInput from "../../components/CustomInput";
import CustomButton from "../../components/CustomButton";
import CustomText from "../../components/CustomText";
import Panel from "../../components/Panel";
import { MaterialIcons } from "@expo/vector-icons";
import api from "../../services/api";
import { useToast } from "../../components/Toast";

/**
 * LoginScreen
 * Halaman autentikasi utama aplikasi.
 * Menangani login mahasiswa menggunakan NIM dan Kata Sandi.
 */
export default function LoginScreen({ onLogin, onNavigateToRegister, onNavigateToForgotPassword }) {
  /* ---------- Component States & Refs ---------- */
  const { showToast } = useToast();
  const [nim, setNim] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef(null);
  const scrollRef = useRef(null);

  const shiftAnim = useRef(new Animated.Value(0)).current;

  /* ---------- Lifecycle & Animations ---------- */
  useEffect(() => {
    // Menggeser panel saat keyboard muncul
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

  /* ---------- Authentication Logic ---------- */
  const handleLogin = async () => {
    // Validasi Form
    setErrors({});
    let localErrors = {};

    if (!nim.trim()) {
      localErrors.nim = "NIM atau Email wajib diisi";
    }
    if (!password) {
      localErrors.password = "Kata sandi wajib diisi";
    }

    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    setLoading(true);

    try {
      const data = await api.auth.login(nim.trim(), password);

      if (data.status === "SUCCESS") {
        showToast("Login Berhasil!", "success");
        if (onLogin) {
          onLogin(data.data);
        }
      } else {
        showToast(data.message || "Gagal masuk. NIM/Email atau sandi salah.", "danger");
      }
    } catch (err) {
      console.log(err);
      let errMsg = "Gagal terhubung ke server Spring Boot Anda.";
      if (err.response && err.response.data) {
        errMsg = err.response.data.message || err.response.data.error || errMsg;
      }
      showToast(errMsg, "danger");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Render ---------- */
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
                <Text style={{ color: isDark ? '#FFFFFF' : Colors.primary.blue500 }}>THRIFT</Text>
                <Text style={{ color: Colors.primary.yellow500 }}>LY</Text>
              </CustomText>

              <CustomInput
                label="NIM atau Email AstraTech"
                placeholder="NIM / Email AstraTech"
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
                icon={
                  <MaterialIcons name="person" size={16} color={theme.text.secondary} />
                }
              />

              <CustomInput
                ref={passwordRef}
                label="Kata Sandi"
                placeholder="Masukkan kata sandi"
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
                icon={
                  <MaterialIcons name="lock" size={16} color={theme.text.secondary} />
                }
              />

              <TouchableOpacity
                style={styles.forgotBtn}
                activeOpacity={0.7}
                onPress={onNavigateToForgotPassword}
              >
                <Text style={styles.forgotText}>Lupa Kata Sandi?</Text>
              </TouchableOpacity>

              <CustomButton
                title="Masuk"
                onPress={handleLogin}
                type="primary"
                loading={loading}
                style={styles.submitBtn}
              />

              <View style={styles.dividerWrapper}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>atau</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.registerWrapper}>
                <Text style={styles.registerLabel}>Belum punya akun?</Text>
                <TouchableOpacity activeOpacity={0.7} onPress={onNavigateToRegister}>
                  <Text style={styles.registerLink}>Daftar Sekarang</Text>
                </TouchableOpacity>
              </View>
            </Panel>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ---------- Styles ---------- */
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
      backgroundColor: "#A855F7",
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
    forgotBtn: {
      alignSelf: "flex-end",
      marginBottom: 20,
    },
    forgotText: {
      fontFamily: "Barlow-Bold",
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
      fontFamily: "Barlow-Medium",
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
      fontFamily: "Barlow-Medium",
      fontSize: 14,
      color: theme.text.secondary,
    },
    registerLink: {
      fontFamily: "Barlow-Bold",
      fontSize: 14,
      color: Colors.primary.blue500,
    },
  });
};
