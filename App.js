/* ==========================================
   Root Application Component
========================================== */
import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet, useColorScheme, StatusBar } from 'react-native';
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
import AccountCenterScreen from './src/screens/AccountCenterScreen';
import MyItemsScreen from './src/screens/MyItemsScreen';
import PostItemScreen from './src/screens/PostItemScreen';
import DetailScreen from './src/screens/DetailScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';
import Colors from './src/constants/colors';
import { ToastProvider } from './src/components/Toast';
import SplashScreen from './src/screens/SplashScreen';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store } from './src/store/store';
import { selectIsAuthenticated, setCredentials, logout } from './src/store/slices/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageProvider } from './src/localization/LanguageContext';
import api from './src/services/api';

const Stack = createNativeStackNavigator();

/**
 * AppContent
 * Menangani navigasi dan logika otentikasi
 */
function AppContent() {
  /* ---------- Component States ---------- */
  const isLoggedIn = useSelector(selectIsAuthenticated);
  const dispatch = useDispatch();
  const [showSplash, setShowSplash] = useState(true);

  /* ---------- Auto Login Check ---------- */
  useEffect(() => {
    const checkLogin = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          try {
            // Ambil data profil dari backend menggunakan token yang ada di AsyncStorage
            const profileResponse = await api.users.getProfile();
            const userProfile = {
              nim: profileResponse.idUser,
              idUser: profileResponse.idUser,
              name: profileResponse.name,
              email: profileResponse.email,
              phone: profileResponse.phone,
              studyProgram: profileResponse.studyProgram,
              profileUrl: profileResponse.profileUrl,
              role: profileResponse.role,
            };
            dispatch(setCredentials({ token, user: userProfile }));
          } catch (apiError) {
            console.log("Token expired atau error mengambil profil:", apiError);
            await AsyncStorage.removeItem('userToken');
            dispatch(logout());
          }
        }
      } catch (e) {
        console.log("Gagal cek token", e);
      }
    };
    checkLogin();
  }, [dispatch]);

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
              <>
                <Stack.Screen name="MainTabs" component={MainTabNavigator} />
                <Stack.Screen name="AccountCenter" component={AccountCenterScreen} />
                <Stack.Screen name="MyItems" component={MyItemsScreen} />
                <Stack.Screen name="PostItem" component={PostItemScreen} />
                <Stack.Screen name="Detail" component={DetailScreen} />
              </>
            ) : (
              <>
                <Stack.Screen name="Login">
                  {(props) => (
                    <LoginScreen
                      {...props}
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

/**
 * App
 * Komponen akar (root) yang mengatur Provider Redux.
 */
export default function App() {
  return (
    <Provider store={store}>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
