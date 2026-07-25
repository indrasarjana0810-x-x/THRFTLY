/* ==========================================
   Komponen Layar Komponen Segmented Control
========================================== */
/* ---------- Impor ---------- */
import React, { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Animated,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import Colors from '../constants/colors';
import CustomText from './CustomText';

/**
 * SegmentedControl
 * Komponen seleksi tab geser (segmented control) yang elegan dan beranimasi.
 * 
 * @param {Array} tabs - Daftar tab (contoh: [{ key: 'tab1', label: 'Tab Satu' }])
 * @param {string} activeTab - Key tab yang aktif saat ini
 * @param {function} onChange - Callback ketika pilihan tab diubah
 */
export default function SegmentedControl({
  tabs,
  activeTab,
  onChange,
  friction = 9,
  tension = 80,
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  const activeIndex = tabs.findIndex((t) => t.key === activeTab);
  const slideAnim = useRef(new Animated.Value(activeIndex >= 0 ? activeIndex : 0)).current;

  useEffect(() => {
    if (activeIndex >= 0) {
      Animated.spring(slideAnim, {
        toValue: activeIndex,
        useNativeDriver: false, // Tidak bisa pakai native driver untuk persentase 'left'
        friction,
        tension,
      }).start();
    }
  }, [activeIndex, friction, tension]);

  const numTabs = tabs.length;
  const tabWidthPercent = 100 / numTabs;

  // Kalkulasi persentase pergeseran secara matematis untuk mendukung N tab
  const leftPosition = slideAnim.interpolate({
    inputRange: [0, Math.max(1, numTabs - 1)],
    outputRange: ['0%', `${(numTabs - 1) * tabWidthPercent}%`],
  });

  return (
    <View style={[styles.segmentWrapper, { backgroundColor: theme.border }]}>
      <View style={styles.segmentInnerContainer}>
        {/* Background Pill yang Bergerak */}
        <Animated.View
          style={[
            styles.activeBackgroundPill,
            {
              left: leftPosition,
              width: `${tabWidthPercent}%`,
              backgroundColor: Colors.primary.blue500,
            },
          ]}
        />

        {/* Tab Buttons */}
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.segmentBtn}
              onPress={() => onChange(tab.key)}
              activeOpacity={1}
            >
              <CustomText
                type="body-bold"
                style={{ color: isSelected ? Colors.light.surface : theme.text.primary }}
              >
                {tab.label}
              </CustomText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

/* ---------- Gaya ---------- */
const styles = StyleSheet.create({
  segmentWrapper: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    width: '100%',
  },
  segmentInnerContainer: {
    flex: 1,
    flexDirection: 'row',
    position: 'relative',
  },
  activeBackgroundPill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 10,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    justifyContent: 'center',
  },
});
