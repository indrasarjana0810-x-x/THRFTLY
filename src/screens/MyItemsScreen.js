/* ==========================================
   MyItems Screen Component
========================================== */
/* ---------- Imports ---------- */
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  ScrollView,
  StatusBar,
  Dimensions,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Switch,
  Alert,
  Modal,
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
import RangeSlider from '../components/RangeSlider';
import CustomToggle from '../components/CustomToggle';
import SegmentedControl from '../components/SegmentedControl';
import Header from '../components/Header';
import { useLanguage } from '../localization/LanguageContext';
import { useToast } from '../components/Toast';
import { formatCurrency } from '../utils/formatCurrency';
import { useIsFocused } from '@react-navigation/native';
import api from '../services/api';

const { width, height } = Dimensions.get('window');

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
  const { t, locale } = useLanguage();
  const { showToast } = useToast();
  const isFocused = useIsFocused();

  const [activeStatuses, setActiveStatuses] = useState({ Available: true, Booked: true, Sold: true });
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [sortBy, setSortBy] = useState('Newest');
  const [tempSortBy, setTempSortBy] = useState('Newest');
  const [tempActiveStatuses, setTempActiveStatuses] = useState({ Available: true, Booked: true, Sold: true });
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [tempMinPrice, setTempMinPrice] = useState('');
  const [tempMaxPrice, setTempMaxPrice] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [tempSelectedCategory, setTempSelectedCategory] = useState('All');
  const [isStatusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeFilterTab, setActiveFilterTab] = useState('Sort');

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);

  const [masterCategories, setMasterCategories] = useState([]);

  useEffect(() => {
    const fetchMasterCategories = async () => {
      try {
        const res = await api.categories.getActive();
        if (res && parseInt(res.status) === 200 && res.data) {
          const mapped = res.data.map(c => ({
            id: c.idCategory,
            name: c.name
          }));
          setMasterCategories(mapped);
        }
      } catch (error) {
        console.log("Error fetching master categories:", error);
      }
    };
    fetchMasterCategories();
  }, []);

  const openFilterModal = () => {
    setTempSortBy(sortBy);
    setTempActiveStatuses({...activeStatuses});
    setTempMinPrice(minPrice);
    setTempMaxPrice(maxPrice);
    setTempSelectedCategory(selectedCategory);
    setFilterModalVisible(true);
  };

  const loadMyItems = async () => {
    try {
      const res = await api.items.getMy();
      if (res && parseInt(res.status) === 200 && res.data) {
        setItems(res.data);
      }
    } catch (error) {
      console.log("Error loading my items:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLongPress = (id) => {
    setIsSelectionMode(true);
    if (!selectedItems.includes(id)) {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const toggleSelection = (id) => {
    if (selectedItems.includes(id)) {
      const newSel = selectedItems.filter(i => i !== id);
      setSelectedItems(newSel);
      if (newSel.length === 0) {
        setIsSelectionMode(false);
      }
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedItems.length === 0) return;
    Alert.alert(
      t('myitems.delete_title') || "Hapus Barang",
      (t('myitems.delete_confirm') || `Apakah Anda yakin ingin menghapus {count} barang terpilih?`).replace('{count}', selectedItems.length),
      [
        { text: t('postitem.cancel') || "Batal", style: "cancel" },
        { 
          text: t('myitems.btn_delete') || "Hapus", 
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await Promise.all(selectedItems.map(id => api.items.delete(id)));
              showToast((t('myitems.delete_success') || `{count} barang berhasil dihapus`).replace('{count}', selectedItems.length), 'success');
              setIsSelectionMode(false);
              setSelectedItems([]);
              loadMyItems();
            } catch (err) {
              console.log(err);
              showToast(t('myitems.delete_fail') || "Gagal menghapus beberapa barang", "danger");
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    if (isFocused) {
      loadMyItems();
    }
  }, [isFocused]);

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

  const filteredItems = items
    .filter(item => {
      const matchesTab = activeStatuses[item.status] === true;
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
      
      const itemPrice = item.price || 0;
      const matchesMin = minPrice === '' || itemPrice >= parseInt(minPrice);
      const matchesMax = maxPrice === '' || itemPrice <= parseInt(maxPrice);
      
      const matchesCategory = selectedCategory === 'All' || item.categoryId === selectedCategory;

      return matchesTab && matchesSearch && matchesMin && matchesMax && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'Newest') {
        const keyA = a.createdDate || a.idItem || '';
        const keyB = b.createdDate || b.idItem || '';
        return keyB.localeCompare(keyA);
      }
      if (sortBy === 'Oldest') {
        const keyA = a.createdDate || a.idItem || '';
        const keyB = b.createdDate || b.idItem || '';
        return keyA.localeCompare(keyB);
      }
      if (sortBy === 'PriceAsc') {
        return (a.price || 0) - (b.price || 0);
      }
      if (sortBy === 'PriceDesc') {
        return (b.price || 0) - (a.price || 0);
      }
      return 0;
    });

  const handleDelete = async (id) => {
    try {
      const res = await api.items.delete(id);
      if (res && parseInt(res.status) === 200) {
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
    const itemToEdit = items.find(i => (i.idItem || i.id) === id);
    if (itemToEdit) {
      navigation.navigate('PostItem', { editMode: true, item: itemToEdit });
    }
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

  const valMin = tempMinPrice ? parseInt(tempMinPrice) : 0;
  const valMax = tempMaxPrice ? parseInt(tempMaxPrice) : Infinity;
  const isPriceError = valMin > valMax;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />

      {/* ==========================================
         Header
      ========================================== */}
      <Header title={t('myitems.title') || 'Barang Saya'} onBack={() => navigation.goBack()} noBorder={true} />

      {/* ==========================================
         Search & Filter Row
      ========================================== */}
      <View style={styles.searchContainer}>
        <CustomInput
          iconName="search"
          placeholder={t('search.placeholder') || 'Cari barang di sini...'}
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
                onPress={openFilterModal}
              >
                <Ionicons 
                  name="options-outline" 
                  size={20} 
                  color={(!activeStatuses.Available || !activeStatuses.Booked || !activeStatuses.Sold || sortBy !== 'Newest' || minPrice !== '' || maxPrice !== '') ? Colors.primary.yellow500 : theme.text.primary} 
                />
              </TouchableOpacity>
            </View>
          }
        />
      </View>

      {/* ==========================================
         Unified Filter & Sort Modal (Centered Card Style)
      ========================================== */}
      <Modal
        visible={isFilterModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setFilterModalVisible(false)}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            style={{
              width: width * 0.85,
              backgroundColor: theme.surface,
              borderRadius: 24,
              paddingTop: 16,
              ...Shadows.primary
            }}
          >
            
            {/* Header Modal */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 }}>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)} style={{ width: 40 }}>
                <Ionicons name="close" size={22} color={theme.text.primary} />
              </TouchableOpacity>
              <CustomText variant="h2" style={{ color: theme.text.primary, fontSize: 16, fontFamily: 'Barlow-Bold' }}>Filter</CustomText>
              <TouchableOpacity onPress={() => { setTempSortBy('Newest'); setTempActiveStatuses({ Available: true, Booked: true, Sold: true }); setTempMinPrice(''); setTempMaxPrice(''); }} style={{ width: 40, alignItems: 'flex-end' }}>
                <Ionicons name="refresh" size={20} color={theme.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
              <SegmentedControl
                tabs={[
                  { key: 'Sort', label: locale === 'id' ? 'Urutkan' : 'Sort' },
                  { key: 'Filter', label: 'Filter' }
                ]}
                activeTab={activeFilterTab}
                onChange={setActiveFilterTab}
              />
            </View>

            {/* Edge-to-Edge Divider */}
            <View style={{ height: 1, backgroundColor: theme.border, width: '100%', marginBottom: 16 }} />

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: height * 0.55 }}>
              {activeFilterTab === 'Sort' ? (
                <View style={{ marginBottom: 24 }}>
                  {/* --- SECTION 1: URUTKAN --- */}
                  <CustomText variant="h3" style={{ fontSize: 14, fontFamily: 'Barlow-Bold', color: theme.text.primary, paddingHorizontal: 20, marginBottom: 10 }}>
                  {t('myitems.sort_time') || (locale === 'id' ? 'Urutkan Berdasarkan Waktu' : 'Sort by Time')}
                </CustomText>
                <View style={{ paddingHorizontal: 20 }}>
                  {[
                    { key: 'Newest', label: t('common.newest') || (locale === 'id' ? 'Terbaru' : 'Newest') },
                    { key: 'Oldest', label: t('common.oldest') || (locale === 'id' ? 'Terlama' : 'Oldest') },
                  ].map((option) => {
                    const isActive = tempSortBy === option.key;
                    return (
                      <TouchableOpacity
                        key={option.key}
                        activeOpacity={0.8}
                        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}
                        onPress={() => setTempSortBy(option.key)}
                      >
                        <Ionicons 
                          name={isActive ? "radio-button-on" : "radio-button-off"} 
                          size={22} 
                          color={isActive ? Colors.primary.blue500 : theme.text.placeholder} 
                        />
                        <CustomText style={{ marginLeft: 10, fontSize: 14, color: theme.text.primary, fontFamily: isActive ? 'Barlow-Bold' : 'Barlow-Medium' }}>
                          {option.label}
                        </CustomText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              ) : (
              <View>

              {/* --- SECTION 3: STATUS BARANG --- */}
              <View style={{ marginBottom: 24 }}>
                <CustomText variant="h3" style={{ fontSize: 14, fontFamily: 'Barlow-Bold', color: theme.text.primary, paddingHorizontal: 20, marginBottom: 10 }}>
                  {t('myitems.item_status') || (locale === 'id' ? 'Status Barang' : 'Item Status')}
                </CustomText>
                {['Available', 'Booked', 'Sold'].map((status) => (
                  <View key={status} style={{ paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <CustomText style={{ fontSize: 14, color: theme.text.primary, fontFamily: 'Barlow-Medium' }}>
                      {getStatusText(status)}
                    </CustomText>
                    <CustomToggle
                      onValueChange={(val) => setTempActiveStatuses(prev => ({ ...prev, [status]: val }))}
                      value={tempActiveStatuses[status] || false}
                      activeColor={Colors.primary.blue500}
                    />
                  </View>
                ))}
              </View>

              {/* --- SECTION 4: KATEGORI --- */}
              {masterCategories.length > 0 && (
                <View style={{ marginBottom: 24 }}>
                  <CustomText variant="h3" style={{ fontSize: 14, fontFamily: 'Barlow-Bold', color: theme.text.primary, paddingHorizontal: 20, marginBottom: 12 }}>
                    {t('common.category') || (locale === 'id' ? 'Kategori' : 'Category')}
                  </CustomText>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
                  >
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setTempSelectedCategory('All')}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor: tempSelectedCategory === 'All' ? Colors.primary.blue500 : theme.surface,
                        borderWidth: 1,
                        borderColor: tempSelectedCategory === 'All' ? Colors.primary.blue500 : theme.border,
                      }}
                    >
                      <CustomText style={{ color: tempSelectedCategory === 'All' ? Colors.light.surface : theme.text.primary, fontSize: 13, fontFamily: tempSelectedCategory === 'All' ? 'Barlow-Bold' : 'Barlow-Medium' }}>
                        {t('common.all') || (locale === 'id' ? 'Semua' : 'All')}
                      </CustomText>
                    </TouchableOpacity>
                    {masterCategories.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        activeOpacity={0.7}
                        onPress={() => setTempSelectedCategory(cat.id)}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 20,
                          backgroundColor: tempSelectedCategory === cat.id ? Colors.primary.blue500 : theme.surface,
                          borderWidth: 1,
                          borderColor: tempSelectedCategory === cat.id ? Colors.primary.blue500 : theme.border,
                        }}
                      >
                        <CustomText style={{ color: tempSelectedCategory === cat.id ? Colors.light.surface : theme.text.primary, fontSize: 13, fontFamily: tempSelectedCategory === cat.id ? 'Barlow-Bold' : 'Barlow-Medium' }}>
                          {t(`category.${cat.id.toLowerCase()}`) || cat.name}
                        </CustomText>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              </View>
              )}
            </ScrollView>

            {/* Apply Button */}
            <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
              <TouchableOpacity
                disabled={isPriceError}
                activeOpacity={0.8}
                onPress={() => {
                  setSortBy(tempSortBy);
                  setActiveStatuses(tempActiveStatuses);
                  setMinPrice(tempMinPrice);
                  setMaxPrice(tempMaxPrice);
                  setSelectedCategory(tempSelectedCategory);
                  setFilterModalVisible(false);
                }}
                style={{
                  backgroundColor: isPriceError ? theme.border : Colors.primary.yellow500,
                  borderRadius: 12,
                  height: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                  ...(isPriceError ? {} : Shadows.primary),
                }}
              >
                <CustomText type="body-bold" style={{ color: isPriceError ? theme.text.secondary : Colors.dark.background, fontSize: 14 }}>{locale === 'id' ? 'Terapkan Filter' : 'Apply Filter'}</CustomText>
              </TouchableOpacity>
            </View>

          </TouchableOpacity>
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
              <Ionicons name="cube-outline" size={64} color={Colors.primary.blue500} />
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
                icon={<Ionicons name="add-circle-outline" size={20} color={Colors.light.surface} />}
                onPress={() => navigation.navigate('PostItem')}
                style={{ width: '80%' }}
              />
            )}
          </View>
        ) : (
          <View style={styles.listWrapper}>
            {isSelectionMode && (
              <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => {
                  if (selectedItems.length === filteredItems.length) {
                    setSelectedItems([]);
                  } else {
                    setSelectedItems(filteredItems.map(i => i.idItem || i.id));
                  }
                }}
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 }}
              >
                <View style={{
                  width: 24, height: 24, borderRadius: 12, marginRight: 12,
                  backgroundColor: selectedItems.length === filteredItems.length ? Colors.primary.blue500 : theme.surface,
                  borderWidth: 2, borderColor: selectedItems.length === filteredItems.length ? Colors.primary.blue500 : theme.text.placeholder,
                  alignItems: 'center', justifyContent: 'center'
                }}>
                  {selectedItems.length === filteredItems.length && <Ionicons name="checkmark" size={16} color={Colors.common.white} />}
                </View>
                <CustomText type="h3" style={{ color: theme.text.primary, fontSize: 16 }}>
                  {selectedItems.length === filteredItems.length ? (t('myitems.deselect_all') || 'Batal Semua') : (t('myitems.select_all') || 'Pilih Semua')}
                </CustomText>
              </TouchableOpacity>
            )}
            {filteredItems.map((item) => {
              const itemId = item.idItem || item.id;
              const isSelected = selectedItems.includes(itemId);
              return (
              <TouchableOpacity
                key={itemId}
                activeOpacity={0.9}
                onLongPress={() => handleLongPress(itemId)}
                onPress={() => {
                  if (isSelectionMode) {
                    toggleSelection(itemId);
                  } else {
                    navigation.navigate('Detail', { id: itemId });
                  }
                }}
                style={[
                  styles.listItem,
                  {
                    backgroundColor: 'transparent',
                    borderColor: isSelected ? Colors.primary.blue500 : theme.border,
                    borderWidth: isSelected ? 2 : 1,
                    transform: isSelected ? [{ scale: 0.98 }] : [{ scale: 1 }],
                    ...Shadows.primary,
                  }
                ]}
              >
                {isSelectionMode && (
                  <View style={{
                    position: 'absolute', top: 10, left: 10, zIndex: 20,
                    width: 24, height: 24, borderRadius: 12,
                    backgroundColor: isSelected ? Colors.primary.blue500 : 'rgba(0,0,0,0.3)',
                    borderWidth: 2, borderColor: isSelected ? Colors.primary.blue500 : 'rgba(255,255,255,0.7)',
                    alignItems: 'center', justifyContent: 'center'
                  }}>
                    {isSelected && <Ionicons name="checkmark" size={16} color={Colors.common.white} />}
                  </View>
                )}
                {isSelected && (
                  <View style={[
                    StyleSheet.absoluteFillObject,
                    { backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)', zIndex: 15, borderRadius: 11 }
                  ]} pointerEvents="none" />
                )}
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

                    {/* Middle: Description & Category */}
                    <View style={{ marginBottom: 6 }}>
                      <CustomText numberOfLines={2} style={{ color: theme.text.secondary, fontSize: 12, fontFamily: 'Barlow-Regular', marginBottom: 4 }}>
                        {item.description || 'Tidak ada deskripsi yang tersedia.'}
                      </CustomText>
                      {item.categoryName && (
                        <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? theme.border : theme.background, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                          <Ionicons name="pricetag-outline" size={10} color={theme.text.secondary} style={{ marginRight: 4 }} />
                          <CustomText style={{ color: theme.text.secondary, fontSize: 10, fontFamily: 'Barlow-Medium' }}>
                            {item.categoryId ? (t(`category.${item.categoryId.toLowerCase()}`) || item.categoryName) : item.categoryName}
                          </CustomText>
                        </View>
                      )}
                    </View>
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
            )})}
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
                        if (res && parseInt(res.status) === 200) {
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

      {/* ==========================================
         Bottom Selection Bar
      ========================================== */}
      {isSelectionMode && (
        <View style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          backgroundColor: theme.surface,
          paddingHorizontal: 20, paddingTop: 16, paddingBottom: 30,
          borderTopWidth: 1, borderColor: theme.border,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          ...Shadows.medium
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity 
              activeOpacity={0.7} 
              onPress={() => {
                setIsSelectionMode(false);
                setSelectedItems([]);
              }}
              style={{ padding: 8, marginRight: 8, backgroundColor: theme.border, borderRadius: 20 }}
            >
              <Ionicons name="close" size={20} color={theme.text.primary} />
            </TouchableOpacity>
            <CustomText type="h3" style={{ color: theme.text.primary }}>
              {selectedItems.length} {t('myitems.selected') || 'terpilih'}
            </CustomText>
          </View>
          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={handleDeleteSelected}
            disabled={selectedItems.length === 0}
            style={{
              backgroundColor: selectedItems.length > 0 ? Colors.semantic.error.main : theme.border,
              paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
              flexDirection: 'row', alignItems: 'center', gap: 6
            }}
          >
            <Ionicons name="trash" size={16} color={selectedItems.length > 0 ? Colors.light.surface : theme.text.secondary} />
            <CustomText type="body-bold" style={{ color: selectedItems.length > 0 ? Colors.light.surface : theme.text.secondary }}>
              {t('myitems.btn_delete') || 'Hapus'}
            </CustomText>
          </TouchableOpacity>
        </View>
      )}
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
  bottomSheetMenu: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    ...Shadows.light,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: '45%',
    flexGrow: 1,
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
