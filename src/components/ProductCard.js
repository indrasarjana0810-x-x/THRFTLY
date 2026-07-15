// src/components/ProductCard.js

import React, { useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Colors from '../constants/colors';
import { Shadows } from '../constants/styles';
import CustomText from './CustomText';
import Badge from './Badge';
import { Image } from 'expo-image';
import { useLanguage } from '../localization/LanguageContext';
import { formatCurrency } from '../utils/formatCurrency';

export default function ProductCard({
  item,
  onPress,
  onFavoritePress,
  isFavorite = false,
  layout = 'grid', // grid | popular  //
  style,
  ...props
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const { t, locale } = useLanguage();

  const cardStyles = getStyles(theme, isDark);

  const isPopular = layout === 'popular';
  const isMasonry = layout === 'masonry';

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const particleAnim = useRef(new Animated.Value(0)).current;

  const getMasonryHeight = () => {
    if (item.imageHeight) return item.imageHeight;
    const id = item.idItem || item.id || '';
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const heights = [130, 160, 180, 200];
    return heights[Math.abs(hash) % heights.length];
  };

  const handleFavoritePress = () => {
    if (!isFavorite) {
      // Saat di-like: Pantulan + Partikel
      particleAnim.setValue(0);
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.4, duration: 100, useNativeDriver: true }),
          Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }),
        ]),
        Animated.timing(particleAnim, { toValue: 1, duration: 400, useNativeDriver: true })
      ]).start();
    } else {
      // Saat di-unlike: Cuma mantul mengecil
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 0.8, duration: 100, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }),
      ]).start();
    }

    if (onFavoritePress) {
      onFavoritePress();
    }
  };

  const renderStatusBadge = (status) => {
    const config = {
      Available: { type: 'success', label: t('status.available') || 'Tersedia' },
      Booked: { type: 'warning', label: t('status.booked') || 'Dipesan' },
      Sold: { type: 'danger', label: t('status.sold') || 'Terjual' },
    };
    const c = config[status] || config.Available;
    
    return (
      <Badge
        label={c.label}
        type={c.type}
        style={cardStyles.statusBadge}
      />
    );
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[
        cardStyles.card,
        isPopular ? cardStyles.popularCard : (isMasonry ? cardStyles.masonryCard : cardStyles.gridCard),
        style
      ]}
      {...props}
    >
      {/* Area Gambar Produk */}
      <View style={[
        cardStyles.imageArea,
        isPopular ? cardStyles.popularImageArea : (isMasonry ? cardStyles.masonryImageArea : cardStyles.gridImageArea),
        isMasonry && { height: getMasonryHeight() }
      ]}>
        {/* Badge status di pojok kanan atas  // */}
        {renderStatusBadge(item.status)}

        {/* Tombol favorit & Partikel */}
        <View style={cardStyles.heartContainer}>
          {/* Partikel Bulet-Bulet */}
          {Array.from({ length: 6 }).map((_, i) => {
            const angle = (i * 360) / 6;
            const rad = (angle * Math.PI) / 180;
            const distance = 24; 
            
            const translateX = particleAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, Math.cos(rad) * distance]
            });
            const translateY = particleAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, Math.sin(rad) * distance]
            });
            const opacity = particleAnim.interpolate({
              inputRange: [0, 0.1, 0.8, 1],
              outputRange: [0, 1, 1, 0]
            });
            const scale = particleAnim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 1, 0]
            });

            return (
              <Animated.View
                key={i}
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  {
                    justifyContent: 'center',
                    alignItems: 'center',
                    opacity,
                    transform: [{ translateX }, { translateY }, { scale }]
                  }
                ]}
              >
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary.yellow500 }} />
              </Animated.View>
            );
          })}

          <TouchableOpacity
            style={cardStyles.heartCircle}
            onPress={handleFavoritePress}
            activeOpacity={0.8}
          >
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <MaterialIcons
                name={isFavorite ? "bookmark" : "bookmark-border"}
                size={15}
                color={isFavorite ? Colors.primary.yellow500 : theme.text.placeholder}
              />
            </Animated.View>
          </TouchableOpacity>
        </View>
        
        {/* Gambar produk jika ada, jika tidak fallback ke emoji */}
        {item.imageUris && item.imageUris.length > 0 ? (
          <Image
            source={{ uri: item.imageUris[0] }}
            style={{ width: '100%', height: '100%', position: 'absolute' }}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
          />
        ) : item.image ? (
          <Image
            source={{ uri: item.image }}
            style={{ width: '100%', height: '100%', position: 'absolute' }}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
          />
        ) : (
          <CustomText style={[
            cardStyles.productEmoji,
            isPopular ? cardStyles.popularProductEmoji : cardStyles.gridProductEmoji
          ]}>
            {item.imageEmoji || '📦'}
          </CustomText>
        )}
      </View>

      {/* Bagian detail keterangan produk (Glassmorphism) */}
      <BlurView 
        intensity={isDark ? 40 : 80} 
        tint={isDark ? 'dark' : 'light'} 
        experimentalBlurMethod="dimezisBlurView"
        style={cardStyles.cardBody}
      >
        <CustomText type="h3" numberOfLines={1} style={cardStyles.productTitle}>
          {item.title}
        </CustomText>
        <View style={cardStyles.metaRow}>
          <CustomText type="caption" style={cardStyles.productCondition}>
            {item.condition}
          </CustomText>
          <View style={cardStyles.locationWrapper}>
            <MaterialIcons name="location-on" size={10} color={theme.text.placeholder} />
            <CustomText type="caption" style={cardStyles.productLocation}>
              {item.location || '1.2 km'}
            </CustomText>
          </View>
        </View>
        <CustomText type="body-bold" color={Colors.primary.blue500} style={cardStyles.productPrice}>
          {typeof item.price === 'number' ? formatCurrency(item.price, locale) : item.price}
        </CustomText>
      </BlurView>
    </TouchableOpacity>
  );
}

/* Styles */

const getStyles = (theme, isDark) => {
  const shadowColor = Colors.primary.blue500;
  const shadowOpacity = isDark ? 0.15 : 0.06;

  return StyleSheet.create({
    card: {
      backgroundColor: 'transparent', // Biar efek kaca tembus ke background
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border, // Dynamic border token
      overflow: 'hidden',
      ...Shadows.primary,
    },
    popularCard: {
      width: 156,
    },
    gridCard: {
      width: '100%',
    },
    masonryCard: {
      width: '100%',
    },
    imageArea: {
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    popularImageArea: {
      height: 140,
      backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
    },
    gridImageArea: {
      height: 120,
      backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
    },
    masonryImageArea: {
      backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
      // Height di-set dinamis lewat inline style di komponen
    },
    productEmoji: {
      textAlign: 'center',
    },
    popularProductEmoji: {
      fontSize: 48,
    },
    gridProductEmoji: {
      fontSize: 44,
    },
    heartContainer: {
      position: 'absolute',
      top: 10,
      right: 10,
      zIndex: 10,
    },
    heartCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.surface,
      alignItems: 'center',
      justifyContent: 'center',
      ...Shadows.light,
    },
    statusBadge: {
      position: 'absolute',
      top: 10,
      left: 10,
      zIndex: 10,
    },
    cardBody: {
      padding: 12,
      gap: 2,
    },
    productTitle: {
      fontSize: 12,
      letterSpacing: -0.2,
    },
    productCondition: {
      fontSize: 10,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 2,
    },
    locationWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    productLocation: {
      fontSize: 10,
      color: theme.text.placeholder,
    },
    productPrice: {
      fontSize: 13,
      marginTop: 2,
    },
  });
};
