// src/components/Avatar.js
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';

/**
 * Avatar
 * Menampilkan gambar profil bulat. Jika image kosong, menampilkan inisial.
 */
export default function Avatar({ imageUrl, name = "?", size = 48 }) {
  const initial = name ? name.charAt(0).toUpperCase() : "?";

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} />
      ) : (
        <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{initial}</Text>
      )}
    </View>
  );
}

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
    resizeMode: 'cover',
  },
  initial: {
    fontFamily: 'Barlow_700Bold',
    color: '#FFFFFF',
  },
});
