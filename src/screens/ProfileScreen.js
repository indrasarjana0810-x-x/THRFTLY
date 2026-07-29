/* ==========================================
   Komponen Layar Profile
========================================== */
/* ---------- Impor ---------- */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Modal,
  Switch,
  Platform,
  StatusBar,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import CustomText from '../components/CustomText';
import CustomAlert from '../components/CustomAlert';
import Avatar from '../components/Avatar';
import Colors from '../constants/colors';
import { Shadows } from '../constants/styles';
import { useSelector, useDispatch } from 'react-redux';
import { selectAuthUser, selectAuthToken, logout, setCredentials } from '../store/slices/authSlice';
import { clearCart } from '../store/slices/cartSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToSupabase, deleteImageFromSupabase } from '../services/supabase';
import { useToast } from '../components/Toast';
import { useLanguage } from '../localization/LanguageContext';
import CustomToggle from '../components/CustomToggle';

const STUDY_PROGRAM_KEYS = [
  { key: 'prodi.tr_alat_berat', dbValue: 'Teknologi Rekayasa Pemeliharaan Alat Berat' },
  { key: 'prodi.tr_logistik', dbValue: 'Teknologi Rekayasa Logistik' },
  { key: 'prodi.tr_rpl', dbValue: 'Teknologi Rekayasa Perangkat Lunak' },
  { key: 'prodi.perkakas_produksi', dbValue: 'Pembuatan Peralatan dan Perkakas Produksi' },
  { key: 'prodi.proses_manufaktur', dbValue: 'Teknik Produksi dan Proses Manufaktur' },
  { key: 'prodi.konstruksi_gedung', dbValue: 'Teknologi Konstruksi Bangunan Gedung' },
  { key: 'prodi.mesin_otomotif', dbValue: 'Mesin Otomotif' },
  { key: 'prodi.mekatronika', dbValue: 'Mekatronika' },
  { key: 'prodi.manajemen_informatika', dbValue: 'Manajemen Informatika' },
];

