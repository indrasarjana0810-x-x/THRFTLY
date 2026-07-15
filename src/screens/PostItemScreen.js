import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ActivityIndicator,
  Animated,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Colors from '../constants/colors';
import { Shadows } from '../constants/styles';
import CustomText from '../components/CustomText';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import Header from '../components/Header';
import SelectionModal from '../components/SelectionModal';
import CustomAlert from '../components/CustomAlert';
import Panel from '../components/Panel';
import { useToast } from '../components/Toast';
import { useLanguage } from '../localization/LanguageContext';
import SegmentedControl from '../components/SegmentedControl';
import { formatCurrency } from '../utils/formatCurrency';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToSupabase } from '../services/supabase';
import api from '../services/api';

/* ==========================================
   Post Item Screen Component
========================================== */
/**
 * PostItemScreen
 * Halaman untuk menambahkan barang baru (listing).
 * Dilengkapi pembagian tab informasi barang & koordinat COD.
 */
export default function PostItemScreen({ navigation }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const { showToast } = useToast();
  const { t, locale } = useLanguage();

  const [activeTab, setActiveTab] = useState('media'); // 'media' | 'detail'

  /* ---------- Form State ---------- */
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(null);
  const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);
  const [condition, setCondition] = useState('Baik');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [imageUris, setImageUris] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.categories.getActive();
        if (res && res.status === "200" && res.categories) {
          const mapped = res.categories.map(c => {
            let icon = 'grid';
            if (c.idCategory === 'CAT01') icon = 'desktop';
            else if (c.idCategory === 'CAT02') icon = 'book';
            else if (c.idCategory === 'CAT03') icon = 'pencil';
            else if (c.idCategory === 'CAT04') icon = 'shirt';
            else if (c.idCategory === 'CAT05') icon = 'flask';
            else if (c.idCategory === 'CAT06') icon = 'home';
            else if (c.idCategory === 'CAT07') icon = 'football';
            
            return {
              id: c.idCategory,
              label: c.name,
              icon: icon
            };
          });
          setCategories(mapped);
        }
      } catch (error) {
        console.log("Error fetching categories:", error);
      }
    };
    fetchCategories();
  }, []);
  const [loading, setLoading] = useState(false);
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [isImageModalVisible, setImageModalVisible] = useState(false);
  const [isLocationPermAlertVisible, setLocationPermAlertVisible] = useState(false);

  const scrollViewRef = useRef(null);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  const handlePickImage = () => {
    if (imageUris.length >= 5) {
      showToast(t('postitem.photo_subtitle') || "Maksimal 5 foto barang!", "danger");
      return;
    }
    setImageModalVisible(true);
  };

  const executeImagePick = async (source) => {
    setImageModalVisible(false);
    try {
      let result;
      if (source === 'kamera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          showToast('Izin kamera diperlukan.', 'warning');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.7,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          showToast('Izin galeri diperlukan.', 'warning');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.7,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const fileUri = result.assets[0].uri;
        setImageUris(prev => [...prev, fileUri]);
      }
    } catch (error) {
      console.log('Error picking image:', error);
      showToast('Gagal memproses gambar.', 'danger');
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setImageUris(imageUris.filter((_, index) => index !== indexToRemove));
  };

  const handleMoveLeft = (indexToMove) => {
    if (indexToMove > 0) {
      const newUris = [...imageUris];
      const temp = newUris[indexToMove - 1];
      newUris[indexToMove - 1] = newUris[indexToMove];
      newUris[indexToMove] = temp;
      setImageUris(newUris);
    }
  };

  const handlePostItem = async () => {
    if (!title || !price || !category || !condition || !description || !location || imageUris.length === 0) {
      showToast("Nama barang, Harga, Kategori, Kondisi, Deskripsi, Lokasi, dan minimal 1 Foto wajib diisi!", "danger");
      return;
    }
    setLoading(true);
    try {
      // Upload all local images to Supabase first
      const uploadedUrls = [];
      for (let i = 0; i < imageUris.length; i++) {
        const localUri = imageUris[i];
        if (localUri.startsWith('http')) {
          uploadedUrls.push(localUri);
        } else {
          const publicUrl = await uploadImageToSupabase(localUri, 'items');
          uploadedUrls.push(publicUrl);
        }
      }

      const payload = {
        title,
        price: parseFloat(price),
        category: category.id,
        condition,
        description,
        locationName: location,
        latitude: latitude ? parseFloat(latitude.toFixed(8)) : null,
        longitude: longitude ? parseFloat(longitude.toFixed(8)) : null,
        status: "Available",
        imageUris: uploadedUrls
      };
      
      const res = await api.items.create(payload);
      if (res && res.status === "200") {
        showToast("Barang berhasil diposting!", "success");
        navigation.goBack();
      } else {
        showToast(res.message || "Gagal memposting barang", "danger");
      }
    } catch (error) {
      console.log("Error posting item:", error);
      showToast("Gagal mengunggah foto atau menyimpan data", "danger");
    } finally {
      setLoading(false);
    }
  };

  const handleFetchLocation = async () => {
    try {
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        executeFetchLocation();
      } else {
        setLocationPermAlertVisible(true);
      }
    } catch (e) {
      showToast(t('postitem.toast_location_error') || "Terjadi kesalahan saat memeriksa izin lokasi.", "danger");
    }
  };

  const executeFetchLocation = async () => {
    setIsFetchingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast("Izin akses lokasi ditolak, koordinat tidak disimpan.", "danger");
        setIsFetchingLocation(false);
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);
    } catch (error) {
      showToast("Gagal mengambil lokasi.", "danger");
    } finally {
      setIsFetchingLocation(false);
    }
  };

  const renderContent = () => (
    <>
      {/* ==========================================
         Segmented Control (Media vs Detail)
      ========================================== */}
      <View style={styles.segmentContainer}>
        <SegmentedControl
          tabs={[
            { key: 'media', label: t('postitem.media') || 'Media & Lokasi' },
            { key: 'detail', label: t('postitem.detail') || 'Detail Barang' }
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
          friction={10}
          tension={50}
        />
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === 'detail' ? (
          <View style={styles.tabContent}>
            <CustomInput
              label={t('postitem.name_label') || "Nama Barang"}
              placeholder={t('postitem.name_placeholder') || "Contoh: Kemeja Flanel Kotak-kotak"}
              value={title}
              onChangeText={setTitle}
              iconName="cube"
              isRequired={true}
            />

            {/* ---------- Harga Input ---------- */}
            <CustomInput
              label={t('postitem.price_label') || "Harga Barang"}
              placeholder=""
              value={price ? price.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''}
              onChangeText={(text) => {
                // Strip semua non-angka dan titik separator, lalu simpan nilai numerik murni
                const numericValue = text.replace(/[^0-9]/g, '');
                setPrice(numericValue);
              }}
              keyboardType="numeric"
              isRequired={true}
              inputStyle={{ textAlign: 'right', height: 48, paddingHorizontal: 14 }}
              wrapperStyle={{
                paddingLeft: 0,
                paddingVertical: 0,
                height: 48,
                overflow: 'hidden',
              }}
              leftComponent={
                <View style={{
                  backgroundColor: Colors.primary.blue500,
                  paddingHorizontal: 18,
                  height: 48,
                  justifyContent: 'center',
                  borderTopLeftRadius: 10,
                  borderBottomLeftRadius: 10,
                }}>
                  <CustomText type="body-bold" style={{ color: '#FFF', marginTop: Platform.OS === 'ios' ? 2 : 0 }}>
                    Rp
                  </CustomText>
                </View>
              }
            />

            {/* ---------- Kategori Picker ---------- */}
            <TouchableOpacity activeOpacity={0.8} onPress={() => setCategoryModalVisible(true)}>
              <View pointerEvents="none">
                <CustomInput
                  label={t('postitem.category_label') || "Kategori"}
                  placeholder={t('postitem.select_category') || "Pilih Kategori Barang"}
                  value={category ? category.label : ''}
                  iconName="grid"
                  editable={false}
                  isRequired={true}
                  rightComponent={
                    <Ionicons name="chevron-forward" size={18} color={theme.text.secondary} style={{ marginLeft: 8 }} />
                  }
                />
              </View>
            </TouchableOpacity>

             {/* ---------- Kondisi Barang Pills ---------- */}
            <View style={styles.inputContainer}>
              <CustomText type="label" style={[styles.inputLabel, { color: theme.text.secondary }]}>
                {t('postitem.condition_label') || 'Kondisi Barang'}
                <CustomText style={{ color: Colors.semantic.error.main }}> *</CustomText>
              </CustomText>
              <View style={styles.pillRow}>
                {['Baru', 'Sangat Baik', 'Baik', 'Kurang'].map((cond) => {
                  const isSelected = condition === cond;
                  return (
                    <TouchableOpacity
                      key={cond}
                      style={[
                        styles.pill,
                        {
                          backgroundColor: isSelected ? Colors.primary.blue500 : (isDark ? '#1E293B' : '#F5F5F5'),
                          borderWidth: 1.5,
                          borderColor: isSelected ? Colors.primary.blue500 : theme.border,
                          ...(isSelected ? Shadows.primary : Shadows.light)
                        }
                      ]}
                      onPress={() => setCondition(cond)}
                    >
                      <CustomText
                        type="label"
                        style={{ color: isSelected ? '#FFF' : theme.text.secondary }}
                      >
                        {cond}
                      </CustomText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
 
            <CustomInput
              label={t('postitem.description_label') || "Deskripsi Barang"}
              placeholder={t('postitem.description_placeholder') || "Jelaskan kondisi barang, minus (jika ada), alasan dijual, dll..."}
              value={description}
              onChangeText={setDescription}
              multiline={true}
              numberOfLines={4}
              textAlignVertical="top"
              containerStyle={{ marginBottom: 0 }}
              inputStyle={{ height: 100, paddingTop: 12 }}
              isRequired={true}
              onFocus={() => {
                requestAnimationFrame(() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 50);
                });
              }}
            />
          </View>
        ) : (
          <View style={[styles.tabContent, { paddingHorizontal: 4 }]}>

            {/* ==========================================
               Media & Lokasi Pertemuan (Unified Panel Card)
            ========================================== */}
            <Panel style={{ padding: 20, marginBottom: 20 }}>
              {/* ---------- SECTION 1: FOTO BARANG ---------- */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.semantic.success.main + '15', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name="images" size={20} color={Colors.semantic.success.main} />
                </View>
                <View style={{ flex: 1 }}>
                  <CustomText type="h3" style={{ color: theme.text.heading }}>{t('postitem.photo_title') || 'Foto Barang'}</CustomText>
                  <CustomText type="caption" style={{ color: theme.text.secondary }}>{t('postitem.photo_subtitle') || 'Upload maksimal 5 foto asli'}</CustomText>
                </View>
                <View style={{ backgroundColor: theme.border, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                  <CustomText type="body-bold" style={{ color: theme.text.primary, fontSize: 12 }}>
                    {imageUris.length}/5
                  </CustomText>
                </View>
              </View>
 
              {/* ---------- Upload Box ---------- */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={{
                  height: 120,
                  borderWidth: 2,
                  borderStyle: 'dashed',
                  borderColor: isDark ? theme.text.placeholder : theme.border,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isDark ? theme.border : theme.background,
                  marginBottom: imageUris.length > 0 ? 16 : 0,
                  opacity: imageUris.length >= 5 ? 0.5 : 1
                }}
                onPress={handlePickImage}
                disabled={imageUris.length >= 5}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: theme.border, marginBottom: 12, ...Shadows.light }}>
                  <Ionicons name="cloud-upload-outline" size={18} color={theme.text.primary} style={{ marginRight: 8 }} />
                  <CustomText type="body-bold" style={{ color: theme.text.primary }}>{t('postitem.upload_photo') || 'Unggah Foto'}</CustomText>
                </View>
                <CustomText type="caption" style={{ color: theme.text.secondary, textAlign: 'center', paddingHorizontal: 20 }}>
                  {t('postitem.upload_desc') || `Pilih gambar dari galeri atau kamera.\nJPG, JPEG, PNG. Maks. 5 MB.`}
                </CustomText>
              </TouchableOpacity>
 
              {/* ---------- Grid Thumbnails ---------- */}
              {imageUris.length > 0 && (
                <View style={[styles.photoGrid, { width: '100%', flexDirection: 'row', justifyContent: 'space-between' }]}>
                  {[...Array(5)].map((_, index) => {
                    const uri = imageUris[index];
                    if (uri) {
                      return (
                        <View key={index} style={[styles.photoBox, { borderColor: theme.border }]}>
                          <Image 
                            source={{ uri }} 
                            style={styles.previewImage} 
                            transition={200}
                          />
                          <TouchableOpacity style={styles.removePhotoBtn} onPress={() => handleRemoveImage(index)}>
                            <Ionicons name="close" size={14} color="#FFF" />
                          </TouchableOpacity>
                          {index > 0 && (
                            <TouchableOpacity 
                              style={styles.swapPhotoBtn} 
                              onPress={() => handleMoveLeft(index)}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="chevron-back" size={12} color="#FFF" />
                            </TouchableOpacity>
                          )}
                          {index === 0 && (
                            <View style={styles.coverBadge}>
                              <CustomText type="caption" style={{ color: '#FFF', fontSize: 9, fontFamily: 'Barlow-Bold' }}>{t('postitem.cover_badge') || 'SAMPUL'}</CustomText>
                            </View>
                          )}
                        </View>
                      );
                    } else {
                      return (
                        <View key={index} style={{ width: '18%', aspectRatio: 1, borderRadius: 12, backgroundColor: isDark ? theme.border : theme.background }} />
                      );
                    }
                  })}
                </View>
              )}
 
              {/* ---------- SUBTLE DIVIDER LINE ---------- */}
              <View 
                style={{ 
                  height: 1, 
                  backgroundColor: isDark ? theme.border : '#E2E8F0', 
                  marginVertical: 24 
                }} 
              />
 
              {/* ---------- SECTION 2: LOKASI PERTEMUAN ---------- */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary.blue500 + '15', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name="location" size={20} color={Colors.primary.blue500} />
                </View>
                <View style={{ flex: 1 }}>
                  <CustomText type="h3" style={{ color: theme.text.heading }}>{t('postitem.location_title') || 'Lokasi Pertemuan'}</CustomText>
                  <CustomText type="caption" style={{ color: theme.text.secondary }}>{t('postitem.location_subtitle') || 'Tentukan titik pertemuan'}</CustomText>
                </View>
              </View>
 
              {/* ---------- Text Input Patokan ---------- */}
              <CustomInput
                label={t('postitem.location_detail_label') || "Detail Patokan Lokasi"}
                placeholder={t('postitem.location_detail_placeholder') || "Contoh: Lobi Gedung B, Depan Kantin"}
                value={location}
                onChangeText={setLocation}
                iconName="business"
                isRequired={true}
                containerStyle={{ marginBottom: 16 }}
              />
 
              {/* ---------- GPS Coordinate Button ---------- */}
              <View style={{ marginBottom: 0, width: "100%" }}>
                <CustomText type="label" style={{ fontFamily: "Barlow-Bold", fontSize: 12, marginBottom: 6, color: theme.text.secondary }}>
                  {t('postitem.map_coord_label') || 'Titik Koordinat Peta'}
                </CustomText>
                
                <TouchableOpacity 
                  activeOpacity={0.8}
                  onPress={handleFetchLocation}
                  disabled={!!isFetchingLocation || !!(latitude && longitude)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: (latitude && longitude) ? Colors.semantic.success.main : theme.border,
                    backgroundColor: isDark ? Colors.dark.surface : Colors.light.background,
                    paddingHorizontal: 14,
                    minHeight: 48,
                    paddingVertical: 12,
                  }}
                >
                  <View style={{ marginRight: 10, alignItems: "center", justifyContent: "center" }}>
                    {isFetchingLocation ? (
                      <ActivityIndicator size="small" color={Colors.primary.blue500} />
                    ) : (
                      <Ionicons 
                        name={latitude && longitude ? "checkmark-circle" : "map-outline"} 
                        size={18} 
                        color={latitude && longitude ? Colors.semantic.success.main : theme.text.secondary} 
                      />
                    )}
                  </View>
                  
                  <CustomText 
                    type="body" 
                    style={{ 
                      flex: 1, 
                      color: (latitude && longitude) ? Colors.semantic.success.main : theme.text.placeholder,
                      fontFamily: (latitude && longitude) ? "Barlow-Bold" : "Barlow-Medium",
                      fontSize: 14
                    }}
                  >
                    {isFetchingLocation ? "Melacak Titik Koordinat..." : (latitude && longitude ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` : (t('postitem.get_location') || "Pin Lokasi di Peta"))}
                  </CustomText>
 
                  {latitude && longitude ? (
                    <TouchableOpacity onPress={() => { setLatitude(null); setLongitude(null); }} style={{ padding: 4 }}>
                      <Ionicons name="trash-outline" size={20} color={Colors.semantic.error.main} />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={theme.text.secondary} />
                  )}
                </TouchableOpacity>
              </View>
            </Panel>
          </View>
        )}

      </ScrollView>
    </>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
      <Header title={t('postitem.title') || "Tambah Barang"} onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
      >
        {renderContent()}
      </KeyboardAvoidingView>

      {/* ==========================================
         Bottom Action Buttons
      ========================================== */}
      <View style={[styles.bottomAction, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <CustomButton
          title={t('postitem.cancel') || "Batal"}
          type="outline"
          onPress={() => navigation.goBack()}
          style={{ flex: 1 }}
        />
        <CustomButton
          title={t('postitem.post') || "Posting"}
          type="primary"
          onPress={handlePostItem}
          loading={loading}
          style={{ flex: 1 }}
        />
      </View>

      {/* ==========================================
         Modals
      ========================================== */}
      {/* ---------- Modal Kategori ---------- */}
      <SelectionModal
        visible={isCategoryModalVisible}
        title={t('postitem.select_category') || "Pilih Kategori"}
        options={categories}
        selectedValue={category ? category.id : null}
        onSelect={(item) => {
          setCategory(item);
          setCategoryModalVisible(false);
        }}
        onClose={() => setCategoryModalVisible(false)}
      />

      {/* ---------- Modal Sumber Foto ---------- */}
      <CustomAlert
        visible={isImageModalVisible}
        type="info"
        title="Tambah Foto Barang"
        message="Dari mana kamu ingin mengambil foto barang?"
        showCancel
        confirmText="Kamera"
        cancelText="Galeri"
        onConfirm={() => {
          setImageModalVisible(false);
          executeImagePick('kamera');
        }}
        onCancel={() => {
          setImageModalVisible(false);
          executeImagePick('galeri');
        }}
        onClose={() => setImageModalVisible(false)}
      />

      {/* ---------- Modal Izin Lokasi ---------- */}
      <CustomAlert
        visible={isLocationPermAlertVisible}
        type="info"
        title="Izin Akses Lokasi"
        message="Aplikasi butuh izin akses lokasi (GPS) kamu untuk menyimpan titik COD secara akurat. Lanjutkan?"
        showCancel
        confirmText="Izinkan"
        cancelText="Tolak"
        onConfirm={() => {
          setLocationPermAlertVisible(false);
          setTimeout(executeFetchLocation, 300);
        }}
        onCancel={() => setLocationPermAlertVisible(false)}
        onClose={() => setLocationPermAlertVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  segmentContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  tabContent: {
    flex: 1,
    gap: 20,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 8,
  },
  inputLabel: {
    marginBottom: 8,
    fontSize: 12,
    fontFamily: 'Barlow-Bold',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  photoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  photoBox: {
    width: '18%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  addPhotoBox: {
    width: 75,
    height: 75,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    padding: 3,
  },
  swapPhotoBtn: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: Colors.primary.blue500,
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  coverBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.primary.blue500,
    paddingVertical: 2,
    alignItems: 'center',
  },
  bottomAction: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 24,
    borderTopWidth: 1,
    gap: 12,
  }
});
