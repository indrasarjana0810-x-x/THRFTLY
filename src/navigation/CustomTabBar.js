/* ==========================================
   Custom Tab Bar Component
========================================== */
/* ---------- Imports ---------- */
import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, useColorScheme, Animated } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import MaskedView from '@react-native-masked-view/masked-view';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import Colors from '../constants/colors';

/* ---------- Geometry Helpers ---------- */
const SCREEN_WIDTH = Dimensions.get('window').width;
const NAV_BAR_WIDTH = SCREEN_WIDTH * 0.88;
const NAV_BAR_HEIGHT = 64;
const NAV_BAR_RADIUS = 25;
const NOTCH_RADIUS = 45;
const FAB_SIZE = 56;

const getNavBarPath = (width, height, radius, notchRadius, notchCenterX) => {
  const notchDepth = notchRadius * 0.97;
  const notchHalfWidth = notchRadius * 1.2;

  const notchStartX = notchCenterX - notchHalfWidth;
  const notchEndX = notchCenterX + notchHalfWidth;

  return `
    M0,${radius}
    A${radius},${radius} 0 0 1 ${radius},0
    L${notchStartX},0
    C${notchStartX + notchHalfWidth * 0.5},0 ${notchCenterX - notchRadius},${notchDepth} ${notchCenterX},${notchDepth}
    C${notchCenterX + notchRadius},${notchDepth} ${notchEndX - notchHalfWidth * 0.5},0 ${notchEndX},0
    L${width - radius},0
    A${radius},${radius} 0 0 1 ${width},${radius}
    L${width},${height - radius}
    A${radius},${radius} 0 0 1 ${width - radius},${height}
    L${radius},${height}
    A${radius},${radius} 0 0 1 0,${height - radius}
    Z
  `;
};

/**
 * CustomTabBar
 */
export default function CustomTabBar({ state, descriptors, navigation }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  const navBarPath = getNavBarPath(
    NAV_BAR_WIDTH,
    NAV_BAR_HEIGHT,
    NAV_BAR_RADIUS,
    NOTCH_RADIUS,
    NAV_BAR_WIDTH / 2
  );

  const getIconName = (routeName) => {
    switch (routeName) {
      case 'HomeTab': return 'home';
      case 'SearchTab': return 'search';
      case 'BookmarksTab': return 'bookmark';
      case 'ProfileTab': return 'person';
      default: return 'circle';
    }
  };

  const getLabel = (routeName) => {
    switch (routeName) {
      case 'HomeTab': return 'Beranda';
      case 'SearchTab': return 'Cari';
      case 'BookmarksTab': return 'Disimpan';
      case 'ProfileTab': return 'Profil';
      default: return 'Menu';
    }
  };

  const shadowColor = isDark ? '#000000' : Colors.primary.blue500;

  return (
    <View style={[styles.bottomNavContainer, { shadowColor }]}>
      <MaskedView
        style={{ width: NAV_BAR_WIDTH, height: NAV_BAR_HEIGHT }}
        maskElement={
          <Svg width={NAV_BAR_WIDTH} height={NAV_BAR_HEIGHT}>
            <Path d={navBarPath} fill="#000000" />
          </Svg>
        }
      >
        <BlurView
          intensity={80}
          tint={isDark ? 'dark' : 'light'}
          experimentalBlurMethod="dimezisBlurView"
          style={{ flex: 1, backgroundColor: isDark ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.4)' }}
        />
      </MaskedView>

      <Svg
        width={NAV_BAR_WIDTH}
        height={NAV_BAR_HEIGHT}
        style={{ position: 'absolute' }}
        pointerEvents="none"
      >
        <Path d={navBarPath} fill="none" stroke={isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.4)'} strokeWidth="1.5" />
      </Svg>

      <View style={[styles.bottomNav, { width: NAV_BAR_WIDTH }]}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate({ name: route.name, merge: true });
            }
          };

          if (index === 2) {
            return (
              <React.Fragment key="fab-gap">
                <View style={styles.navItemPlusWrapper} />
                <AnimatedVerticalTab
                  key={route.key}
                  isFocused={isFocused}
                  onPress={onPress}
                  iconName={getIconName(route.name)}
                  label={getLabel(route.name)}
                  isDark={isDark}
                  theme={theme}
                />
              </React.Fragment>
            );
          }

          return (
            <AnimatedVerticalTab
              key={route.key}
              isFocused={isFocused}
              onPress={onPress}
              iconName={getIconName(route.name)}
              label={getLabel(route.name)}
              isDark={isDark}
              theme={theme}
            />
          );
        })}
      </View>

      <TouchableOpacity activeOpacity={0.8} style={styles.floatingButton}>
        <MaterialIcons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const AnimatedVerticalTab = ({ isFocused, onPress, iconName, label, isDark, theme }) => {
  const animValue = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(animValue, {
      toValue: isFocused ? 1 : 0,
      friction: 6,
      tension: 60,
      useNativeDriver: true, // Translasi dan Opacity bisa pakai native driver!
    }).start();
  }, [isFocused]);

  const iconTranslateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8], // Icon naik ke atas kalau aktif
  });

  const textTranslateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [15, 0], // Teks meluncur dari bawah ke atas
  });

  const activeColor = isDark ? '#FFFFFF' : Colors.primary.blue500;
  const iconColor = isFocused ? activeColor : theme.text.placeholder;

  return (
    <TouchableOpacity
      style={styles.navItem}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Animated.View style={{ transform: [{ translateY: iconTranslateY }], alignItems: 'center' }}>
        <MaterialIcons name={iconName} size={24} color={iconColor} />
      </Animated.View>
      
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 12,
          opacity: animValue,
          transform: [{ translateY: textTranslateY }],
        }}
      >
        <Animated.Text style={[styles.navItemLabel, { color: activeColor }]}>
          {label}
        </Animated.Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  bottomNavContainer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row',
    height: NAV_BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: '100%',
  },
  navItemLabel: {
    fontFamily: 'Barlow-Bold',
    fontSize: 10,
    textAlign: 'center',
  },
  navItemPlusWrapper: {
    width: NOTCH_RADIUS * 2,
    height: '100%',
  },
  floatingButton: {
    position: 'absolute',
    top: -(FAB_SIZE / 2 - 10),
    alignSelf: 'center',
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: Colors.primary.blue500,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary.blue500,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    width: 32,
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
});
