/* ==========================================
   Main Tab Navigator
========================================== */
/* ---------- Imports ---------- */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CustomTabBar from './CustomTabBar';
import Colors from '../constants/colors';
import { useLanguage } from '../localization/LanguageContext';

const Tab = createBottomTabNavigator();

const PlaceholderScreen = ({ title }) => {
  const { t } = useLanguage();
  return (
    <View style={styles.placeholderContainer}>
      <Text style={styles.placeholderText}>{t('placeholder.' + title.toLowerCase() + '_title') || `${title} Screen`}</Text>
      <Text style={styles.placeholderSub}>{t('placeholder.coming_soon') || 'Coming soon...'}</Text>
    </View>
  );
};

const SearchScreen = () => <PlaceholderScreen title="Search" />;
const WishlistScreen = () => <PlaceholderScreen title="Wishlist" />;

/**
 * MainTabNavigator
 * Mengatur navigasi tab bawah dengan CustomTabBar yang reusable.
 */
export default function MainTabNavigator() {
  return (
    <Tab.Navigator 
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ 
        headerShown: false,
      }}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} />
      <Tab.Screen name="SearchTab" component={SearchScreen} />
      <Tab.Screen name="WishlistTab" component={WishlistScreen} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6', // light mode background
  },
  placeholderText: {
    fontFamily: 'Barlow-Bold',
    fontSize: 24,
    color: Colors.primary.blue500,
  },
  placeholderSub: {
    fontFamily: 'Barlow-Regular',
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  }
});