/* ==========================================
   Komponen Layar Komponen Main
========================================== */
export default function ProfileScreen({ navigation }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  const [alertVisible, setAlertVisible] = useState(false);
  const [notifGlobal, setNotifGlobal] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    AsyncStorage.getItem('notifGlobal').then(val => {
      if (val !== null) setNotifGlobal(val === 'true');
    });
  }, []);

  const handleNotifToggle = async (val) => {
    setNotifGlobal(val);
    await AsyncStorage.setItem('notifGlobal', val.toString());
    try {
      await api.users.updateNotifStatus(val);
    } catch (e) {
      // Biarkan gagal diam-diam jika backend belum mendukung endpoint ini
    }
  };

  const dispatch = useDispatch();
  const user = useSelector(selectAuthUser);
  const token = useSelector(selectAuthToken);

  const { t, locale, switchLanguage } = useLanguage();
  const [langModalVisible, setLangModalVisible] = useState(false);
  
  // Animasi Language Modal (useRef standar sesuai W4 Slide 83)
  const langSlideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const langFadeAnim = useRef(new Animated.Value(0)).current;

  const openLangModal = () => {
    setLangModalVisible(true);
    Animated.parallel([
      Animated.timing(langSlideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(langFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  };

  const closeLangModal = () => {
    Animated.parallel([
      Animated.timing(langSlideAnim, {
        toValue: Dimensions.get('window').height,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(langFadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      })
    ]).start(() => setLangModalVisible(false));
  };

  // MENU_SECTIONS dimemoisasi menggunakan useMemo sesuai W4 Slide 93
  const MENU_SECTIONS = useMemo(() => [
    {
      title: t('profile.account') || 'Akun',
      data: [
        { id: 'account', title: t('profile.account_center'), desc: t('profile.desc_account') || 'Kelola profil & keamanan', icon: 'person-circle-outline', color: Colors.semantic.info.main, type: 'link' },
        { id: 'my_items', title: t('profile.saved_items') || 'Barang Saya', desc: t('profile.desc_my_items') || 'Kelola listing barang', icon: 'cube-outline', color: Colors.semantic.warning.main, type: 'link' },
        { id: 'history', title: t('profile.my_orders') || 'Riwayat Transaksi', desc: t('profile.desc_history') || 'Pembelian & penjualan', icon: 'time-outline', color: Colors.semantic.success.main, type: 'link' },
      ]
    },
    {
      title: t('profile.preferences'),
      data: [
        { id: 'language', title: t('profile.language'), desc: locale === 'id' ? t('profile.lang_indonesia') : t('profile.lang_english'), icon: 'language-outline', color: Colors.primary.blue500, type: 'language' },
        { id: 'notification', title: t('profile.menu_notification'), desc: t('profile.desc_notification'), icon: 'notifications-outline', color: Colors.semantic.info.main, type: 'toggle' },
      ]
    }
  ], [t, locale]);

  /* ---------- Fungsi Penanganan ---------- */
  const handleMenuPress = (menu) => {
    if (menu.id === 'account') {
      navigation.navigate('AccountCenter');
      return;
    }
    if (menu.id === 'my_items') {
      navigation.navigate('MyItems');
      return;
    }
    if (menu.id === 'history') {
      navigation.navigate('TransactionHistory');
      return;
    }
    if (menu.id === 'language') {
      openLangModal();
      return;
    }
  };

  const handleLogout = () => {
    setAlertVisible(true);
  };

  const confirmLogout = async () => {
    setAlertVisible(false);
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userProfile');
      dispatch(clearCart());
      dispatch(logout());
    } catch (e) {
      void 0;
    }
  };





  /* ---------- Tampilan ---------- */
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* --- PROFILE CARD (MOCKUP STYLE) --- */}
        <View style={[styles.profileCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Avatar name={user?.name || "Pengguna"} imageUrl={user?.profileUrl} size={72} />

          <View style={styles.profileCardDetails}>
            <CustomText type="h2" style={[styles.profileCardName, { color: theme.text.primary }]} numberOfLines={1}>
              {user?.name || "Nama Pengguna"}
            </CustomText>
            
            <CustomText type="caption" style={[styles.profileCardNim, { color: theme.text.secondary }]} numberOfLines={1}>
              {(() => {
                let displayProdi = user?.studyProgram;
                if (displayProdi) {
                  const found = STUDY_PROGRAM_KEYS.find(sp => sp.dbValue === displayProdi);
                  if (found) {
                    displayProdi = t(found.key) || displayProdi;
                  }
                }
                return [user?.idUser, displayProdi].filter(Boolean).join(' · ') || user?.email || '';
              })()}
            </CustomText>
          </View>
        </View>

        {/* --- MENU SECTIONS (MOCKUP STYLE) --- */}
        {MENU_SECTIONS.map((section, sectionIndex) => (
          <View key={`section-${sectionIndex}`} style={styles.menuSectionWrapper}>
            <CustomText type="body-bold" style={[styles.sectionTitle, { color: theme.text.secondary }]}>
              {section.title}
            </CustomText>
            <View style={[styles.menuSection, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}>
              {section.data.map((menu, index) => (
                <TouchableOpacity
                  key={menu.id}
                  style={[
                    styles.menuItem,
                    index !== section.data.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }
                  ]}
                  onPress={() => handleMenuPress(menu)}
                  activeOpacity={menu.type === 'toggle' ? 1 : 0.7}
                >
                  <View style={styles.menuItemLeft}>
                    <Ionicons name={menu.icon} size={20} color={menu.color} style={{ marginRight: 12 }} />
                    <CustomText type="body-bold" style={{ color: theme.text.primary }}>
                      {menu.title}
                    </CustomText>
                  </View>

                  <View style={styles.menuItemRight}>
                    {menu.type === 'language' && (
                      <CustomText type="body" style={{ color: theme.text.secondary, marginRight: 6 }}>
                        {locale === 'id' ? 'Indonesia' : 'English'}
                      </CustomText>
                    )}
                    {menu.type === 'toggle' ? (
                      <CustomToggle
                        value={notifGlobal}
                        onValueChange={handleNotifToggle}
                      />
                    ) : (
                      <MaterialIcons name="chevron-right" size={20} color={theme.text.placeholder} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* --- LOGOUT BUTTON (FAB SOLID DANGER STYLE) --- */}
        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={handleLogout} 
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="logout" size={20} color={Colors.common.white} />
          <CustomText type="body-bold" style={{ color: Colors.common.white, marginLeft: 8, fontSize: 15 }}>
            {t('profile.logout')}
          </CustomText>
        </TouchableOpacity>
        
        {/* Padding untuk Tab Bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* --- CUSTOM ALERT (LOGOUT) --- */}
      <CustomAlert
        visible={alertVisible}
        type="warning"
        title={t('profile.logout_confirm_title')}
        message={t('profile.logout_confirm_message')}
        showCancel
        confirmText={t('profile.yes_logout')}
        cancelText={t('profile.cancel')}
        onConfirm={confirmLogout}
        onCancel={() => setAlertVisible(false)}
        onClose={() => setAlertVisible(false)}
      />



      {/* --- LANGUAGE MODAL --- */}
      <Modal
        visible={langModalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={closeLangModal}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)', opacity: langFadeAnim }]}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeLangModal} />
        </Animated.View>

        <Animated.View style={[styles.modalShadowContainer, { transform: [{ translateY: langSlideAnim }] }]}>
          <View 
            style={[styles.bottomSheet, { backgroundColor: theme.surface }]}
          >
            <View style={styles.sheetHandler} />
            <CustomText type="h2" style={[styles.sheetTitle, { color: theme.text.heading }]}>
              {t('profile.language')}
            </CustomText>

            <View style={[styles.pillGroup, { backgroundColor: theme.border }]}>
              <TouchableOpacity 
                style={[
                  styles.pillButton, 
                  locale === 'id' ? { backgroundColor: Colors.primary.blue500 } : { backgroundColor: 'transparent' }
                ]} 
                onPress={() => { switchLanguage('id'); closeLangModal(); }}
              >
                <CustomText type="body-bold" style={{ color: locale === 'id' ? Colors.light.surface : theme.text.primary }}>{t('profile.lang_indonesia')}</CustomText>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[
                  styles.pillButton, 
                  locale === 'en' ? { backgroundColor: Colors.primary.blue500 } : { backgroundColor: 'transparent' }
                ]} 
                onPress={() => { switchLanguage('en'); closeLangModal(); }}
              >
                <CustomText type="body-bold" style={{ color: locale === 'en' ? Colors.light.surface : theme.text.primary }}>{t('profile.lang_english')}</CustomText>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

/* ==========================================
   Komponen Layar Styles
========================================== */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: 0,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  screenHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarWrapper: {
    borderRadius: 36,
    position: 'relative',
    overflow: 'hidden',
  },
  uploadingOverlay: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  editTrigger: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: Colors.primary.blue500,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  profileCardDetails: {
    flex: 1,
    marginLeft: 16,
  },
  profileCardName: {
    fontFamily: 'Barlow-Bold',
    fontSize: 16,
    marginBottom: 2,
  },
  profileCardNim: {
    fontFamily: 'Barlow-Regular',
    fontSize: 12,
    marginBottom: 0,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statsItem: {
    alignItems: 'center',
    flex: 1,
  },
  statsValue: {
    fontSize: 20,
    marginBottom: 4,
  },
  statsLabel: {
    fontSize: 11,
  },
  statsDivider: {
    width: 1,
    height: 30,
  },
  menuSectionWrapper: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 8,
  },
  menuSection: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.semantic.error.main,
    shadowColor: Colors.semantic.error.main,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    marginTop: 8,
  },
  /* ---------- Gaya Bottom Sheet ---------- */
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
  sheetTitle: {
    fontSize: 20,
    marginBottom: 24,
    textAlign: 'center',
  },
  prefSection: {
    marginBottom: 24,
  },
  pillGroup: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
  },
  pillButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  closeSheetButton: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
    marginTop: 8,
  },
});
