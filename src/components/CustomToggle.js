/* ==========================================
   Custom Toggle Component
========================================== */
/* ---------- Imports ---------- */
import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  Animated,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import Colors from '../constants/colors';
import { Shadows } from '../constants/styles';

/**
 * CustomToggle
 * Komponen tombol switch toggle beranimasi yang dapat disesuaikan.
 * Berguna untuk switch on/off seperti pilihan Dark Mode atau pengaturan notifikasi.
 * 
 * @param {boolean} value - Nilai status toggle (aktif / tidak aktif)
 * @param {function} onValueChange - Handler callback saat nilai diubah
 * @param {string} activeColor - Warna saat toggle aktif (opsional)
 */
export default function CustomToggle({ value, onValueChange, activeColor = Colors.primary.blue500 }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  const animValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(animValue, {
      toValue: value ? 1 : 0,
      friction: 5,
      tension: 60,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const thumbTranslateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 22],
  });
  const bgInterpolate = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.border, activeColor],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onValueChange(!value)}
      style={styles.toggleContainer}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 12, backgroundColor: bgInterpolate }]} />
      <Animated.View style={[
        styles.toggleThumb,
        {
          transform: [{ translateX: thumbTranslateX }],
          ...Shadows.light,
        }
      ]} />
    </TouchableOpacity>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  toggleContainer: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.light.surface,
  },
});
