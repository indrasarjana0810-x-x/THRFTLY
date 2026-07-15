/* ==========================================
   Header Component
========================================== */
/* ---------- Imports ---------- */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/colors';
import { useNavigation } from '@react-navigation/native';

/**
 * Header
 * Komponen TopBar standar untuk halaman di luar Home.
 * 
 * @param {string} title - Judul halaman
 * @param {boolean} showBack - Menampilkan tombol back (default: true)
 * @param {object} rightComponent - Komponen tambahan di sisi kanan (opsional)
 */
export default function Header({ title, showBack = true, rightComponent }) {
  const navigation = useNavigation();
  const isDark = useColorScheme() === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.leftSide}>
        {showBack && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.text.primary} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.centerSide}>
        <Text style={[styles.title, { color: theme.text.heading }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <View style={styles.rightSide}>
        {rightComponent}
      </View>
    </View>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  container: {
    height: Platform.OS === 'android' ? 56 + (StatusBar.currentHeight || 0) : 56,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 4,
  },
  leftSide: {
    flex: 1,
    alignItems: 'flex-start',
  },
  backBtn: {
    padding: 8,
  },
  centerSide: {
    flex: 3,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Barlow-Bold',
    fontSize: 18,
  },
  rightSide: {
    flex: 1,
    alignItems: 'flex-end',
  },
});
