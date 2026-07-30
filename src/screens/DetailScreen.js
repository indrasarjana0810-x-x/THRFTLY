/* ==========================================
   Layar Detail Produk
========================================== */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  ScrollView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Linking,
  Platform,
  LayoutAnimation,
  UIManager,
  Share,
  FlatList,
  Animated,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { selectAuthUser } from '../store/slices/authSlice';
import { selectCartItems, toggleCartOptimistic, toggleCartApi } from '../store/slices/cartSlice';
import Colors from '../constants/colors';
import { Shadows } from '../constants/styles';
import CustomText from '../components/CustomText';
import CustomAlert from '../components/CustomAlert';
import Avatar from '../components/Avatar';
import api from '../services/api';
import { useToast } from '../components/Toast';
import { useLanguage } from '../localization/LanguageContext';
import { formatCurrency } from '../utils/formatCurrency';


const { width, height } = Dimensions.get('window');
const IMAGE_HEIGHT = height * 0.52;
const AccordionSection = React.memo(({ title, isOpen, onToggle, theme, styles, rightElement, children }) => {
  const [contentHeight, setContentHeight] = useState(0);
  const animationProgress = useRef(new Animated.Value(isOpen ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animationProgress, {
      toValue: isOpen ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [isOpen]);

  const animatedHeight = animationProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, contentHeight],
  });

  const rotation = animationProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-180deg'],
  });

  return (
    <View style={{ overflow: 'hidden' }}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onToggle}
        style={[styles.accordionHeader, { borderBottomColor: theme.border }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'space-between', marginRight: 8 }}>
          <CustomText style={[styles.sectionLabel, { color: theme.text.primary }]}>{title}</CustomText>
          {rightElement}
        </View>
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <Ionicons
            name="chevron-down"
            size={16}
            color={theme.text.secondary}
          />
        </Animated.View>
      </TouchableOpacity>
      
      <Animated.View style={{ height: animatedHeight, overflow: 'hidden' }}>
        <View 
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h > 0 && Math.abs(h - contentHeight) > 1) {
              setContentHeight(h);
            }
          }}
          style={{ position: 'absolute', width: '100%', top: 0, left: 0 }}
        >
          <View style={styles.accordionContent}>
            {children}
          </View>
        </View>
      </Animated.View>
    </View>
  );
});

