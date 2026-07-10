/* ==========================================
   Splash Screen Component
========================================== */
/* ---------- Imports ---------- */
import React, { useEffect, useRef } from "react";
import {
  StyleSheet,
  Animated,
  Text,
  TouchableOpacity,
  StatusBar,
  Easing,
  View,
} from "react-native";
import Colors from "../constants/colors";
import ThriftlyLogo from "../components/ThriftlyLogo";

/**
 * SplashScreen
 * Layar animasi pembuka yang muncul saat aplikasi pertama kali dimuat.
 * Terdiri dari animasi logo dan teks.
 */
export default function SplashScreen({ onFinish, darkMode = false }) {
  /* ---------- Component States & Refs ---------- */
  const logoScale = useRef(new Animated.Value(0.75)).current;
  const logoTranslateY = useRef(new Animated.Value(25)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;



  // Animasi teks tipografi bawah per huruf //
  const letters = ["T", "H", "R", "I", "F", "T", "L", "Y"];
  const letterAnims = useRef(letters.map(() => new Animated.Value(0))).current;

  // Animasi transisi keluar (zoom in camera dive) //
  const screenScale = useRef(new Animated.Value(1)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  const hasFinishedRef = useRef(false);
  const logoBreath = useRef(new Animated.Value(1)).current;

  /* ---------- UI Logics & Handlers ---------- */
  const triggerExit = () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;

    Animated.parallel([
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(screenScale, {
        toValue: 1.08, // Efek menembus masuk layar (camera dive zoom)
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      onFinish();
    });
  };

  /* ---------- Lifecycle (Mounting/Unmounting) ---------- */
  useEffect(() => {
    // 1. Fase Pertama: Ledakan & munculkan logo + Ambient Glow (600ms)
    Animated.parallel([
      // Munculkan Logo dengan elastic bounce dan geser naik
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.timing(logoTranslateY, {
        toValue: 0,
        duration: 650,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // 2. Fase Kedua: Jalankan breathing pulse loop secara terus-menerus selama screen aktif
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoBreath, {
            toValue: 1.025,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(logoBreath, {
            toValue: 0.975,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    // 3. Staggered Text Reveal per huruf (delay 350ms)
    const textTimeout = setTimeout(() => {
      const letterAnimations = letterAnims.map((anim) => {
        return Animated.spring(anim, {
          toValue: 1,
          tension: 75,
          friction: 6,
          useNativeDriver: true,
        });
      });
      Animated.stagger(80, letterAnimations).start();
    }, 350);

    // 4. Auto timeout untuk transisi keluar setelah 2.4 detik
    const exitTimeout = setTimeout(() => {
      triggerExit();
    }, 2400);

    return () => {
      clearTimeout(textTimeout);
      clearTimeout(exitTimeout);
    };
  }, []);

  const bgColor = darkMode ? "#0A0A0A" : "#FFFFFF";
  const textColor = darkMode ? "#94A3B8" : "#64748B";
  const glowColor = Colors.primary.blue500;

  /* ---------- Render ---------- */
  return (
    <TouchableOpacity
      activeOpacity={1}
      style={[StyleSheet.absoluteFill, { zIndex: 99999 }]}
      onPress={triggerExit}
    >
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: bgColor,
            opacity: screenOpacity,
            transform: [{ scale: screenScale }],
          },
        ]}
      >
        <StatusBar barStyle={darkMode ? "light-content" : "dark-content"} backgroundColor={bgColor} />



        {/* Container Logo Teranimasi */}
        <Animated.View
          style={{
            opacity: logoOpacity,
            transform: [
              { scale: logoScale },
              { scale: logoBreath },
              { translateY: logoTranslateY },
            ],
            alignItems: "center",
            zIndex: 2,
          }}
        >
          <ThriftlyLogo size={178} darkMode={darkMode} />
        </Animated.View>

        {/* Nama App Teks Tipografi Staggered Per Huruf */}
        <View style={styles.typographyContainer}>
          {letters.map((letter, index) => {
            const letterColor = index < 6
              ? (darkMode ? '#FFFFFF' : Colors.primary.blue500)
              : Colors.primary.yellow500;

            const translateY = letterAnims[index].interpolate({
              inputRange: [0, 1],
              outputRange: [15, 0],
            });

            return (
              <Animated.Text
                key={index}
                style={[
                  styles.letterText,
                  {
                    color: letterColor,
                    opacity: letterAnims[index],
                    transform: [
                      { scale: letterAnims[index] },
                      { translateY: translateY },
                    ],
                  },
                ]}
              >
                {letter}
              </Animated.Text>
            );
          })}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  typographyContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -6,
    zIndex: 2,
  },
  letterText: {
    fontFamily: "Barlow-Black",
    fontSize: 26,
    letterSpacing: 0.5,
    marginHorizontal: 0.5,
    textTransform: "uppercase",
  },
});
