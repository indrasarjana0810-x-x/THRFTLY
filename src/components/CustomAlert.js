import React, { useEffect, useRef } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Animated,
  useColorScheme,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import CustomText from './CustomText';
import Colors from '../constants/colors';

const ALERT_TYPES = {
  success: { icon: 'check-circle', color: '#10B981', title: 'Berhasil' },
  warning: { icon: 'warning', color: '#F59E0B', title: 'Peringatan' },
  danger: { icon: 'error', color: '#EF4444', title: 'Bahaya' },
  info: { icon: 'info', color: '#2979FF', title: 'Informasi' },
};

export default function CustomAlert({
  visible,
  type = 'info',
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'OK',
  cancelText = 'Batal',
  showCancel = false,
  onClose,
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  const scaleValue = useRef(new Animated.Value(0)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleValue.setValue(0.8);
      opacityValue.setValue(0);
      
      Animated.parallel([
        Animated.spring(scaleValue, {
          toValue: 1,
          friction: 6,
          tension: 100, // Higher tension means faster snap
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: 150, // Faster fade in
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleValue, {
          toValue: 0.8,
          duration: 150, // Faster exit
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 0,
          duration: 150, // Faster fade out
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Hindari render kalau tidak visible dan animasi sudah selesai
  if (!visible && opacityValue._value === 0) return null;

  const currentConfig = ALERT_TYPES[type] || ALERT_TYPES.info;
  const displayTitle = title || currentConfig.title;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onCancel || onConfirm}>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose || onCancel || onConfirm}
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              { opacity: opacityValue, backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)' },
            ]}
          />
        </TouchableOpacity>
        <Animated.View
          style={[
            styles.alertBox,
            { backgroundColor: theme.surface, borderColor: theme.border },
            { opacity: opacityValue, transform: [{ scale: scaleValue }] },
          ]}
        >
          {/* Ikon */}
          <View style={[styles.iconWrapper, { backgroundColor: `${currentConfig.color}20` }]}>
            <MaterialIcons name={currentConfig.icon} size={36} color={currentConfig.color} />
          </View>

          {/* Konten */}
          <CustomText type="h2" style={[styles.title, { color: theme.text.heading }]}>
            {displayTitle}
          </CustomText>
          <CustomText type="body" style={[styles.message, { color: theme.text.secondary }]}>
            {message}
          </CustomText>

          {/* Tombol Aksi */}
          <View style={styles.actionRow}>
            {showCancel && (
              <TouchableOpacity
                style={[styles.button, styles.cancelButton, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}
                onPress={onCancel}
                activeOpacity={0.8}
              >
                <CustomText type="body-bold" style={{ color: theme.text.primary }}>
                  {cancelText}
                </CustomText>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                { backgroundColor: currentConfig.color, marginLeft: showCancel ? 12 : 0 },
              ]}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <CustomText type="body-bold" style={{ color: '#FFFFFF' }}>
                {confirmText}
              </CustomText>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  alertBox: {
    width: '85%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 24,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {},
  confirmButton: {},
});
