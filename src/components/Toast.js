// src/components/Toast.js

import React, { createContext, useContext, useState, useRef } from "react";
import { StyleSheet, View, Text, Animated, Platform } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Colors from "../constants/colors";

const ToastContext = createContext(null);

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ message: "", type: "info", visible: false });
  const translateY = useRef(new Animated.Value(-150)).current;
  const progressWidth = useRef(new Animated.Value(1)).current;
  const timeoutRef = useRef(null);

  const showToast = (message, type = "info") => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Jika toast sedang aktif, turunkan/naikkan cepat lalu ganti teks  //
    if (toast.visible) {
      Animated.timing(translateY, {
        toValue: -150,
        duration: 120,
        useNativeDriver: true,
      }).start(() => {
        setToast({ message, type, visible: true });
        progressWidth.setValue(1);

        // Slide kembali ke bawah dengan teks baru  //
        Animated.spring(translateY, {
          toValue: Platform.OS === "android" ? 50 : 60,
          useNativeDriver: true,
          tension: 45,
          friction: 8,
        }).start();

        // Jalankan progress bar penyusutan  //
        Animated.timing(progressWidth, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: false,
        }).start();

        timeoutRef.current = setTimeout(() => {
          hideToast();
        }, 3000);
      });
    } else {
      setToast({ message, type, visible: true });
      progressWidth.setValue(1);

      // Slide ke bawah  //
      Animated.spring(translateY, {
        toValue: Platform.OS === "android" ? 50 : 60,
        useNativeDriver: true,
        tension: 45,
        friction: 8,
      }).start();

      // Jalankan progress bar penyusutan  //
      Animated.timing(progressWidth, {
        toValue: 0,
        duration: 3000,
        useNativeDriver: false,
      }).start();

      timeoutRef.current = setTimeout(() => {
        hideToast();
      }, 3000);
    }
  };

  const hideToast = () => {
    Animated.timing(translateY, {
      toValue: -150,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    });
  };

  const getToastStyle = () => {
    switch (toast.type) {
      case "success":
        return styles.successToast;
      case "danger":
        return styles.dangerToast;
      case "warning":
        return styles.warningToast;
      default:
        return styles.infoToast;
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return <MaterialIcons name="check-circle" size={18} color={Colors.semantic.success.dark} />;
      case "danger":
        return <MaterialIcons name="warning" size={18} color={Colors.semantic.error.dark} />;
      case "warning":
        return <MaterialIcons name="error" size={18} color={Colors.semantic.warning.dark} />;
      default:
        return <MaterialIcons name="info" size={18} color={Colors.semantic.info.dark} />;
    }
  };

  const getTextStyle = () => {
    switch (toast.type) {
      case "success":
        return styles.successText;
      case "danger":
        return styles.dangerText;
      case "warning":
        return styles.warningText;
      default:
        return styles.infoText;
    }
  };

  const getProgressColor = () => {
    switch (toast.type) {
      case "success":
        return Colors.semantic.success.main;
      case "danger":
        return Colors.semantic.error.main;
      case "warning":
        return Colors.semantic.warning.main;
      default:
        return Colors.semantic.info.main;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast.visible && (
        <Animated.View
          style={[
            styles.toastContainer,
            getToastStyle(),
            { transform: [{ translateY }] },
          ]}
        >
          <View style={styles.toastContent}>
            <View style={styles.iconWrapper}>{getIcon()}</View>
            <Text style={[styles.messageText, getTextStyle()]} numberOfLines={2}>
              {toast.message}
            </Text>
          </View>
          
          {/* Progress Line Bar di bagian bawah Toast  // */}
          <Animated.View
            style={[
              styles.progressBar,
              {
                backgroundColor: getProgressColor(),
                width: progressWidth.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

/* Styles */

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: "hidden", // Diperlukan agar progress bar terpotong sesuai border radius  //
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 9999,
  },
  toastContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  iconWrapper: {
    justifyContent: "center",
    alignItems: "center",
  },
  messageText: {
    fontFamily: "Barlow-Bold",
    fontSize: 13,
    flex: 1,
  },
  progressBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    height: 3,
  },
  // Success state
  successToast: {
    backgroundColor: Colors.semantic.success.light,
    borderColor: Colors.semantic.success.main,
  },
  successText: {
    color: Colors.semantic.success.dark,
  },
  // Danger state
  dangerToast: {
    backgroundColor: Colors.semantic.error.light,
    borderColor: Colors.semantic.error.main,
  },
  dangerText: {
    color: Colors.semantic.error.dark,
  },
  // Warning state
  warningToast: {
    backgroundColor: Colors.semantic.warning.light,
    borderColor: Colors.semantic.warning.main,
  },
  warningText: {
    color: Colors.semantic.warning.dark,
  },
  // Info state
  infoToast: {
    backgroundColor: Colors.semantic.info.light,
    borderColor: Colors.semantic.info.main,
  },
  infoText: {
    color: Colors.semantic.info.dark,
  },
});
