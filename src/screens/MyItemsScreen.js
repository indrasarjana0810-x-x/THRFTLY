/* ==========================================
   MyItems Screen Component
========================================== */
/* ---------- Imports ---------- */
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  ScrollView,
  StatusBar,
  Dimensions,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/colors';
import { Shadows } from '../constants/styles';
import CustomText from '../components/CustomText';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import ProductCard from '../components/ProductCard';
import Header from '../components/Header';
import { useLanguage } from '../localization/LanguageContext';
import { useToast } from '../components/Toast';
import { formatCurrency } from '../utils/formatCurrency';
import api from '../services/api';

const { width } = Dimensions.get('window');

/**
 * MyItemsScreen
 * Halaman untuk menampilkan daftar barang milik pengguna sendiri.
 * Mendukung filter status barang (Tersedia, Dipesan, Terjual) dan aksi ubah/hapus.
 */

// Menggunakan ID dari script SQL kita: ITM20260705001 dan ITM20260705002
const MOCK_MY_ITEMS = [
  {
    id: 'ITM20260705001',
    title: 'Buku Kalkulus Purcell Ed. 9',
    price: 150000,
    condition: 'Sangat Baik',
    location: 'Lobi Gedung B',
    status: 'Available', // Available, Booked, Sold
    image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=800&auto=format&fit=crop',
    isHot: false,
  },
  {
    id: 'ITM20260705002',
    title: 'Kemeja Flanel Uniqlo Size L',
    price: 80000,
    condition: 'Baik',
    location: 'Parkiran Motor',
    status: 'Booked',
    image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=800&auto=format&fit=crop',
    isHot: false,
  },
  {
    id: 'ITM20260705003',
    title: 'Earphone TWS Baseus',
    price: 120000,
    condition: 'Baru',
    location: 'Kantin Gedung A',
    status: 'Sold',
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?q=80&w=800&auto=format&fit=crop',
    isHot: false,
  }
];

const TABS = ['All', 'Available', 'Booked', 'Sold'];

