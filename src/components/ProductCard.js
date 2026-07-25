/* ==========================================
   Komponen Layar Product Card
========================================== */
import React, { useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Animated,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Colors from '../constants/colors';
import { Shadows } from '../constants/styles';
import CustomText from './CustomText';
import Badge from './Badge';
import { Image } from 'expo-image';
import { useLanguage } from '../localization/LanguageContext';
import { formatCurrency } from '../utils/formatCurrency';
import { useSelector, useDispatch } from 'react-redux';
import { selectCartItems, toggleCartOptimistic, toggleCartApi } from '../store/slices/cartSlice';

/**
 * ProductCard
 * Komponen kartu produk untuk menampilkan barang yang dijual.
 * Mendukung tata letak grid dan horizontal (popular).
 */
export default function ProductCard({
  item,
  onPress,
  onFavoritePress,
  isFavorite = false,
  isSelectable = false,
  isSelected = false,
  layout = 'grid', // grid | popular  //
  userLocation,
  onLongPress,
  style,
  ...props
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const { t, locale } = useLanguage();

  const dispatch = useDispatch();
  const cartItems = useSelector(selectCartItems) || [];

  // Menggunakan state dari Redux atau properti jika diberikan
  const id = item.idItem || item.id;
  const isItemFavorited = isFavorite || cartItems.includes(id);

  const cardStyles = getStyles(theme, isDark);

  const isPopular = layout === 'popular';
  const isMasonry = layout === 'masonry';
  const isList = layout === 'list';

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
    if (!isItemFavorited) {
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

    if (id) {
      dispatch(toggleCartOptimistic(id));
      dispatch(toggleCartApi(id));
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

  const getDistanceText = () => {
    if (item.distance) return `${item.distance} km`;

    if (item.latitude && item.longitude) {
      // Menggunakan lokasi asli user jika ada, jika tidak gunakan lokasi mock (Politeknik Astra)
      const userLat = userLocation ? userLocation.latitude : -6.3475;
      const userLon = userLocation ? userLocation.longitude : 107.1486;
      const R = 6371; // Radius bumi dalam km
      const dLat = (item.latitude - userLat) * (Math.PI / 180);
      const dLon = (item.longitude - userLon) * (Math.PI / 180);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(userLat * (Math.PI / 180)) * Math.cos(item.latitude * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      if (distance < 1) {
        return `${Math.round(distance * 1000)} m`;
      }
      return `${distance.toFixed(1)} km`;
    }

    if (item.locationName) return item.locationName;
    if (item.location) return item.location;

    return '-';
  };

  return (
    <TouchableOpacity
      style={[
        cardStyles.card,
        isPopular ? cardStyles.popularCard : (isMasonry ? cardStyles.masonryCard : cardStyles.gridCard),
        isSelected && { transform: [{ scale: 0.96 }] },
        style
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.9}
      {...props}
    >
      {isSelectable && (
        <View style={{
          position: 'absolute', top: 10, left: 10, zIndex: 20,
          width: 24, height: 24, borderRadius: 12,
          backgroundColor: isSelected ? Colors.primary.blue500 : 'rgba(0,0,0,0.3)',
          borderWidth: 2, borderColor: isSelected ? Colors.primary.blue500 : 'rgba(255,255,255,0.7)',
          alignItems: 'center', justifyContent: 'center'
        }}>
          {isSelected && <MaterialIcons name="check" size={16} color={Colors.common.white} />}
        </View>
      )}
      {isSelected && (
        <View style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)', zIndex: 15, borderRadius: 24 }
        ]} pointerEvents="none" />
      )}
      {/* Area Gambar Produk (Hanya untuk Grid/Masonry/Popular) */}
      {!isList && (
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
              style={[
                cardStyles.heartCircle,
                isItemFavorited && {
                  backgroundColor: isDark ? 'rgba(255, 214, 0, 0.2)' : '#FEF3C7',
                  borderWidth: 1,
                  borderColor: isDark ? Colors.primary.yellow500 : '#F59E0B',
                }
              ]}
              onPress={handleFavoritePress}
              activeOpacity={0.8}
            >
              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <Ionicons
                  name={isItemFavorited ? "cart" : "cart-outline"}
                  size={16}
                  color={isItemFavorited ? (isDark ? Colors.primary.yellow500 : '#B45309') : theme.text.placeholder}
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
      )}

      {isList ? (
        /* ---------- LIST LAYOUT (Horizontal) ---------- */
        <BlurView
          intensity={isDark ? 30 : 60}
          tint={isDark ? 'dark' : 'light'}
          experimentalBlurMethod="dimezisBlurView"
          style={cardStyles.listContainer}
        >
          {/* Image Left */}
          <View style={cardStyles.listImageArea}>
            {renderStatusBadge(item.status)}
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
              <CustomText type="h1" style={cardStyles.listProductEmoji}>
                {item.emoji || '📦'}
              </CustomText>
            )}
          </View>

          {/* Content Right */}
          <View style={cardStyles.listBody}>
            <View style={{ flex: 1 }}>
              <CustomText type="h3" style={cardStyles.listProductTitle} numberOfLines={2}>
                {item.title}
              </CustomText>

              <View style={[cardStyles.metaRow, { marginTop: 6 }]}>
                {item.condition && (
                  <CustomText style={[cardStyles.productCondition, { color: theme.text.primary }]}>
                    {item.condition === 'Sangat Baik' ? (t('postitem.cond_vg') || 'Sangat Baik') :
                      item.condition === 'Baik' ? (t('postitem.cond_good') || 'Baik') :
                        item.condition === 'Kurang' ? (t('postitem.cond_poor') || 'Kurang') :
                          item.condition}
                  </CustomText>
                )}
                <View style={cardStyles.locationWrapper}>
                  <Ionicons name="location" size={10} color={theme.text.placeholder} />
                  <CustomText style={cardStyles.productLocation} numberOfLines={1}>
                    {getDistanceText() || item.location || 'Kampus'}
                  </CustomText>
                </View>
              </View>

              <CustomText type="h2" style={[cardStyles.listProductPrice, { color: Colors.primary.blue500 }]}>
                {formatCurrency(item.price || 0, locale)}
              </CustomText>
            </View>

            {/* Favorite / Delete Button on the far right */}
            <View style={{ justifyContent: 'flex-end', alignItems: 'center', marginLeft: 8 }}>
              <TouchableOpacity
                style={[cardStyles.heartCircle, { width: 36, height: 36, borderRadius: 18 }]}
                onPress={handleFavoritePress}
                activeOpacity={0.8}
              >
                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                  <MaterialIcons
                    name={isItemFavorited ? "bookmark" : "bookmark-border"}
                    size={20}
                    color={isItemFavorited ? Colors.primary.yellow500 : theme.text.placeholder}
                  />
                </Animated.View>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      ) : (
        /* ---------- GRID / MASONRY / POPULAR LAYOUT (Vertical) ---------- */
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
              {item.condition === 'Sangat Baik' ? (t('postitem.cond_vg') || 'Sangat Baik') :
                item.condition === 'Baik' ? (t('postitem.cond_good') || 'Baik') :
                  item.condition === 'Kurang' ? (t('postitem.cond_poor') || 'Kurang') :
                    item.condition}
            </CustomText>
            <View style={cardStyles.locationWrapper}>
              <MaterialIcons name="location-on" size={10} color={theme.text.placeholder} />
              <CustomText type="caption" style={cardStyles.productLocation}>
                {getDistanceText()}
              </CustomText>
            </View>
          </View>
          <CustomText type="body-bold" color={Colors.primary.blue500} style={cardStyles.productPrice}>
            {typeof item.price === 'number' ? formatCurrency(item.price, locale) : item.price}
          </CustomText>
        </BlurView>
      )}
    </TouchableOpacity>
  );
}

/* ---------- Gaya ---------- */

const getStyles = (theme, isDark) => {
  const shadowColor = Colors.primary.blue500;
  const shadowOpacity = isDark ? 0.15 : 0.06;

  return StyleSheet.create({
    card: {
      backgroundColor: 'transparent',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
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

    /* ---------- Spesifik Tata Letak List ---------- */
    listContainer: {
      flexDirection: 'row',
      width: '100%',
      padding: 12,
    },
    listImageArea: {
      width: 100,
      height: 100,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    listProductEmoji: {
      fontSize: 40,
    },
    listBody: {
      flex: 1,
      paddingLeft: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    listProductTitle: {
      fontSize: 15,
      letterSpacing: -0.2,
      lineHeight: 20,
    },
    listProductPrice: {
      fontSize: 16,
      marginTop: 8,
    },
    /* ---------- - ---------- */

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
