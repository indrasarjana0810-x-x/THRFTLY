// src/components/Badge.js

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';

export default function Badge({
  label,
  count,
  type = 'primary',
  style,
  textStyle,
}) {
  const isCountMode = count !== undefined && count !== null;

  if (isCountMode) {
    if (count <= 0) return null;
    
    return (
      <View style={[styles.countContainer, style]}>
        <Text style={[styles.countText, textStyle]}>
          {count > 99 ? '99+' : count}
        </Text>
      </View>
    );
  }

  if (!label) return null;

  const getBadgeStyle = () => {
    return [
      styles.badge,
      styles[type] || styles.primary,
      style,
    ];
  };

  const getTextStyle = () => {
    return [
      styles.badgeText,
      styles[`text_${type}`] || styles.text_primary,
      textStyle,
    ];
  };

  return (
    <View style={getBadgeStyle()}>
      <Text style={getTextStyle()}>{label}</Text>
    </View>
  );
}

/* Styles */

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontFamily: 'Barlow-Bold',
    fontSize: 9,
  },
  // Types
  primary: {
    backgroundColor: Colors.primary.blue100,
  },
  text_primary: {
    color: Colors.primary.blue500,
  },
  success: {
    backgroundColor: Colors.semantic.success.light,
  },
  text_success: {
    color: Colors.semantic.success.dark,
  },
  warning: {
    backgroundColor: Colors.semantic.warning.light,
  },
  text_warning: {
    color: Colors.semantic.warning.dark,
  },
  danger: {
    backgroundColor: Colors.semantic.error.light,
  },
  text_danger: {
    color: Colors.semantic.error.dark,
  },
  neutral: {
    backgroundColor: '#F3F4F6',
  },
  text_neutral: {
    color: '#6B7280',
  },
  // Count indicator mode
  countContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.semantic.error.main,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    zIndex: 20,
  },
  countText: {
    color: '#FFFFFF',
    fontFamily: 'Barlow-Bold',
    fontSize: 8,
    textAlign: 'center',
  },
});
