/* ==========================================
   Komponen Layar Post Item
========================================== */
import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Easing,
  StatusBar,
  Dimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
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

// Templates are now loaded dynamically from database via REST API in useEffect below

// Preset Spot COD Kampus Politeknik Astra (Static Base)
const BASE_CAMPUS_SPOTS = [
  { id: 'spot1', nameId: 'Lobi Utama Gedung A (Rektorat)', nameEn: 'Main Lobby Building A (Rectorate)', lat: -6.348360, lng: 107.148073 },
  { id: 'spot2', nameId: 'Gedung B (Area Perkuliahan)', nameEn: 'Building B (Lecture Area)', lat: -6.348000, lng: 107.148600 },
  { id: 'spot3', nameId: 'Kantin Utama Kampus Astra', nameEn: 'Main Canteen Astra Campus', lat: -6.348800, lng: 107.149200 },
  { id: 'spot4', nameId: 'Perpustakaan Lt. 2', nameEn: 'Library 2nd Floor', lat: -6.348200, lng: 107.149500 },
  { id: 'spot5', nameId: 'Parkiran Utama Kampus', nameEn: 'Main Campus Parking Area', lat: -6.349100, lng: 107.150100 },
  { id: 'spot6', nameId: 'Hall & Lapangan Olahraga', nameEn: 'Hall & Sports Field', lat: -6.349500, lng: 107.150600 },
];

// AnimatedPath untuk animasi SVG strokeDashoffset
const AnimatedPath = Animated.createAnimatedComponent(Path);

