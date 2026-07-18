// src/screens/ExploreScreen.js
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Animated,
  Dimensions,
  Platform,
  Modal,
  ActivityIndicator,
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

const CONDITIONS = [
  { id: "Semua", label: "🌐 Semua" },
  { id: "Seperti Baru", label: "✨ Seperti Baru" },
  { id: "Sangat Baik", label: "💎 Sangat Baik" },
  { id: "Baik", label: "👍 Baik" },
];

const SORT_OPTIONS = [
  { id: "Default", label: "Default (Bawaan)", icon: "swap-vertical" },
  { id: "low-to-high", label: "Harga: Terendah ke Tertinggi", icon: "arrow-up" },
  { id: "high-to-low", label: "Harga: Tertinggi ke Terendah", icon: "arrow-down" },
];

export default function ExploreScreen({
  items,
  wishlist,
  toggleWishlist,
  theme,
  isDark,
  initialCategory = "0",
  onPressProduct,
  autoFocusSearch,
  onSearchFocused,
  visible,
  language = "id",
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearchQuery, setActiveSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [isFocused, setIsFocused] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [activeCondition, setActiveCondition] = useState("Semua");
  const [activeSortPrice, setActiveSortPrice] = useState("Default");
  const [pageLimit, setPageLimit] = useState(6);

  const filterBtnRef = useRef(null);
  const filterFade = useRef(new Animated.Value(0)).current;

  const openFilter = () => {
    setFilterVisible(true);
    Animated.timing(filterFade, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const closeFilter = (callback) => {
    Animated.timing(filterFade, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setFilterVisible(false);
      if (callback) callback();
    });
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim().length >= 3) {
      setActiveSearchQuery(searchQuery.trim());
    } else {
      setActiveSearchQuery(""); // Reset search filter if search is too short
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setActiveSearchQuery("");
  };

  useEffect(() => {
    setSelectedCategory(initialCategory);
  }, [initialCategory]);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const searchBarScale = useRef(new Animated.Value(1)).current;
  const resultsFade = useRef(new Animated.Value(0)).current;
  const resultsSlide = useRef(new Animated.Value(20)).current;

  const CATEGORIES = [
    { id: "0", label: "Semua", emoji: "🛍️" },
    { id: "1", label: "Elektronik", emoji: "💻" },
    { id: "2", label: "Buku", emoji: "📚" },
    { id: "3", label: "Pakaian", emoji: "👕" },
    { id: "4", label: "Kos", emoji: "🏠" },
    { id: "5", label: "Alat Tulis", emoji: "✏️" },
  ];

  // Run screen entrance animations whenever focused
  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      slideAnim.setValue(25);
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
    }
  }, [visible]);

  // Run results slide up animation below category tab when filters change
  useEffect(() => {
    setPageLimit(6); // Reset pagination limit back to initial page size
    resultsFade.setValue(0);
    resultsSlide.setValue(20);
    Animated.parallel([
      Animated.timing(resultsFade, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(resultsSlide, {
        toValue: 0,
        friction: 7,
        tension: 30,
        useNativeDriver: true,
      }),
    ]).start();
  }, [selectedCategory, activeSearchQuery, activeCondition, activeSortPrice]);

  const handleLoadMore = () => {
    if (pageLimit < displayedItems.length) {
      setPageLimit((prev) => prev + 6);
    }
  };

  const renderFooter = () => {
    if (displayedItems.length <= 6) return <View style={{ height: 40 }} />;
    if (pageLimit >= displayedItems.length) {
      return (
        <View style={{ paddingVertical: 24, alignItems: "center" }}>
          <Text style={{ fontSize: 11, fontFamily: "Barlow_500Medium", color: theme.text.placeholder }}>
            {t("Semua barang telah dimuat", language)}
          </Text>
        </View>
      );
    }
    return (
      <View style={{ paddingVertical: 20, alignItems: "center" }}>
        <ActivityIndicator size="small" color={Colors.primary.blue500} />
      </View>
    );
  };

  const handleSearchFocus = (focused) => {
    setIsFocused(focused);
    Animated.spring(searchBarScale, {
      toValue: focused ? 1.02 : 1,
      useNativeDriver: true,
      friction: 8,
      tension: 50,
    }).start();
  };

  const parsePrice = (priceStr) => {
    return parseInt(priceStr.replace(/[^0-9]/g, "")) || 0;
  };

  const getFilteredAndSortedItems = () => {
    const filtered = items.filter((item) => {
      const matchesCategory =
        selectedCategory === "0" || item.categoryId === selectedCategory;
      
      const isSearchActive = activeSearchQuery.trim().length >= 3;
      const matchesSearch = isSearchActive
        ? item.title.toLowerCase().includes(activeSearchQuery.toLowerCase())
        : true;

      const matchesCondition = 
        activeCondition === "Semua" || 
        item.condition.toLowerCase().includes(activeCondition.toLowerCase());
        
      return matchesCategory && matchesSearch && matchesCondition;
    });

    if (activeSortPrice === "low-to-high") {
      return [...filtered].sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
    } else if (activeSortPrice === "high-to-low") {
      return [...filtered].sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
    }
    
    return filtered;
  };

  const displayedItems = getFilteredAndSortedItems();

  const styles = getStyles(theme, isDark, isFocused);

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* ── Search Header (zIndex high + overflow visible for dropdown) ── */}
      <View style={[styles.searchHeader, filterVisible && { zIndex: 200, overflow: "visible" }]}>
        <Animated.View
          style={[
            styles.searchBarWrapper,
            { transform: [{ scale: searchBarScale }] },
          ]}
        >
          <Ionicons name="search" size={18} color={theme.text.placeholder} style={{ marginRight: 4 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={t("Cari barang bekas di kampus...", language)}
            placeholderTextColor={theme.text.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            autoFocus={autoFocusSearch}
            onFocus={() => {
              handleSearchFocus(true);
              if (onSearchFocused) onSearchFocused();
            }}
            onBlur={() => handleSearchFocus(false)}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch} activeOpacity={0.7} style={{ marginRight: 8 }}>
              <Ionicons name="close-circle" size={18} color={theme.text.placeholder} />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            ref={filterBtnRef}
            style={[
              styles.filterButton,
              (activeCondition !== "Semua" || activeSortPrice !== "Default") && styles.filterButtonActive
            ]} 
            activeOpacity={0.8}
            onPress={() => filterVisible ? closeFilter() : openFilter()}
          >
            <Ionicons name="options-outline" size={16} color="#FFFFFF" />
            {(activeCondition !== "Semua" || activeSortPrice !== "Default") && (
              <View style={styles.filterActiveDot} />
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Helper Text */}
        {searchQuery.trim().length > 0 && searchQuery.trim().length < 3 && (
          <Text style={styles.searchHelperText}>
            {t("Masukkan minimal 3 karakter untuk mencari...", language)}
          </Text>
        )}

        {/* ── Dropdown anchored inside searchHeader ── */}
        {filterVisible && (
          <Animated.View style={[styles.dropdownCard, { opacity: filterFade }]}>
            {/* Triangle pointer */}
            <View style={styles.dropdownArrow} />

            {/* Section: Kondisi */}
            <Text style={styles.dropdownSectionLabel}>{t("KONDISI BARANG", language)}</Text>
            {CONDITIONS.map((cond, i) => {
              const isSelected = activeCondition === cond.id;
              return (
                <TouchableOpacity
                  key={cond.id}
                  style={[
                    styles.dropdownItem,
                    i < CONDITIONS.length - 1 && styles.dropdownItemBorder
                  ]}
                  onPress={() => {
                    closeFilter(() => setActiveCondition(cond.id));
                  }}
                >
                  <Text style={styles.dropdownItemEmoji}>{cond.label.split(" ")[0]}</Text>
                  <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextActive]}>
                    {t(cond.label.split(" ").slice(1).join(" "), language)}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={16} color={Colors.primary.blue500} />
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Divider */}
            <View style={styles.dropdownDivider} />

            {/* Section: Urutkan */}
            <Text style={styles.dropdownSectionLabel}>{t("URUTKAN HARGA", language)}</Text>
            {SORT_OPTIONS.map((opt, i) => {
              const isSelected = activeSortPrice === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.dropdownItem,
                    i < SORT_OPTIONS.length - 1 && styles.dropdownItemBorder
                  ]}
                  onPress={() => {
                    closeFilter(() => setActiveSortPrice(opt.id));
                  }}
                >
                  <Ionicons name={opt.icon} size={15} color={isSelected ? Colors.primary.blue500 : theme.text.secondary} style={{ marginRight: 10 }} />
                  <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextActive]}>
                    {t(opt.label, language)}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={16} color={Colors.primary.blue500} />
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Reset row */}
            {(activeCondition !== "Semua" || activeSortPrice !== "Default") && (
              <>
                <View style={styles.dropdownDivider} />
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    closeFilter(() => {
                      setActiveCondition("Semua");
                      setActiveSortPrice("Default");
                    });
                  }}
                >
                  <Ionicons name="refresh" size={15} color="#EF4444" style={{ marginRight: 10 }} />
                  <Text style={[styles.dropdownItemText, { color: "#EF4444" }]}>{t("Atur Ulang Filter", language)}</Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
        )}
      </View>

      {/* Backdrop to close dropdown when tapping outside */}
      {filterVisible && (
        <TouchableOpacity
          style={styles.filterBackdrop}
          activeOpacity={1}
          onPress={() => closeFilter()}
        />
      )}

      {/* ── Categories Grid (Horizontal) ── */}
      <View style={{ marginVertical: 12 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.8}
                style={[
                  styles.categoryChip,
                  isSelected && styles.categoryChipActive,
                ]}
              >
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                <Text
                  style={[
                    styles.categoryLabel,
                    isSelected && styles.categoryLabelActive,
                  ]}
                >
                  {t(cat.label, language)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Results Container (Slide/fade from below categories) ── */}
      <Animated.View
        style={{
          flex: 1,
          opacity: resultsFade,
          transform: [{ translateY: resultsSlide }],
        }}
      >
        {/* ── Results Info ── */}
        <View style={styles.resultsInfo}>
          <Text style={styles.resultsText}>
            {t("Menampilkan", language)} {displayedItems.length} {t("barang", language)}
          </Text>
        </View>

        {/* ── Grid/List View ── */}
        <FlatList
          data={displayedItems.slice(0, pageLimit)}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.2}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={60} color={theme.text.placeholder} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>{t("Barang tidak ditemukan", language)}</Text>
              <Text style={styles.emptySubtitle}>
                {t("Coba gunakan kata kunci lain atau pilih kategori yang berbeda.", language)}
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <ProductCard
              item={item}
              theme={theme}
              isDark={isDark}
              isWishlisted={wishlist.includes(item.id)}
              onWishlistPress={() => toggleWishlist(item.id)}
              onPress={() => onPressProduct(item)}
              index={index}
              language={language}
            />
          )}
        />
      </Animated.View>
    </Animated.View>
  );
}

