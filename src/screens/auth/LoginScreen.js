// src/screens/auth/LoginScreen.js

import React, { useState, useRef } from "react";
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
} from "react-native";
import Colors from "../../constants/Colors";
import ThriftlyLogo from "../../components/ThriftlyLogo";
import CustomInput from "../../components/CustomInput";
import CustomButton from "../../components/CustomButton";
import CustomText from "../../components/CustomText";
import Panel from "../../components/Panel";
import { Feather } from "@expo/vector-icons";

export default function LoginScreen({ onLogin }) {
  const [nim, setNim] = useState("");
  const [password, setPassword] = useState("");
  const passwordRef = useRef(null);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  const styles = getStyles(theme, isDark);

  const handleLogin = () => {
    console.log("Login attempt with NIM/Email:", nim, "Password:", password);
    if (onLogin) {
      onLogin();
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

      {/* HAPUS KeyboardAvoidingView */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        scrollEnabled={true}
      >
        {/* Logo Area */}
        <View style={styles.logoWrapper}>
          <View style={styles.logoCircle} />
          <View style={styles.logoCover} />
          <View style={styles.logoSvgContainer}>
            <ThriftlyLogo size={88} darkMode={isDark} />
          </View>
        </View>

        <Panel style={styles.formContainer}>
          <CustomText type="h1" style={styles.brandText}>
            <Text style={{ color: Colors.primary.blue500 }}>THRIFT</Text>
            <Text style={{ color: Colors.primary.yellow500 }}>LY</Text>
          </CustomText>

          <CustomInput
            label="NIM atau Email AstraTech"
            placeholder="NIM / Email AstraTech"
            value={nim}
            onChangeText={setNim}
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
            icon={
              <Feather name="user" size={16} color={theme.text.secondary} />
            }
          />

          <CustomInput
            ref={passwordRef}
            label="Kata Sandi"
            placeholder="Masukkan kata sandi"
            value={password}
            onChangeText={setPassword}
            isPassword={true}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            blurOnSubmit={true}
            onSubmitEditing={handleLogin}
            icon={
              <Feather name="lock" size={16} color={theme.text.secondary} />
            }
          />

          <TouchableOpacity style={styles.forgotBtn} activeOpacity={0.7}>
            <Text style={styles.forgotText}>Lupa Kata Sandi?</Text>
          </TouchableOpacity>

          <CustomButton
            title="Masuk"
            onPress={handleLogin}
            type="primary"
            style={styles.submitBtn}
          />

          <View style={styles.dividerWrapper}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>atau</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.registerWrapper}>
            <Text style={styles.registerLabel}>Belum punya akun?</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.registerLink}>Daftar Sekarang</Text>
            </TouchableOpacity>
          </View>
        </Panel>
      </ScrollView>
    </SafeAreaView>
  );
}

/* Styles */
const getStyles = (theme, isDark) => {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: 24,
      paddingVertical: 32,
      paddingBottom: Platform.OS === "ios" ? 120 : 80, // <-- TAMBAH PADDING BAWAH
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
      width: 110,
      height: 110,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: -55,
      zIndex: 20,
      position: "relative",
      alignSelf: "center",
    },
    logoCircle: {
      position: "absolute",
      width: 110,
      height: 110,
      borderRadius: 55,
      backgroundColor: theme.surface,
      borderWidth: 1.5,
      borderColor: theme.border,
      zIndex: 10,
    },
    logoCover: {
      position: "absolute",
      bottom: -1.5,
      width: 112,
      height: 55,
      backgroundColor: theme.surface,
      zIndex: 12,
      alignSelf: "center",
    },
    logoSvgContainer: {
      position: "absolute",
      zIndex: 15,
      width: 88,
      height: 88,
      alignItems: "center",
      justifyContent: "center",
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
      marginVertical: 18,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.border,
      opacity: 0.6,
    },
    dividerText: {
      fontFamily: "Barlow-Medium",
      fontSize: 12,
      color: theme.text.placeholder,
      paddingHorizontal: 12,
    },
    registerWrapper: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    registerLabel: {
      fontFamily: "Barlow-Regular",
      fontSize: 13,
      color: theme.text.secondary,
    },
    registerLink: {
      fontFamily: "Barlow-Bold",
      fontSize: 13,
      color: Colors.primary.blue500,
      textDecorationLine: "underline",
    },
  });
};