export default function MyItemsScreen({ navigation }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('All');
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [isStatusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const loadMyItems = async () => {
    try {
      const statusParam = activeTab === 'All' ? null : activeTab;
      const res = await api.items.getMy(statusParam);
      if (res && res.status === "200" && res.items) {
        setItems(res.items);
      }
    } catch (error) {
      console.log("Error loading my items:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMyItems();
  }, [activeTab]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadMyItems();
  };

  const handleOpenStatusModal = (item) => {
    setSelectedItem(item);
    setStatusModalVisible(true);
  };

  const getTabLabel = (tab) => {
    switch (tab) {
      case 'All': return t('myitems.tab_all') || 'Semua';
      case 'Available': return t('myitems.tab_available') || 'Tersedia';
      case 'Booked': return t('myitems.tab_booked') || 'Dipesan';
      case 'Sold': return t('myitems.tab_sold') || 'Terjual';
      default: return tab;
    }
  };

  const filteredItems = items.filter(item => {
    const matchesTab = activeTab === 'All' || item.status === activeTab;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleDelete = async (id) => {
    try {
      const res = await api.items.delete(id);
      if (res && res.status === "200") {
        setItems(items.filter(item => (item.idItem || item.id) !== id));
        showToast(t('common.success') || 'Barang berhasil dihapus!', 'success');
      } else {
        showToast(res.message || "Gagal menghapus barang", "danger");
      }
    } catch (error) {
      console.log("Error deleting item:", error);
      showToast("Gagal terhubung ke server", "danger");
    }
  };

  const handleEdit = (id) => {
    showToast(t('placeholder.coming_soon') || 'Coming soon...', 'info');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Available': return Colors.semantic.success.main;
      case 'Booked': return Colors.semantic.warning.main;
      case 'Sold': return Colors.semantic.error.main;
      default: return theme.text.secondary;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'Available': return t('status.available') || 'Tersedia';
      case 'Booked': return t('status.booked') || 'Dipesan';
      case 'Sold': return t('status.sold') || 'Terjual';
      default: return status;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />

      {/* ==========================================
         Header
      ========================================== */}
      <Header title={t('myitems.title') || 'Barang Saya'} onBack={() => navigation.goBack()} />

      {/* ==========================================
         Search & Filter Row
      ========================================== */}
      <View style={styles.searchContainer}>
        <CustomInput
          iconName="search"
          placeholder={t('nav.search') || 'Cari barang...'}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={{ marginBottom: 0 }}
          wrapperStyle={{
            height: 40,
            paddingVertical: 0,
            borderRadius: 10,
            borderWidth: 1.2,
          }}
          inputStyle={{
            fontSize: 13,
            height: 40,
          }}
          rightComponent={
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={{ marginRight: 6, padding: 2 }}>
                  <Ionicons name="close-circle" size={18} color={theme.text.secondary} />
                </TouchableOpacity>
              )}
              <View style={[styles.filterDivider, { backgroundColor: theme.border, height: 16 }]} />
              <TouchableOpacity
                style={[styles.filterButtonInside, { paddingVertical: 4 }]}
                onPress={() => setFilterModalVisible(true)}
              >
                <Ionicons name="options-outline" size={20} color={activeTab !== 'All' ? Colors.primary.yellow500 : theme.text.primary} />
              </TouchableOpacity>
            </View>
          }
        />
      </View>

      {/* ==========================================
         Filter Modal
      ========================================== */}
      <Modal
        visible={isFilterModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setFilterModalVisible(false)}>
          <View style={[styles.dropdownMenu, { backgroundColor: theme.surface }]}>
            <CustomText variant="h3" style={[styles.dropdownTitle, { color: theme.text.primary }]}>
              Pilih Status
            </CustomText>
            {TABS.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.dropdownOption, isActive && { backgroundColor: theme.background }]}
                  onPress={() => {
                    setActiveTab(tab);
                    setFilterModalVisible(false);
                  }}
                >
                  <CustomText
                    variant="body"
                    style={{
                      color: isActive ? Colors.primary.yellow500 : theme.text.primary,
                      fontFamily: isActive ? 'Barlow-Bold' : 'Barlow-Medium'
                    }}
                  >
                    {getTabLabel(tab)}
                  </CustomText>
                  {isActive && <Ionicons name="checkmark" size={20} color={Colors.primary.yellow500} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ==========================================
         Items List
      ========================================== */}
      <ScrollView 
        contentContainerStyle={styles.listContainer} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary.blue500]}
            tintColor={Colors.primary.blue500}
          />
        }
      >
        {loading ? (
          <View style={{ paddingVertical: 80, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={Colors.primary.blue500} />
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrapper}>
              <Ionicons name="pricetags-outline" size={64} color={Colors.primary.blue500} />
            </View>
            <CustomText variant="h2" style={{ color: theme.text.primary, marginBottom: 8, textAlign: 'center' }}>
              {t('myitems.empty_title')}
            </CustomText>
            <CustomText variant="body" style={{ color: theme.text.secondary, textAlign: 'center', marginBottom: 24, paddingHorizontal: 20 }}>
              {searchQuery ? t('myitems.empty_search') : t('myitems.empty_state')}
            </CustomText>

            {!searchQuery && (
              <CustomButton
                title={t('myitems.start_selling')}
                type="primary"
                icon={<Ionicons name="add-circle-outline" size={20} color="#FFF" />}
                onPress={() => navigation.navigate('PostItem')}
                style={{ width: '80%' }}
              />
            )}
          </View>
        ) : (
          <View style={styles.listWrapper}>
            {filteredItems.map((item) => (
              <TouchableOpacity
                key={item.idItem || item.id}
                activeOpacity={0.9}
                onPress={() => navigation.navigate('Detail', { id: item.idItem || item.id })}
                style={[
                  styles.listItem,
                  {
                    backgroundColor: 'transparent',
                    borderColor: theme.border,
                    ...Shadows.primary,
                  }
                ]}
              >
                <Image 
                  source={{ uri: (item.imageUris && item.imageUris.length > 0) ? item.imageUris[0] : item.image }} 
                  style={styles.listImage} 
                  transition={200}
                />
                <BlurView
                  intensity={isDark ? 40 : 80}
                  tint={isDark ? 'dark' : 'light'}
                  experimentalBlurMethod="dimezisBlurView"
                  style={[styles.listContent, { backgroundColor: isDark ? 'rgba(30,41,59,0.5)' : 'rgba(255,255,255,0.6)' }]}
                >
                  {/* Group 1: Title & Description */}
                  <View style={{ width: '100%' }}>
                    {/* Top row: Name (left) & Status (right) */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 4 }}>
                      <CustomText variant="body-bold" numberOfLines={1} style={{ color: theme.text.primary, flex: 1, marginRight: 8, fontSize: 15 }}>
                        {item.title}
                      </CustomText>
                      <TouchableOpacity 
                        activeOpacity={0.7}
                        onPress={() => handleOpenStatusModal(item)}
                        style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15', flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 3 }]}
                      >
                        <CustomText style={{ color: getStatusColor(item.status), fontSize: 10, fontFamily: 'Barlow-Bold' }}>
                          {getStatusText(item.status)}
                        </CustomText>
                        <Ionicons name="chevron-down" size={8} color={getStatusColor(item.status)} />
                      </TouchableOpacity>
                    </View>

                    {/* Middle: Description */}
                    <CustomText numberOfLines={2} style={{ color: theme.text.secondary, fontSize: 12, fontFamily: 'Barlow-Regular' }}>
                      {item.description || 'Tidak ada deskripsi.'}
                    </CustomText>
                  </View>

                  {/* Bottom: Price */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <CustomText style={{ color: Colors.primary.blue500, fontFamily: 'Barlow-Bold', fontSize: 14 }}>
                      {formatCurrency(item.price)}
                    </CustomText>
                    <Ionicons name="chevron-forward" size={14} color={theme.text.secondary} />
                  </View>
                </BlurView>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ==========================================
         Status Update Modal
      ========================================== */}
      <Modal
        visible={isStatusModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setStatusModalVisible(false)}>
          <View style={[styles.dropdownMenu, { backgroundColor: theme.surface }]}>
            <CustomText variant="h3" style={[styles.dropdownTitle, { color: theme.text.primary, paddingHorizontal: 20 }]}>
              Ubah Status Barang
            </CustomText>
            {['Available', 'Booked', 'Sold'].map((statusOption) => {
              const isActive = selectedItem?.status === statusOption;
              return (
                <TouchableOpacity
                  key={statusOption}
                  style={[styles.dropdownOption, isActive && { backgroundColor: theme.background }]}
                  onPress={async () => {
                    if (selectedItem) {
                      try {
                        const res = await api.items.updateStatus(selectedItem.idItem || selectedItem.id, statusOption);
                        if (res && res.status === "200") {
                          setItems(items.map(it => {
                            if ((it.idItem || it.id) === (selectedItem.idItem || selectedItem.id)) {
                              return { ...it, status: statusOption };
                            }
                            return it;
                          }));
                          showToast('Status barang berhasil diperbarui', 'success');
                        } else {
                          showToast(res.message || 'Gagal merubah status', 'danger');
                        }
                      } catch (error) {
                        console.log("Error updating status:", error);
                        showToast("Gagal terhubung ke server", "danger");
                      }
                    }
                    setStatusModalVisible(false);
                  }}
                >
                  <CustomText
                    variant="body"
                    style={{
                      color: isActive ? Colors.primary.yellow500 : theme.text.primary,
                      fontFamily: isActive ? 'Barlow-Bold' : 'Barlow-Medium'
                    }}
                  >
                    {getStatusText(statusOption)}
                  </CustomText>
                  {isActive && <Ionicons name="checkmark" size={20} color={Colors.primary.yellow500} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingLeft: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Barlow-Medium',
    fontSize: 16,
    height: '100%',
  },
  filterDivider: {
    width: 1,
    height: 24,
  },
  filterButtonInside: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    marginTop: 40,
  },
  emptyIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary.blue500 + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  dropdownMenu: {
    width: width * 0.8,
    borderRadius: 16,
    paddingVertical: 16,
    ...Shadows.light,
  },
  dropdownTitle: {
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listWrapper: {
    flex: 1,
    gap: 12,
  },
  listItem: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    height: 120,
  },
  listImage: {
    width: 100,
    height: '100%',
    borderTopLeftRadius: 11,
    borderBottomLeftRadius: 11,
  },
  listContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
    borderTopRightRadius: 11,
    borderBottomRightRadius: 11,
    overflow: 'hidden',
  },
  listBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  actionRowList: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
