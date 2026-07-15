/* ==========================================
   Detail Screen — Normal Scroll with Accordions
========================================== */
import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { MaterialIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { selectAuthUser } from '../store/slices/authSlice';
import Colors from '../constants/colors';
import CustomText from '../components/CustomText';
import CustomAlert from '../components/CustomAlert';
import Avatar from '../components/Avatar';
import api from '../services/api';
import { useToast } from '../components/Toast';
import { useLanguage } from '../localization/LanguageContext';
import { formatCurrency } from '../utils/formatCurrency';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width, height } = Dimensions.get('window');
const IMAGE_HEIGHT = height * 0.52;
const AccordionSection = React.memo(({ title, isOpen, onToggle, theme, styles, children }) => {
  return (
    <View>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onToggle}
        style={[styles.accordionHeader, { borderBottomColor: theme.border }]}
      >
        <CustomText style={[styles.sectionLabel, { color: theme.text.primary }]}>{title}</CustomText>
        <Ionicons
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={theme.text.secondary}
        />
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.accordionContent}>
          {children}
        </View>
      )}
    </View>
  );
});

export default function DetailScreen({ route, navigation }) {
  const { id } = route.params;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const { t } = useLanguage();
  const { showToast } = useToast();
  const user = useSelector(selectAuthUser);

  /* ---------- Data State ---------- */
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isDeleteAlertVisible, setDeleteAlertVisible] = useState(false);

  /* ---------- Bookmark Particle Animation (sama seperti ProductCard) ---------- */
  const bookmarkScaleAnim = useRef(new Animated.Value(1)).current;
  const bookmarkParticleAnim = useRef(new Animated.Value(0)).current;

  const handleToggleFavorite = () => {
    const nextFavorite = !isFavorite;
    setIsFavorite(nextFavorite);

    if (nextFavorite) {
      // Tambah bookmark: pantul + partikel meledak
      bookmarkParticleAnim.setValue(0);
      Animated.parallel([
        Animated.sequence([
          Animated.timing(bookmarkScaleAnim, { toValue: 1.4, duration: 100, useNativeDriver: true }),
          Animated.spring(bookmarkScaleAnim, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }),
        ]),
        Animated.timing(bookmarkParticleAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
    } else {
      // Hapus bookmark: mantul mengecil
      Animated.sequence([
        Animated.timing(bookmarkScaleAnim, { toValue: 0.8, duration: 100, useNativeDriver: true }),
        Animated.spring(bookmarkScaleAnim, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }),
      ]).start();
    }
  };

  /* ---------- Derived State ---------- */
  const isOwner = user && item && (user.idUser === item.sellerId || user.nim === item.sellerId);
  const imagesList = item?.imageUris?.length > 0 ? item.imageUris : [];
  const imageBg = isDark ? '#1A1A2E' : '#F0F0F0';
  const cardBg = isDark ? '#0F0F1A' : '#FFFFFF';

  /* ---------- Accordion State ---------- */
  const [openSections, setOpenSections] = useState({
    lokasi: true,
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
  const fetchItemDetail = async () => {
    try {
      setLoading(true);
      const res = await api.items.getById(id);
      if (res && res.status === '200' && res.item) {
        setItem(res.item);
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
  };

  useEffect(() => { fetchItemDetail(); }, [id]);

  if (loading || !item) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
        <ActivityIndicator size="large" color={Colors.primary.blue500} />
      </View>
    );
  }



  const getStatusColor = (s) => {
    if (s === 'Available') return Colors.semantic.success.main;
    if (s === 'Booked') return Colors.semantic.warning.main;
    if (s === 'Sold') return Colors.semantic.error.main;
    return theme.text.secondary;
  };

  const getStatusText = (s) => {
    if (s === 'Available') return t('status.available') || 'Tersedia';
    if (s === 'Booked') return t('status.booked') || 'Dipesan';
    if (s === 'Sold') return t('status.sold') || 'Terjual';
    return s;
  };

  const handleContactSeller = () => {
    if (!item.sellerPhone) { showToast('Nomor WA penjual tidak tersedia.', 'warning'); return; }
    let phone = item.sellerPhone.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.slice(1);
    const msg = `Halo ${item.sellerName || 'Penjual'}, saya tertarik dengan barang "${item.title}" di Thriftly. Masih tersedia?`;
    Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`).catch(() => showToast('Gagal membuka WhatsApp.', 'danger'));
  };

  const handleOpenMap = () => {
    if (!item.latitude) return;
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`)
      .catch(() => showToast('Gagal membuka peta.', 'danger'));
  };

  const handleShare = async () => {
    try {
      const shareMessage = `Hei! Lihat barang keren ini di Thriftly:\n\n*${item.title}*\nHarga: ${formatCurrency(item.price)}\nKondisi: ${item.condition}\nLokasi Pertemuan: ${item.locationName || 'Kampus'}\n\nYuk buka aplikasi Thriftly untuk melihat detailnya!`;
      await Share.share({
        message: shareMessage,
      });
    } catch (error) {
      console.log('Error sharing item:', error);
    }
  };

  const handleDeleteItem = async () => {
    setDeleteAlertVisible(false);
    setLoading(true);
    try {
      const res = await api.items.delete(item.idItem);
      if (res?.status === '200') {
        showToast('Barang berhasil dihapus!', 'success');
        navigation.goBack();
      } else {
        showToast(res.message || 'Gagal menghapus.', 'danger');
        setLoading(false);
      }
    } catch {
      showToast('Gagal terhubung ke server', 'danger');
      setLoading(false);
    }
  };



  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      <ScrollView
        showsVerticalScrollIndicator={false}
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

          {/* Back */}
          <TouchableOpacity
            style={[styles.floatBtn, { top: Platform.OS === 'ios' ? 56 : 40, left: 20, backgroundColor: cardBg }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={22} color={theme.text.primary} />
          </TouchableOpacity>

          {/* Share */}
          <TouchableOpacity
            style={[styles.floatBtn, { top: Platform.OS === 'ios' ? 56 : 40, right: 20, backgroundColor: cardBg }]}
            onPress={handleShare}
            activeOpacity={0.8}
          >
            <Ionicons name="share-social-outline" size={20} color={theme.text.primary} />
          </TouchableOpacity>

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
                <CustomText style={styles.badgeText}>{item.condition}</CustomText>
              </View>
              <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) }]}>
                <CustomText style={[styles.badgeText, { color: '#FFF' }]}>{getStatusText(item.status)}</CustomText>
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
              {formatCurrency(item.price)}
            </CustomText>
          </View>

          {/* ── Second Row: Category Badge (Left) ── */}
          <View style={styles.metaHeaderRow}>
            <View style={[styles.categoryBadge, { backgroundColor: isDark ? Colors.dark.surface : Colors.light.border }]}>
              <Ionicons name="pricetags-outline" size={11} color={theme.text.secondary} style={{ marginRight: 6 }} />
              <CustomText style={[styles.categoryBadgeText, { color: theme.text.secondary }]}>
                {item.categoryName || 'Kategori'}
              </CustomText>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border, marginTop: 16 }]} />


          {/* Lokasi */}
          <AccordionSection
            title="Lokasi Pertemuan"
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

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Deskripsi */}
          <AccordionSection
            title="Deskripsi"
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
                title="Penjual"
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
      </ScrollView>

      {/* ==================== STICKY BOTTOM BAR ==================== */}
      <View style={[
        styles.bottomBar,
        { backgroundColor: cardBg, borderTopColor: theme.border, paddingBottom: Platform.OS === 'ios' ? 30 : 16 }
      ]}>
        {isOwner ? (
          <View style={{ flex: 1, flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setDeleteAlertVisible(true)}
              style={[styles.deleteBtn, { borderColor: Colors.semantic.error.main }]}
            >
              <Ionicons name="trash-outline" size={20} color={Colors.semantic.error.main} />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => showToast('Fitur edit barang segera hadir', 'info')}
              style={[styles.ctaBtn, { flex: 1, backgroundColor: theme.text.heading }]}
            >
              <Ionicons name="pencil-outline" size={18} color={isDark ? Colors.dark.background : Colors.light.surface} style={{ marginRight: 8 }} />
              <CustomText style={[styles.ctaBtnText, { color: isDark ? Colors.dark.background : Colors.light.surface }]}>Edit Barang</CustomText>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flex: 1, flexDirection: 'row', gap: 10 }}>
            {/* Bookmark button on the left */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleToggleFavorite}
              style={[styles.iconActionBtn, { backgroundColor: isDark ? Colors.dark.surface : Colors.light.border }]}
            >
              {/* Partikel Bulet-Bulet (sama persis kayak ProductCard) */}
              {Array.from({ length: 6 }).map((_, i) => {
                const angle = (i * 360) / 6;
                const rad = (angle * Math.PI) / 180;
                const distance = 20;
                const translateX = bookmarkParticleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, Math.cos(rad) * distance],
                });
                const translateY = bookmarkParticleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, Math.sin(rad) * distance],
                });
                const opacity = bookmarkParticleAnim.interpolate({
                  inputRange: [0, 0.1, 0.8, 1],
                  outputRange: [0, 1, 1, 0],
                });
                const scale = bookmarkParticleAnim.interpolate({
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
                    <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: Colors.primary.yellow500 }} />
                  </Animated.View>
                );
              })}

              {/* Bookmark Icon */}
              <Animated.View style={{ transform: [{ scale: bookmarkScaleAnim }] }}>
                <MaterialIcons
                  name={isFavorite ? 'bookmark' : 'bookmark-border'}
                  size={22}
                  color={isFavorite ? Colors.primary.yellow500 : theme.text.secondary}
                />
              </Animated.View>
            </TouchableOpacity>

            {/* WA CTA button */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleContactSeller}
              style={[styles.ctaBtn, { flex: 1, backgroundColor: '#25D366' }]}
            >
              <Ionicons name="logo-whatsapp" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <CustomText style={[styles.ctaBtnText, { color: '#FFF' }]}>Hubungi via WA</CustomText>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Delete Alert */}
      <CustomAlert
        visible={isDeleteAlertVisible}
        type="danger"
        title="Hapus Barang?"
        message="Apakah Anda yakin ingin menghapus barang ini secara permanen dari Thriftly?"
        showCancel
        confirmText="Hapus"
        cancelText="Batal"
        onConfirm={handleDeleteItem}
        onCancel={() => setDeleteAlertVisible(false)}
        onClose={() => setDeleteAlertVisible(false)}
      />
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
  floatBtn: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
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
    color: '#000',
  },

  /* ---- Content Card ---- */
  contentCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 140, // Increased padding to stretch background and hide bottom shadow under floating action bar
    shadowColor: '#000',
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
    shadowColor: '#000',
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
});
