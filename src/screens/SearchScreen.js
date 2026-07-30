/* ==========================================
   Komponen Layar Search
========================================== */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  useColorScheme,
  Keyboard,
  Dimensions,
  Modal,
  ScrollView,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/colors';
import ProductCard from '../components/ProductCard';
import EmptyState from '../components/EmptyState';
import CustomInput from '../components/CustomInput';
import RangeSlider from '../components/RangeSlider';
import CustomText from '../components/CustomText';
import { Shadows } from '../constants/styles';
import api from '../services/api';
import { useLanguage } from '../localization/LanguageContext';
import { useSelector } from 'react-redux';
import { selectAuthUser } from '../store/slices/authSlice';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');


const isCloseToBottom = ({ layoutMeasurement, contentOffset, contentSize }) => {
  const paddingToBottom = 50;
  return layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
};

export default function SearchScreen({ navigation, route }) {
  const { t } = useLanguage();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const user = useSelector(selectAuthUser);

  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState([]);
  
  // Use categoryId from params if provided, otherwise null
  const initialCategory = route?.params?.categoryId || null;
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);

  // If route params change (e.g. user clicks another category on home while search is open), update it
  useEffect(() => {
    if (route?.params?.categoryId) {
      setSelectedCategory(route.params.categoryId);
    }
  }, [route?.params?.categoryId]);
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          let location = await Location.getCurrentPositionAsync({});
          setUserLocation(location.coords);
        }
      } catch (e) {
        void 0;
      }
    })();
  }, []);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filter State
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [tempMinPrice, setTempMinPrice] = useState('');
  const [tempMaxPrice, setTempMaxPrice] = useState('');
  
  const [selectedCondition, setSelectedCondition] = useState('Semua');
  const [tempCondition, setTempCondition] = useState('Semua');

  const openFilterModal = () => {
    setTempMinPrice(minPrice);
    setTempMaxPrice(maxPrice);
    setTempCondition(selectedCondition);
    setFilterModalVisible(true);
  };

  const applyFilter = () => {
    setMinPrice(tempMinPrice);
    setMaxPrice(tempMaxPrice);
    setSelectedCondition(tempCondition);
    setFilterModalVisible(false);
  };

  const valMin = tempMinPrice ? parseInt(tempMinPrice) : 0;
  const valMax = tempMaxPrice ? parseInt(tempMaxPrice) : Infinity;
  const isPriceError = valMin > valMax;

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.categories.getActive();
        if (res && parseInt(res.status) === 200 && res.data) {
          const mapped = res.data.map(c => {
            let icon = 'grid-outline';
            if (c.idCategory === 'CAT01') icon = 'desktop-outline';
            else if (c.idCategory === 'CAT02') icon = 'book-outline';
            else if (c.idCategory === 'CAT03') icon = 'shirt-outline';
            else if (c.idCategory === 'CAT04') icon = 'football-outline';
            else if (c.idCategory === 'CAT05') icon = 'home-outline';
            else if (c.idCategory === 'CAT06') icon = 'car-outline';
            else if (c.idCategory === 'CAT07') icon = 'construct-outline';
            return {
              id: c.idCategory,
              name: c.name,
              icon: icon
            };
          });
          setCategories([
            { id: null, name: 'Semua', icon: 'apps-outline', isAll: true },
            ...mapped
          ]);
        }
      } catch (err) {
        void 0;
      }
    };
    fetchCategories();
  }, []);

  const loadItems = useCallback(async (isLoadMore = false, isRefreshing = false) => {
    if (loadingMore) return;
    
    let currentPage = 0;
    if (isLoadMore) {
      if (page + 1 >= totalPages) return;
      currentPage = page + 1;
      setLoadingMore(true);
    } else if (isRefreshing) {
      setRefreshing(true);
      currentPage = 0;
      setPage(0);
    } else {
      setLoading(true);
      currentPage = 0;
      setPage(0);
    }
    
    try {
      const params = { 
        page: currentPage, 
        size: 10, 
        category: selectedCategory,
        query: searchQuery 
      };

      if (minPrice !== '') params.minPrice = parseInt(minPrice);
      if (maxPrice !== '') params.maxPrice = parseInt(maxPrice);
      if (selectedCondition !== 'Semua') params.condition = selectedCondition;

      if (userLocation) {
        params.userLat = userLocation.latitude;
        params.userLng = userLocation.longitude;
      }

      const res = await api.items.getAll(params);
      if (res && parseInt(res.status) === 200 && res.data) {
        if (isLoadMore) {
          setItems(prev => [...prev, ...(res.data.content || [])]);
        } else {
          setItems(res.data.content || []);
        }
        setPage(res.data.currentPage || 0);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (error) {
      void 0;
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [loadingMore, page, totalPages, selectedCategory, searchQuery, minPrice, maxPrice, selectedCondition, userLocation]);

  const onRefresh = useCallback(() => {
    loadItems(false, true);
  }, [loadItems]);

  // Debounce search & filter query execution
  useEffect(() => {
    setLoading(true);
    setItems([]);
    const delayDebounceFn = setTimeout(() => {
      loadItems(false);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, selectedCategory, minPrice, maxPrice, selectedCondition]);

  const handleSearch = () => {
    Keyboard.dismiss();
    loadItems(false);
  };

  // Local filteredItems dihapus, data difilter langsung di backend


  const renderHeader = () => (
    <View style={{ marginBottom: 0 }}>
      {/* Categories Horizontal List */}
      <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>
        {t('search.categories') || 'Kategori'}
      </Text>
      <FlatList
        data={categories}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isSelected = selectedCategory === item.id;
          return (
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.categoryChip,
                { 
                  backgroundColor: isDark ? theme.surface : Colors.common.white,
                  borderWidth: 1,
                  borderColor: isDark ? theme.border : Colors.light.border,
                  ...Shadows.primary,
                  elevation: 2, // Slight elevation for default state
                },
                isSelected && { 
                  backgroundColor: Colors.primary.yellow500,
                  borderColor: Colors.primary.yellow500,
                  shadowColor: Colors.primary.yellow500,
                  shadowOpacity: 0.3,
                  elevation: 6, // Higher elevation when selected
                }
              ]}
              onPress={() => setSelectedCategory(isSelected ? null : item.id)}
            >
              <Ionicons 
                name={item.icon} 
                size={16} 
                color={isSelected ? Colors.common.black : (isDark ? Colors.light.surface : Colors.primary.blue500)} 
                style={{ marginRight: 6 }} 
              />
              <Text style={[
                styles.categoryText,
                { color: isDark ? Colors.light.surface : Colors.primary.blue500 },
                isSelected && { color: Colors.common.black, fontFamily: 'Barlow-Bold' }
              ]}>
                {item.isAll ? (t('search.all_categories') || 'Semua') : (item.id ? (t(`category.${item.id.toLowerCase()}`) || item.name) : item.name)}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
      <Text style={[styles.sectionTitle, { color: theme.text.primary, marginTop: 24, marginBottom: 0 }]}>
        {t('search.results') || 'Hasil Pencarian'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* Search Bar */}
      <View style={[styles.searchContainer, { borderBottomColor: theme.border, paddingBottom: 16 }]}>
        <CustomInput
          iconName="search"
          placeholder={t('search.placeholder') || 'Cari barang di sini...'}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
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
              <View style={{ width: 1, backgroundColor: theme.border, height: 16, marginHorizontal: 6 }} />
              <TouchableOpacity
                style={{ paddingVertical: 4, paddingHorizontal: 4 }}
                onPress={openFilterModal}
              >
                <Ionicons 
                  name="options-outline" 
                  size={20} 
                  color={(minPrice !== '' || maxPrice !== '' || selectedCondition !== 'Semua') ? Colors.primary.yellow500 : theme.text.primary} 
                />
              </TouchableOpacity>
            </View>
          }
        />
      </View>

      {/* Main Content */}
      {renderHeader()}
      {(() => {
        const filteredItems = items.filter(item => !user || item.sellerId !== user.idUser);
        return (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[
              filteredItems.length === 0 && { flexGrow: 1, justifyContent: 'center' }
            ]}
            showsVerticalScrollIndicator={false}
            onScroll={({ nativeEvent }) => {
              if (isCloseToBottom(nativeEvent)) {
                loadItems(true);
              }
            }}
            scrollEventThrottle={400}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[Colors.primary.blue500]}
                tintColor={Colors.primary.blue500}
              />
            }
          >
            {loading && items.length === 0 ? (
              <ActivityIndicator size="large" color={Colors.primary.blue500} style={{ marginTop: 40 }} />
            ) : filteredItems.length === 0 ? (
              <EmptyState
                title={t('search.empty_title') || 'Barang tidak ditemukan'}
                description={t('search.empty_desc') || 'Coba gunakan kata kunci lain atau pilih kategori yang berbeda.'}
                icon="search"
              />
            ) : (
              <View style={styles.masonryContainer}>
                <View style={styles.masonryColumn}>
                  {filteredItems.filter((_, i) => i % 2 === 0).map((item) => (
                    <ProductCard
                      key={item.idItem || item.id}
                      item={item}
                      onPress={() => navigation.navigate('Detail', { id: item.idItem || item.id })}
                      layout="masonry"
                      userLocation={userLocation}
                      style={{ marginBottom: 16 }}
                    />
                  ))}
                </View>
                <View style={styles.masonryColumn}>
                  {filteredItems.filter((_, i) => i % 2 !== 0).map((item) => (
                    <ProductCard
                      key={item.idItem || item.id}
                      item={item}
                      onPress={() => navigation.navigate('Detail', { id: item.idItem || item.id })}
                      layout="masonry"
                      userLocation={userLocation}
                      style={{ marginBottom: 16 }}
                    />
                  ))}
                </View>
              </View>
            )}
            {loadingMore && (
              <ActivityIndicator size="small" color={Colors.primary.blue500} style={{ padding: 20 }} />
            )}
            <View style={{ height: 100 }} />
          </ScrollView>
        );
      })()}

      {/* Filter Modal */}
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
              <CustomText variant="h2" style={{ color: theme.text.primary, fontSize: 16, fontFamily: 'Barlow-Bold' }}>{t('common.filter') || 'Filter'}</CustomText>
              <TouchableOpacity onPress={() => { setTempMinPrice(''); setTempMaxPrice(''); setTempCondition('Semua'); }} style={{ width: 40, alignItems: 'flex-end' }}>
                <Ionicons name="refresh" size={20} color={theme.text.primary} />
              </TouchableOpacity>
            </View>

            {/* Edge-to-Edge Divider */}
            <View style={{ height: 1, backgroundColor: theme.border, width: '100%', marginBottom: 16 }} />

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: Dimensions.get('window').height * 0.55 }}>
              <View style={{ paddingVertical: 20 }}>
                {/* Rentang Harga */}
                <CustomText variant="h3" style={{ fontSize: 14, fontFamily: 'Barlow-Bold', color: theme.text.primary, paddingHorizontal: 20, marginBottom: 10 }}>
                  {t('search.price_range') || 'Rentang Harga'}
                </CustomText>
                
                <View style={{ paddingHorizontal: 24, marginTop: 10, marginBottom: 16 }}>
                  <RangeSlider
                    min={0}
                    max={10000000}
                    step={50000}
                    initialLow={parseInt(tempMinPrice) || 0}
                    initialHigh={parseInt(tempMaxPrice) || 10000000}
                    theme={theme}
                    activeColor={Colors.primary.blue500}
                    onValueChanged={(low, high) => {
                      setTempMinPrice(low.toString());
                      setTempMaxPrice(high.toString());
                    }}
                  />
                </View>

                <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 12, alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <CustomInput
                      placeholder={t('common.min') || "Min"}
                      value={tempMinPrice ? tempMinPrice.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''}
                      onChangeText={(text) => setTempMinPrice(text.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                      inputStyle={{ textAlign: 'right', height: 44, paddingHorizontal: 12, fontSize: 13 }}
                      wrapperStyle={{
                        paddingLeft: 0,
                        paddingVertical: 0,
                        height: 44,
                        overflow: 'hidden',
                        marginBottom: 0,
                      }}
                      leftComponent={
                        <View style={{
                          backgroundColor: Colors.primary.blue500,
                          paddingHorizontal: 14,
                          height: 44,
                          justifyContent: 'center',
                          borderTopLeftRadius: 10,
                          borderBottomLeftRadius: 10,
                        }}>
                          <CustomText type="body-bold" style={{ color: Colors.light.surface, fontSize: 12, marginTop: Platform.OS === 'ios' ? 2 : 0 }}>
                            Rp
                          </CustomText>
                        </View>
                      }
                    />
                  </View>
                  <CustomText style={{ color: theme.text.secondary, fontSize: 14, marginBottom: 0 }}>-</CustomText>
                  <View style={{ flex: 1 }}>
                    <CustomInput
                      placeholder={t('common.max') || "Max"}
                      value={tempMaxPrice ? tempMaxPrice.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''}
                      onChangeText={(text) => setTempMaxPrice(text.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                      inputStyle={{ textAlign: 'right', height: 44, paddingHorizontal: 12, fontSize: 13 }}
                      wrapperStyle={{
                        paddingLeft: 0,
                        paddingVertical: 0,
                        height: 44,
                        overflow: 'hidden',
                        marginBottom: 0,
                      }}
                      leftComponent={
                        <View style={{
                          backgroundColor: Colors.primary.blue500,
                          paddingHorizontal: 14,
                          height: 44,
                          justifyContent: 'center',
                          borderTopLeftRadius: 10,
                          borderBottomLeftRadius: 10,
                        }}>
                          <CustomText type="body-bold" style={{ color: Colors.light.surface, fontSize: 12, marginTop: Platform.OS === 'ios' ? 2 : 0 }}>
                            Rp
                          </CustomText>
                        </View>
                      }
                    />
                  </View>
                </View>
                {isPriceError && (
                  <View style={{ paddingHorizontal: 20, marginTop: 12, flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="warning" size={14} color={Colors.semantic.error.main} style={{ marginRight: 6 }} />
                    <CustomText style={{ color: Colors.semantic.error.main, fontSize: 12, fontFamily: 'Barlow-Medium' }}>
                      {t('myitems.error_price') || 'Batas minimum tidak boleh melebihi maksimum.'}
                    </CustomText>
                  </View>
                )}

                {/* Kondisi Barang */}
                <View style={{ marginTop: 24 }}>
                  <CustomText variant="h3" style={{ fontSize: 14, fontFamily: 'Barlow-Bold', color: theme.text.primary, paddingHorizontal: 20, marginBottom: 12 }}>
                    {t('search.condition') || 'Kondisi Barang'}
                  </CustomText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
                    {['Semua', 'Sangat Baik', 'Baik', 'Kurang'].map(cond => (
                      <TouchableOpacity
                        key={cond}
                        activeOpacity={0.8}
                        onPress={() => setTempCondition(cond)}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 20,
                          backgroundColor: tempCondition === cond ? Colors.primary.blue500 : theme.surface,
                          borderWidth: 1,
                          borderColor: tempCondition === cond ? Colors.primary.blue500 : theme.border,
                        }}
                      >
                        <CustomText style={{
                          fontSize: 13,
                          color: tempCondition === cond ? Colors.light.surface : theme.text.primary,
                          fontFamily: tempCondition === cond ? 'Barlow-Bold' : 'Barlow-Medium',
                        }}>
                          {cond === 'Semua' ? (t('search.cond_all') || 'Semua') : 
                           cond === 'Sangat Baik' ? (t('postitem.cond_vg') || 'Sangat Baik') :
                           cond === 'Baik' ? (t('postitem.cond_good') || 'Baik') :
                           (t('postitem.cond_poor') || 'Kurang')}
                        </CustomText>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </ScrollView>

            {/* Apply Button */}
            <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
              <TouchableOpacity
                disabled={isPriceError}
                activeOpacity={0.8}
                onPress={applyFilter}
                style={{
                  backgroundColor: isPriceError ? theme.border : Colors.primary.yellow500,
                  borderRadius: 12,
                  height: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                  ...(isPriceError ? {} : Shadows.primary),
                }}
              >
                <CustomText type="body-bold" style={{ color: isPriceError ? theme.text.secondary : Colors.dark.background, fontSize: 14 }}>
                  {t('common.apply_filter') || 'Terapkan Filter'}
                </CustomText>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  masonryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 16,
  },
  safeArea: {
    flex: 1,
  },
  masonryColumn: {
    width: '48%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyButton: {
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  clearIcon: {
    marginLeft: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Barlow-Regular',
    fontSize: 15,
  },
  sectionTitle: {
    fontFamily: 'Barlow-Bold',
    fontSize: 18,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  categoryList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryText: {
    fontFamily: 'Barlow-Medium',
    fontSize: 14,
  },
  listContent: {
    flexGrow: 1,
    paddingTop: 16,
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  cardWrapper: {
    width: (width - 40 - 16) / 2, // 2 columns, 40 total side padding, 16 gap
  }
});
