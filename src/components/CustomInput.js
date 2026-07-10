// src/components/CustomInput.js

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
import { MaterialIcons } from "@expo/vector-icons";
import Colors from "../constants/colors";

const CustomInput = forwardRef(
  (
    {
      label,
      placeholder,
      value,
      onChangeText,
      icon,
      isPassword = false,
      error,
      keyboardType = "default",
      autoCapitalize = "none",
      autoCorrect = false,
      returnKeyType = "default",
      blurOnSubmit = true,
      onSubmitEditing,
      style,
      inputStyle,
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
        backgroundColor: isDark ? "#0F0F1A" : "#F9FAFB",
        borderColor: error ? Colors.semantic.error.main : theme.border,
      },
      isFocused && {
        borderColor: error ? Colors.semantic.error.main : Colors.primary.blue500,
        backgroundColor: theme.surface,
      }
    ];

    const textInputStyle = [
      styles.input,
      { color: theme.text.primary },
      inputStyle
    ];

    return (
      <View style={[styles.container, style]}>
        {label && <Text style={labelStyle}>{label}</Text>}

        <View style={inputWrapperStyle}>
          {icon && <View style={styles.inputIconWrapper}>{icon}</View>}

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
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />

          {isPassword && (
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={showPassword ? "visibility" : "visibility-off"}
                size={18}
                color={theme.text.secondary}
              />
            </TouchableOpacity>
          )}
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
    height: 48,
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
    height: "100%",
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

