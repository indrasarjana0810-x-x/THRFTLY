/* ==========================================
   Transaction Detail Screen
   ========================================== */
import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/colors';
import CustomText from '../components/CustomText';
import Avatar from '../components/Avatar';
import Header from '../components/Header';
import { Image } from 'expo-image';
import { formatCurrency } from '../utils/formatCurrency';
import { useLanguage } from '../localization/LanguageContext';

export default function TransactionDetailScreen({ route, navigation }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const { t, locale } = useLanguage();

  const { transaction, role } = route.params || {};

  if (!transaction) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <Header title={locale === 'id' ? 'Detail Transaksi' : 'Transaction Details'} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <CustomText style={{ color: theme.text.primary }}>
            {locale === 'id' ? 'Transaksi tidak ditemukan.' : 'Transaction not found.'}
          </CustomText>
        </View>
      </SafeAreaView>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return Colors.semantic.success.main;
      case 'Cancelled': return Colors.semantic.error.main;
      case 'Rejected': return Colors.semantic.error.main;
      case 'Accepted': return Colors.primary.blue500;
      default: return Colors.semantic.warning.main;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'Completed': return locale === 'id' ? 'Selesai' : 'Completed';
      case 'Cancelled': return locale === 'id' ? 'Dibatalkan' : 'Cancelled';
      case 'Rejected': return locale === 'id' ? 'Ditolak' : 'Rejected';
      case 'Accepted': return locale === 'id' ? 'Diterima' : 'Accepted';
      default: return locale === 'id' ? 'Menunggu' : 'Pending';
    }
  };

  const partner = role === 'buyer' ? transaction.seller : transaction.buyer;

  const cardShadow = {
    elevation: 4,
    shadowColor: Colors.primary.blue500,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.15 : 0.06,
    shadowRadius: 10,
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Header title={locale === 'id' ? 'Detail Transaksi' : 'Transaction Details'} noBorder={true} />
      
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24, paddingTop: 16 }}>
        
        {/* Single Receipt Card */}
        <View style={[styles.receiptCard, { backgroundColor: theme.surface, borderColor: theme.border }, cardShadow]}>
          
          {/* Tanggal & Status */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <View>
              <CustomText style={{ color: theme.text.secondary, fontSize: 13, marginBottom: 2 }}>
                {locale === 'id' ? 'Tanggal Transaksi' : 'Transaction Date'}
              </CustomText>
              <CustomText style={{ color: theme.text.primary, fontFamily: 'Barlow-Bold', fontSize: 14 }}>
                {new Date(transaction.transDate).toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US', {
                  year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </CustomText>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(transaction.status) + '15' }]}>
              <CustomText style={[styles.statusText, { color: getStatusColor(transaction.status), fontSize: 13 }]}>
                {getStatusLabel(transaction.status)}
              </CustomText>
            </View>
          </View>

          <View style={[styles.dashedDivider, { borderColor: theme.border }]} />

          {/* Info Partner */}
          <View style={styles.section}>
            <CustomText style={{ color: theme.text.secondary, fontSize: 13, marginBottom: 12 }}>
              {role === 'buyer' ? (locale === 'id' ? 'Informasi Penjual' : 'Seller Info') : (locale === 'id' ? 'Informasi Pembeli' : 'Buyer Info')}
            </CustomText>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Avatar name={partner?.name} imageUrl={partner?.profile} size={42} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <CustomText style={{ color: theme.text.primary, fontFamily: 'Barlow-Bold', fontSize: 15 }}>
                  {partner?.name || 'User'}
                </CustomText>
                <CustomText style={{ color: theme.text.secondary, fontSize: 13, marginTop: 2 }}>
                  {partner?.phone || '-'}
                </CustomText>
              </View>
            </View>
          </View>

          <View style={[styles.dashedDivider, { borderColor: theme.border }]} />

          {/* Detail Pesanan */}
          <View style={styles.section}>
            <CustomText style={[styles.sectionTitle, { color: theme.text.secondary, marginBottom: 12 }]}>
              {locale === 'id' ? 'Detail Pesanan' : 'Order Details'}
            </CustomText>
            <View style={{ gap: 12 }}>
              {transaction.details.map((detail, idx) => {
                const mainImg = detail.item?.imageUris && detail.item.imageUris.length > 0 ? detail.item.imageUris[0] : null;
                return (
                  <View key={idx} style={styles.itemRow}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => navigation.navigate('Detail', { id: detail.item?.idItem })}
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
          </View>

          {/* Meeting Note (Optional) */}
          {transaction.meetingNote && (
            <>
              <View style={[styles.dashedDivider, { borderColor: theme.border }]} />
              <View style={{ paddingVertical: 16 }}>
                <CustomText style={{ color: theme.text.secondary, fontSize: 13, marginBottom: 8 }}>
                  {locale === 'id' ? 'Catatan COD' : 'COD Notes'}
                </CustomText>
                <View style={[styles.noteBox, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)', borderWidth: 1, borderColor: theme.border, padding: 12, borderRadius: 8 }]}>
                  <Ionicons name="chatbox-ellipses-outline" size={16} color={theme.text.secondary} style={{ marginRight: 8, marginTop: 2 }} />
                  <CustomText style={{ color: theme.text.secondary, fontSize: 13, flex: 1, fontStyle: 'italic', lineHeight: 20 }}>
                    {transaction.meetingNote}
                  </CustomText>
                </View>
              </View>
            </>
          )}

          <View style={[styles.dashedDivider, { borderColor: theme.border }]} />

          {/* Total Belanja */}
          <View style={[styles.rowBetween, { paddingTop: 16 }]}>
            <CustomText style={{ color: theme.text.secondary, fontSize: 14, fontFamily: 'Barlow-Bold' }}>
              {locale === 'id' ? 'Total Belanja' : 'Total Price'}
            </CustomText>
            <CustomText style={[styles.totalPrice, { color: theme.text.primary, fontSize: 16 }]}>
              {formatCurrency(transaction.totalTrx)}
            </CustomText>
          </View>

        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  receiptCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  section: {
    paddingVertical: 16,
  },
  dashedDivider: {
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    marginHorizontal: -20,
  },
  solidDivider: {
    borderBottomWidth: 1,
    borderColor: 'rgba(150,150,150,0.1)',
    marginVertical: 16,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: 'Barlow-Bold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontFamily: 'Barlow-Black',
    fontSize: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  itemImgWrapper: {
    width: 54,
    height: 54,
    borderRadius: 10,
    overflow: 'hidden',
  },
  itemImg: {
    width: '100%',
    height: '100%',
  },
  itemPlaceholderImg: {
    width: 54,
    height: 54,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 14,
  },
  itemTitle: {
    fontFamily: 'Barlow-Bold',
    fontSize: 15,
  },
  itemCondition: {
    fontSize: 12,
    marginTop: 4,
  },
  itemPrice: {
    fontFamily: 'Barlow-Black',
    fontSize: 14,
    marginTop: 4,
  },
  totalPrice: {
    fontFamily: 'Barlow-Black',
    fontSize: 18,
  },
  noteBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
  },
});
