// src/components/Panel.js

import React from 'react';
import { View, StyleSheet, useColorScheme } from 'react-native';
import Colors from '../constants/colors';

export default function Panel({
  children,
  style,
  shadow = true,
  ...props
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  const panelStyles = getStyles(theme, isDark, shadow);

  return (
    <View style={[panelStyles.panel, style]} {...props}>
      {children}
    </View>
  );
}

/* Styles */

const getStyles = (theme, isDark, shadow) => {
  const shadowColor = Colors.primary.blue500;
  const shadowOpacity = isDark ? 0.35 : 0.15; // Neon glow effect

  return StyleSheet.create({
    panel: {
      backgroundColor: theme.surface,
      borderRadius: 24,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 24,
      // Bayangan premium jika shadow diset true
      ...(shadow && {
        shadowColor: shadowColor,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: shadowOpacity,
        shadowRadius: 20,
        elevation: 12, // Fallback untuk Android
      }),
    },
  });
};
