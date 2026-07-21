/* ==========================================
   Custom Tab Bar Component
========================================== */
/* ---------- Imports ---------- */
import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, useColorScheme, Animated } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import MaskedView from '@react-native-masked-view/masked-view';
import { BlurView } from 'expo-blur';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import Colors from '../constants/colors';
import { useLanguage } from '../localization/LanguageContext';

/* ---------- Bantuan Geometri ---------- */
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
 * Komponen navigasi bawah kustom dengan efek blur dan tombol FAB di tengah.
 */
export default function CustomTabBar({ state, descriptors, navigation }) {
  const { t, locale } = useLanguage();
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

  const getIconName = (routeName, isFocused) => {
    switch (routeName) {
      case 'HomeTab': return isFocused ? 'home' : 'home-outline';
      case 'SearchTab': return isFocused ? 'search' : 'search-outline';
      case 'CartTab': return isFocused ? 'cart' : 'cart-outline';
      case 'ProfileTab': return isFocused ? 'person' : 'person-outline';
      default: return 'ellipse';
    }
  };

  const getLabel = (routeName) => {
    switch (routeName) {
      case 'HomeTab': return t('nav.home') || 'Beranda';
      case 'SearchTab': return t('nav.search') || 'Cari';
      case 'CartTab': return t('nav.cart') || (locale === 'id' ? 'Keranjang' : 'Cart');
      case 'ProfileTab': return t('nav.profile') || 'Profil';
      default: return 'Menu';
    }
  };

  const shadowColor = isDark ? Colors.common.black : Colors.primary.blue500;

  return (
    <View style={[styles.bottomNavContainer, { shadowColor }]}>
      <MaskedView
        style={{ width: NAV_BAR_WIDTH, height: NAV_BAR_HEIGHT }}
        maskElement={
          <Svg width={NAV_BAR_WIDTH} height={NAV_BAR_HEIGHT}>
            <Path d={navBarPath} fill={Colors.common.black} />
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
              navigation.navigate(route.name);
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
                  iconName={getIconName(route.name, isFocused)}
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
              iconName={getIconName(route.name, isFocused)}
              label={getLabel(route.name)}
              isDark={isDark}
              theme={theme}
            />
          );
        })}
      </View>

      <TouchableOpacity 
        activeOpacity={0.8} 
        style={styles.floatingButton}
        onPress={() => navigation.navigate('PostItem')}
      >
        <MaterialIcons name="add" size={32} color={Colors.common.white} />
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
      useNativeDriver: true, // Translasi dan Opacity mendukung penggunaan native driver
    }).start();
  }, [isFocused]);

  const iconTranslateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8], // Ikon bergeser ke atas saat aktif
  });

  const textTranslateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [15, 0], // Teks muncul dari arah bawah
  });

  const activeColor = isDark ? Colors.common.white : Colors.primary.blue500;
  const iconColor = isFocused ? activeColor : theme.text.placeholder;

  return (
    <TouchableOpacity
      style={styles.navItem}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Animated.View style={{ transform: [{ translateY: iconTranslateY }], alignItems: 'center' }}>
        <Ionicons name={iconName} size={24} color={iconColor} />
      </Animated.View>
      
      <Animated.View
        style={{
          position: 'absolute',
          bottom: 12,
          opacity: animValue,
          transform: [{ translateY: textTranslateY }],
        }}
      >
        <Animated.Text style={[styles.navItemLabel, { color: activeColor }]} numberOfLines={1} adjustsFontSizeToFit>
          {label}
        </Animated.Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

/* ---------- Gaya Visual ---------- */
const styles = StyleSheet.create({
  bottomNavContainer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 24,
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
    width: 56,
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
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 12,
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