/* ==========================================
   CheckPointRow — per-item animated component
   Setiap baris poin punya Animated.Value sendiri
========================================== */
function CheckPointRow({ point, index, state, onToggle, onNote, isDark, theme, isLast }) {
  const { t } = useLanguage();
  const drawAnim1 = useRef(new Animated.Value(state?.passed !== undefined ? 0 : 15)).current;
  const drawAnim2 = useRef(new Animated.Value(state?.passed !== undefined ? 0 : 15)).current;
  const prevPassed = useRef(state?.passed);

  const isPassed = state?.passed === true;
  const isFailed = state?.passed === false;
  const isAnswered = state?.passed !== undefined;

  useEffect(() => {
    if (state?.passed !== undefined && state?.passed !== prevPassed.current) {
      if (state.passed) {
        // ✓ Checkmark: animate drawAnim1 dari 15 ke 0
        drawAnim1.setValue(15);
        Animated.timing(drawAnim1, {
          toValue: 0,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
      } else {
        // ✗ Silang: animate drawAnim1 (diagonal 1) lalu drawAnim2 (diagonal 2) berurutan
        drawAnim1.setValue(15);
        drawAnim2.setValue(15);
        
        Animated.sequence([
          Animated.timing(drawAnim1, {
            toValue: 0,
            duration: 180,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
          }),
          Animated.timing(drawAnim2, {
            toValue: 0,
            duration: 180,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
          })
        ]).start();
      }
    }
    prevPassed.current = state?.passed;
  }, [state?.passed]);

  const handleToggle = (passed) => {
    onToggle(point.id, passed);
  };

  return (
    <View>
      <View style={{ paddingVertical: 14 }}>

        {/* Nomor / icon indicator + teks poin */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
          {/* Circle wrapper — static */}
          <View style={{
            width: 24, height: 24, borderRadius: 12,
            backgroundColor:
              isPassed ? Colors.semantic.success.main
              : isFailed ? Colors.semantic.error.main
              : theme.border,
            alignItems: 'center', justifyContent: 'center',
            marginRight: 10, marginTop: 1, flexShrink: 0,
            overflow: 'hidden',
          }}>
            {isAnswered ? (
              <Svg width={13} height={13} viewBox="0 0 13 13">
                {isPassed ? (
                  // ✓ Checkmark path: draw itself
                  <AnimatedPath
                    d="M 2,8 L 5,11 L 11,3"
                    stroke={Colors.light.surface}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    strokeDasharray={15}
                    strokeDashoffset={drawAnim1}
                  />
                ) : (
                  // ✗ X path: digambar berurutan (diagonal 1 lalu diagonal 2)
                  <>
                    <AnimatedPath
                      d="M 2.5,2.5 L 10.5,10.5"
                      stroke={Colors.light.surface}
                      strokeWidth={2}
                      strokeLinecap="round"
                      fill="none"
                      strokeDasharray={15}
                      strokeDashoffset={drawAnim1}
                    />
                    <AnimatedPath
                      d="M 10.5,2.5 L 2.5,10.5"
                      stroke={Colors.light.surface}
                      strokeWidth={2}
                      strokeLinecap="round"
                      fill="none"
                      strokeDasharray={15}
                      strokeDashoffset={drawAnim2}
                    />
                  </>
                )}
              </Svg>
            ) : (
              <CustomText style={{ color: theme.text.secondary, fontSize: 10, fontFamily: 'Barlow-Bold' }}>
                {index + 1}
              </CustomText>
            )}
          </View>
          <CustomText type="body" style={{ color: theme.text.primary, flex: 1, lineHeight: 20 }}>
            {t(`checksheet.${point.id.toLowerCase()}`) || point.point}
          </CustomText>
        </View>

        {/* Toggle Lulus / Tidak Lulus */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => handleToggle(true)}
            style={[styles.checkToggleBtn, {
              flex: 1,
              backgroundColor: isPassed ? Colors.semantic.success.main : (isDark ? theme.surface : Colors.light.background),
              borderColor: isPassed ? Colors.semantic.success.main : theme.border,
            }]}
          >
            <Ionicons name="checkmark-circle" size={15} color={isPassed ? Colors.light.surface : theme.text.placeholder} style={{ marginRight: 5 }} />
            <CustomText type="label" style={{ color: isPassed ? Colors.light.surface : theme.text.secondary }}>{t('postitem.check_pass') || 'Lulus'}</CustomText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => handleToggle(false)}
            style={[styles.checkToggleBtn, {
              flex: 1,
              backgroundColor: isFailed ? Colors.semantic.error.main : (isDark ? theme.surface : Colors.light.background),
              borderColor: isFailed ? Colors.semantic.error.main : theme.border,
            }]}
          >
            <Ionicons name="close-circle" size={15} color={isFailed ? Colors.light.surface : theme.text.placeholder} style={{ marginRight: 5 }} />
            <CustomText type="label" style={{ color: isFailed ? Colors.light.surface : theme.text.secondary }}>{t('postitem.check_fail') || 'Tidak Lulus'}</CustomText>
          </TouchableOpacity>
        </View>

        {/* Input catatan — wajib kalau Tidak Lulus */}
        {isFailed && (
          <TextInput
            style={[styles.checkNoteInput, {
              backgroundColor: isDark ? Colors.semantic.error.main + '18' : Colors.semantic.error.light,
              borderColor: Colors.semantic.error.main + '50',
              color: theme.text.primary,
            }]}
            placeholder={t('postitem.check_note_ph') || "Jelaskan kondisi kekurangan ini... (wajib)"}
            placeholderTextColor={isDark ? Colors.semantic.error.main + 'AA' : Colors.semantic.error.main + '80'}
            value={state?.note || ''}
            onChangeText={(text) => onNote(point.id, text)}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
        )}
      </View>

      {/* Divider kecuali poin terakhir */}
      {!isLast && <View style={{ height: 1, backgroundColor: theme.border }} />}
    </View>
  );
}

/* ==========================================
   Post Item Screen Component
========================================== */
/**
 * PostItemScreen
 * Halaman untuk menambahkan barang baru (listing).
 * Dilengkapi pembagian tab informasi barang & koordinat COD.
 */
export default function PostItemScreen({ navigation, route }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const { showToast } = useToast();
  const { t, locale } = useLanguage();

  const editMode = route?.params?.editMode || false;
  const editItem = route?.params?.item || null;

  const [activeTab, setActiveTab] = useState('media'); // 'media' | 'detail' | 'checksheet'

  /* ---------- Form State ---------- */
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(null);
  const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);
  // Kondisi otomatis dihitung dari check sheet — tidak diisi manual
  const [checklist, setChecklist] = useState({}); // { [pointId]: { passed: bool, note: string } }
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [imageUris, setImageUris] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showValidation, setShowValidation] = useState(false);

  // Prefill form in edit mode
  useEffect(() => {
    const isLocked = editItem?.status?.toLowerCase() === 'sold' || editItem?.status?.toLowerCase() === 'booked';
    if (editMode && editItem && isLocked) {
      navigation.goBack();
      return;
    }
    const fetchFullItem = async () => {
      try {
        const itemId = editItem.id || editItem.idItem;
        const res = await api.items.getById(itemId);
        
        if (res && parseInt(res.status) === 200 && res.data) {
          const fullItem = res.data;
          setTitle(fullItem.title || '');
          setPrice(fullItem.price ? fullItem.price.toString() : '');
          setLocation(fullItem.locationName || fullItem.location || '');
          setDescription(fullItem.description || '');
          
          if (fullItem.categoryId && fullItem.categoryName) {
            setCategory({ id: fullItem.categoryId, label: fullItem.categoryName });
          } else if (fullItem.categoryId) {
            setCategory({ id: fullItem.categoryId, label: fullItem.categoryName || 'Kategori' });
          }

          if (fullItem.imageUris && fullItem.imageUris.length > 0) {
            setImageUris(fullItem.imageUris);
          } else if (fullItem.image) {
            setImageUris([fullItem.image]);
          }

          if (fullItem.latitude && fullItem.longitude) {
            setLatitude(fullItem.latitude);
            setLongitude(fullItem.longitude);
          }

          if (fullItem.checksheet && fullItem.checksheet.length > 0) {
            const mappedChecklist = {};
            fullItem.checksheet.forEach(c => {
              mappedChecklist[c.templateId] = { passed: c.passed, note: c.note };
            });
            setChecklist(mappedChecklist);
          }
        }
      } catch (error) {
        void 0;
      }
    };

    if (editMode && editItem) {
      // Set initial values from lightweight editItem first for instant UI response
      setTitle(editItem.title || '');
      setPrice(editItem.price ? editItem.price.toString() : '');
      
      if (editItem.imageUris && editItem.imageUris.length > 0) {
        setImageUris(editItem.imageUris);
      } else if (editItem.image) {
        setImageUris([editItem.image]);
      }

      // Then fetch the full details
      fetchFullItem();
    }
  }, [editMode, editItem]);

  // Template poin check sheet untuk kategori yang dipilih (di-load dinamis dari DB)
  const [checklistTemplate, setChecklistTemplate] = useState(null);

  // Fetch template checksheet dari database ketika kategori berubah
  useEffect(() => {
    // We intentionally DO NOT call setChecklist({}) here anymore.
    // Calling it here would wipe out the prefilled checksheet during Edit Mode.
    // Orphaned checklist data from old categories will just be ignored when mapping over the new template.
    
    const fetchChecksheetTemplates = async () => {
      if (!category) {
        setChecklistTemplate(null);
        return;
      }
      try {
        const res = await api.checksheet.getTemplates(category.id);
        if (res && parseInt(res.status) === 200 && res.data) {
          const mapped = res.data.map(t => ({
            id: t.idTemplate,
            point: t.point
          }));
          setChecklistTemplate(mapped.length > 0 ? mapped : null);
        } else {
          setChecklistTemplate(null);
        }
      } catch (error) {
        void 0;
        setChecklistTemplate(null);
      }
    };
    
    fetchChecksheetTemplates();
  }, [category]);

  // Auto-hitung kondisi dari hasil check sheet
  // null = belum ada kategori / belum isi checklist sama sekali
  const autoCondition = useMemo(() => {
    if (!checklistTemplate || checklistTemplate.length === 0) return null;
    const total = checklistTemplate.length;
    const passed = checklistTemplate.filter(p => checklist[p.id]?.passed === true).length;
    const pct = total > 0 ? (passed / total) * 100 : 0;
    if (pct === 100) return 'Sangat Baik';
    if (pct >= 75)   return 'Baik';
    return 'Kurang';
  }, [checklist, checklistTemplate]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.categories.getActive();
        if (res && parseInt(res.status) === 200 && res.data) {
          const mapped = res.data.map(c => {
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
        void 0;
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
  const [spotModalVisible, setSpotModalVisible] = useState(false);
  const [selectedSpotName, setSelectedSpotName] = useState('');

  const campusPresetSpots = useMemo(() => {
    const spots = BASE_CAMPUS_SPOTS.map(s => ({
      id: s.id,
      label: locale === 'id' ? s.nameId : s.nameEn,
      lat: s.lat,
      lng: s.lng
    }));
    spots.push({
      id: 'gps',
      label: t('postitem.use_gps') || (locale === 'id' ? 'Gunakan Lokasi GPS HP Saat Ini' : 'Use Current Device GPS Location'),
      isGps: true
    });
    return spots;
  }, [locale, t]);

  const handleSelectSpot = (spot) => {
    setSpotModalVisible(false);
    if (spot.isGps) {
      handleFetchLocation();
    } else {
      setLatitude(spot.lat);
      setLongitude(spot.lng);
      setSelectedSpotName(spot.label);
      if (!location) {
        setLocation(spot.label);
      }
    }
  };

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
      void 0;
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
    if (!title || !price || !category || !description || !location || imageUris.length === 0) {
      setShowValidation(true);
      showToast("Nama barang, Harga, Kategori, Deskripsi, Lokasi, dan minimal 1 Foto wajib diisi!", "danger");
      return;
    }
    // Validasi: check sheet wajib diisi jika kategori punya template
    if (checklistTemplate && checklistTemplate.length > 0) {
      const allAnswered = checklistTemplate.every(p => checklist[p.id]?.passed !== undefined);
      if (!allAnswered) {
        showToast("Semua poin Check Sheet Kondisi wajib dijawab sebelum posting!", "danger");
        setActiveTab('checksheet');
        return;
      }
      // Validasi: poin yang gagal wajib ada catatan
      const failedWithoutNote = checklistTemplate.some(
        p => checklist[p.id]?.passed === false && !checklist[p.id]?.note?.trim()
      );
      if (failedWithoutNote) {
        showToast("Poin yang tidak lulus wajib diberi catatan/keterangan!", "warning");
        setActiveTab('checksheet');
        return;
      }
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

      // Susun data checklist untuk dikirim ke backend
      const checklistPayload = checklistTemplate
        ? checklistTemplate.map(p => ({
          templateId: p.id,
          passed: checklist[p.id]?.passed ?? true,
          note: checklist[p.id]?.note || null,
        }))
        : [];

      const payload = {
        title,
        price: parseFloat(price),
        category: category.id,
        condition: autoCondition, // Otomatis dari check sheet
        description,
        locationName: location,
        latitude: latitude ? parseFloat(latitude.toFixed(8)) : null,
        longitude: longitude ? parseFloat(longitude.toFixed(8)) : null,
        status: "Available",
        imageUris: uploadedUrls,
        checksheet: checklistPayload,
      };

      if (editMode && editItem) {
        const itemId = editItem.id || editItem.idItem;
        const res = await api.items.update(itemId, payload);
        if (res && parseInt(res.status) === 200) {
          showToast(t('common.success') || "Barang berhasil diperbarui!", "success");
          navigation.goBack();
        } else {
          showToast(res.message || "Gagal memperbarui barang", "danger");
        }
      } else {
        const res = await api.items.create(payload);
        if (res && parseInt(res.status) === 200) {
          showToast("Barang berhasil diposting!", "success");
          navigation.goBack();
        } else {
          showToast(res.message || "Gagal memposting barang", "danger");
        }
      }
    } catch (error) {
      void 0;
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

  const isInsideCampus = (lat, lng) => {
    const polygon = [
      [-6.348360, 107.147450],
      [-6.347481, 107.148073],
      [-6.349691, 107.151397],
      [-6.350577, 107.150883]
    ];
    let i, j;
    let result = false;
    for (i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      if ((polygon[i][1] > lng) !== (polygon[j][1] > lng) &&
          (lat < (polygon[j][0] - polygon[i][0]) * (lng - polygon[i][1]) / (polygon[j][1] - polygon[i][1]) + polygon[i][0])) {
        result = !result;
      }
    }
    return result;
  };

  const executeFetchLocation = async () => {
    setIsFetchingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast("Izin akses lokasi ditolak. Koordinat tidak dapat disimpan.", "danger");
        setIsFetchingLocation(false);
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      
      if (!isInsideCampus(lat, lng)) {
        showToast(t('postitem.err_out_of_bounds') || "Lokasi serah terima barang harus berada di dalam area kampus Politeknik Astra.", "danger");
        setLatitude(null);
        setLongitude(null);
      } else {
        setLatitude(lat);
        setLongitude(lng);
      }
    } catch (error) {
      showToast("Gagal mengambil lokasi.", "danger");
    } finally {
      setIsFetchingLocation(false);
    }
  };

  // Handler toggle per poin check sheet
  const handleCheckToggle = (pointId, passed) => {
    setChecklist(prev => ({
      ...prev,
      [pointId]: { ...prev[pointId], passed },
    }));
  };

  const handleCheckNote = (pointId, note) => {
    setChecklist(prev => ({
      ...prev,
      [pointId]: { ...prev[pointId], note },
    }));
  };

  // Hitung progress check sheet untuk badge
  const checksheetProgress = useMemo(() => {
    if (!checklistTemplate) return null;
    const total = checklistTemplate.length;
    const answered = checklistTemplate.filter(p => checklist[p.id]?.passed !== undefined).length;
    const passed = checklistTemplate.filter(p => checklist[p.id]?.passed === true).length;
    return { total, answered, passed };
  }, [checklist, checklistTemplate]);

  const renderContent = () => (
    <>
      {/* ==========================================
         Segmented Control (Media | Detail | Check Sheet)
      ========================================== */}
      <View style={styles.segmentContainer}>
        <SegmentedControl
          tabs={[
            { key: 'media', label: t('postitem.media') || 'Media & Lokasi' },
            { key: 'detail', label: t('postitem.detail') || 'Detail Barang' },
            ...(checklistTemplate ? [{ key: 'checksheet', label: t('postitem.checksheet_tab') || 'Check Sheet' }] : []),
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
              error={showValidation && !title ? (t('common.required') || "Wajib diisi") : null}
            />

            {/* ---------- Harga Input ---------- */}
            <CustomInput
              label={t('postitem.price_label') || "Harga Barang"}
              placeholder=""
              value={price ? price.replace(/\B(?=(\d{3})+(?!\d))/g, locale === 'en' ? ',' : '.') : ''}
              onChangeText={(text) => {
                // Strip semua non-angka dan titik separator, lalu simpan nilai numerik murni
                const numericValue = text.replace(/[^0-9]/g, '');
                setPrice(numericValue);
              }}
              keyboardType="numeric"
              isRequired={true}
              error={showValidation && !price ? (t('common.required') || "Wajib diisi") : null}
              inputStyle={{ textAlign: 'right', height: 48, paddingHorizontal: 14 }}
              wrapperStyle={{
                paddingLeft: 0,
                paddingRight: 0,
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
                  <CustomText type="body-bold" style={{ color: Colors.light.surface, marginTop: Platform.OS === 'ios' ? 2 : 0 }}>
                    {locale === 'en' ? 'IDR' : 'Rp'}
                  </CustomText>
                </View>
              }
              rightComponent={
                <View style={{
                  flexDirection: 'column',
                  width: 32,
                  height: 48,
                  justifyContent: 'center',
                }}>
                  <TouchableOpacity 
                    activeOpacity={0.5}
                    style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 2 }}
                    onPress={() => {
                      const current = parseInt(price) || 0;
                      if (current === 0) {
                        setPrice('10000');
                      } else {
                        setPrice((current + 1000).toString());
                      }
                    }}
                  >
                    <Ionicons name="chevron-up" size={16} color={theme.text.secondary} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    activeOpacity={0.5}
                    style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 2 }}
                    onPress={() => {
                      const current = parseInt(price) || 0;
                      if (current <= 1000) {
                        setPrice('');
                      } else {
                        setPrice((current - 1000).toString());
                      }
                    }}
                  >
                    <Ionicons name="chevron-down" size={16} color={theme.text.secondary} />
                  </TouchableOpacity>
                </View>
              }
            />

            {/* ---------- Kategori Picker ---------- */}
            <TouchableOpacity activeOpacity={0.8} onPress={() => setCategoryModalVisible(true)}>
              <View pointerEvents="none">
                <CustomInput
                  label={t('postitem.category_label') || "Kategori"}
                  placeholder={t('postitem.select_category') || "Pilih Kategori Barang"}
                  value={category ? (t(`category.${category.id.toLowerCase()}`) || category.label) : ''}
                  iconName="grid"
                  editable={false}
                  isRequired={true}
                  error={showValidation && !category ? (t('common.required') || "Wajib diisi") : null}
                  rightComponent={
                    <Ionicons name="chevron-forward" size={18} color={theme.text.secondary} style={{ marginLeft: 8 }} />
                  }
                />
              </View>
            </TouchableOpacity>

            {/* ---------- Kondisi Barang (Auto-calculated dari Check Sheet) ---------- */}
            <Panel style={{ padding: 16, marginBottom: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary.blue500 + '18', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name="shield-checkmark" size={19} color={Colors.primary.blue500} />
                </View>
                <View style={{ flex: 1 }}>
                  <CustomText type="h3" style={{ color: theme.text.heading }}>{t('postitem.condition_title') || 'Kondisi Barang'}</CustomText>
                  <CustomText type="caption" style={{ color: theme.text.secondary }}>
                    {!category
                      ? t('postitem.condition_no_cat') || 'Silakan pilih kategori terlebih dahulu.'
                      : checklistTemplate
                        ? t('postitem.condition_calc') || 'Dihitung otomatis berdasarkan Lembar Pengecekan.'
                        : t('postitem.condition_none') || 'Kategori ini tidak memiliki lembar pengecekan.'}
                  </CustomText>
                </View>
                {/* Badge hanya tampil kalau sudah ada nilai */}
                {autoCondition !== null && (
                  <View style={{
                    backgroundColor:
                      autoCondition === 'Sangat Baik' ? Colors.semantic.success.main
                      : autoCondition === 'Baik' ? Colors.semantic.warning.main
                      : Colors.semantic.error.main,
                    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
                  }}>
                    <CustomText type="label" style={{ color: Colors.light.surface }}>
                      {autoCondition === 'Sangat Baik' ? (t('postitem.cond_vg') || 'Sangat Baik')
                        : autoCondition === 'Baik' ? (t('postitem.cond_good') || 'Baik')
                        : (t('postitem.cond_poor') || 'Kurang')}
                    </CustomText>
                  </View>
                )}
              </View>
              {checklistTemplate && (
                <>
                  <View style={{ height: 1, backgroundColor: theme.border, marginTop: 14, marginBottom: 12 }} />
                  <TouchableOpacity
                    onPress={() => setActiveTab('checksheet')}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <CustomText type="caption" style={{ color: theme.text.secondary }}>
                          {checksheetProgress?.answered ?? 0}/{checksheetProgress?.total ?? checklistTemplate.length} {t('postitem.points_answered') || 'poin dijawab'}
                        </CustomText>
                        {checksheetProgress && checksheetProgress.answered > 0 && (
                          <CustomText type="caption" style={{ color: Colors.semantic.success.main, fontFamily: 'Barlow-Bold', marginLeft: 8 }}>
                            · {checksheetProgress.passed} {t('postitem.points_passed_label') || 'Lulus'}
                          </CustomText>
                        )}
                      </View>
                      <View style={{ height: 5, backgroundColor: theme.border, borderRadius: 3 }}>
                        <View style={{
                          height: 5, borderRadius: 3,
                          backgroundColor: Colors.semantic.success.main,
                          width: `${checksheetProgress && checksheetProgress.total > 0 ? (checksheetProgress.passed / checksheetProgress.total) * 100 : 0}%`,
                        }} />
                      </View>
                    </View>
                    <View style={{ marginLeft: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary.blue500 + '14', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
                      <CustomText type="label" style={{ color: Colors.primary.blue500, marginRight: 2 }}>{t('postitem.fill_checksheet') || 'Isi'}</CustomText>
                      <Ionicons name="chevron-forward" size={14} color={Colors.primary.blue500} />
                    </View>
                  </TouchableOpacity>
                </>
              )}
            </Panel>

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
              error={showValidation && !description ? (t('common.required') || "Wajib diisi") : null}
              onFocus={() => {
                requestAnimationFrame(() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 50);
                });
              }}
            />
          </View>
        ) : activeTab === 'checksheet' ? (
          /* ==========================================
             Tab: Check Sheet Kondisi Barang
          ========================================== */
          <View style={styles.tabContent}>

            {/* ── Panel Utama: Header + Daftar Poin ── */}
            <Panel style={{ padding: 20 }}>

              {/* Section Header — sama persis dengan pola Foto & Lokasi */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary.blue500 + '18', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Ionicons name="shield-checkmark" size={20} color={Colors.primary.blue500} />
                </View>
                <View style={{ flex: 1 }}>
                  <CustomText type="h3" style={{ color: theme.text.heading }}>{t('postitem.check_title') || 'Lembar Pengecekan Kondisi'}</CustomText>
                  <CustomText type="caption" style={{ color: theme.text.secondary }}>{t('postitem.check_desc') || 'Poin yang tidak lulus wajib diberi catatan.'}</CustomText>
                </View>
                {checksheetProgress && (
                  <View style={{ backgroundColor: theme.border, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                    <CustomText type="body-bold" style={{ color: theme.text.primary, fontSize: 12 }}>
                      {checksheetProgress.answered}/{checksheetProgress.total}
                    </CustomText>
                  </View>
                )}
              </View>

              {/* Progress Bar */}
              {checksheetProgress && (
                <View style={{ marginBottom: 16 }}>
                  <View style={{ height: 5, backgroundColor: theme.border, borderRadius: 3 }}>
                    <View style={{
                      height: 5, borderRadius: 3,
                      backgroundColor:
                        autoCondition === 'Sangat Baik' ? Colors.semantic.success.main
                        : autoCondition === 'Baik'      ? Colors.semantic.warning.main
                        : autoCondition === 'Kurang'    ? Colors.semantic.error.main
                        : Colors.primary.blue500, // null = belum ada jawaban
                      width: `${checksheetProgress.total > 0 ? (checksheetProgress.answered / checksheetProgress.total) * 100 : 0}%`,
                    }} />
                  </View>
                </View>
              )}

              {/* Divider sebelum list */}
              <View style={{ height: 1, backgroundColor: theme.border, marginBottom: 4 }} />

              {/* Daftar Poin — compact list items dengan divider */}
              {checklistTemplate && checklistTemplate.map((point, index) => (
                <CheckPointRow
                  key={point.id}
                  point={point}
                  index={index}
                  state={checklist[point.id]}
                  onToggle={handleCheckToggle}
                  onNote={handleCheckNote}
                  isDark={isDark}
                  theme={theme}
                  isLast={index === checklistTemplate.length - 1}
                />
              ))}
            </Panel>

            {/* ── Completion Gate — hanya muncul kalau SEMUA poin sudah dijawab ── */}
            {checksheetProgress && checksheetProgress.answered === checksheetProgress.total && autoCondition !== null && (() => {
              const condColor =
                autoCondition === 'Sangat Baik' ? Colors.semantic.success
                : autoCondition === 'Baik' ? Colors.semantic.warning
                : Colors.semantic.error;
              return (
                <Panel style={{ padding: 20 }}>
                  {/* Header: ikon + status selesai */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                    <View style={{
                      width: 36, height: 36, borderRadius: 18,
                      backgroundColor: Colors.semantic.success.main + '18',
                      alignItems: 'center', justifyContent: 'center', marginRight: 12
                    }}>
                      <Ionicons name="checkmark-done-circle" size={20} color={Colors.semantic.success.main} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <CustomText type="h3" style={{ color: theme.text.heading }}>{t('postitem.check_done_title') || 'Lembar Pengecekan Selesai!'}</CustomText>
                      <CustomText type="caption" style={{ color: theme.text.secondary }}>
                        {(t('postitem.check_done_desc') || 'Seluruh {count} poin telah Anda jawab.').replace('{count}', checksheetProgress.total)}
                      </CustomText>
                    </View>
                  </View>

                  {/* Skor hasil */}
                  <View style={{
                    flexDirection: 'row', alignItems: 'center',
                    backgroundColor: isDark ? condColor.main + '1F' : condColor.light,
                    borderRadius: 12, padding: 12, marginBottom: 14,
                    borderWidth: 1, borderColor: condColor.main + (isDark ? '50' : '30'),
                  }}>
                    <Ionicons
                      name={autoCondition === 'Sangat Baik' ? 'trophy' : autoCondition === 'Baik' ? 'thumbs-up' : 'alert-circle'}
                      size={22} color={condColor.main} style={{ marginRight: 10 }}
                    />
                    <View style={{ flex: 1 }}>
                      <CustomText type="caption" style={{ color: isDark ? condColor.main : condColor.dark }}>{t('postitem.recorded_as') || 'Kondisi barang ini akan tercatat sebagai'}</CustomText>
                      <CustomText type="h3" style={{ color: isDark ? condColor.main : condColor.dark }}>
                        {autoCondition === 'Sangat Baik' ? (t('postitem.cond_vg') || 'Sangat Baik')
                          : autoCondition === 'Baik' ? (t('postitem.cond_good') || 'Baik')
                          : (t('postitem.cond_poor') || 'Kurang')}
                      </CustomText>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <CustomText type="h3" style={{ color: isDark ? condColor.main : condColor.dark, fontSize: 20 }}>
                        {checksheetProgress.passed}/{checksheetProgress.total}
                      </CustomText>
                      <CustomText type="caption" style={{ color: isDark ? condColor.main : condColor.dark, fontSize: 10 }}>{t('postitem.points_passed') || 'poin lulus'}</CustomText>
                    </View>
                  </View>

                  {/* CTA: balik ke tab Detail */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setActiveTab('detail')}
                    style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: Colors.primary.blue500,
                      borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20,
                    }}
                  >
                    <Ionicons name="arrow-back" size={16} color={Colors.light.surface} style={{ marginRight: 6 }} />
                    <CustomText type="label" style={{ color: Colors.light.surface }}>{t('postitem.back_to_detail') || 'Kembali ke Detail Barang'}</CustomText>
                  </TouchableOpacity>
                </Panel>
              );
            })()}
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
                  borderColor: (showValidation && imageUris.length === 0) ? Colors.semantic.error.main : (isDark ? theme.text.placeholder : theme.border),
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: (showValidation && imageUris.length === 0) ? Colors.semantic.error.main + '15' : (isDark ? theme.border : theme.background),
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
                            <Ionicons name="close" size={14} color={Colors.light.surface} />
                          </TouchableOpacity>
                          {index > 0 && (
                            <TouchableOpacity
                              style={styles.swapPhotoBtn}
                              onPress={() => handleMoveLeft(index)}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="chevron-back" size={12} color={Colors.light.surface} />
                            </TouchableOpacity>
                          )}
                          {index === 0 && (
                            <View style={styles.coverBadge}>
                              <CustomText type="caption" style={{ color: Colors.light.surface, fontSize: 9, fontFamily: 'Barlow-Bold' }}>{t('postitem.cover_badge') || 'SAMPUL'}</CustomText>
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
                  backgroundColor: isDark ? theme.border : Colors.light.border,
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
                error={showValidation && !location ? (t('common.required') || "Wajib diisi") : null}
                containerStyle={{ marginBottom: 16 }}
              />

              {/* ---------- Spot Location Field (Preset Kampus & GPS) ---------- */}
              <View style={{ marginBottom: 16, width: "100%" }}>
                <CustomText style={{ fontFamily: "Barlow-Bold", fontSize: 12, marginBottom: 6, color: theme.text.secondary }}>
                  {t('postitem.map_coord_label') || 'Spot Titik Pertemuan COD Kampus'}
                </CustomText>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setSpotModalVisible(true)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: (latitude && longitude) ? Colors.semantic.success.main : theme.border,
                    backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
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
                        name={latitude && longitude ? "map" : "map-outline"}
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
                      fontSize: 13
                    }}
                  >
                    {isFetchingLocation 
                      ? (t('postitem.fetching_location') || "Melacak Lokasi Kampus...") 
                      : (latitude && longitude 
                          ? (selectedSpotName || (t('postitem.spot_verified') || 'Spot Kampus Terverifikasi')) 
                          : (t('postitem.get_location') || "Pilih Spot Pertemuan COD Kampus"))}
                  </CustomText>

                  {latitude && longitude ? (
                    <TouchableOpacity onPress={() => { setLatitude(null); setLongitude(null); setSelectedSpotName(''); }} style={{ padding: 4 }}>
                      <Ionicons name="trash-outline" size={18} color={Colors.semantic.error.main} />
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

      {/* Modal Pilihan Spot Kampus */}
      <SelectionModal
        visible={spotModalVisible}
        onClose={() => setSpotModalVisible(false)}
        title={t('postitem.select_spot_modal_title') || "Pilih Spot Pertemuan COD"}
        options={campusPresetSpots}
        onSelect={handleSelectSpot}
      />
    </>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
      <Header 
        title={editMode ? (t('postitem.edit_title') || "Edit Barang") : (t('postitem.title') || "Tambah Barang")} 
        onBack={() => navigation.goBack()} 
        noBorder={true}
      />

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
          title={editMode ? (t('postitem.save_btn') || "Simpan Perubahan") : (t('postitem.post') || "Posting")}
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
        options={categories.map(c => ({ ...c, label: t(`category.${c.id.toLowerCase()}`) || c.label }))}
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
    gap: 16,
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
    borderColor: Colors.light.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.common.black,
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
  },
  // ── Check Sheet styles ────────────────────────────────────────────
  checksheetHeader: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  checksheetRow: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 0,
  },
  checkToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  checkNoteInput: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontFamily: 'Barlow-Medium',
    minHeight: 60,
  },
  conditionResultCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    alignItems: 'center',
  },
});
