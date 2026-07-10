/* ==========================================
   Icon Button Component
========================================== */
/* ---------- Imports ---------- */
import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

/**
 * IconButton
 * Tombol interaktif yang hanya berisi ikon.
 * 
 * @param {string} icon - Nama ikon dari MaterialIcons
 * @param {number} size - Ukuran ikon
 * @param {string} color - Warna ikon
 * @param {function} onPress - Fungsi aksi saat tombol ditekan
 */
export default function IconButton({ icon, size = 24, color = '#000', onPress, style }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.button, style]} activeOpacity={0.7}>
      <MaterialIcons name={icon} size={size} color={color} />
    </TouchableOpacity>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  button: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
