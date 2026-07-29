/* ==========================================
   Transaction History Screen — Buyer & Seller Tabbed View
   ========================================== */
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  FlatList,
  RefreshControl,
  Linking,
  ActivityIndicator,
  LayoutAnimation,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
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
import SegmentedControl from '../components/SegmentedControl';
import CustomAlert from '../components/CustomAlert';

export default function TransactionHistoryScreen({ navigation }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const { t, locale } = useLanguage();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('buyer'); // buyer | seller
  const activeTabRef = useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  const [buyerTrans, setBuyerTrans] = useState([]);
  const [sellerTrans, setSellerTrans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [buyerPage, setBuyerPage] = useState(0);
  const [buyerTotalPages, setBuyerTotalPages] = useState(1);
  const [buyerLoadingMore, setBuyerLoadingMore] = useState(false);

  const [sellerPage, setSellerPage] = useState(0);
  const [sellerTotalPages, setSellerTotalPages] = useState(1);
  const [sellerLoadingMore, setSellerLoadingMore] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    type: 'info',
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    onConfirm: () => {},
  });

  const showAlert = (type, title, message, onConfirm, confirmText = 'OK') => {
    setAlertConfig({
      type,
      title,
      message,
      onConfirm,
      confirmText,
      cancelText: t('common.cancel') || 'Batal',
    });
    setAlertVisible(true);
  };

  const handleTabChange = useCallback((tab) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveTab(tab);
  }, []);

  const fetchTransactions = useCallback(async (isLoadMore = false, isRefreshing = false) => {
    if (isLoadMore) {
      const isBuyer = activeTabRef.current === 'buyer';
      const loadingMore = isBuyer ? buyerLoadingMore : sellerLoadingMore;
      const page = isBuyer ? buyerPage : sellerPage;
      const totalPages = isBuyer ? buyerTotalPages : sellerTotalPages;
      
      if (loadingMore || page + 1 >= totalPages) return;

      if (isBuyer) setBuyerLoadingMore(true);
      else setSellerLoadingMore(true);

      try {
        if (isBuyer) {
          const res = await api.transaction.getBuyerTransactions({ page: page + 1, size: 10 });
          if (res && parseInt(res.status) === 200 && res.data) {
            setBuyerTrans(prev => [...prev, ...(res.data.content || res.data || [])]);
            setBuyerPage(res.data.currentPage || 0);
            setBuyerTotalPages(res.data.totalPages || 1);
          }
        } else {
          const res = await api.transaction.getSellerTransactions({ page: page + 1, size: 10 });
          if (res && parseInt(res.status) === 200 && res.data) {
            setSellerTrans(prev => [...prev, ...(res.data.content || res.data || [])]);
            setSellerPage(res.data.currentPage || 0);
            setSellerTotalPages(res.data.totalPages || 1);
          }
        }
      } catch (err) {
        showToast(t('common.error'), 'danger');
      } finally {
        if (isBuyer) setBuyerLoadingMore(false);
        else setSellerLoadingMore(false);
      }
    } else {
      // Initial or refresh load (fetch both)
      if (isRefreshing) setRefreshing(true);
      else setLoading(true);

      setBuyerPage(0);
      setSellerPage(0);

      try {
        const [buyerRes, sellerRes] = await Promise.all([
          api.transaction.getBuyerTransactions({ page: 0, size: 10 }),
          api.transaction.getSellerTransactions({ page: 0, size: 10 }),
        ]);

        if (buyerRes && parseInt(buyerRes.status) === 200) {
          setBuyerTrans(buyerRes.data.content || buyerRes.data || []);
          setBuyerPage(buyerRes.data.currentPage || 0);
          setBuyerTotalPages(buyerRes.data.totalPages || 1);
        }
        if (sellerRes && parseInt(sellerRes.status) === 200) {
          setSellerTrans(sellerRes.data.content || sellerRes.data || []);
          setSellerPage(sellerRes.data.currentPage || 0);
          setSellerTotalPages(sellerRes.data.totalPages || 1);
        }
      } catch (err) {
        void 0;
        showToast(t('common.error'), 'danger');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [buyerLoadingMore, sellerLoadingMore, buyerPage, sellerPage, buyerTotalPages, sellerTotalPages, showToast, t]);

  useFocusEffect(
    useCallback(() => {
      // Load pertama saat layar fokus
      fetchTransactions(false, false);

      // Realtime polling setiap 4 detik saat layar sedang dibuka agar pesanan baru otomatis muncul
      const interval = setInterval(() => {
        Promise.all([
          api.transaction.getBuyerTransactions({ page: 0, size: 10 }),
          api.transaction.getSellerTransactions({ page: 0, size: 10 }),
        ]).then(([buyerRes, sellerRes]) => {
          if (buyerRes && parseInt(buyerRes.status) === 200 && buyerRes.data) {
            setBuyerTrans(buyerRes.data.content || buyerRes.data || []);
            setBuyerPage(buyerRes.data.currentPage || 0);
            setBuyerTotalPages(buyerRes.data.totalPages || 1);
          }
          if (sellerRes && parseInt(sellerRes.status) === 200 && sellerRes.data) {
            setSellerTrans(sellerRes.data.content || sellerRes.data || []);
            setSellerPage(sellerRes.data.currentPage || 0);
            setSellerTotalPages(sellerRes.data.totalPages || 1);
          }
        }).catch(() => void 0);
      }, 4000);

      return () => clearInterval(interval);
    }, [fetchTransactions])
  );

  const handleRefresh = useCallback(() => {
    fetchTransactions(false, true);
  }, [fetchTransactions]);

  const handleUpdateStatus = useCallback(async (transId, newStatus) => {
    try {
      const res = await api.transaction.updateStatus(transId, newStatus);
      if (res && parseInt(res.status) === 200) {
        fetchTransactions(false, false);
      } else {
        showToast(res.message || t('history.update_fail') || 'Gagal memperbarui transaksi', 'danger');
      }
    } catch (err) {
      void 0;
      showToast(t('auth.server_error'), 'danger');
    }
  }, [fetchTransactions, showToast, t]);

  const handleContactWA = useCallback((partnerName, partnerPhone, items, total) => {
    if (!partnerPhone) {
      showToast(t('history.no_phone') || 'Nomor telepon tidak tersedia.', 'warning');
      return;
    }
    let phone = partnerPhone.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.slice(1);

    const itemsText = items.map((i, idx) => `${idx + 1}. ${i.item.title}`).join('\n');
    const msg = (t('history.wa_template') || 'Halo %{name},\nsaya ingin menghubungi mengenai pesanan COD di Thriftly:\n\n%{items}\n\n*Total:* %{total}\nBagaimana kelanjutan COD kita?')
      .replace('%{name}', partnerName)
      .replace('%{items}', itemsText)
      .replace('%{total}', formatCurrency(total, locale));
    
    Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`).catch(() => {
      showToast(t('history.wa_fail') || 'Gagal membuka WhatsApp', 'danger');
    });
  }, [locale, showToast, t]);

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'Pending': return Colors.semantic.warning.main;
      case 'Accepted': return Colors.primary.blue500;
      case 'Completed': return Colors.semantic.success.main;
      case 'Rejected':
      case 'Cancelled': return Colors.semantic.error.main;
      default: return theme.text.secondary;
    }
  }, [theme.text.secondary]);

  const getStatusLabel = useCallback((status) => {
    switch (status) {
      case 'Pending': return t('status.pending') || 'Menunggu';
      case 'Accepted': return t('status.accepted') || 'COD Berlangsung';
      case 'Completed': return t('status.completed') || 'Selesai';
      case 'Rejected': return t('status.rejected') || 'Ditolak';
      case 'Cancelled': return t('status.cancelled') || 'Dibatalkan';
      default: return status;
    }
  }, [t]);

  const renderTransactionCard = useCallback(({ item }) => {
    const isBuyerRole = activeTab === 'buyer';
    const partner = isBuyerRole ? item.seller : item.buyer;
    const isPending = item.status === 'Pending';
    const isAccepted = item.status === 'Accepted';

    const cardShadow = {
      elevation: 4,
      shadowColor: Colors.primary.blue500,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.15 : 0.06,
      shadowRadius: 10,
    };

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, cardShadow]}>
        {/* Card Header: TransId & Status */}
        <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
          <View>
            <CustomText style={[styles.transDate, { color: theme.text.secondary }]}>
              {new Date(item.transDate).toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US', {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </CustomText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15', borderColor: getStatusColor(item.status) + '30' }]}>
            <CustomText style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </CustomText>
          </View>
        </View>

        {/* Card Body: Partner Info */}
        <View style={styles.partnerSection}>
          <Avatar name={partner?.name} imageUrl={partner?.profile} size={36} />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <CustomText style={{ color: theme.text.secondary, fontSize: 11 }}>
              {isBuyerRole ? (t('history.seller_label') || 'Penjual:') : (t('history.buyer_label') || 'Pembeli:')}
            </CustomText>
            <CustomText style={{ color: theme.text.primary, fontFamily: 'Barlow-Bold', fontSize: 14 }} numberOfLines={1}>
              {partner?.name || 'User'}
            </CustomText>
          </View>
        </View>

        {/* Card Body: Item Summary (Klik kartu untuk melihat Detail Transaksi) */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('TransactionDetail', { transaction: item, role: activeTab })}
          style={[styles.itemsContainer, { 
            borderColor: theme.border, 
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
            padding: 12,
            borderRadius: 12,
            marginHorizontal: 16,
            marginBottom: 12
          }]}
        >
          {(() => {
            const firstDetail = item.details && item.details.length > 0 ? item.details[0] : null;
            const mainImg = firstDetail?.item?.imageUris && firstDetail.item.imageUris.length > 0 
              ? firstDetail.item.imageUris[0] 
              : (firstDetail?.item?.image ? firstDetail.item.image : null);
            const extraCount = item.details ? item.details.length - 1 : 0;

            return (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {mainImg ? (
                  <View style={styles.itemImgWrapper}>
                    <Image source={{ uri: mainImg }} style={styles.itemImg} contentFit="cover" cachePolicy="memory-disk" />
                  </View>
                ) : (
                  <View style={[styles.itemPlaceholderImg, { backgroundColor: isDark ? Colors.dark.surface : Colors.light.border }]}>
                    <Ionicons name="pricetag-outline" size={20} color={theme.text.secondary} />
                  </View>
                )}
                <View style={[styles.itemDetails, { flex: 1 }]}>
                  <CustomText style={[styles.itemTitle, { color: theme.text.primary }]} numberOfLines={1}>
                    {firstDetail?.item?.title || 'Barang Thrift'}
                  </CustomText>
                  {extraCount > 0 ? (
                    <CustomText style={{ color: theme.text.secondary, fontSize: 12, marginTop: 2 }}>
                      +{extraCount} barang lainnya
                    </CustomText>
                  ) : (
                    firstDetail?.item?.condition && (
                      <CustomText style={[styles.itemCondition, { color: theme.text.secondary }]}>
                        {firstDetail.item.condition === 'Sangat Baik' ? (t('postitem.cond_vg') || 'Sangat Baik') :
                         firstDetail.item.condition === 'Baik' ? (t('postitem.cond_good') || 'Baik') :
                         firstDetail.item.condition === 'Kurang' ? (t('postitem.cond_poor') || 'Kurang') :
                         firstDetail.item.condition}
                      </CustomText>
                    )
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.text.secondary} />
              </View>
            );
          })()}
        </TouchableOpacity>

        {/* Meeting Note / Note Janjian */}
        {item.meetingNote && (
          <View style={styles.noteBox}>
            <Ionicons name="chatbox-ellipses-outline" size={14} color={theme.text.secondary} style={{ marginRight: 6, marginTop: 1 }} />
            <CustomText style={{ color: theme.text.secondary, fontSize: 12, flex: 1, fontStyle: 'italic' }}>
              {item.meetingNote.toLowerCase().startsWith('note') || item.meetingNote.toLowerCase().startsWith('lokasi') || item.meetingNote.toLowerCase().startsWith('catatan')
                ? item.meetingNote 
                : `Catatan COD: ${item.meetingNote}`}
            </CustomText>
          </View>
        )}

        {/* Summary total */}
        <View style={styles.summaryRow}>
          <CustomText style={{ color: theme.text.secondary, fontSize: 13 }}>
            Total:
          </CustomText>
          <CustomText style={{ color: theme.text.primary, fontFamily: 'Barlow-Bold', fontSize: 16 }}>
            {formatCurrency(item.totalTrx, locale)}
          </CustomText>
        </View>

        {/* Card Actions */}
        {(isPending || isAccepted) && (
          <View style={[styles.actionsRow, { borderTopColor: theme.border }]}>
            {isPending && (
              <View style={{ flexDirection: 'row', flex: 1, gap: 10 }}>
                {isBuyerRole ? (
                  /* ---------- Buyer can cancel pending order or WhatsApp seller ---------- */
                  <>
                    <TouchableOpacity
                      activeOpacity={0.75}
                      style={[
                        styles.actionBtn, 
                        styles.btnOutline, 
                        { 
                          flex: 1, 
                          borderColor: Colors.semantic.error.main,
                          backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.06)'
                        }
                      ]}
                      onPress={() => showAlert(
                        'warning',
                        t('history.cancel_title') || 'Batalkan Pemesanan',
                        t('history.cancel_msg') || 'Apakah Anda yakin ingin membatalkan pemesanan ini?',
                        () => handleUpdateStatus(item.idTrans, 'Cancelled'),
                        t('history.yes_cancel') || 'Ya, Batal'
                      )}
                    >
                      <Ionicons name="close-circle-outline" size={16} color={Colors.semantic.error.main} style={{ marginRight: 6 }} />
                      <CustomText style={[styles.btnText, { color: Colors.semantic.error.main }]}>
                        {t('history.btn_cancel') || 'Batalkan'}
                      </CustomText>
                    </TouchableOpacity>

                    {partner?.phone && (
                      <TouchableOpacity
                        activeOpacity={0.75}
                        style={[
                          styles.actionBtn, 
                          styles.btnOutline, 
                          { 
                            flex: 1, 
                            borderColor: Colors.semantic.whatsapp,
                            backgroundColor: isDark ? 'rgba(37, 211, 102, 0.12)' : 'rgba(37, 211, 102, 0.06)'
                          }
                        ]}
                        onPress={() => handleContactWA(partner.name, partner.phone, item.details, item.totalTrx)}
                      >
                        <Ionicons name="logo-whatsapp" size={16} color={Colors.semantic.whatsapp} style={{ marginRight: 6 }} />
                        <CustomText style={[styles.btnText, { color: Colors.semantic.whatsapp }]}>
                          {t('history.btn_wa') || 'WhatsApp'}
                        </CustomText>
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  /* ---------- Seller can accept or reject pending order ---------- */
                  <>
                    <TouchableOpacity
                      activeOpacity={0.75}
                      style={[
                        styles.actionBtn, 
                        styles.btnOutline, 
                        { 
                          flex: 1, 
                          borderColor: Colors.semantic.error.main,
                          backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.06)'
                        }
                      ]}
                      onPress={() => handleUpdateStatus(item.idTrans, 'Rejected')}
                    >
                      <Ionicons name="close-circle-outline" size={16} color={Colors.semantic.error.main} style={{ marginRight: 6 }} />
                      <CustomText style={[styles.btnText, { color: Colors.semantic.error.main }]}>
                        {t('history.btn_reject') || 'Tolak'}
                      </CustomText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.75}
                      style={[styles.actionBtn, { flex: 1, backgroundColor: Colors.primary.blue500 }]}
                      onPress={() => handleUpdateStatus(item.idTrans, 'Accepted')}
                    >
                      <Ionicons name="checkmark-circle-outline" size={16} color={Colors.common.white} style={{ marginRight: 6 }} />
                      <CustomText style={[styles.btnText, { color: Colors.common.white }]}>
                        {t('history.btn_accept') || 'Terima'}
                      </CustomText>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            {isAccepted && (
              <View style={{ flexDirection: 'row', flex: 1, gap: 10 }}>
                {/* Chat Partner WA */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  style={[
                    styles.actionBtn, 
                    styles.btnOutline, 
                    { 
                      flex: 1, 
                      borderColor: Colors.semantic.whatsapp,
                      backgroundColor: isDark ? 'rgba(37, 211, 102, 0.12)' : 'rgba(37, 211, 102, 0.06)'
                    }
                  ]}
                  onPress={() => handleContactWA(partner.name, partner.phone, item.details, item.totalTrx)}
                >
                  <Ionicons name="logo-whatsapp" size={16} color={Colors.semantic.whatsapp} style={{ marginRight: 6 }} />
                  <CustomText style={[styles.btnText, { color: Colors.semantic.whatsapp }]}>
                    {t('history.btn_wa') || 'WhatsApp'}
                  </CustomText>
                </TouchableOpacity>

                {/* Mark as Completed */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  style={[styles.actionBtn, { flex: 1, backgroundColor: Colors.primary.blue500 }]}
                  onPress={() => showAlert(
                    'info',
                    t('history.complete_title') || 'Transaksi Selesai',
                    t('history.complete_msg') || 'Apakah Anda menyatakan COD telah berhasil dan transaksi selesai?',
                    () => handleUpdateStatus(item.idTrans, 'Completed'),
                    t('history.yes_complete') || 'Ya, Selesai'
                  )}
                >
                  <Ionicons name="checkmark-done-circle-outline" size={17} color={Colors.common.white} style={{ marginRight: 6 }} />
                  <CustomText style={[styles.btnText, { color: Colors.common.white }]}>
                    {t('history.btn_complete') || 'Selesai COD'}
                  </CustomText>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    );
  }, [activeTab, isDark, theme, locale, t, handleUpdateStatus, handleContactWA, showAlert, navigation]);

  const listData = useMemo(() => {
    return activeTab === 'buyer' ? buyerTrans : sellerTrans;
  }, [activeTab, buyerTrans, sellerTrans]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Screen Header */}
      <Header title={t('history.title') || 'Riwayat Transaksi'} noBorder={true} />

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <SegmentedControl
          tabs={[
            { key: 'buyer', label: t('history.tab_buyer') || 'Pembelian' },
            { key: 'seller', label: t('history.tab_seller') || 'Penjualan' }
          ]}
          activeTab={activeTab}
          onChange={handleTabChange}
        />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary.blue500} />
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.idTrans}
          renderItem={renderTransactionCard}
          contentContainerStyle={[
            styles.listContent,
            listData.length === 0 && { flexGrow: 1, justifyContent: 'center' }
          ]}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={5}
          removeClippedSubviews={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors.primary.blue500]}
              tintColor={Colors.primary.blue500}
            />
          }
          onEndReached={() => fetchTransactions(true, false)}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            (activeTab === 'buyer' ? buyerLoadingMore : sellerLoadingMore) ? (
              <ActivityIndicator size="small" color={Colors.primary.blue500} style={{ padding: 20 }} />
            ) : (
              <View style={{ height: 20 }} />
            )
          }
          ListEmptyComponent={
            <EmptyState
              title={t('history.empty_title') || 'Tidak Ada Transaksi'}
              description={t('history.empty_desc') || 'Riwayat transaksi Anda pada status ini masih kosong.'}
              icon="receipt"
            />
          }
        />
      )}

      <CustomAlert
        visible={alertVisible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        showCancel={true}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        onConfirm={() => {
          setAlertVisible(false);
          if (alertConfig.onConfirm) alertConfig.onConfirm();
        }}
        onCancel={() => setAlertVisible(false)}
        onClose={() => setAlertVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabContainer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  listContent: {
    flexGrow: 1,
    padding: 16,
    gap: 14,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  transId: {
    fontFamily: 'Barlow-Bold',
    fontSize: 14,
  },
  transDate: {
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 0.5,
  },
  statusText: {
    fontFamily: 'Barlow-Bold',
    fontSize: 11,
  },
  partnerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  itemsContainer: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginVertical: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
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
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  actionBtn: {
    height: 40,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutline: {
    borderWidth: 1.5,
  },
  btnText: {
    fontFamily: 'Barlow-Bold',
    fontSize: 13,
  },
});
