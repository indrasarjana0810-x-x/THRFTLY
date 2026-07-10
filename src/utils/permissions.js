/* ==========================================
   Permissions Helper
========================================== */
/* ---------- Imports ---------- */
import * as Location from 'expo-location';
import { Camera } from 'expo-camera'; // Menggunakan module Camera lama atau CameraView dari expo-camera

/**
 * requestLocationPermission
 * Meminta izin kepada pengguna untuk mengakses lokasi perangkat.
 * Mengikuti pedoman privasi OS.
 * 
 * @returns {boolean} True jika izin diberikan, false jika ditolak.
 */
export const requestLocationPermission = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error("Gagal meminta izin lokasi:", error);
    return false;
  }
};

/**
 * requestCameraPermission
 * Meminta izin akses kamera perangkat.
 * 
 * @returns {boolean} True jika izin diberikan, false jika ditolak.
 */
export const requestCameraPermission = async () => {
  try {
    const { status } = await Camera.requestCameraPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error("Gagal meminta izin kamera:", error);
    return false;
  }
};
