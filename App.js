/* ==========================================
   Root Application Component
========================================== */
import React, { useState } from 'react';
import { ActivityIndicator, View, StyleSheet, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  useFonts,
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
  Barlow_900Black,
} from '@expo-google-fonts/barlow';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';
import Colors from './src/constants/colors';
import { ToastProvider } from './src/components/Toast';
import SplashScreen from './src/screens/SplashScreen';

const Stack = createNativeStackNavigator();

/**
 * App
 * Komponen akar (root) yang mengatur Navigation Container, Tema (Dark/Light), 
 * dan Splash Screen overlay.
 */
export default function App() {
  /* ---------- Component States ---------- */
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  /* ---------- Theme & Assets ---------- */
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: theme.background,
    },
  };

  const [fontsLoaded] = useFonts({
    'Barlow-Regular': Barlow_400Regular,
    'Barlow-Medium': Barlow_500Medium,
    'Barlow-SemiBold': Barlow_600SemiBold,
    'Barlow-Bold': Barlow_700Bold,
    'Barlow-Black': Barlow_900Black,
  });

  if (!fontsLoaded) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={Colors.primary.blue500} />
      </View>
    );
  }

  /* ---------- Render ---------- */
  return (
    <ToastProvider>
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <NavigationContainer theme={navigationTheme}>
          <StatusBar style="auto" />
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              animation: 'fade_from_bottom',
              contentStyle: { backgroundColor: theme.background },
            }}
          >
            {isLoggedIn ? (
              <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            ) : (
              <>
                <Stack.Screen name="Login">
                  {(props) => (
                    <LoginScreen
                      {...props}
                      onLogin={() => setIsLoggedIn(true)}
                      onNavigateToRegister={() => props.navigation.navigate('Register')}
                      onNavigateToForgotPassword={() => props.navigation.navigate('ForgotPassword')}
                    />
                  )}
                </Stack.Screen>
                <Stack.Screen name="Register">
                  {(props) => (
                    <RegisterScreen
                      {...props}
                      onNavigateToLogin={() => props.navigation.goBack()}
                      onRegisterSuccess={() => props.navigation.navigate('Login')}
                    />
                  )}
                </Stack.Screen>
                <Stack.Screen name="ForgotPassword">
                  {(props) => (
                    <ForgotPasswordScreen
                      {...props}
                      onNavigateToLogin={() => props.navigation.navigate('Login')}
                    />
                  )}
                </Stack.Screen>
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
        {showSplash && (
          <SplashScreen onFinish={() => setShowSplash(false)} darkMode={isDark} />
        )}
      </View>
    </ToastProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
