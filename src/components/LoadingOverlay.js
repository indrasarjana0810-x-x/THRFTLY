// src/components/LoadingOverlay.js
import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text, useColorScheme } from 'react-native';
import Colors from '../constants/Colors';

/**
 * LoadingOverlay
 * Menutupi seluruh layar saat aplikasi memuat proses berat.
 */
export default function LoadingOverlay({ visible, message = 'Memuat...' }) {
  const isDark = useColorScheme() === 'dark';

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={[styles.box, { backgroundColor: isDark ? Colors.dark.surface : '#FFFFFF' }]}>
        <ActivityIndicator size="large" color={Colors.primary.blue500} />
        <Text style={[styles.message, { color: isDark ? '#FFFFFF' : '#333' }]}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 10,
  },
  box: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  message: {
    fontFamily: 'Barlow_500Medium',
    fontSize: 14,
    marginTop: 16,
  },
});
