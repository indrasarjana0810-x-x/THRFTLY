/* ==========================================
   Transaction History Screen — Buyer & Seller Tabbed View
   ========================================== */
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  FlatList,
  RefreshControl,
  Linking,
  ActivityIndicator,
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
  const [buyerTrans, setBuyerTrans] = useState([]);
  const [sellerTrans, setSellerTrans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  const fetchTransactions = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [buyerRes, sellerRes] = await Promise.all([
        api.transaction.getBuyerTransactions(),
        api.transaction.getSellerTransactions(),
      ]);

      if (buyerRes && parseInt(buyerRes.status) === 200) {
        setBuyerTrans(buyerRes.data || []);
      }
      if (sellerRes && parseInt(sellerRes.status) === 200) {
        setSellerTrans(sellerRes.data || []);
      }
    } catch (err) {
      console.log('Error fetching history:', err);
      showToast(locale === 'id' ? 'Gagal memuat riwayat transaksi' : 'Failed to load transaction history', 'danger');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTransactions(true);
  };

  const handleUpdateStatus = async (transId, newStatus) => {
    try {
      const res = await api.transaction.updateStatus(transId, newStatus);
      if (res && parseInt(res.status) === 200) {
        showToast(
          locale === 'id' ? 'Status transaksi berhasil diperbarui' : 'Transaction status updated successfully',
          'success'
        );
        fetchTransactions(true);
      } else {
        showToast(res.message || 'Gagal memperbarui transaksi', 'danger');
      }
    } catch (err) {
      console.log('Error updating status:', err);
      showToast(locale === 'id' ? 'Gagal terhubung ke server' : 'Failed to connect to server', 'danger');
    }
  };

  const handleContactWA = (partnerName, partnerPhone, items, total) => {
    if (!partnerPhone) {
      showToast('Nomor telepon tidak tersedia.', 'warning');
      return;
    }
    let phone = partnerPhone.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.slice(1);

    const itemsText = items.map((i, idx) => `${idx + 1}. ${i.item.title}`).join('\n');
    const msg = `Halo ${partnerName},\nsaya ingin menghubungi mengenai pesanan COD di Thriftly:\n\n${itemsText}\n\n*Total:* ${formatCurrency(total)}\nBagaimana kelanjutan COD kita?`;
    
    Linking.openURL(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`).catch(() => {
      showToast('Gagal membuka WhatsApp', 'danger');
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return Colors.semantic.warning.main;
      case 'Accepted': return Colors.primary.blue500;
      case 'Completed': return Colors.semantic.success.main;
      case 'Rejected':
      case 'Cancelled': return Colors.semantic.error.main;
      default: return theme.text.secondary;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'Pending': return locale === 'id' ? 'Menunggu' : 'Pending';
      case 'Accepted': return locale === 'id' ? 'COD Berlangsung' : 'Accepted (COD)';
      case 'Completed': return locale === 'id' ? 'Selesai' : 'Completed';
      case 'Rejected': return locale === 'id' ? 'Ditolak' : 'Rejected';
      case 'Cancelled': return locale === 'id' ? 'Dibatalkan' : 'Cancelled';
      default: return status;
    }
  };

  const renderTransactionCard = ({ item }) => {
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
              {isBuyerRole ? (locale === 'id' ? 'Penjual:' : 'Seller:') : (locale === 'id' ? 'Pembeli:' : 'Buyer:')}
            </CustomText>
            <CustomText style={{ color: theme.text.primary, fontFamily: 'Barlow-Bold', fontSize: 14 }} numberOfLines={1}>
              {partner?.name || 'User'}
            </CustomText>
          </View>
        </View>

        {/* Card Body: Items list */}
        <View style={[styles.itemsContainer, { 
          borderColor: theme.border, 
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)' 
        }]}>
          {item.details.map((detail, idx) => {
            const mainImg = detail.item?.imageUris && detail.item.imageUris.length > 0 ? detail.item.imageUris[0] : null;
            return (
              <View key={idx} style={[styles.itemRow, idx === item.details.length - 1 && { borderBottomWidth: 0 }]}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('TransactionDetail', { transaction: item, role: activeTab })}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                >
                  {mainImg ? (
                    <View style={styles.itemImgWrapper}>
                      <Image source={{ uri: mainImg }} style={styles.itemImg} contentFit="cover" cachePolicy="memory-disk" />
                    </View>
                  ) : (
                    <View style={[styles.itemPlaceholderImg, { backgroundColor: isDark ? Colors.dark.surface : Colors.light.border }]}>
                      <Ionicons name="pricetag-outline" size={20} color={theme.text.secondary} />
                    </View>
                  )}
                  <View style={styles.itemDetails}>
                    <CustomText style={[styles.itemTitle, { color: theme.text.primary }]} numberOfLines={1}>
                      {detail.item?.title || 'Barang Thrift'}
                    </CustomText>
                    {detail.item?.condition && (
                      <CustomText style={[styles.itemCondition, { color: theme.text.secondary }]}>
                        {detail.item.condition === 'Sangat Baik' ? (t('postitem.cond_vg') || 'Sangat Baik') :
                         detail.item.condition === 'Baik' ? (t('postitem.cond_good') || 'Baik') :
                         detail.item.condition === 'Kurang' ? (t('postitem.cond_poor') || 'Kurang') :
                         detail.item.condition}
                      </CustomText>
                    )}
                    <CustomText style={[styles.itemPrice, { color: Colors.primary.yellow500 }]}>
                      {formatCurrency(detail.priceDet)}
                    </CustomText>
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Meeting Note / Note Janjian */}
        {item.meetingNote && (
          <View style={styles.noteBox}>
            <Ionicons name="chatbox-ellipses-outline" size={14} color={theme.text.secondary} style={{ marginRight: 6, marginTop: 1 }} />
            <CustomText style={{ color: theme.text.secondary, fontSize: 12, flex: 1, fontStyle: 'italic' }}>
              Note COD: {item.meetingNote}
            </CustomText>
          </View>
        )}

        {/* Summary total */}
        <View style={styles.summaryRow}>
          <CustomText style={{ color: theme.text.secondary, fontSize: 13 }}>
            Total:
          </CustomText>
          <CustomText style={{ color: theme.text.primary, fontFamily: 'Barlow-Bold', fontSize: 16 }}>
            {formatCurrency(item.totalTrx)}
          </CustomText>
        </View>

        {/* Card Actions */}
        {(isPending || isAccepted) && (
          <View style={[styles.actionsRow, { borderTopColor: theme.border }]}>
            {isPending && (
              <>
                {isBuyerRole ? (
                  /* Buyer can cancel pending order */
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[styles.actionBtn, styles.btnOutline, { borderColor: Colors.semantic.error.main }]}
                    onPress={() => showAlert(
                      'warning',
                      locale === 'id' ? 'Batalkan Pemesanan' : 'Cancel Booking',
                      locale === 'id' ? 'Apakah Anda yakin ingin membatalkan pemesanan ini?' : 'Are you sure you want to cancel this booking?',
                      () => handleUpdateStatus(item.idTrans, 'Cancelled'),
                      locale === 'id' ? 'Ya, Batal' : 'Yes, Cancel'
                    )}
                  >
                    <CustomText style={[styles.btnText, { color: Colors.semantic.error.main }]}>
                      {locale === 'id' ? 'Batalkan' : 'Cancel'}
                    </CustomText>
                  </TouchableOpacity>
                ) : (
                  /* Seller can accept or reject pending order */
                  <View style={{ flexDirection: 'row', flex: 1, gap: 10 }}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={[styles.actionBtn, styles.btnOutline, { flex: 1, borderColor: Colors.semantic.error.main }]}
                      onPress={() => handleUpdateStatus(item.idTrans, 'Rejected')}
                    >
                      <CustomText style={[styles.btnText, { color: Colors.semantic.error.main }]}>
                        {locale === 'id' ? 'Tolak' : 'Reject'}
                      </CustomText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={[styles.actionBtn, { flex: 1, backgroundColor: Colors.primary.blue500 }]}
                      onPress={() => handleUpdateStatus(item.idTrans, 'Accepted')}
                    >
                      <CustomText style={[styles.btnText, { color: Colors.common.white }]}>
                        {locale === 'id' ? 'Terima' : 'Accept'}
                      </CustomText>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            {isAccepted && (
              <View style={{ flexDirection: 'row', flex: 1, gap: 10 }}>
                {/* Chat Partner WA */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[styles.actionBtn, styles.btnOutline, { flex: 1, borderColor: Colors.semantic.whatsapp }]}
                  onPress={() => handleContactWA(partner.name, partner.phone, item.details, item.totalTrx)}
                >
                  <Ionicons name="logo-whatsapp" size={16} color={Colors.semantic.whatsapp} style={{ marginRight: 6 }} />
                  <CustomText style={[styles.btnText, { color: Colors.semantic.whatsapp }]}>
                    WhatsApp
                  </CustomText>
                </TouchableOpacity>

                {/* Mark as Completed */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[styles.actionBtn, { flex: 1, backgroundColor: Colors.semantic.success.main }]}
                  onPress={() => showAlert(
                    'info',
                    locale === 'id' ? 'Transaksi Selesai' : 'Complete Transaction',
                    locale === 'id' ? 'Apakah Anda menyatakan COD telah berhasil dan transaksi selesai?' : 'Are you stating that COD succeeded and transaction is complete?',
                    () => handleUpdateStatus(item.idTrans, 'Completed'),
                    locale === 'id' ? 'Ya, Selesai' : 'Yes, Complete'
                  )}
                >
                  <Ionicons name="checkmark" size={16} color={Colors.common.white} style={{ marginRight: 4 }} />
                  <CustomText style={[styles.btnText, { color: Colors.common.white }]}>
                    {locale === 'id' ? 'Selesai COD' : 'Done COD'}
                  </CustomText>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const listData = activeTab === 'buyer' ? buyerTrans : sellerTrans;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Screen Header */}
      <Header title={locale === 'id' ? 'Riwayat Transaksi' : 'Transaction History'} noBorder={true} />

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <SegmentedControl
          tabs={[
            { key: 'buyer', label: locale === 'id' ? 'Pemesanan Saya' : 'My Bookings' },
            { key: 'seller', label: locale === 'id' ? 'Pesanan Masuk' : 'Incoming Orders' }
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
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
          contentContainerStyle={styles.listContent}
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
              title={locale === 'id' ? 'Tidak Ada Transaksi' : 'No Transactions'}
              description={locale === 'id' ? 'Riwayat transaksi Anda di status ini masih kosong.' : 'Your transaction history for this tab is empty.'}
              icon="receipt"
              style={{ marginTop: 60 }}
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
