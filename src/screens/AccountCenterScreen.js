/* ==========================================
   Account Center Screen Component
========================================== */
/**
 * AccountCenterScreen
 * Halaman untuk mengelola profil akun pengguna.
 * Mengizinkan pengkinian nama lengkap, nomor telepon, serta perubahan kata sandi.
 */
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
  StatusBar,
  Modal,
  Keyboard,
  Animated,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSelector, useDispatch } from 'react-redux';
import { selectAuthUser, selectAuthToken, setCredentials } from '../store/slices/authSlice';
import api from '../services/api';

import Header from '../components/Header';
import CustomInput from '../components/CustomInput';
import CustomButton from '../components/CustomButton';
import CustomText from '../components/CustomText';
import CustomAlert from '../components/CustomAlert';
import { useToast } from '../components/Toast';
import Colors from '../constants/colors';
import { useLanguage } from '../localization/LanguageContext';
import Avatar from '../components/Avatar';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToSupabase, deleteImageFromSupabase } from '../services/supabase';

export default function AccountCenterScreen({ navigation }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  const user = useSelector(selectAuthUser);
  const token = useSelector(selectAuthToken);
  const dispatch = useDispatch();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.profileUrl || '');

  // Alert States for Avatar Selection and Permissions
  const [avatarAlertVisible, setAvatarAlertVisible] = useState(false);
  const [cameraPermAlertVisible, setCameraPermAlertVisible] = useState(false);
  const [galleryPermAlertVisible, setGalleryPermAlertVisible] = useState(false);

  const openCamera = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (permissionResult.granted === false) {
        showToast('Izin akses kamera ditolak. Silakan izinkan melalui pengaturan perangkat.', 'danger');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });
      processImageResult(result);
    } catch (error) {
      console.log('Error opening camera:', error);
    }
  };

  const openGallery = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        showToast('Izin akses galeri ditolak. Silakan izinkan melalui pengaturan perangkat.', 'danger');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        legacy: true,
      });
      processImageResult(result);
    } catch (error) {
      console.log('Error opening gallery:', error);
    }
  };

  const handleChangeAvatar = () => {
    setAvatarAlertVisible(true);
  };

  const handleSelectCamera = async () => {
    setAvatarAlertVisible(false);
    const { status } = await ImagePicker.getCameraPermissionsAsync();
    if (status === 'granted') {
      setTimeout(openCamera, 300);
    } else {
      setTimeout(() => setCameraPermAlertVisible(true), 300);
    }
  };

  const handleSelectGallery = async () => {
    setAvatarAlertVisible(false);
    const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (status === 'granted') {
      setTimeout(openGallery, 300);
    } else {
      setTimeout(() => setGalleryPermAlertVisible(true), 300);
    }
  };

  const processImageResult = async (result) => {
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setIsUploading(true);
      try {
        const fileUri = result.assets[0].uri;
        const uploadedUrl = await uploadImageToSupabase(fileUri, 'avatars');
        if (user && user.profileUrl) {
          await deleteImageFromSupabase(user.profileUrl);
        }
        setAvatarUrl(uploadedUrl);
        await api.users.updateAvatar(uploadedUrl);
        if (user && token) {
          dispatch(setCredentials({ 
            token, 
            user: { ...user, profileUrl: uploadedUrl } 
          }));
        }
      } catch (error) {
        console.log(error);
        showToast('Gagal mengubah foto profil.', 'danger');
      } finally {
        setIsUploading(false);
      }
    }
  };

  // States for Change Password Modal
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  
  // Animasi modal
  const slideAnim = React.useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const openPasswordModal = () => {
    setPasswordModalVisible(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  };

  const closePasswordModal = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: Dimensions.get('window').height,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      })
    ]).start(() => setPasswordModalVisible(false));
  };
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSave = async () => {
    setLoading(true);
    try {
      const data = await api.users.updateProfile(name, phone);
      if (parseInt(data.status) === 200) {
        showToast(t('common.success') || 'Perubahan berhasil disimpan!', 'success');
        dispatch(setCredentials({ 
          token, 
          user: { ...user, name, phone } 
        }));
      } else {
        showToast(data.message || t('common.error') || 'Gagal menyimpan perubahan', 'danger');
      }
    } catch (err) {
      console.log(err);
      let errMsg = t('auth.toast_server_error') || 'Terjadi kesalahan jaringan.';
      if (err.response && err.response.data) {
        errMsg = err.response.data.message || errMsg;
      }
      showToast(errMsg, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = () => {
    setErrors({});
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    openPasswordModal();
  };

  const submitChangePassword = async () => {
    setErrors({});
    let localErrors = {};

    if (!oldPassword) localErrors.oldPassword = t('auth.password_required') || "Kata sandi saat ini wajib diisi.";
    if (!newPassword) localErrors.newPassword = t('auth.toast_new_password_required') || "Kata sandi baru wajib diisi.";
    else if (newPassword.length < 8) localErrors.newPassword = t('auth.password_min') || "Kata sandi baru minimal 8 karakter.";
    if (newPassword !== confirmPassword) localErrors.confirmPassword = t('auth.toast_password_mismatch') || "Konfirmasi kata sandi tidak cocok.";

    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    setPasswordLoading(true);
    try {
      const data = await api.users.changePassword(oldPassword, newPassword, confirmPassword);
      if (parseInt(data.status) === 200) {
        showToast(t('auth.toast_password_updated') || 'Kata sandi berhasil diubah!', 'success');
        closePasswordModal();
      } else {
        showToast(data.message || t('auth.toast_password_update_failed') || 'Gagal mengubah kata sandi', 'danger');
      }
    } catch (err) {
      console.log(err);
      let errMsg = t('auth.toast_server_error') || 'Terjadi kesalahan jaringan.';
      if (err.response && err.response.data) {
        errMsg = err.response.data.message || errMsg;
      }
      showToast(errMsg, 'danger');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      <Header 
        title={t('account.title') || 'Pusat Akun'} 
        rightComponent={
          loading ? (
            <ActivityIndicator size="small" color={Colors.primary.blue500} />
          ) : (
            <TouchableOpacity onPress={handleSave} style={{ padding: 4 }} activeOpacity={0.7}>
              <CustomText type="body-bold" style={{ color: Colors.primary.blue500, fontSize: 15 }}>
                {t('account.save') || 'Simpan'}
              </CustomText>
            </TouchableOpacity>
          )
        }
      />
 
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ---------- Profile Header ---------- */}
          <View style={styles.profileHeader}>
            <TouchableOpacity 
              style={styles.avatarWrapper} 
              activeOpacity={0.8}
              onPress={handleChangeAvatar}
              disabled={isUploading}
            >
              <Avatar 
                imageUrl={avatarUrl || user?.profileUrl} 
                name={user?.name || user?.email} 
                size={96} 
              />
              {isUploading ? (
                <View style={[StyleSheet.absoluteFill, styles.uploadingOverlay]}>
                  <ActivityIndicator size="small" color={Colors.light.surface} />
                </View>
              ) : (
                <View style={[
                  styles.cameraBadge, 
                  { 
                    backgroundColor: Colors.primary.blue500, 
                    borderColor: theme.background,
                    elevation: 3,
                    shadowColor: isDark ? Colors.light.surface : Colors.common.black,
                    shadowOpacity: isDark ? 0.35 : 0.15
                  }
                ]}>
                  <Ionicons name="camera" size={16} color={Colors.light.surface} />
                </View>
              )}
            </TouchableOpacity>
          </View>
 
          {/* ---------- Informasi Publik Section ---------- */}
          <View style={styles.fieldsSection}>
            <CustomText type="body-bold" style={[styles.sectionHeading, { color: theme.text.secondary }]}>
              {t('account.public_info') || 'Informasi Publik'}
            </CustomText>
            <CustomInput
              label={t('account.full_name')}
              placeholder={t('account.name_placeholder')}
              value={name}
              onChangeText={setName}
              iconName="person"
              isRequired={true}
            />
            <CustomInput
              label={t('account.phone')}
              placeholder={t('account.phone_placeholder')}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              iconName="call"
              isRequired={true}
            />
            
            <TouchableOpacity activeOpacity={0.8} onPress={handleChangePassword}>
              <View pointerEvents="none">
                <CustomInput
                  label={t('auth.password_label') || 'Kata Sandi'}
                  placeholder={t('account.change_password') || 'Ubah Kata Sandi'}
                  value=""
                  iconName="key"
                  editable={false}
                  rightComponent={
                    <Ionicons name="chevron-forward" size={18} color={theme.text.secondary} style={{ marginLeft: 8 }} />
                  }
                />
              </View>
            </TouchableOpacity>
          </View>
 
          {/* ---------- Identitas Kampus Section ---------- */}
          <View style={styles.fieldsSection}>
            <CustomText type="body-bold" style={[styles.sectionHeading, { color: theme.text.secondary }]}>
              {t('account.campus_identity') || 'Identitas Kemahasiswaan'}
            </CustomText>
            <CustomInput
              label={t('account.nim')}
              value={user?.idUser || ''}
              editable={false}
              iconName="finger-print"
            />
            <CustomInput
              label={t('account.email')}
              value={user?.email || ''}
              editable={false}
              iconName="mail"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODAL UBAH KATA SANDI */}
      <Modal
        visible={passwordModalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={closePasswordModal}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)', opacity: fadeAnim }]}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closePasswordModal} />
          </Animated.View>
          
          <Animated.View style={[styles.modalShadowContainer, { transform: [{ translateY: slideAnim }] }]}>
            <View 
              style={[styles.modalContent, { backgroundColor: theme.surface }]}
            >
              <View style={styles.dragHandle} />
              <View style={styles.modalHeader}>
                <CustomText type="h2" style={{ color: theme.text.heading }}>{t('account.change_password_title')}</CustomText>
              </View>

            <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled" bounces={false}>
              <CustomInput
                label={t('account.old_password')}
                placeholder={t('account.old_password_placeholder')}
                value={oldPassword}
                onChangeText={(text) => {
                  setOldPassword(text);
                  if (errors.oldPassword) setErrors((prev) => ({ ...prev, oldPassword: null }));
                }}
                isPassword
                error={errors.oldPassword}
                iconName="lock-closed"
                isRequired={true}
              />
              <CustomInput
                label={t('account.new_password')}
                placeholder={t('account.new_password_placeholder')}
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: null }));
                }}
                isPassword
                error={errors.newPassword}
                iconName="lock-closed"
                isRequired={true}
              />
              <CustomInput
                label={t('account.confirm_password')}
                placeholder={t('account.confirm_password_placeholder')}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: null }));
                }}
                isPassword
                error={errors.confirmPassword}
                iconName="checkmark-circle"
                isRequired={true}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <CustomButton
                title={t('account.cancel')}
                type="secondary"
                onPress={closePasswordModal}
                style={styles.modalBtn}
              />
              <CustomButton
                title={t('account.save_password')}
                type="primary"
                onPress={submitChangePassword}
                loading={passwordLoading}
                style={styles.modalBtn}
              />
              </View>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      <CustomAlert
        visible={avatarAlertVisible}
        type="info"
        title="Ubah Foto Profil"
        message="Dari mana kamu ingin mengambil foto profil?"
        showCancel
        confirmText="Kamera"
        cancelText="Galeri"
        onConfirm={handleSelectCamera}
        onCancel={handleSelectGallery}
        onClose={() => setAvatarAlertVisible(false)}
      />

      {/* --- PRE-PERMISSION CAMERA ALERT --- */}
      <CustomAlert
        visible={cameraPermAlertVisible}
        type="info"
        title="Izin Kamera"
        message="Aplikasi butuh izin kamera kamu untuk mengambil foto secara langsung. Lanjutkan?"
        showCancel
        confirmText="Izinkan"
        cancelText="Tolak"
        onConfirm={() => {
          setCameraPermAlertVisible(false);
          setTimeout(openCamera, 300);
        }}
        onCancel={() => setCameraPermAlertVisible(false)}
        onClose={() => setCameraPermAlertVisible(false)}
      />

      {/* --- PRE-PERMISSION GALLERY ALERT --- */}
      <CustomAlert
        visible={galleryPermAlertVisible}
        type="info"
        title="Izin Akses Galeri"
        message="Aplikasi butuh akses ke foto dan galeri kamu untuk mengunggah avatar. Lanjutkan?"
        showCancel
        confirmText="Izinkan"
        cancelText="Tolak"
        onConfirm={() => {
          setGalleryPermAlertVisible(false);
          setTimeout(openGallery, 300);
        }}
        onCancel={() => setGalleryPermAlertVisible(false)}
        onClose={() => setGalleryPermAlertVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  uploadingOverlay: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  fieldsSection: {
    marginBottom: 24,
  },
  passwordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  sectionHeading: {
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  panelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  modalShadowContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: Colors.primary.blue500,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
    backgroundColor: 'transparent',
    maxHeight: '90%',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    overflow: 'hidden',
  },
  dragHandle: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(150, 150, 150, 0.3)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    paddingHorizontal: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  modalBody: {
    paddingHorizontal: 24,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 12,
  },
  modalBtn: {
    flex: 1,
  }
});
