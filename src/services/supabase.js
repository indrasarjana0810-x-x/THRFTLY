// src/services/supabase.js
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

const SUPABASE_URL = 'https://mzhscdlhpwpivcrgedop.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16aHNjZGxocHdwaXZjcmdlZG9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2Njc2MjYsImV4cCI6MjA5OTI0MzYyNn0.0W-OGNHaILhNlzISfedDAOfOwxbQMVXLlwlSbsozAPA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Upload an image to Supabase Storage
 * @param {string} localUri - The local file URI from expo-image-picker
 * @param {string} folder - The folder to upload to (e.g., 'avatars', 'products')
 * @returns {Promise<string>} - Returns the public URL of the uploaded image
 */
export const uploadImageToSupabase = async (localUri, folder = 'avatars') => {
  try {
    // 1. Dapatkan ekstensi file
    const fileExt = localUri.split('.').pop()?.toLowerCase() || 'jpg';
    
    // 2. Buat nama file unik
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    // 3. Baca file sebagai Base64
    const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: 'base64' });
    
    // 4. Upload ke Supabase menggunakan ArrayBuffer (standar untuk image di supabase-js versi baru)
    const { data, error } = await supabase.storage
      .from('thriftly-storage')
      .upload(fileName, decode(base64), {
        contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
        upsert: false
      });
      
    if (error) {
      throw error;
    }
    
    // 5. Dapatkan URL Publik
    const { data: publicUrlData } = supabase.storage
      .from('thriftly-storage')
      .getPublicUrl(fileName);
      
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error uploading image to Supabase:', error);
    throw error;
  }
};

/**
 * Hapus gambar dari Supabase Storage berdasarkan Public URL
 * @param {string} publicUrl - URL publik gambar dari Supabase
 */
export const deleteImageFromSupabase = async (publicUrl) => {
  try {
    if (!publicUrl) return;
    
    const bucketName = 'thriftly-storage';
    // Mengekstrak jalur file dari public URL
    const urlParts = publicUrl.split(`${bucketName}/`);
    
    if (urlParts.length === 2) {
      const filePath = urlParts[1]; // Contoh: "avatars/12345.jpg"
      
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);
        
      if (error) {
        console.error('Gagal menghapus gambar lama dari Supabase:', error);
      }
    }
  } catch (error) {
    console.error('Error saat menghapus gambar Supabase:', error);
  }
};
