/* ==========================================
   Header Component
========================================== */
/* ---------- Imports ---------- */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
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
    <View style={[styles.container, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
      <View style={styles.leftSide}>
        {showBack && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back-ios" size={20} color={theme.text.primary} />
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
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
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
