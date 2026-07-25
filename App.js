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
import CartScreen from './src/screens/CartScreen';
import TransactionHistoryScreen from './src/screens/TransactionHistoryScreen';
import TransactionDetailScreen from './src/screens/TransactionDetailScreen';
import NotificationScreen from './src/screens/NotificationScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';
import Colors from './src/constants/colors';
import { ToastProvider } from './src/components/Toast';
import SplashScreen from './src/screens/SplashScreen';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store } from './src/store/store';
import { selectIsAuthenticated, setCredentials, logout } from './src/store/slices/authSlice';
import { fetchCart } from './src/store/slices/cartSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageProvider } from './src/localization/LanguageContext';
import api from './src/services/api';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform, LogBox } from 'react-native';

// --- HIDE EXPO GO NOTIFICATION ERRORS ---
LogBox.ignoreLogs(['removed from Expo Go', 'expo-notifications']);
const originalConsoleError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('removed from Expo Go')) {
    return;
  }
  originalConsoleError(...args);
};
// ----------------------------------------

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const Stack = createNativeStackNavigator();

/**
 * AppContent
 * Menangani logika autentikasi, navigasi, dan state global awal aplikasi.
 */
function AppContent() {
  /* ---------- Component States ---------- */
  const isLoggedIn = useSelector(selectIsAuthenticated);
  const dispatch = useDispatch();
  const [showSplash, setShowSplash] = useState(true);

  /* ---------- Push Notifications & Channel Setup ---------- */
  useEffect(() => {
    async function setupNotificationChannel() {
      if (Platform.OS === 'android') {
        try {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'General Notifications',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#2563EB',
            sound: 'default',
          });
        } catch (e) {}
      }
    }
    setupNotificationChannel();

    async function registerForPushNotificationsAsync() {
      if (Constants.appOwnership === 'expo') {
        return null;
      }

      let token;
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
  
      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        // Kita HAPUS requestPermissionsAsync dari sini.
        // Biar pop-up izin notifikasi (OS default) NGGAK muncul otomatis di background.
        // Izin HANYA akan diminta lewat Custom Modal di NotificationScreen.js.

        if (finalStatus !== 'granted') {
          void 0;
          return;
        }
        try {
          const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
          if (!projectId) {
            return;
          }

          token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
          void 0;
        } catch (e) {
          // Ignore silently to avoid console spam
        }
      } else {
        void 0;
      }
      return token;
    }

    if (isLoggedIn) {
      // Tunda 5 detik agar tidak bentrok dengan modal perizinan lokasi di layar awal
      const timer = setTimeout(() => {
        registerForPushNotificationsAsync().then(token => {
          if (token) {
            api.users.saveToken(token).catch(e => void 0);
          }
        });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isLoggedIn]);

  /* ---------- Notification Polling for Realtime Local Pop-ups ---------- */
  useEffect(() => {
    if (!isLoggedIn) return;

    let lastKnownNotifCount = null;

    const checkNewNotifications = async () => {
      try {
        const res = await api.notifications.get();
        if (res && parseInt(res.status) === 200 && res.data && res.data.notifications) {
          const list = res.data.notifications;
          if (list.length > 0) {
            const latest = list[0];
            if (lastKnownNotifCount !== null && list.length > lastKnownNotifCount && !latest.isRead) {
              const notifSetting = await AsyncStorage.getItem('notifGlobal');
              if (notifSetting !== 'false') {
                const { triggerLocalNotification } = require('./src/utils/notificationHelper');
                triggerLocalNotification(latest.title, latest.message, { refId: latest.refId });
              }
            }
            lastKnownNotifCount = list.length;
          }
        }
      } catch (e) {
        // Silently ignore network errors during background check
      }
    };

    checkNewNotifications();
    const interval = setInterval(checkNewNotifications, 5000);

    return () => clearInterval(interval);
  }, [isLoggedIn]);

  /* ---------- Initialization (Cart & Auto Login) ---------- */
  useEffect(() => {
    const initializeApp = async () => {
      try {

        // Pengecekan status login otomatis
        const token = await AsyncStorage.getItem('userToken');
        const savedProfile = await AsyncStorage.getItem('userProfile');
        
        if (token) {
          // Mengembalikan sesi langsung dari penyimpanan lokal agar lebih cepat
          if (savedProfile) {
            try {
              dispatch(setCredentials({ token, user: JSON.parse(savedProfile) }));
            } catch (e) {}
          } else {
            dispatch(setCredentials({ token, user: null }));
          }

          // Memverifikasi dan memperbarui profil dari backend secara senyap
          try {
            const profileResponse = await api.users.getProfile();
            if (profileResponse && (parseInt(profileResponse.status) === 200) && profileResponse.data) {
              const userData = profileResponse.data;
              const userProfile = {
                nim: userData.idUser,
                idUser: userData.idUser,
                name: userData.name,
                email: userData.email,
                phone: userData.phone,
                studyProgram: userData.studyProgram,
                profileUrl: userData.profileUrl,
                role: userData.role,
              };
              await AsyncStorage.setItem('userProfile', JSON.stringify(userProfile));
              dispatch(setCredentials({ token, user: userProfile }));
            }
          } catch (apiError) {
            void 0;
            if (apiError.response && (apiError.response.status === 401 || apiError.response.status === 403)) {
              await AsyncStorage.removeItem('userToken');
              await AsyncStorage.removeItem('userProfile');
              dispatch(logout());
            }
          }
        }

        // Memuat data keranjang dari backend
        dispatch(fetchCart());
        
      } catch (e) {
        void 0;
      }
    };
    initializeApp();
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
                <Stack.Screen name="Cart" component={CartScreen} />
                <Stack.Screen name="TransactionHistory" component={TransactionHistoryScreen} />
                <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
                <Stack.Screen name="Notification" component={NotificationScreen} />
              </>
            ) : (
              <>
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Register" component={RegisterScreen} />
                <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
        {showSplash && (
          // Handler timer tampilan splash screen awal
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