// ─── Animated Product Card Component ───
function ProductCard({ item, theme, isDark, isWishlisted, onWishlistPress, onPress, index, language = "id" }) {
  const scale = useRef(new Animated.Value(1)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(30)).current;
  const heartScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardFade, {
        toValue: 1,
        duration: 350,
        delay: Math.min(index * 60, 400),
        useNativeDriver: true,
      }),
      Animated.spring(cardSlide, {
        toValue: 0,
        friction: 6,
        tension: 30,
        delay: Math.min(index * 60, 400),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handleHeartPress = () => {
    heartScale.setValue(0.5);
    Animated.spring(heartScale, {
      toValue: 1.5,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start(() => {
      Animated.spring(heartScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }).start();
    });
    onWishlistPress();
  };

  const styles = getCardStyles(theme, isDark);

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          opacity: cardFade,
          transform: [{ scale }, { translateY: cardSlide }],
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
        {/* Floating Heart Button at top-left */}
        <TouchableOpacity
          style={styles.wishlistBtnFloating}
          onPress={handleHeartPress}
          activeOpacity={0.8}
        >
          <Animated.Text
            style={[
              styles.wishlistIconFloating,
              isWishlisted && styles.wishlistActiveIconFloating,
              { transform: [{ scale: heartScale }] },
            ]}
          >
            {isWishlisted ? "♥" : "♡"}
          </Animated.Text>
        </TouchableOpacity>

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
          {item.isHot && (
            <View style={styles.hotBadge}>
              <Text style={styles.hotBadgeText}>🔥 HOT</Text>
            </View>
          )}
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

        <View style={styles.cardBody}>
          <Text style={styles.title} numberOfLines={1}>
            {t(item.title, language)}
          </Text>
          <Text style={styles.condition}>{t(item.condition, language)}</Text>
          <View style={styles.cardFooter}>
            <Text style={styles.price}>{item.price}</Text>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    item.status === "Available"
                      ? Colors.semantic.success.light
                      : item.status === "Booked"
                      ? Colors.semantic.warning.light
                      : Colors.semantic.error.light,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  {
                    color:
                      item.status === "Available"
                        ? Colors.semantic.success.dark
                        : item.status === "Booked"
                        ? Colors.semantic.warning.dark
                        : Colors.semantic.error.dark,
                  },
                ]}
              >
                {item.status === "Available"
                  ? t("Tersedia", language)
                  : item.status === "Booked"
                  ? "Booked"
                  : t("Terjual", language)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── STYLES GENERATORS ───
const getStyles = (theme, isDark, isFocused) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      position: "relative",
    },
    searchHeader: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 6,
    },
    searchBarWrapper: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.surface,
      paddingHorizontal: 14,
      paddingVertical: 6,
      height: 44,
      borderRadius: 50,
      borderWidth: 1.5,
      borderColor: isFocused ? Colors.primary.blue500 : theme.border,
      gap: 8,
      shadowColor: isFocused ? Colors.primary.blue500 : "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isFocused ? 0.15 : 0.02,
      shadowRadius: 6,
      elevation: isFocused ? 4 : 1,
    },
    filterButton: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: Colors.primary.blue500,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    searchIcon: {
      fontSize: 16,
      color: theme.text.placeholder,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      fontFamily: "Barlow_500Medium",
      color: theme.text.primary,
      padding: 0,
    },
    clearIcon: {
      fontSize: 14,
      color: theme.text.placeholder,
      padding: 4,
    },
    searchHelperText: {
      fontSize: 11,
      fontFamily: "Barlow_600SemiBold",
      color: Colors.semantic.warning.main,
      marginTop: 6,
      marginLeft: 14,
    },
    categoriesContainer: {
      paddingHorizontal: 16,
      gap: 8,
    },
    categoryChip: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.surface,
      borderWidth: 1.5,
      borderColor: theme.border,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 50,
      gap: 6,
    },
    categoryChipActive: {
      backgroundColor: theme.text.heading,
      borderColor: theme.text.heading,
    },
    categoryEmoji: {
      fontSize: 14,
    },
    categoryLabel: {
      fontSize: 13,
      fontFamily: "Barlow_600SemiBold",
      color: theme.text.secondary,
    },
    categoryLabelActive: {
      color: isDark ? "#1A1A2E" : "#FFFFFF",
      fontFamily: "Barlow_700Bold",
    },
    resultsInfo: {
      paddingHorizontal: 16,
      marginBottom: 10,
    },
    resultsText: {
      fontSize: 12,
      fontFamily: "Barlow_600SemiBold",
      color: theme.text.secondary,
    },
    gridRow: {
      justifyContent: "space-between",
      paddingHorizontal: 16,
    },
    listContent: {
      paddingBottom: 90,
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
      paddingTop: 80,
    },
    emptyTitle: {
      fontSize: 16,
      fontFamily: "Barlow_700Bold",
      color: theme.text.heading,
      marginTop: 8,
      marginBottom: 6,
      textAlign: "center",
    },
    emptySubtitle: {
      fontSize: 13,
      fontFamily: "Barlow_500Medium",
      color: theme.text.secondary,
      textAlign: "center",
      lineHeight: 18,
    },
    dropdownCard: {
      position: "absolute",
      top: 56,
      right: 16,
      width: 220,
      backgroundColor: theme.surface,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: theme.border,
      padding: 10,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 8,
      zIndex: 300,
    },
    dropdownArrow: {
      position: "absolute",
      top: -8,
      right: 20,
      width: 14,
      height: 14,
      backgroundColor: theme.surface,
      borderLeftWidth: 1.5,
      borderTopWidth: 1.5,
      borderColor: theme.border,
      transform: [{ rotate: "45deg" }],
      zIndex: 299,
    },
    dropdownSectionLabel: {
      fontSize: 9,
      fontFamily: "Barlow_700Bold",
      color: theme.text.secondary,
      letterSpacing: 0.8,
      marginBottom: 4,
      marginTop: 6,
      paddingLeft: 6,
    },
    dropdownItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: 8,
    },
    dropdownItemBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    dropdownItemEmoji: {
      fontSize: 14,
      marginRight: 10,
    },
    dropdownItemText: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Barlow_500Medium",
      color: theme.text.primary,
    },
    dropdownItemTextActive: {
      fontFamily: "Barlow_700Bold",
      color: Colors.primary.blue500,
    },
    filterActiveDot: {
      position: "absolute",
      top: -2,
      right: -2,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: Colors.primary.yellow500,
      borderWidth: 1,
      borderColor: Colors.primary.blue500,
    },
    filterButtonActive: {
      backgroundColor: Colors.primary.blue600,
    },
    filterBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "transparent",
      zIndex: 150,
    },
    dropdownDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.border,
      marginVertical: 2,
    },
  });
};

