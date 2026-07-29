/* ==========================================
   Komponen Layar Custom Text
========================================== */
import React from 'react';
import { Text, StyleSheet, useColorScheme } from 'react-native';
import Colors from '../constants/colors';

/**
 * CustomText
 * Komponen teks utama dengan dukungan tipografi yang telah ditentukan (Heading, Body, Caption).
 */
export default function CustomText({
  children,
  type = 'body', // h1 | h2 | h3 | body | body-bold | caption | caption-bold  //
  style,
  color,
  ...props
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  const styles = getStyles(theme);

  const getTextStyle = () => {
    const baseStyle = [styles.text];

    if (type === 'h1') baseStyle.push(styles.h1);
    else if (type === 'h2') baseStyle.push(styles.h2);
    else if (type === 'h3') baseStyle.push(styles.h3);
    else if (type === 'body') baseStyle.push(styles.body);
    else if (type === 'body-bold') baseStyle.push(styles.bodyBold);
    else if (type === 'caption') baseStyle.push(styles.caption);
    else if (type === 'caption-bold') baseStyle.push(styles.captionBold);

    const customColor = color ? { color } : null;

    return [baseStyle, customColor, style];
  };

  return (
    <Text style={getTextStyle()} {...props}>
      {children}
    </Text>
  );
}

/* ---------- Gaya ---------- */

const getStyles = (theme) => {
  return StyleSheet.create({
    text: {
      color: theme.text.primary,
    },
    h1: {
      fontFamily: 'Barlow-Black',
      fontSize: 24,
      color: theme.text.heading,
      letterSpacing: -0.5,
    },
    h2: {
      fontFamily: 'Barlow-Bold',
      fontSize: 18,
      color: theme.text.heading,
      letterSpacing: -0.3,
    },
    h3: {
      fontFamily: 'Barlow-SemiBold',
      fontSize: 15,
      color: theme.text.heading,
    },
    body: {
      fontFamily: 'Barlow-Regular',
      fontSize: 14,
      lineHeight: 20,
      color: theme.text.primary,
    },
    bodyBold: {
      fontFamily: 'Barlow-Bold',
      fontSize: 14,
      lineHeight: 20,
      color: theme.text.primary,
    },
    caption: {
      fontFamily: 'Barlow-Regular',
      fontSize: 12,
      color: theme.text.secondary,
    },
    captionBold: {
      fontFamily: 'Barlow-Bold',
      fontSize: 12,
      color: theme.text.secondary,
    },
  });
};
