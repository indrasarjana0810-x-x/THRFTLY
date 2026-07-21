/* ==========================================
   Avatar Component
========================================== */
/* ---------- Imports ---------- */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Colors from '../constants/colors';

/**
 * Avatar
 * Menampilkan gambar profil bulat. Jika image kosong, menampilkan huruf pertama (inisial).
 * W4 - React.memo: mencegah re-render jika props tidak berubah
 */
const Avatar = React.memo(function Avatar({ imageUrl, name = "?", size = 48 }) {
  const initial = name ? name.charAt(0).toUpperCase() : "?";

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
      {imageUrl ? (
        <Image 
          source={{ uri: imageUrl }} 
          style={styles.image}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{initial}</Text>
      )}
    </View>
  );
});

export default Avatar;

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.primary.blue500,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  initial: {
    fontFamily: 'Barlow-Bold',
    color: Colors.light.surface,
  },
});
