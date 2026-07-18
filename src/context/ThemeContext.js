// src/context/ThemeContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import Colors from '../constants/Colors';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const systemColorScheme = useColorScheme();
  const [userThemeMode, setUserThemeMode] = useState("system"); // "system" | "light" | "dark"
  
  const isDark = userThemeMode === "system" ? systemColorScheme === "dark" : userThemeMode === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  return (
    <ThemeContext.Provider value={{ userThemeMode, setUserThemeMode, isDark, theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    // Fallback if not wrapped in provider
    return {
      userThemeMode: "system",
      setUserThemeMode: () => {},
      isDark: false,
      theme: Colors.light
    };
  }
  return context;
}
