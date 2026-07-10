/* ==========================================
   Main Tab Navigator
========================================== */
/* ---------- Imports ---------- */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import CustomTabBar from './CustomTabBar';
import Colors from '../constants/colors';

const Tab = createBottomTabNavigator();

// Placeholder screens for other tabs
const PlaceholderScreen = ({ title }) => (
  <View style={styles.placeholderContainer}>
    <Text style={styles.placeholderText}>{title} Screen</Text>
    <Text style={styles.placeholderSub}>Coming soon...</Text>
  </View>
);

const SearchScreen = () => <PlaceholderScreen title="Search" />;
const BookmarksScreen = () => <PlaceholderScreen title="Bookmarks" />;
const ProfileScreen = () => <PlaceholderScreen title="Profile" />;

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
      <Tab.Screen name="BookmarksTab" component={BookmarksScreen} />
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
