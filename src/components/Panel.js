// src/components/Panel.js

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';
import { useTheme } from '../context/ThemeContext';

export default function Panel({
  children,
  style,
  shadow = true,
  ...props
}) {
  const { theme, isDark } = useTheme();

  const panelStyles = getStyles(theme, isDark, shadow);

  return (
    <View style={[panelStyles.panel, style]} {...props}>
      {children}
    </View>
  );
}

/* Styles */

const getStyles = (theme, isDark, shadow) => {
  const shadowColor = isDark ? '#000000' : Colors.primary.blue500;
  const shadowOpacity = isDark ? 0.4 : 0.08;

  return StyleSheet.create({
    panel: {
      backgroundColor: theme.surface,
      borderRadius: 24,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 24,
      // Bayangan premium jika shadow diset true  //
      ...(shadow && {
        shadowColor: shadowColor,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: shadowOpacity,
        shadowRadius: 20,
        elevation: 6,
      }),
    },
  });
};
