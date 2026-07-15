// src/components/CustomButton.js

import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import Colors from '../constants/colors';
import { Shadows } from '../constants/styles';

export default function CustomButton({
  title,
  onPress,
  type = 'primary', // primary | secondary | outline | text  //
  size = 'medium',  // small | medium | large  //
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
  ...props
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  const btnStyles = getStyles(theme, isDark);

  const getButtonStyles = () => {
    const baseStyle = [btnStyles.button, btnStyles[size]];
    
    if (type === 'primary') {
      baseStyle.push(btnStyles.primary);
    } else if (type === 'secondary') {
      baseStyle.push(btnStyles.secondary);
    } else if (type === 'outline') {
      baseStyle.push(btnStyles.outline);
    } else if (type === 'text') {
      baseStyle.push(btnStyles.textButton);
    }

    if (disabled || loading) {
      baseStyle.push(btnStyles.disabled);
    }

    return [baseStyle, style];
  };

  const getTextStyle = () => {
    const baseTextStyle = [btnStyles.text, btnStyles[`text_${size}`]];

    if (type === 'primary') {
      baseTextStyle.push(btnStyles.textPrimary);
    } else if (type === 'secondary') {
      baseTextStyle.push(btnStyles.textSecondary);
    } else if (type === 'outline') {
      baseTextStyle.push(btnStyles.textOutline);
    } else if (type === 'text') {
      baseTextStyle.push(btnStyles.textOnly);
    }

    if (disabled) {
      baseTextStyle.push(btnStyles.textDisabled);
    }

    return [baseTextStyle, textStyle];
  };

  const getLoaderColor = () => {
    if (type === 'primary') return '#FFFFFF';
    if (type === 'secondary') return theme.text.heading;
    return Colors.primary.blue500;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={getButtonStyles()}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getLoaderColor()} />
      ) : (
        <>
          {icon && icon}
          <Text style={getTextStyle()}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

/* Styles */

const getStyles = (theme, isDark) => {
  return StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      gap: 8,
    },
    /* Sizes */
    small: {
      height: 38,
      paddingHorizontal: 16,
      borderRadius: 10,
    },
    medium: {
      height: 48,
      paddingHorizontal: 24,
      borderRadius: 14,
    },
    large: {
      height: 56,
      paddingHorizontal: 32,
      borderRadius: 16,
    },
    /* Types */
    primary: {
      backgroundColor: Colors.primary.blue500,
      ...Shadows.primary,
    },
    secondary: {
      backgroundColor: isDark ? '#222235' : '#F3F4F6',
      borderWidth: 1,
      borderColor: theme.border,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: Colors.primary.blue500,
    },
    textButton: {
      backgroundColor: 'transparent',
      paddingHorizontal: 0,
      height: 'auto',
    },
    disabled: {
      backgroundColor: isDark ? '#2E2E3E' : '#E5E7EB',
      borderColor: isDark ? '#2E2E3E' : '#E5E7EB',
      shadowOpacity: 0,
      elevation: 0,
    },
    /* Text Styles */
    text: {
      fontFamily: 'Barlow-Bold',
      textAlign: 'center',
    },
    text_small: {
      fontSize: 13,
    },
    text_medium: {
      fontSize: 15,
    },
    text_large: {
      fontSize: 17,
    },
    textPrimary: {
      color: '#FFFFFF',
    },
    textSecondary: {
      color: theme.text.primary,
    },
    textOutline: {
      color: Colors.primary.blue500,
    },
    textOnly: {
      color: Colors.primary.blue500,
    },
    textDisabled: {
      color: isDark ? '#555566' : '#9CA3AF',
    },
  });
};
