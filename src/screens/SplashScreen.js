/* ==========================================
   Splash Screen Component
========================================== */
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
import Colors from "../constants/Colors";
import ThriftlyLogo from "../components/ThriftlyLogo";

export default function SplashScreen({ onFinish, darkMode = false }) {
  const logoScale = useRef(new Animated.Value(0.75)).current;
  const logoTranslateY = useRef(new Animated.Value(25)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  const letters = ["T", "H", "R", "I", "F", "T", "L", "Y"];
  const letterAnims = useRef(letters.map(() => new Animated.Value(0))).current;

  const screenScale = useRef(new Animated.Value(1)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  const hasFinishedRef = useRef(false);
  const logoBreath = useRef(new Animated.Value(1)).current;

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
        toValue: 1.08,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      onFinish();
    });
  };

  useEffect(() => {
    Animated.parallel([
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

    const exitTimeout = setTimeout(() => {
      triggerExit();
    }, 2400);

    return () => {
      clearTimeout(textTimeout);
      clearTimeout(exitTimeout);
    };
  }, []);

  const bgColor = darkMode ? "#0A0A0A" : "#FFFFFF";

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

        <View style={styles.typographyContainer}>
          {letters.map((letter, index) => {
            const letterColor =
              index < 6
                ? darkMode
                  ? "#FFFFFF"
                  : Colors.primary.blue500
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
    fontFamily: "Barlow_900Black",
    fontSize: 26,
    letterSpacing: 0.5,
    marginHorizontal: 0.5,
    textTransform: "uppercase",
  },
});