export default function DetailScreen({ route, navigation }) {
  const { id } = route.params;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const { t, locale } = useLanguage();
  const { showToast } = useToast();
  const user = useSelector(selectAuthUser);
  const dispatch = useDispatch();
  const cartItems = useSelector(selectCartItems) || [];
  const isInCart = cartItems.includes(id);

  /* ---------- Scroll Animations ---------- */
  const scrollY = useRef(new Animated.Value(0)).current;
  const [scrollRange, setScrollRange] = useState(100);
  const [scrollContentHeight, setScrollContentHeight] = useState(0);
  const [scrollLayoutHeight, setScrollLayoutHeight] = useState(0);

  useEffect(() => {
    if (scrollContentHeight > 0 && scrollLayoutHeight > 0) {
      const maxScroll = Math.max(0, scrollContentHeight - scrollLayoutHeight);
      setScrollRange(Math.max(1, Math.min(100, maxScroll)));
    }
  }, [scrollContentHeight, scrollLayoutHeight]);

  const headerBgOpacity = scrollY.interpolate({
    inputRange: [0, scrollRange],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const iconOpacityTop = scrollY.interpolate({
    inputRange: [0, scrollRange * 0.8],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const iconOpacitySolid = scrollY.interpolate({
    inputRange: [0, scrollRange * 0.8],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  /* ---------- Data State ---------- */
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isWaModalVisible, setIsWaModalVisible] = useState(false);
  const [waMeetingNote, setWaMeetingNote] = useState('');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isDeleteAlertVisible, setDeleteAlertVisible] = useState(false);

  /* ---------- Cart Particle Animation (sama seperti ProductCard) ---------- */
  const cartScaleAnim = useRef(new Animated.Value(1)).current;
  const cartParticleAnim = useRef(new Animated.Value(0)).current;

  /* ---------- Checksheet Sublist Animation ---------- */
  const [showAllChecksheet, setShowAllChecksheet] = useState(false);
  const [subListHeight, setSubListHeight] = useState(0);
  const subListAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(subListAnim, {
      toValue: showAllChecksheet ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [showAllChecksheet]);

  const animatedSubHeight = subListAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, subListHeight],
  });

  const subChevronRotation = subListAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-180deg'],
  });

  const opacityOpen = subListAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const opacityClose = subListAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const handleToggleCart = () => {
    if (!user) {
      showToast(
        t('detail.login_to_save'),
        'warning'
      );
      return;
    }

    const nextFavorite = !isInCart;
    dispatch(toggleCartOptimistic(id));
    dispatch(toggleCartApi(id));

    if (nextFavorite) {
      // Tambah ke keranjang: pantul + partikel meledak
      cartParticleAnim.setValue(0);
      Animated.parallel([
        Animated.sequence([
          Animated.timing(cartScaleAnim, { toValue: 1.4, duration: 100, useNativeDriver: true }),
          Animated.spring(cartScaleAnim, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }),
        ]),
        Animated.timing(cartParticleAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
    } else {
      // Hapus dari keranjang: mantul mengecil
      Animated.sequence([
        Animated.timing(cartScaleAnim, { toValue: 0.8, duration: 100, useNativeDriver: true }),
        Animated.spring(cartScaleAnim, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }),
      ]).start();
    }
  };

  /* ---------- Derived State (Memoized per W4 Cheat Sheet) ---------- */
  const isOwner = useMemo(() => {
    return Boolean(
      user && item && (
        user.idUser === item.sellerId ||
        user.idUser === item.userId ||
        user.idUser === item.idUser ||
        user.email === item.sellerEmail ||
        user.email === item.email ||
        user.name === item.sellerName ||
        user.name === item.userName
      )
    );
  }, [user, item]);

  const imagesList = useMemo(() => {
    return item?.imageUris?.length > 0 ? item.imageUris : [];
  }, [item]);
  const imageBg = isDark ? Colors.dark.surface : Colors.light.border;
  const cardBg = isDark ? Colors.dark.background : Colors.common.white;

  /* ---------- Accordion State ---------- */
  const [openSections, setOpenSections] = useState({
    lokasi: true,
    checksheet: true,
    deskripsi: true,
    penjual: false,
  });

  const toggleSection = (key) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  /* ---------- Carousel & Thumbnail Sync ---------- */
  const carouselRef = useRef(null);
  const thumbnailScrollRef = useRef(null);

  // 1. Autoplay carousel (scroll automatically every 4 seconds)
  useEffect(() => {
    if (loading || !item || imagesList.length <= 1) return;

    const timer = setInterval(() => {
      const nextIndex = (activeImageIndex + 1) % imagesList.length;
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setActiveImageIndex(nextIndex);
      carouselRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    }, 4000);

    return () => clearInterval(timer);
  }, [activeImageIndex, imagesList.length, loading, item]);

  // 2. Scroll thumbnail strip automatically to focus on active image
  useEffect(() => {
    if (loading || !item || imagesList.length <= 1) return;

    // Each thumbnail is 52px height + 8px gap = 60px height
    const itemHeight = 60;
    const visibleCount = 3;
    
    if (activeImageIndex >= visibleCount - 1) {
      const scrollOffset = (activeImageIndex - (visibleCount - 2)) * itemHeight;
      thumbnailScrollRef.current?.scrollTo({ y: scrollOffset, animated: true });
    } else {
      thumbnailScrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [activeImageIndex, imagesList.length, loading, item]);

  const handleThumbnailPress = (index) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveImageIndex(index);
    carouselRef.current?.scrollToIndex({ index, animated: true });
  };

  const onMomentumScrollEnd = (event) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / width);
    if (index !== activeImageIndex) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setActiveImageIndex(index);
    }
  };

  /* ---------- API ---------- */
  const fetchItemDetail = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.items.getById(id);
      if (res && (parseInt(res.status) === 200) && (res.data || res.item)) {
        setItem(res.data || res.item);
      } else {
        showToast(res.message || 'Gagal memuat detail barang.', 'danger');
        navigation.goBack();
      }
    } catch {
      showToast('Gagal terhubung ke server', 'danger');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [id, navigation, showToast]);

  useFocusEffect(
    useCallback(() => {
      fetchItemDetail();
    }, [fetchItemDetail])
  );

  const getStatusColor = useCallback((s) => {
    if (s === 'Available') return Colors.semantic.success.main;
    if (s === 'Booked') return Colors.semantic.warning.main;
    if (s === 'Sold') return Colors.semantic.error.main;
    return theme.text.secondary;
  }, [theme]);

  const getStatusText = useCallback((s) => {
    if (s === 'Available') return t('status.available') || 'Tersedia';
    if (s === 'Booked') return t('status.booked') || 'Dipesan';
    if (s === 'Sold') return t('status.sold') || 'Terjual';
    return s;
  }, [t]);

  const handleContactSeller = useCallback(() => {
    if (!user) {
      showToast(
        t('detail.login_required_contact'), 
        'warning'
      );
      return;
    }
    if (!item?.sellerPhone) { 
      showToast(
        t('detail.no_wa') || 'Nomor WA penjual tidak tersedia.', 
        'warning'
      ); 
      return; 
    }

    const currentStatus = item?.status || '';
    if (currentStatus.toLowerCase() !== 'available' && currentStatus.toLowerCase() !== 'tersedia') {
      showToast(
        t('detail.not_available') || 'Barang ini sudah tidak tersedia untuk dipesan.', 
        'warning'
      );
      return;
    }

    setWaMeetingNote('');
    setIsWaModalVisible(true);
  }, [user, item, showToast, t]);

  if (loading || !item) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
        <ActivityIndicator size="large" color={Colors.primary.blue500} />
      </View>
    );
  }

  const confirmCheckoutAndWA = async () => {
    setIsWaModalVisible(false);
    setIsCheckingOut(true);
    try {
      const itemId = item.idItem || item.id;
      const finalNote = waMeetingNote.trim();
      const res = await api.transaction.checkout([itemId], finalNote);

      if (res && (parseInt(res.status) === 200 || parseInt(res.status) === 201)) {
        // Toast removed as WhatsApp opens immediately

        // Update local item status to Booked
        setItem(prev => prev ? { ...prev, status: 'Booked' } : prev);

        let phone = item.sellerPhone.replace(/[^0-9]/g, '');
        if (phone.startsWith('0')) phone = '62' + phone.slice(1);

        let msg = '';
        if (locale === 'id') {
          msg = `Halo ${item.sellerName || 'Penjual'},\nSaya tertarik untuk membeli produk berikut di Thriftly:\n\n1. *${item.title}* (${formatCurrency(item.price, locale)})\n\n*Total:* ${formatCurrency(item.price, locale)}`;
          if (finalNote) {
            msg += `\n*Catatan COD:* ${finalNote}`;
          }
          msg += `\n\nSaya telah membuat pesanan COD di aplikasi Thriftly. Apakah kita bisa janjian waktu & lokasi ketemuan? Terima kasih.`;
        } else {
          msg = `Hello ${item.sellerName || 'Seller'},\nI am interested in purchasing the following product on Thriftly:\n\n1. *${item.title}* (${formatCurrency(item.price, locale)})\n\n*Total:* ${formatCurrency(item.price, locale)}`;
          if (finalNote) {
            msg += `\n*COD Note:* ${finalNote}`;
          }
          msg += `\n\nI have placed a COD order on the Thriftly app. Can we schedule a meeting time & location? Thank you.`;
        }

        Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`).catch(() => {
          showToast(t('detail.open_wa_err'), 'danger');
        });
      } else {
        // Jika gagal (misal barang baru saja dipesan user lain)
        setItem(prev => prev ? { ...prev, status: 'Booked' } : prev);
        const errMsg = res?.message || (locale === 'id' 
          ? 'Maaf, barang ini baru saja dipesan oleh pembeli lain beberapa detik lalu.' 
          : 'Sorry, this item was just booked by another buyer.');
        showToast(errMsg, 'warning');
      }
    } catch (err) {
      setItem(prev => prev ? { ...prev, status: 'Booked' } : prev);
      const errMsg = err?.response?.data?.message || err?.message || (locale === 'id' 
        ? 'Maaf, barang ini baru saja dipesan oleh pembeli lain.' 
        : 'Sorry, this item was just booked by another buyer.');
      showToast(errMsg, 'warning');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleAddToCart = () => {
    if (item) {
      if (isInCart) {
        dispatch(removeFromCart(item.idItem || item.id));
      } else {
        dispatch(addToCart(item));
      }
    }
  };

  const handleOpenMap = () => {
    if (!item.latitude) return;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`)
      .catch(() => showToast('Gagal membuka peta.', 'danger'));
  };

  const handleShare = async () => {
    try {
      const shareMessage = `Hei! Lihat barang keren ini di Thriftly:\n\n*${item.title}*\nHarga: ${formatCurrency(item.price, locale)}\nKondisi: ${item.condition}\nLokasi Pertemuan: ${item.locationName || 'Kampus'}\n\nYuk buka aplikasi Thriftly untuk melihat detailnya!`;
      await Share.share({
        message: shareMessage,
      });
    } catch (error) {
      void 0;
    }
  };

  const handleDeleteItem = async () => {
    setDeleteAlertVisible(false);
    setLoading(true);
    try {
      const itemId = item?.idItem || item?.id;
      const res = await api.items.delete(itemId);
      if (res && (parseInt(res.status) === 200 || res.status === 200 || res.status === '200' || res.success)) {
        showToast(t('detail.delete_success') || 'Barang berhasil dihapus!', 'success');
        navigation.goBack();
      } else {
        showToast(res?.message || t('detail.delete_fail') || 'Gagal menghapus.', 'danger');
        setLoading(false);
      }
    } catch (err) {
      showToast(t('auth.server_error') || 'Gagal terhubung ke server', 'danger');
      setLoading(false);
    }
  };



  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      {/* Dynamic Header Background Overlay */}
      <Animated.View style={[
        styles.stickyHeader,
        {
          backgroundColor: cardBg,
          opacity: headerBgOpacity,
        }
      ]} />

      {/* Floating Sticky Actions */}
      <View style={[styles.headerActions, { top: Platform.OS === 'ios' ? 56 : 40 }]}>
        {/* Back Button */}
        <TouchableOpacity
          style={styles.actionRoundBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          {/* Translucent background for image state */}
          <Animated.View style={[
            StyleSheet.absoluteFill,
            { 
              borderRadius: 20, 
              backgroundColor: 'rgba(0,0,0,0.4)', 
              opacity: iconOpacityTop,
            }
          ]} />
          
          {/* White icon for image state */}
          <Animated.View style={{ opacity: iconOpacityTop, position: 'absolute' }}>
            <Ionicons name="chevron-back" size={22} color={Colors.common.white} />
          </Animated.View>

          {/* Theme colored icon for solid header state */}
          <Animated.View style={{ opacity: iconOpacitySolid }}>
            <Ionicons name="chevron-back" size={22} color={theme.text.primary} />
          </Animated.View>
        </TouchableOpacity>

        {/* Share Button */}
        <TouchableOpacity
          style={styles.actionRoundBtn}
          onPress={handleShare}
          activeOpacity={0.8}
        >
          {/* Translucent background for image state */}
          <Animated.View style={[
            StyleSheet.absoluteFill,
            { 
              borderRadius: 20, 
              backgroundColor: 'rgba(0,0,0,0.4)', 
              opacity: iconOpacityTop,
            }
          ]} />
          
          {/* White icon for image state */}
          <Animated.View style={{ opacity: iconOpacityTop, position: 'absolute' }}>
            <Ionicons name="share-social-outline" size={20} color={Colors.common.white} />
          </Animated.View>

          {/* Theme colored icon for solid header state */}
          <Animated.View style={{ opacity: iconOpacitySolid }}>
            <Ionicons name="share-social-outline" size={20} color={theme.text.primary} />
          </Animated.View>
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onContentSizeChange={(_, h) => setScrollContentHeight(h)}
        onLayout={(e) => setScrollLayoutHeight(e.nativeEvent.layout.height)}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* ==================== IMAGE SECTION ==================== */}
        <View style={[styles.imageSection, { backgroundColor: imageBg }]}>
          {imagesList.length > 0 ? (
            <FlatList
              ref={carouselRef}
              data={imagesList}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, index) => index.toString()}
              onMomentumScrollEnd={onMomentumScrollEnd}
              style={styles.mainImage}
              getItemLayout={(_, index) => ({
                length: width,
                offset: width * index,
                index,
              })}
              renderItem={({ item: imgUri }) => (
                <Image
                  source={{ uri: imgUri }}
                  style={{ width, height: IMAGE_HEIGHT }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={200}
                />
              )}
            />
          ) : (
            <View style={[styles.mainImage, { justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="pricetags-outline" size={80} color={theme.text.placeholder} />
            </View>
          )}

          {/* Thumbnail Strip (Scrollable, decays size/opacity for items > 3) */}
          {imagesList.length > 1 && (
            <View style={[styles.thumbnailStrip, { top: Platform.OS === 'ios' ? 110 : 95 }]}>
              <ScrollView
                ref={thumbnailScrollRef}
                showsVerticalScrollIndicator={false}
                style={styles.thumbnailScrollView}
                contentContainerStyle={{ gap: 8, paddingVertical: 8, paddingHorizontal: 6 }}
                nestedScrollEnabled={true}
              >
                {imagesList.map((uri, index) => {
                  const isActive = index === activeImageIndex;
                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleThumbnailPress(index)}
                      activeOpacity={0.8}
                      style={[
                        styles.thumbnailBox,
                        {
                          borderColor: isActive ? Colors.primary.blue500 : theme.border,
                          borderWidth: isActive ? 2.5 : 1.5,
                          backgroundColor: cardBg,
                          opacity: isActive ? 1.0 : 0.45,
                          transform: [{ scale: isActive ? 1.05 : 0.82 }],
                        }
                      ]}
                    >
                      <Image source={{ uri }} style={styles.thumbnailImg} contentFit="cover" />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Glass Badge at bottom of image */}
          <BlurView
            intensity={isDark ? 55 : 45}
            tint={isDark ? 'dark' : 'light'}
            experimentalBlurMethod="dimezisBlurView"
            style={styles.glassContainer}
          >
            <View style={styles.badgesRow}>
              <View style={[styles.badge, { backgroundColor: Colors.primary.yellow500 }]}>
                <CustomText style={styles.badgeText}>
                  {item.condition === 'Sangat Baik' ? t('postitem.cond_vg') :
                   item.condition === 'Baik' ? t('postitem.cond_good') :
                   item.condition === 'Kurang' ? t('postitem.cond_poor') :
                   item.condition}
                </CustomText>
              </View>
              <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
                <CustomText style={[styles.badgeText, { color: Colors.common.white }]}>{getStatusText(item.status)}</CustomText>
              </View>
            </View>
          </BlurView>
        </View>

        {/* ==================== CONTENT CARD ==================== */}
        <View style={[styles.contentCard, { backgroundColor: cardBg }]}>
          {/* ── First Row: Title (Left) & Price (Right) ── */}
          <View style={styles.mainHeaderRow}>
            <CustomText style={[styles.title, { color: theme.text.heading, marginRight: 16 }]}>
              {item.title}
            </CustomText>
            <CustomText style={[styles.priceTagRight, { color: Colors.primary.blue500 }]}>
              {formatCurrency(item.price, locale)}
            </CustomText>
          </View>

          {/* ── Second Row: Category Badge (Left) ── */}
          <View style={styles.metaHeaderRow}>
            <View style={[styles.categoryBadge, { backgroundColor: isDark ? Colors.dark.surface : Colors.light.border }]}>
              <Ionicons name="pricetags-outline" size={11} color={theme.text.secondary} style={{ marginRight: 6 }} />
              <CustomText style={[styles.categoryBadgeText, { color: theme.text.secondary }]}>
                {(() => {
                  const catId = item.idCategory || item.categoryId || (item.categoryName && item.categoryName.startsWith('CAT') ? item.categoryName : null);
                  if (catId) {
                    return t(`category.${catId.toLowerCase()}`);
                  }
                  return item.categoryName || t('common.category');
                })()}
              </CustomText>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border, marginTop: 16 }]} />


          {/* Lokasi */}
          <AccordionSection
            title={t('detail.meeting_location')}
            isOpen={openSections.lokasi}
            onToggle={() => toggleSection('lokasi')}
            theme={theme}
            styles={styles}
          >
            <TouchableOpacity
              activeOpacity={item.latitude ? 0.7 : 1}
              onPress={item.latitude ? handleOpenMap : null}
              style={[styles.locationRow, { backgroundColor: isDark ? Colors.dark.surface : Colors.light.background, borderColor: theme.border }]}
            >
              <Ionicons name="location-outline" size={16} color={Colors.primary.blue500} style={{ marginRight: 8 }} />
              <CustomText style={{ color: theme.text.primary, flex: 1, fontFamily: 'Barlow-Medium', fontSize: 14 }}>
                {item.locationName || 'Lokasi tidak tersedia'}
              </CustomText>
              {item.latitude && <Ionicons name="map-outline" size={15} color={Colors.primary.blue500} />}
            </TouchableOpacity>
          </AccordionSection>

          {item.checksheet && item.checksheet.length > 0 && (() => {
            const totalPoints = item.checksheet.length;
            const failedPoints = item.checksheet.filter(c => !c.passed);
            const passedPointsCount = item.checksheet.filter(c => c.passed).length;
            const pct = totalPoints > 0 ? Math.round((passedPointsCount / totalPoints) * 100) : 0;
            
            return (
              <>
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                <AccordionSection
                  title={t('detail.checksheet_title')}
                  isOpen={openSections.checksheet}
                  onToggle={() => toggleSection('checksheet')}
                  theme={theme}
                  styles={styles}
                  rightElement={
                    <View style={{ 
                      backgroundColor: pct === 100 ? Colors.semantic.success.main + '15' : Colors.primary.blue500 + '15', 
                      paddingHorizontal: 12, 
                      paddingVertical: 4, 
                      borderRadius: 8,
                      borderWidth: 0.5,
                      borderColor: pct === 100 ? Colors.semantic.success.main + '30' : Colors.primary.blue500 + '30'
                    }}>
                      <CustomText style={{ fontFamily: 'Barlow-Bold', fontSize: 13, color: pct === 100 ? Colors.semantic.success.main : Colors.primary.blue500 }}>
                        {pct}%
                      </CustomText>
                    </View>
                  }
                >
                  {failedPoints.length > 0 && (
                    <View style={{ gap: 12 }}>
                      {/* Warning Summary Banner */}
                      <View style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center', 
                        backgroundColor: isDark ? 'rgba(239,68,68,0.08)' : 'rgba(254,242,242,0.6)', 
                        borderColor: isDark ? 'rgba(239,68,68,0.2)' : 'rgba(254,226,226,1)',
                        borderWidth: 1, 
                        padding: 14, 
                        borderRadius: 12,
                        gap: 10
                      }}>
                        <Ionicons name="alert-circle" size={22} color={Colors.semantic.error.main} />
                        <View style={{ flex: 1 }}>
                          <CustomText style={{ color: theme.text.primary, fontSize: 13, fontFamily: 'Barlow-Bold' }}>
                            {t('detail.checksheet_failed_count').replace('{count}', failedPoints.length)}
                          </CustomText>
                        </View>
                      </View>

                      {/* Display the flaws directly */}
                      <View style={{ gap: 10, marginTop: 4 }}>
                        {failedPoints.map((pointObj) => (
                          <View 
                            key={pointObj.templateId} 
                            style={{ 
                              backgroundColor: isDark ? theme.surface : Colors.light.background, 
                              borderColor: theme.border, 
                              borderWidth: 1, 
                              borderRadius: 12, 
                              padding: 12 
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                              <Ionicons name="close-circle" size={16} color={Colors.semantic.error.main} style={{ marginTop: 1 }} />
                              <CustomText style={{ color: theme.text.primary, fontSize: 13, fontFamily: 'Barlow-Bold', flex: 1 }}>
                                {t(`checksheet.${pointObj.templateId.toLowerCase()}`) || pointObj.point}
                              </CustomText>
                            </View>
                            {pointObj.note && (
                              <CustomText style={{ color: theme.text.secondary, fontSize: 12, fontFamily: 'Barlow-Medium', fontStyle: 'italic', marginLeft: 24, marginTop: 4 }}>
                                Detail: {pointObj.note}
                              </CustomText>
                            )}
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Toggle Button Header Card (Full-width) */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setShowAllChecksheet(!showAllChecksheet)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      marginTop: 12,
                      borderWidth: 1.5,
                      borderColor: theme.border,
                      borderRadius: 14,
                      backgroundColor: isDark ? theme.surface : Colors.common.white,
                      zIndex: 2,
                      elevation: 2,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      <Ionicons 
                        name="list-outline" 
                        size={16} 
                        color={Colors.primary.blue500} 
                      />
                      <View style={{ flex: 1, height: 20, justifyContent: 'center' }}>
                        <Animated.View style={{ position: 'absolute', left: 0, opacity: opacityOpen }}>
                          <CustomText style={{ color: Colors.primary.blue500, fontFamily: 'Barlow-Bold', fontSize: 13 }}>
                            {t('detail.view_checks')}
                          </CustomText>
                        </Animated.View>
                        <Animated.View style={{ position: 'absolute', left: 0, opacity: opacityClose }}>
                          <CustomText style={{ color: Colors.primary.blue500, fontFamily: 'Barlow-Bold', fontSize: 13 }}>
                            {t('detail.hide_checks')}
                          </CustomText>
                        </Animated.View>
                      </View>
                    </View>
                    <Animated.View style={{ transform: [{ rotate: subChevronRotation }] }}>
                      <Ionicons 
                        name="chevron-down" 
                        size={16} 
                        color={Colors.primary.blue500} 
                      />
                    </Animated.View>
                  </TouchableOpacity>

                  {/* Expandable Content (Layered/stacked folder tab style) */}
                  <Animated.View style={{ height: animatedSubHeight, overflow: 'hidden', zIndex: 1 }}>
                    <View 
                      onLayout={(e) => {
                        const h = e.nativeEvent.layout.height;
                        if (h > 0 && Math.abs(h - subListHeight) > 1) {
                          setSubListHeight(h + 8);
                        }
                      }}
                      style={{ position: 'absolute', width: '100%', top: 0, left: 0, paddingBottom: 6 }}
                    >
                      <View style={{ 
                        marginTop: -6, 
                        marginHorizontal: 12, 
                        backgroundColor: isDark ? 'rgba(30,41,59,0.45)' : Colors.light.background, 
                        borderColor: theme.border, 
                        borderWidth: 1.2, 
                        borderTopWidth: 0,
                        borderBottomLeftRadius: 12,
                        borderBottomRightRadius: 12,
                        borderTopLeftRadius: 0,
                        borderTopRightRadius: 0,
                        paddingTop: 18,
                        paddingBottom: 16,
                        paddingHorizontal: 14, 
                        gap: 12,
                        elevation: 1,
                      }}>
                        {item.checksheet.map((pointObj) => (
                          <View key={pointObj.templateId} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                            <Ionicons 
                              name={pointObj.passed ? "checkmark" : "close"} 
                              size={16} 
                              color={pointObj.passed ? Colors.semantic.success.main : Colors.semantic.error.main} 
                              style={{ marginTop: 2 }}
                            />
                            <View style={{ flex: 1 }}>
                              <CustomText style={{ color: pointObj.passed ? theme.text.secondary : theme.text.primary, fontSize: 13, fontFamily: 'Barlow-Medium' }}>
                                {t(`checksheet.${pointObj.templateId.toLowerCase()}`) || pointObj.point}
                              </CustomText>
                              {!pointObj.passed && pointObj.note && (
                                <CustomText style={{ color: Colors.semantic.error.main, fontSize: 11, fontFamily: 'Barlow-Medium', fontStyle: 'italic', marginTop: 2 }}>
                                  Minus: {pointObj.note}
                                </CustomText>
                              )}
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  </Animated.View>
                </AccordionSection>
              </>
            );
          })()}

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Deskripsi */}
          <AccordionSection
            title={t('detail.description')}
            isOpen={openSections.deskripsi}
            onToggle={() => toggleSection('deskripsi')}
            theme={theme}
            styles={styles}
          >
            <CustomText style={{ color: theme.text.secondary, fontFamily: 'Barlow-Regular', fontSize: 14, lineHeight: 22 }}>
              {item.description}
            </CustomText>
          </AccordionSection>

          {!isOwner && (
            <>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              {/* Penjual */}
              <AccordionSection
                title={t('detail.seller')}
                isOpen={openSections.penjual}
                onToggle={() => toggleSection('penjual')}
                theme={theme}
                styles={styles}
              >
                <View style={[styles.sellerRow, { backgroundColor: isDark ? Colors.dark.surface : Colors.light.background, borderColor: theme.border }]}>
                  <Avatar imageUrl={item.sellerAvatar} name={item.sellerName || '?'} size={44} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <CustomText style={{ color: theme.text.primary, fontFamily: 'Barlow-Bold', fontSize: 15 }}>
                      {item.sellerName}
                    </CustomText>
                    <CustomText style={{ color: theme.text.secondary, fontFamily: 'Barlow-Regular', fontSize: 13, marginTop: 2 }}>
                      {item.sellerEmail}
                    </CustomText>
                  </View>
                </View>
              </AccordionSection>
            </>
          )}
        </View>
      </Animated.ScrollView>

      {/* ==================== STICKY BOTTOM BAR ==================== */}
      <View style={[
        styles.bottomBar,
        { backgroundColor: cardBg, borderTopColor: theme.border, paddingBottom: Platform.OS === 'ios' ? 30 : 16 }
      ]}>
        {isOwner ? (
          <View style={{ flex: 1, flexDirection: 'row', gap: 10 }}>
            {/* Delete Button - Disabled if Sold or Booked */}
            <TouchableOpacity
              activeOpacity={(item?.status?.toLowerCase() === 'sold' || item?.status?.toLowerCase() === 'booked') ? 1 : 0.8}
              disabled={item?.status?.toLowerCase() === 'sold' || item?.status?.toLowerCase() === 'booked'}
              onPress={() => setDeleteAlertVisible(true)}
              style={[
                styles.deleteBtn, 
                { 
                  borderColor: (item?.status?.toLowerCase() === 'sold' || item?.status?.toLowerCase() === 'booked') ? theme.border : Colors.semantic.error.main,
                  opacity: (item?.status?.toLowerCase() === 'sold' || item?.status?.toLowerCase() === 'booked') ? 0.4 : 1,
                }
              ]}
            >
              <Ionicons 
                name="trash-outline" 
                size={20} 
                color={(item?.status?.toLowerCase() === 'sold' || item?.status?.toLowerCase() === 'booked') ? theme.text.secondary : Colors.semantic.error.main} 
              />
            </TouchableOpacity>

            {/* Edit Button - Disabled if Sold or Booked */}
            <TouchableOpacity
              activeOpacity={(item?.status?.toLowerCase() === 'sold' || item?.status?.toLowerCase() === 'booked') ? 1 : 0.8}
              disabled={item?.status?.toLowerCase() === 'sold' || item?.status?.toLowerCase() === 'booked'}
              onPress={() => navigation.navigate('PostItem', { editMode: true, item })}
              style={[
                styles.ctaBtn, 
                { 
                  flex: 1, 
                  backgroundColor: theme.text.heading,
                  opacity: (item?.status?.toLowerCase() === 'sold' || item?.status?.toLowerCase() === 'booked') ? 0.4 : 1,
                }
              ]}
            >
              <Ionicons name="pencil-outline" size={18} color={isDark ? Colors.dark.background : Colors.light.surface} style={{ marginRight: 8 }} />
              <CustomText style={[styles.ctaBtnText, { color: isDark ? Colors.dark.background : Colors.light.surface }]}>{t('detail.edit_item') || 'Edit Barang'}</CustomText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flex: 1, flexDirection: 'row', gap: 10 }}>
            {/* Cart button on the left */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleToggleCart}
              style={[
                styles.iconActionBtn, 
                { 
                  backgroundColor: isInCart 
                    ? (isDark ? 'rgba(255, 214, 0, 0.2)' : '#FEF3C7') 
                    : (isDark ? Colors.dark.surface : Colors.light.border),
                  borderColor: isInCart ? (isDark ? Colors.primary.yellow500 : '#F59E0B') : 'transparent',
                  borderWidth: isInCart ? 1.5 : 0
                }
              ]}
            >
              {/* Partikel Bulet-Bulet (sama persis kayak ProductCard) */}
              {Array.from({ length: 6 }).map((_, i) => {
                const angle = (i * 360) / 6;
                const rad = (angle * Math.PI) / 180;
                const distance = 20;
                const translateX = cartParticleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, Math.cos(rad) * distance],
                });
                const translateY = cartParticleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, Math.sin(rad) * distance],
                });
                const opacity = cartParticleAnim.interpolate({
                  inputRange: [0, 0.1, 0.8, 1],
                  outputRange: [0, 1, 1, 0],
                });
                const scale = cartParticleAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 1, 0],
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
                        transform: [{ translateX }, { translateY }, { scale }],
                      },
                    ]}
                  >
                    <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: isDark ? Colors.primary.yellow500 : '#D97706' }} />
                  </Animated.View>
                );
              })}

              {/* Cart Icon */}
              <Animated.View style={{ transform: [{ scale: cartScaleAnim }] }}>
                <Ionicons
                  name={isInCart ? 'cart' : 'cart-outline'}
                  size={22}
                  color={isInCart ? (isDark ? Colors.primary.yellow500 : '#B45309') : theme.text.secondary}
                />
              </Animated.View>
            </TouchableOpacity>

            {/* WA CTA button / Unavailable status button */}
            {(() => {
              const itemStatusLower = (item?.status || '').toLowerCase();
              const isItemSold = itemStatusLower === 'sold';
              const isItemBooked = itemStatusLower === 'booked';
              const isItemUnavailable = isItemSold || isItemBooked;

              return (
                <TouchableOpacity
                  activeOpacity={isItemUnavailable ? 1 : 0.85}
                  onPress={handleContactSeller}
                  disabled={isCheckingOut || isItemUnavailable}
                  style={[
                    styles.ctaBtn, 
                    { 
                      flex: 1, 
                      backgroundColor: isItemUnavailable 
                        ? (isDark ? Colors.dark.surface : Colors.light.border) 
                        : (isCheckingOut ? Colors.semantic.whatsapp + '99' : Colors.semantic.whatsapp) 
                    }
                  ]}
                >
                  {isCheckingOut ? (
                    <ActivityIndicator size="small" color={Colors.common.white} />
                  ) : isItemUnavailable ? (
                    <CustomText style={[styles.ctaBtnText, { color: theme.text.placeholder }]}>
                      {isItemSold ? (t('cart.item_sold_btn') || 'Sudah Terjual') : (t('cart.item_unavailable_btn') || 'Sudah Dipesan')}
                    </CustomText>
                  ) : (
                    <>
                      <Ionicons name="logo-whatsapp" size={20} color={Colors.common.white} style={{ marginRight: 8 }} />
                      <CustomText style={[styles.ctaBtnText, { color: Colors.common.white }]}>
                        {t('detail.contact_wa') || 'Hubungi via WA'}
                      </CustomText>
                    </>
                  )}
                </TouchableOpacity>
              );
            })()}
          </View>
        )}
      </View>

      {/* Delete Alert */}
      <CustomAlert
        visible={isDeleteAlertVisible}
        type="danger"
        title={t('detail.delete_title') || 'Hapus Barang?'}
        message={t('detail.delete_msg') || 'Apakah Anda yakin ingin menghapus barang ini secara permanen dari Thriftly?'}
        showCancel
        confirmText={t('detail.delete_btn') || 'Hapus'}
        cancelText={t('profile.cancel') || 'Batal'}
        onConfirm={handleDeleteItem}
        onCancel={() => setDeleteAlertVisible(false)}
        onClose={() => setDeleteAlertVisible(false)}
      />

      {/* Modal Buat Janji COD (Identik dengan CartScreen) */}
      <Modal
        visible={isWaModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsWaModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            activeOpacity={1}
            style={styles.modalBackdrop}
            onPress={() => setIsWaModalVisible(false)}
          />
          
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardView}
          >
            <View style={styles.modalShadowContainer}>
              <View style={[styles.bottomSheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.sheetHandler} />
                
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <CustomText style={[styles.modalTitle, { color: theme.text.primary }]}>
                    {t('cart.confirm_title') || 'Buat Janji COD'}
                  </CustomText>
                  <TouchableOpacity 
                    onPress={() => setIsWaModalVisible(false)}
                    style={styles.closeModalBtn}
                  >
                    <Ionicons name="close" size={22} color={theme.text.secondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  <CustomText style={[styles.modalSellerLabel, { color: theme.text.secondary }]}>
                    {t('cart.arrange_cod') || 'Membuat janji COD dengan penjual:'}
                  </CustomText>
                  <CustomText style={[styles.modalSellerName, { color: theme.text.primary }]}>
                    {item?.sellerName || 'Penjual'}
                  </CustomText>

                  {/* Items Summary list */}
                  <View style={[styles.modalItemsBox, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background, borderColor: theme.border }]}>
                    <View style={styles.modalItemSummaryRow}>
                      <CustomText style={{ color: theme.text.primary, fontSize: 13, flex: 1 }} numberOfLines={1}>
                        • {item?.title}
                      </CustomText>
                      <CustomText style={{ color: theme.text.secondary, fontSize: 13, fontFamily: 'Barlow-Bold' }}>
                        {formatCurrency(item?.price || 0, locale)}
                      </CustomText>
                    </View>
                    <View style={[styles.modalDivider, { backgroundColor: theme.border }]} />
                    <View style={styles.modalItemSummaryRow}>
                      <CustomText style={{ color: theme.text.primary, fontFamily: 'Barlow-Bold', fontSize: 14 }}>
                        Total:
                      </CustomText>
                      <CustomText style={{ color: Colors.primary.yellow500, fontFamily: 'Barlow-Bold', fontSize: 15 }}>
                        {formatCurrency(item?.price || 0, locale)}
                      </CustomText>
                    </View>
                  </View>

                  {/* Meeting Notes Input */}
                  <CustomText style={[styles.inputLabel, { color: theme.text.primary }]}>
                    {t('cart.note_label') || 'Catatan:'}
                  </CustomText>
                  <TextInput
                    value={waMeetingNote}
                    onChangeText={setWaMeetingNote}
                    placeholder={t('cart.note_placeholder') || 'Tulis catatan di sini...'}
                    placeholderTextColor={theme.text.secondary + '80'}
                    multiline={true}
                    numberOfLines={4}
                    style={[styles.textInput, { 
                      color: theme.text.primary,
                      borderColor: theme.border,
                      backgroundColor: isDark ? Colors.dark.background : Colors.common.white
                    }]}
                  />

                  {/* Actions */}
                  <TouchableOpacity 
                    activeOpacity={0.8}
                    style={[styles.submitCheckoutBtn, { backgroundColor: Colors.semantic.whatsapp }]}
                    onPress={confirmCheckoutAndWA}
                    disabled={isCheckingOut}
                  >
                    {isCheckingOut ? (
                      <ActivityIndicator size="small" color={Colors.common.white} />
                    ) : (
                      <>
                        <Ionicons name="logo-whatsapp" size={18} color={Colors.common.white} style={{ marginRight: 8 }} />
                        <CustomText style={styles.submitCheckoutBtnText}>
                          {t('cart.submit_cod') || 'Ajukan & Hubungi WA'}
                        </CustomText>
                      </>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

/* ==========================================
   Styles
========================================== */
const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  /* ---- Image Section ---- */
  imageSection: {
    width,
    height: IMAGE_HEIGHT,
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 104 : 88,
    zIndex: 90,
  },
  headerActions: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 100,
  },
  actionRoundBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailStrip: {
    position: 'absolute',
    right: 14,
    alignItems: 'center',
    zIndex: 10,
  },
  thumbnailScrollView: {
    maxHeight: 180,
  },
  thumbnailBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  glassContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    overflow: 'hidden',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: {
    fontFamily: 'Barlow-Bold',
    fontSize: 11,
    color: Colors.common.black,
  },

  /* ---- Content Card ---- */
  contentCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 140, // Increased padding to stretch background and hide bottom shadow under floating action bar
    shadowColor: Colors.common.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  mainHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontFamily: 'Barlow-Black',
    fontSize: 24,
    lineHeight: 28,
    flex: 1,
  },
  priceTagRight: {
    fontFamily: 'Barlow-Black',
    fontSize: 22,
    lineHeight: 28,
    textAlign: 'right',
    includeFontPadding: false,
  },
  metaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontFamily: 'Barlow-SemiBold',
    fontSize: 12,
  },
  heartBtnDetail: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    marginVertical: 20,
    borderRadius: 1,
  },

  /* ---- Accordion ---- */
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  sectionLabel: {
    fontFamily: 'Barlow-Bold',
    fontSize: 15,
  },
  accordionContent: {
    paddingTop: 12,
    paddingBottom: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  conditionChip: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 50,
    borderWidth: 1.5,
  },
  conditionChipText: {
    fontFamily: 'Barlow-SemiBold',
    fontSize: 13,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  waInlineBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  iconActionBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ---- Bottom Bar ---- */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 10,
    shadowColor: Colors.common.black,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 24,
    zIndex: 99,
  },
  ctaBtn: {
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnText: {
    fontFamily: 'Barlow-Bold',
    fontSize: 15,
  },
  deleteBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Modal Styles (Identik dengan CartScreen) */
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  keyboardView: {
    width: '100%',
  },
  modalShadowContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...Shadows.primary,
    elevation: 20,
    backgroundColor: 'transparent',
    maxHeight: '90%',
  },
  bottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    overflow: 'hidden',
  },
  sheetHandler: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(150, 150, 150, 0.3)',
    alignSelf: 'center',
    marginBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: 'Barlow-Black',
    fontSize: 22,
    lineHeight: 28,
    paddingVertical: 2,
  },
  closeModalBtn: {
    padding: 4,
  },
  modalSellerLabel: {
    fontSize: 13,
  },
  modalSellerName: {
    fontFamily: 'Barlow-Bold',
    fontSize: 18,
    marginTop: 2,
  },
  modalItemsBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginVertical: 16,
    gap: 8,
  },
  modalItemSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalDivider: {
    height: 1,
    marginVertical: 4,
  },
  inputLabel: {
    fontFamily: 'Barlow-Bold',
    fontSize: 14,
    marginBottom: 8,
  },
  textInput: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    fontSize: 14,
    fontFamily: 'Barlow-Medium',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitCheckoutBtn: {
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  submitCheckoutBtnText: {
    fontFamily: 'Barlow-Bold',
    color: Colors.common.white,
    fontSize: 14,
  },
});
