import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
} from "react-native";
import Colors from "../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../utils/translator";
import Config from "../services/config";

const resolveImageUrl = (url) => {
  if (!url) return "https://images.unsplash.com/photo-1542291026-7eec264c27ff";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("file://")) {
    return url;
  }
  const host = Config.BASE_URL.replace("/api", "");
  return `${host}${url}`;
};

const { width } = Dimensions.get("window");

export default function WishlistScreen({
  items,
  wishlist,
  toggleWishlist,
  theme,
  isDark,
  onNavigateToExplore,
  onPressProduct,
  visible,
  language = "id",
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const emptyPulse = useRef(new Animated.Value(1)).current;
  const emptyBounce = useRef(new Animated.Value(0.3)).current;

  // Find all items that are in the wishlist array
  const wishlistedItems = items.filter((item) => wishlist.includes(item.id));

  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 7,
          tension: 30,
          useNativeDriver: true,
        }),
      ]).start();

      // Empty state pulsing heart
      if (wishlistedItems.length === 0) {
        Animated.spring(emptyBounce, {
          toValue: 1,
          friction: 4,
          tension: 12,
          useNativeDriver: true,
        }).start();

        const pulse = Animated.loop(
          Animated.sequence([
            Animated.timing(emptyPulse, {
              toValue: 1.15,
              duration: 1200,
              useNativeDriver: true,
            }),
            Animated.timing(emptyPulse, {
              toValue: 1,
              duration: 1200,
              useNativeDriver: true,
            }),
          ])
        );
        pulse.start();
        return () => pulse.stop();
      }
    }
  }, [visible, wishlist.length]);

  const styles = getStyles(theme, isDark);

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.screenTitle}>{t("Barang Tersimpan", language)}</Text>
        <Text style={styles.screenSubtitle}>
          {t("Daftar barang incaran yang telah Anda tandai.", language)}
        </Text>
      </View>

      {wishlistedItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Animated.View style={[styles.emptyIconCircle, { transform: [{ scale: Animated.multiply(emptyBounce, emptyPulse) }] }]}>
            <Ionicons name="bookmark-outline" size={40} color={Colors.primary.blue500} />
          </Animated.View>
          <Text style={styles.emptyTitle}>{t("Belum Ada Simpanan", language)}</Text>
          <Text style={styles.emptySubtitle}>
            {t("Belum ada barang yang disimpan. Jelajahi produk menarik dan ketuk ikon penanda untuk menyimpannya di sini.", language)}
          </Text>
          <TouchableOpacity
            style={styles.exploreBtn}
            onPress={onNavigateToExplore}
            activeOpacity={0.8}
          >
            <Text style={styles.exploreBtnText}>{t("Cari Barang Bekas", language)}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={wishlistedItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <WishlistItemCard
              item={item}
              theme={theme}
              isDark={isDark}
              onRemove={() => toggleWishlist(item.id)}
              onPress={() => onPressProduct(item)}
              index={index}
              language={language}
            />
          )}
        />
      )}
    </Animated.View>
  );
}

// ─── Custom Animated Card for Wishlist Item ───
function WishlistItemCard({ item, theme, isDark, onRemove, onPress, index, language = "id" }) {
  const cardScale = useRef(new Animated.Value(1)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardFade, {
        toValue: 1,
        duration: 300,
        delay: Math.min(index * 60, 300),
        useNativeDriver: true,
      }),
      Animated.spring(cardSlide, {
        toValue: 0,
        friction: 6,
        tension: 30,
        delay: Math.min(index * 60, 300),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(cardScale, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(cardScale, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const styles = getCardStyles(theme, isDark);

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          opacity: cardFade,
          transform: [{ scale: cardScale }, { translateY: cardSlide }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={styles.card}
      >
        {/* Photo Container */}
        <View
          style={[
            styles.imageContainer,
            {
              backgroundColor: isDark
                ? "#2C2C2E"
                : "#ECECEC",
            },
          ]}
        >
          {item.images && item.images.length > 0 ? (
            <Image
              source={{ uri: resolveImageUrl(item.images[0]) }}
              style={{ width: "100%", height: "100%", borderRadius: 12 }}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.imageIcon}>{item.imageEmoji || "📦"}</Text>
          )}
        </View>

        {/* Info Area */}
        <View style={styles.cardBody}>
          <Text style={styles.title} numberOfLines={1}>
            {t(item.title, language)}
          </Text>
          <Text style={styles.condition}>{t(item.condition, language)}</Text>
          <Text style={styles.price}>{item.price}</Text>
          <Text style={styles.seller}>{t("Penjual", language)}: {t(item.seller || "Mahasiswa", language)}</Text>
        </View>

        {/* Remove Button */}
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={onRemove}
          activeOpacity={0.7}
        >
          <Ionicons name="bookmark" size={20} color={isDark ? Colors.primary.yellow500 : Colors.primary.blue500} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── STYLES GENERATORS ───
const getStyles = (theme, isDark) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
    },
    screenTitle: {
      fontSize: 22,
      fontFamily: "Barlow_800ExtraBold",
      color: theme.text.heading,
      letterSpacing: -0.5,
    },
    screenSubtitle: {
      fontSize: 13,
      fontFamily: "Barlow_500Medium",
      color: theme.text.secondary,
      marginTop: 4,
    },
    listContent: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 130,
      gap: 12,
    },
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 40,
      paddingBottom: 140,
    },
    emptyIconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: isDark ? "#2E1C24" : "#FEE2E2",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },
    emptyIcon: {
      fontSize: 36,
      color: "#EF4444",
    },
    emptyTitle: {
      fontSize: 18,
      fontFamily: "Barlow_800ExtraBold",
      color: theme.text.heading,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 13,
      fontFamily: "Barlow_500Medium",
      color: theme.text.secondary,
      textAlign: "center",
      lineHeight: 18,
      marginBottom: 24,
    },
    exploreBtn: {
      backgroundColor: Colors.primary.blue500,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 50,
      shadowColor: Colors.primary.blue500,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 3,
    },
    exploreBtnText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontFamily: "Barlow_700Bold",
    },
  });
};

const getCardStyles = (theme, isDark) => {
  return StyleSheet.create({
    cardContainer: {
      width: "100%",
    },
    card: {
      flexDirection: "row",
      backgroundColor: theme.surface,
      borderRadius: 20,
      padding: 12,
      alignItems: "center",
    },
    imageContainer: {
      width: 76,
      height: 76,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    imageIcon: {
      fontSize: 28,
    },
    cardBody: {
      flex: 1,
      marginLeft: 12,
      justifyContent: "center",
      gap: 2,
    },
    title: {
      fontSize: 13,
      fontFamily: "Barlow_700Bold",
      color: theme.text.heading,
    },
    condition: {
      fontSize: 10,
      fontFamily: "Barlow_500Medium",
      color: theme.text.secondary,
    },
    price: {
      fontSize: 14,
      fontFamily: "Barlow_900Black",
      color: Colors.primary.blue500,
      marginTop: 2,
    },
    seller: {
      fontSize: 10,
      fontFamily: "Barlow_500Medium",
      color: theme.text.placeholder,
      marginTop: 2,
    },
    removeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? "#2A2A3E" : "#E0F2FE",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 6,
    },
    removeBtnText: {
      fontSize: 16,
      color: "#EF4444",
      fontFamily: "Barlow_700Bold",
    },
  });
};
