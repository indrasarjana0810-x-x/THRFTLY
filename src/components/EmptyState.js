// src/components/EmptyState.js

import React from 'react';
import { View, StyleSheet, useColorScheme } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Colors from '../constants/colors';
import CustomText from './CustomText';
import CustomButton from './CustomButton';

export default function EmptyState({
  title,
  description,
  icon = 'package',
  buttonTitle,
  onButtonPress,
  style,
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconCircle, { backgroundColor: isDark ? '#232335' : '#F3F4F6' }]}>
        <MaterialIcons name={icon} size={32} color={Colors.primary.blue500} />
      </View>
      
      <CustomText type="h2" style={styles.title}>
        {title}
      </CustomText>
      
      {description && (
        <CustomText type="caption" style={styles.description}>
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

/* Styles */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 6,
  },
  description: {
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  button: {
    minWidth: 140,
  },
});
