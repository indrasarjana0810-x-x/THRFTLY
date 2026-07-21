/* ==========================================
   Custom Input
========================================== */
import React, {
  useState,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import Colors from "../constants/colors";

/**
 * CustomInput
 * Komponen input form yang dapat digunakan ulang dengan dukungan ikon, multiline, dan validasi error.
 */
const CustomInput = forwardRef(
  (
    {
      label,
      placeholder,
      value,
      onChangeText,
      iconName,
      isPassword = false,
      isRequired = false,
      error,
      keyboardType = "default",
      autoCapitalize = "none",
      autoCorrect = false,
      returnKeyType = "default",
      blurOnSubmit = true,
      onSubmitEditing,
      leftComponent,
      rightComponent,
      style,
      inputStyle,
      wrapperStyle,
      onFocus,
      onBlur,
      ...props
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const inputRef = useRef(null); // <-- REF INTERNAL

    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const theme = isDark ? Colors.dark : Colors.light;

    // EXPOSE FUNGSI FOCUS DAN BLUR KE PARENT
    useImperativeHandle(ref, () => ({
      focus: () => {
        inputRef.current?.focus();
      },
      blur: () => {
        inputRef.current?.blur();
      },
    }));



    // Combine static styles with dynamic theme / error / focus styles
    const labelStyle = [
      styles.label,
      { color: theme.text.secondary }
    ];

    const inputWrapperStyle = [
      styles.inputWrapper,
      {
        backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
        borderColor: error ? Colors.semantic.error.main : theme.border,
      },
      isFocused && {
        borderColor: error ? Colors.semantic.error.main : Colors.primary.blue500,
        backgroundColor: theme.surface,
      },
      wrapperStyle
    ];

    const textInputStyle = [
      styles.input,
      { color: theme.text.primary },
      inputStyle
    ];

    return (
      <View style={[styles.container, style]}>
        {label && (
          <Text style={labelStyle}>
            {label}
            {isRequired && <Text style={{ color: Colors.semantic.error.main }}> *</Text>}
          </Text>
        )}

        <View style={inputWrapperStyle}>
          {leftComponent ? (
            leftComponent
          ) : iconName ? (
            <View style={styles.inputIconWrapper}>
              <Ionicons 
                name={isFocused ? iconName : `${iconName}-outline`} 
                size={18} 
                color={isFocused ? Colors.primary.blue500 : theme.text.secondary} 
              />
            </View>
          ) : null}

          <TextInput
            ref={inputRef} // <-- PAKE REF INTERNAL
            style={textInputStyle}
            placeholder={placeholder}
            placeholderTextColor={theme.text.placeholder}
            value={value}
            onChangeText={onChangeText}
            keyboardType={keyboardType}
            secureTextEntry={isPassword && !showPassword}
            autoCapitalize={autoCapitalize}
            autoCorrect={autoCorrect}
            spellCheck={false}
            returnKeyType={returnKeyType}
            blurOnSubmit={blurOnSubmit}
            onSubmitEditing={onSubmitEditing}
            onFocus={(e) => {
              setIsFocused(true);
              if (onFocus) onFocus(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              if (onBlur) onBlur(e);
            }}
            {...props}
          />

          {rightComponent ? (
            rightComponent
          ) : isPassword ? (
            <TouchableOpacity 
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeBtn}
            >
              <MaterialIcons 
                name={showPassword ? "visibility" : "visibility-off"} 
                size={20} 
                color={theme.text.secondary} 
              />
            </TouchableOpacity>
          ) : null}
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  },
);

export default CustomInput;

/* Static Styles */
const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: "100%",
  },
  label: {
    fontFamily: "Barlow-Bold",
    fontSize: 12,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    minHeight: 48, // ubah dari height ke minHeight supaya bisa membesar kalau multiline
    paddingVertical: 12, // tambahkan padding biar text area rapi
  },
  inputIconWrapper: {
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontFamily: "Barlow-Medium",
    fontSize: 14,
    minHeight: 24, // ubah dari height: '100%' ke minHeight supaya flexbox ga aneh di multiline
    padding: 0,
  },
  eyeBtn: {
    padding: 4,
  },
  errorText: {
    fontFamily: "Barlow-Medium",
    fontSize: 11,
    color: Colors.semantic.error.main,
    marginTop: 4,
    marginLeft: 4,
  },
});

