// src/components/ProductCard.js

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Image,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import CustomText from './CustomText';
import Badge from './Badge';
import Config from '../services/config';

const resolveImageUrl = (url) => {
  if (!url) return "https://images.unsplash.com/photo-1542291026-7eec264c27ff";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("file://")) {
    return url;
  }
  const host = Config.BASE_URL.replace("/api", "");
  return `${host}${url}`;
};

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

  const cardStyles = getStyles(theme, isDark);

  const isPopular = layout === 'popular';

  const renderStatusBadge = (status) => {
    const config = {
      Available: { type: 'success', label: 'Tersedia' },
      Booked: { type: 'warning', label: 'Booked' },
      Sold: { type: 'danger', label: 'Terjual' },
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
        isPopular ? cardStyles.popularCard : cardStyles.gridCard,
        style
      ]}
      {...props}
    >
      {/* Area Gambar Produk */}
      <View style={[
        cardStyles.imageArea,
        isPopular ? cardStyles.popularImageArea : cardStyles.gridImageArea
      ]}>
        {/* Badge status di pojok kanan atas  // */}
        {renderStatusBadge(item.status)}

        {/* Tombol favorit di pojok kiri atas  // */}
        <TouchableOpacity
          style={cardStyles.heartCircle}
          onPress={onFavoritePress}
          activeOpacity={0.8}
        >
          <AntDesign
            name={isFavorite ? "heart" : "hearto"}
            size={13}
            color={isFavorite ? Colors.primary.yellow500 : "#9CA3AF"}
          />
        </TouchableOpacity>
        
        {/* Ilustrasi produk berupa gambar / emoji */}
        {item.images && item.images.length > 0 ? (
          <Image
            source={{ uri: resolveImageUrl(item.images[0]) }}
            style={{ width: "100%", height: "100%", borderRadius: 12 }}
            resizeMode="cover"
          />
        ) : (
          <CustomText style={[
            cardStyles.productEmoji,
            isPopular ? cardStyles.popularProductEmoji : cardStyles.gridProductEmoji
          ]}>
            {item.imageEmoji || "📦"}
          </CustomText>
        )}
      </View>

      {/* Bagian detail keterangan produk  // */}
      <View style={cardStyles.cardBody}>
        <CustomText type="h3" numberOfLines={1} style={cardStyles.productTitle}>
          {item.title}
        </CustomText>
        <CustomText type="caption" style={cardStyles.productCondition}>
          {item.condition}
        </CustomText>
        <CustomText type="body-bold" color={Colors.primary.blue500} style={cardStyles.productPrice}>
          {item.price}
        </CustomText>
      </View>
    </TouchableOpacity>
  );
}

/* Styles */

const getStyles = (theme, isDark) => {
  const shadowColor = isDark ? '#000000' : Colors.primary.blue500;
  const shadowOpacity = isDark ? 0.35 : 0.06;

  return StyleSheet.create({
    card: {
      backgroundColor: theme.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
      shadowColor: shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: shadowOpacity,
      shadowRadius: 10,
      elevation: 4,
    },
    popularCard: {
      width: 156,
    },
    gridCard: {
      width: '100%',
    },
    imageArea: {
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    popularImageArea: {
      height: 140,
      backgroundColor: isDark ? '#252538' : '#F9FBFD',
    },
    gridImageArea: {
      height: 120,
      backgroundColor: isDark ? '#252538' : '#F9FBFD',
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
    heartCircle: {
      position: 'absolute',
      top: 10,
      left: 10,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: isDark ? '#11111E' : '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
      zIndex: 10,
    },
    statusBadge: {
      position: 'absolute',
      top: 10,
      right: 10,
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
      marginTop: 2,
    },
    productPrice: {
      fontSize: 13,
      marginTop: 2,
    },
  });
};