const getCardStyles = (theme, isDark) => {
  return StyleSheet.create({
    cardContainer: {
      width: (width - 48) / 2,
      marginBottom: 16,
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: "hidden",
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.07,
          shadowRadius: 8,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    wishlistBtnFloating: {
      position: "absolute",
      top: 10,
      right: 10,
      zIndex: 5,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: "rgba(255, 255, 255, 0.12)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 0.5,
      borderColor: "rgba(255, 255, 255, 0.2)",
    },
    wishlistIconFloating: {
      fontSize: 16,
      fontFamily: "Barlow_700Bold",
      color: "#FFFFFF",
      marginTop: Platform.OS === "android" ? -2 : 0,
    },
    wishlistActiveIconFloating: {
      color: "#EF4444",
    },
    imageContainer: {
      height: 160,
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    imageIcon: {
      fontSize: 50,
    },
    hotBadge: {
      position: "absolute",
      top: 10,
      left: 10,
      backgroundColor: Colors.primary.yellow500,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 50,
      zIndex: 1,
    },
    hotBadgeText: {
      fontSize: 10,
      fontFamily: "Barlow_700Bold",
      color: "#1A1A2E",
    },
    cardBody: {
      padding: 12,
    },
    title: {
      fontSize: 13,
      fontFamily: "Barlow_700Bold",
      color: theme.text.heading,
      lineHeight: 18,
    },
    condition: {
      fontSize: 11,
      fontFamily: "Barlow_500Medium",
      color: theme.text.secondary,
      marginTop: 2,
    },
    price: {
      fontSize: 14,
      fontFamily: "Barlow_900Black",
      color: Colors.primary.blue500,
    },
    cardFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 8,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 50,
    },
    statusBadgeText: {
      fontSize: 10,
      fontFamily: "Barlow_700Bold",
    },
  });
};
