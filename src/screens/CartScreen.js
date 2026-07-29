/* ==========================================
   Komponen Layar Layar Keranjang
========================================== */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  FlatList,
  ActivityIndicator,
  Linking,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { selectCartItems, toggleCartOptimistic, toggleCartApi, fetchCart } from '../store/slices/cartSlice';
import Colors from '../constants/colors';
import { Shadows } from '../constants/styles';
import CustomText from '../components/CustomText';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';
import { Image } from 'expo-image';
import { formatCurrency } from '../utils/formatCurrency';
import { useLanguage } from '../localization/LanguageContext';
import { useToast } from '../components/Toast';
import api from '../services/api';
import Header from '../components/Header';

export default function CartScreen({ navigation }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const { t, locale } = useLanguage();
  const { showToast } = useToast();
  const dispatch = useDispatch();

  const cartItemIds = useSelector(selectCartItems) || [];
  const [cartItems, setCartItems] = useState([]);
  const [fetchingCart, setFetchingCart] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Auto refresh cart whenever screen comes into focus (Sesuai Materi W6 Poin 28: useFocusEffect)
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchCart());
    }, [dispatch])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchCart());
    setRefreshing(false);
  }, [dispatch]);

  // Load detailed item objects for all cart IDs
  useEffect(() => {
    const loadCartItemsFromApi = async () => {
      if (!cartItemIds || cartItemIds.length === 0) {
        setCartItems([]);
        setFetchingCart(false);
        return;
      }
      // Hanya tampilkan spinner loading jika data di layar masih benar-benar kosong
      setCartItems(prev => {
        if (!prev || prev.length === 0) {
          setFetchingCart(true);
        }
        return prev;
      });

      try {
        const results = [];
        for (const id of cartItemIds) {
          try {
            const res = await api.items.getById(id);
            if (res && (parseInt(res.status) === 200) && (res.data || res.item)) {
              results.push(res.data || res.item);
            }
          } catch (e) {
            void 0;
          }
        }
        setCartItems(results);
      } catch (err) {
        void 0;
      } finally {
        setFetchingCart(false);
      }
    };
    loadCartItemsFromApi();
  }, [cartItemIds]);

  // Modal Checkout States
  const [isCheckoutModalVisible, setCheckoutModalVisible] = useState(false);
  const [selectedSellerId, setSelectedSellerId] = useState(null);
  const [selectedSellerName, setSelectedSellerName] = useState('');
  const [selectedSellerPhone, setSelectedSellerPhone] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [meetingNote, setMeetingNote] = useState('');
  const [loading, setLoading] = useState(false);

  // Group items by Seller (memoized using useMemo to avoid re-grouping on every render/keystroke)
  const groupedList = useMemo(() => {
    const grouped = cartItems.reduce((acc, item) => {
      const sellerId = item.sellerId || 'unknown';
      const sellerName = item.sellerName || 'Penjual Thriftly';
      const sellerPhone = item.sellerPhone || '';
      const sellerAvatar = item.sellerAvatar || null;
      
      if (!acc[sellerId]) {
        acc[sellerId] = {
          sellerId,
          sellerName,
          sellerPhone,
          sellerAvatar,
          items: []
        };
      }
      acc[sellerId].items.push(item);
      return acc;
    }, {});
    return Object.values(grouped);
  }, [cartItems]);

  const handleRemoveItem = useCallback((itemId) => {
    dispatch(toggleCartOptimistic(itemId));
    dispatch(toggleCartApi(itemId));
  }, [dispatch]);

  const openCheckoutModal = useCallback((sellerGroup) => {
    const availableItems = sellerGroup.items.filter(i => {
      const s = (i.status || '').toLowerCase();
      return s === '' || s === 'available' || s === 'tersedia';
    });

    if (availableItems.length === 0) {
      showToast(
        locale === 'id' 
          ? 'Semua barang dari penjual ini sudah dipesan/terjual oleh pembeli lain.' 
          : 'All items from this seller have been booked/sold by another buyer.', 
        'warning'
      );
      return;
    }

    setSelectedSellerId(sellerGroup.sellerId);
    setSelectedSellerName(sellerGroup.sellerName);
    setSelectedSellerPhone(sellerGroup.sellerPhone);
    setSelectedItems(availableItems);
    setMeetingNote('');
    setCheckoutModalVisible(true);
  }, [locale, showToast]);

  const handleCheckout = useCallback(async () => {
    if (!selectedSellerId || selectedItems.length === 0) return;
    
    setLoading(true);
    try {
      const itemIds = selectedItems.map(item => item.idItem || item.id);
      const res = await api.transaction.checkout(itemIds, meetingNote);

      if (res && parseInt(res.status) === 200) {
        showToast(t('cart.success_toast'), 'success');

        // Remove these checked out items from Cart
        selectedItems.forEach(item => {
          const itemId = item.idItem || item.id;
          dispatch(toggleCartOptimistic(itemId));
          dispatch(toggleCartApi(itemId));
        });

        setCheckoutModalVisible(false);

        // Open WhatsApp automatically
        if (selectedSellerPhone) {
          let phone = selectedSellerPhone.replace(/[^0-9]/g, '');
          if (phone.startsWith('0')) phone = '62' + phone.slice(1);

          let itemsListText = selectedItems.map((item, idx) => {
            return `${idx + 1}. *${item.title}* (${formatCurrency(item.price, locale)})`;
          }).join('\n');

          const total = selectedItems.reduce((sum, item) => sum + Number(item.price), 0);
          
          let msg = '';
          if (locale === 'id') {
            msg = `Halo ${selectedSellerName},\nSaya tertarik untuk membeli produk berikut di Thriftly:\n\n${itemsListText}\n\n*Total:* ${formatCurrency(total, locale)}`;
            if (meetingNote.trim()) {
              msg += `\n*Catatan Pertemuan COD:* ${meetingNote.trim()}`;
            }
            msg += `\n\nApakah produk-produk tersebut masih tersedia untuk dibeli dengan metode COD? Terima kasih.`;
          } else {
            msg = `Hello ${selectedSellerName},\nI am interested in purchasing the following products on Thriftly:\n\n${itemsListText}\n\n*Total:* ${formatCurrency(total, locale)}`;
            if (meetingNote.trim()) {
              msg += `\n*COD Meeting Notes:* ${meetingNote.trim()}`;
            }
            msg += `\n\nAre these products still available for purchase via COD? Thank you.`;
          }

          Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`).catch(() => {
            showToast(
              locale === 'id' 
                ? 'Gagal membuka aplikasi WhatsApp.' 
                : 'Failed to open the WhatsApp application.', 
              'danger'
            );
          });
        }

        // Navigate to Transaction History or Profile
        navigation.navigate('ProfileTab');
      } else {
        dispatch(fetchCart());
        showToast(res?.message || (locale === 'id' ? 'Maaf, salah satu barang baru saja dipesan oleh pembeli lain.' : 'Sorry, one of the items was just booked by another buyer.'), 'warning');
      }
    } catch (err) {
      dispatch(fetchCart());
      const errMsg = err?.response?.data?.message || err?.message || (locale === 'id' ? 'Maaf, barang tersebut baru saja dipesan oleh pembeli lain.' : 'Sorry, the item was just booked by another buyer.');
      showToast(errMsg, 'warning');
    } finally {
      setLoading(false);
    }
  }, [selectedSellerId, selectedItems, meetingNote, dispatch, showToast, t, selectedSellerPhone, selectedSellerName, locale, navigation]);

  const renderSellerGroup = useCallback(({ item: sellerGroup }) => {
    const totalGroupPrice = sellerGroup.items.reduce((sum, i) => sum + Number(i.price), 0);
    const availableItems = sellerGroup.items.filter(i => {
      const s = (i.status || '').toLowerCase();
      return s === '' || s === 'available' || s === 'tersedia';
    });
    const hasAvailable = availableItems.length > 0;
    const totalAvailablePrice = availableItems.reduce((sum, i) => sum + Number(i.price), 0);
    const isAllSold = sellerGroup.items.every(i => (i.status || '').toLowerCase() === 'sold');
    const unavailableLabel = isAllSold
      ? (t('cart.item_sold_btn') || 'Sudah Terjual')
      : (t('cart.item_unavailable_btn') || 'Sudah Dipesan');

    return (
      <View style={[styles.sellerCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {/* Seller Info Header */}
        <View style={[styles.sellerHeader, { borderBottomColor: theme.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Avatar name={sellerGroup.sellerName} imageUrl={sellerGroup.sellerAvatar} size={32} />
            <CustomText style={[styles.sellerName, { color: theme.text.primary }]} numberOfLines={1}>
              {sellerGroup.sellerName}
            </CustomText>
          </View>
          <TouchableOpacity 
            disabled={!hasAvailable}
            activeOpacity={0.7}
            style={[
              styles.checkoutBtn, 
              { backgroundColor: !hasAvailable ? (isDark ? Colors.dark.border : '#E0E0E0') : Colors.primary.blue500 }
            ]}
            onPress={() => openCheckoutModal(sellerGroup)}
          >
            <CustomText style={[styles.checkoutBtnText, { color: !hasAvailable ? theme.text.placeholder : Colors.common.white }]}>
              {!hasAvailable ? unavailableLabel : t('cart.checkout_btn')}
            </CustomText>
          </TouchableOpacity>
        </View>

        {/* Group Items */}
        {sellerGroup.items.map((cartItem) => {
          const mainImg = cartItem.imageUris && cartItem.imageUris.length > 0 
            ? cartItem.imageUris[0] 
            : (cartItem.image ? cartItem.image : null);
          const statusLower = (cartItem.status || '').toLowerCase();
          const isItemUnavailable = statusLower !== '' && statusLower !== 'available' && statusLower !== 'tersedia';
          return (
            <View key={cartItem.idItem || cartItem.id} style={[styles.itemRow, { borderBottomColor: theme.border, opacity: isItemUnavailable ? 0.6 : 1 }]}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Detail', { id: cartItem.idItem || cartItem.id })}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
              >
                {mainImg ? (
                  <View style={styles.itemImgWrapper}>
                    <Image source={{ uri: mainImg }} style={styles.itemImg} contentFit="cover" transition={200} />
                  </View>
                ) : (
                  <View style={[styles.itemPlaceholderImg, { backgroundColor: isDark ? Colors.dark.surface : Colors.light.border }]}>
                    <Ionicons name="pricetag-outline" size={20} color={theme.text.secondary} />
                  </View>
                )}

                <View style={styles.itemDetails}>
                  <CustomText style={[styles.itemTitle, { color: theme.text.primary }]} numberOfLines={1}>
                    {cartItem.title}
                  </CustomText>
                  {isItemUnavailable ? (
                    <View style={{ backgroundColor: Colors.semantic.error.main + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginVertical: 2 }}>
                      <CustomText style={{ color: Colors.semantic.error.main, fontSize: 10, fontFamily: 'Barlow-Bold' }}>
                        {cartItem.status?.toLowerCase() === 'sold' ? (t('status.sold') || 'Terjual') : (t('status.booked') || 'Dipesan')}
                      </CustomText>
                    </View>
                  ) : (
                    <CustomText style={[styles.itemCondition, { color: theme.text.secondary }]}>
                      {cartItem.condition === 'Sangat Baik' ? (t('postitem.cond_vg') || 'Sangat Baik') :
                       cartItem.condition === 'Baik' ? (t('postitem.cond_good') || 'Baik') :
                       cartItem.condition === 'Kurang' ? (t('postitem.cond_poor') || 'Kurang') :
                       cartItem.condition}
                    </CustomText>
                  )}
                  <CustomText style={[styles.itemPrice, { color: isItemUnavailable ? theme.text.placeholder : Colors.primary.yellow500 }]}>
                    {formatCurrency(cartItem.price, locale)}
                  </CustomText>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                activeOpacity={0.7}
                style={styles.removeBtn}
                onPress={() => handleRemoveItem(cartItem.idItem || cartItem.id)}
              >
                <Ionicons name="trash-outline" size={20} color={Colors.semantic.error.main} />
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Total Summary Footer per Seller */}
        <View style={styles.sellerSummaryRow}>
          <CustomText style={{ color: theme.text.secondary, fontSize: 13 }}>
            {t('cart.total') || 'Total:'}
          </CustomText>
          <CustomText style={{ color: theme.text.primary, fontFamily: 'Barlow-Bold', fontSize: 15 }}>
            {formatCurrency(totalGroupPrice, locale)}
          </CustomText>
        </View>
      </View>
    );
  }, [theme, isDark, openCheckoutModal, handleRemoveItem, locale, t]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Screen Header */}
      <Header title={t('cart.title') || 'Keranjang Belanja'} showBack={false} noBorder={true} />

      {fetchingCart ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary.blue500} />
        </View>
      ) : (
        <FlatList
          data={groupedList}
          keyExtractor={(item) => item.sellerId}
          renderItem={renderSellerGroup}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          contentContainerStyle={[
            styles.listContent,
            groupedList.length === 0 && { flexGrow: 1, justifyContent: 'center' }
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors.primary.blue500]}
              tintColor={Colors.primary.blue500}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title={t('cart.empty_title') || 'Keranjang Anda Kosong'}
              description={t('cart.empty_desc') || 'Belum ada barang yang ditambahkan ke keranjang belanja Anda.'}
              icon="shopping-cart"
            />
          }
        />
      )}

      {/* Checkout Booking Modal */}
      <Modal
        visible={isCheckoutModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCheckoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setCheckoutModalVisible(false)} 
          />
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
                    onPress={() => setCheckoutModalVisible(false)}
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
                  {selectedSellerName}
                </CustomText>

                {/* Items Summary list */}
                <View style={[styles.modalItemsBox, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background, borderColor: theme.border }]}>
                  {selectedItems.map(item => (
                    <View key={item.idItem || item.id} style={styles.modalItemSummaryRow}>
                      <CustomText style={{ color: theme.text.primary, fontSize: 13, flex: 1 }} numberOfLines={1}>
                        • {item.title}
                      </CustomText>
                      <CustomText style={{ color: theme.text.secondary, fontSize: 13, fontFamily: 'Barlow-Bold' }}>
                        {formatCurrency(item.price, locale)}
                      </CustomText>
                    </View>
                  ))}
                  <View style={[styles.modalDivider, { backgroundColor: theme.border }]} />
                  <View style={styles.modalItemSummaryRow}>
                    <CustomText style={{ color: theme.text.primary, fontFamily: 'Barlow-Bold', fontSize: 14 }}>
                      {t('cart.total') || 'Total:'}
                    </CustomText>
                    <CustomText style={{ color: Colors.primary.yellow500, fontFamily: 'Barlow-Bold', fontSize: 15 }}>
                      {formatCurrency(selectedItems.reduce((sum, i) => sum + Number(i.price), 0), locale)}
                    </CustomText>
                  </View>
                </View>

                {/* Meeting Notes Input */}
                <CustomText style={[styles.inputLabel, { color: theme.text.primary }]}>
                  {t('cart.note_label') || 'Catatan:'}
                </CustomText>
                <TextInput
                  value={meetingNote}
                  onChangeText={setMeetingNote}
                  placeholder={t('cart.note_placeholder') || 'Tulis catatan di sini...'}
                  placeholderTextColor={theme.text.placeholder}
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
                  onPress={handleCheckout}
                  disabled={loading}
                >
                  {loading ? (
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabHeader: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 12,
  },
  tabHeaderTitle: {
    fontFamily: 'Barlow-Black',
    fontSize: 24,
    letterSpacing: -0.5,
  },
  listContent: {
    flexGrow: 1,
    padding: 20,
    gap: 16,
  },
  sellerCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    ...Shadows.primary,
    elevation: 3,
  },
  sellerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  sellerName: {
    fontFamily: 'Barlow-Bold',
    fontSize: 15,
    marginLeft: 10,
    flex: 1,
  },
  checkoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  checkoutBtnText: {
    fontFamily: 'Barlow-Bold',
    color: Colors.common.white,
    fontSize: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  itemImgWrapper: {
    width: 50,
    height: 50,
    borderRadius: 10,
    overflow: 'hidden',
  },
  itemImg: {
    width: '100%',
    height: '100%',
  },
  itemPlaceholderImg: {
    width: 50,
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  itemTitle: {
    fontFamily: 'Barlow-Bold',
    fontSize: 14,
  },
  itemCondition: {
    fontSize: 12,
    marginTop: 2,
  },
  itemPrice: {
    fontFamily: 'Barlow-Black',
    fontSize: 14,
    marginTop: 2,
  },
  removeBtn: {
    padding: 8,
  },
  sellerSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  
  /* ---------- Modal Styles ---------- */
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
  disclaimerText: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 10,
    lineHeight: 16,
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
