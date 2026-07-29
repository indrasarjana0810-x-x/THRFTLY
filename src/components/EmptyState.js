/* ==========================================
   Komponen Layar Empty State
========================================== */
import React from 'react';
import { View, StyleSheet, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/colors';
import CustomText from './CustomText';
import CustomButton from './CustomButton';

export default function EmptyState({
  title,
  description,
  icon = 'cube',
  buttonTitle,
  onButtonPress,
  style,
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  // Map icon names to Ionicons equivalents
  let validIcon = 'cube-outline';
  if (icon === 'cart' || icon === 'shopping-cart') validIcon = 'cart-outline';
  if (icon === 'receipt' || icon === 'list') validIcon = 'receipt-outline';
  if (icon === 'notifications' || icon === 'bell') validIcon = 'notifications-outline';
  if (icon === 'search') validIcon = 'search-outline';

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconCircle, { backgroundColor: Colors.primary.blue500 + '15' }]}>
        <Ionicons name={validIcon} size={64} color={Colors.primary.blue500} />
      </View>
      
      <CustomText type="h2" style={[styles.title, { color: theme.text.primary }]}>
        {title}
      </CustomText>
      
      {description && (
        <CustomText type="body" style={[styles.description, { color: theme.text.secondary }]}>
          {description}
        </CustomText>
      )}

      {buttonTitle && onButtonPress && (
        <CustomButton
          title={buttonTitle}
          onPress={onButtonPress}
          type="primary"
          size="small"
          style={styles.button}
        />
      )}
    </View>
  );
}

/* ---------- Gaya ---------- */

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  button: {
    minWidth: 160,
  },
});
