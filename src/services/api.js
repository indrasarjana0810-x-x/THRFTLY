/* ==========================================
   API Client
========================================== */
import axios from "axios";
import Config from "./config";

const apiClient = axios.create({
  baseURL: Config.BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

/**
 * setAuthToken
 * Sets or removes the JWT Token from headers dynamically.
 */
export const setAuthToken = (token) => {
  if (token) {
    apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common["Authorization"];
  }
};

/* ---------- API Endpoints ---------- */

const api = {
  auth: {
    /**
     * Register
     * Mendaftarkan akun mahasiswa baru ke server.
     */
    register: async (userData) => {
      const response = await apiClient.post("/auth/register", userData);
      return response.data;
    },
    
    /**
     * Login
     * Autentikasi pengguna menggunakan NIM/Email dan password.
     */
    login: async (nim, password) => {
      const response = await apiClient.post("/auth/login", {
        nim,
        password,
      });
      return response.data;
    },

    /**
     * Forgot Password
     * Meminta pengiriman kode OTP untuk mereset kata sandi.
     */
    forgotPassword: async (nim) => {
      const response = await apiClient.post("/auth/forgot-password", {
        nim,
      });
      return response.data;
    },

    /**
     * Verify OTP
     * Memverifikasi kode OTP yang dimasukkan oleh pengguna.
     */
    verifyOtp: async (nim, otpCode) => {
      const response = await apiClient.post("/auth/verify-otp", {
        nim,
        otpCode,
      });
      return response.data;
    },

    /**
     * Reset Password
     * Menyimpan kata sandi baru setelah OTP divalidasi.
     */
    resetPassword: async (nim, otpCode, newPassword) => {
      const response = await apiClient.post("/auth/reset-password", {
        nim,
        otpCode,
        newPassword,
      });
      return response.data;
    },

    /**
     * Update Profile
     * Mengubah data profil mahasiswa di database backend.
     */
    updateProfile: async (profileData) => {
      const response = await apiClient.put("/auth/update-profile", profileData);
      return response.data;
    },
  },

  categories: {
    /**
     * Get All
     * Mengambil daftar seluruh kategori barang yang aktif.
     */
    getAll: async () => {
      const response = await apiClient.get("/categories");
      return response.data;
    },
  },

  items: {
    /**
     * Get All Available
     * Mengambil daftar barang yang masih tersedia (status != Sold).
     */
    getAll: async () => {
      const response = await apiClient.get("/items");
      return response.data;
    },

    /**
     * Get Seller Items
     * Mengambil daftar iklan yang dipasang oleh penjual saat ini.
     */
    getSellerItems: async () => {
      const response = await apiClient.get("/items/seller");
      return response.data;
    },

    /**
     * Create
     * Memasang iklan barang baru.
     */
    create: async (itemData) => {
      const response = await apiClient.post("/items", itemData);
      return response.data;
    },

    /**
     * Update Status
     * Mengubah status barang ('Available' | 'Booked' | 'Sold').
     */
    updateStatus: async (itemId, status) => {
      const response = await apiClient.put(`/items/${itemId}/status`, { status });
      return response.data;
    },

    /**
     * Update Item
     * Mengedit detail barang jualan yang sudah ada.
     */
    update: async (itemId, itemData) => {
      const response = await apiClient.put(`/items/${itemId}`, itemData);
      return response.data;
    },

    /**
     * Delete
     * Menghapus iklan barang.
     */
    delete: async (itemId) => {
      const response = await apiClient.delete(`/items/${itemId}`);
      return response.data;
    },
  },

  transactions: {
    /**
     * Get Purchases
     * Mengambil riwayat pembelian mahasiswa saat ini.
     */
    getPurchases: async () => {
      const response = await apiClient.get("/transactions/purchases");
      return response.data;
    },

    /**
     * Get Sales
     * Mengambil riwayat penjualan mahasiswa saat ini.
     */
    getSales: async () => {
      const response = await apiClient.get("/transactions/sales");
      return response.data;
    },

    /**
     * Book/Order Item
     * Memesan barang (Booking COD).
     */
    book: async (itemId, meetingNote) => {
      const response = await apiClient.post("/transactions", { itemId, meetingNote });
      return response.data;
    },

    /**
     * Update Transaction Status
     * Menyetujui/Menolak/Membatalkan booking.
     */
    updateStatus: async (transId, status) => {
      const response = await apiClient.put(`/transactions/${transId}/status`, { status });
      return response.data;
    },
  },

  wishlist: {
    /**
     * Get All
     * Mengambil daftar ID barang yang dimasukkan ke wishlist.
     */
    get: async () => {
      const response = await apiClient.get("/wishlist");
      return response.data;
    },

    /**
     * Toggle Wishlist
     * Menambahkan/Menghapus barang ke wishlist.
     */
    toggle: async (itemId) => {
      const response = await apiClient.post(`/wishlist/${itemId}`);
      return response.data;
    },
  },

  reports: {
    /**
     * Submit Report
     * Melaporkan iklan barang yang melanggar standar.
     */
    submit: async (itemId, reason, detail = "") => {
      const response = await apiClient.post("/reports", { itemId, reason, detail });
      return response.data;
    },

    /**
     * Get Seller Reports
     * Mengambil semua laporan yang masuk untuk iklan milik penjual saat ini.
     * Digunakan untuk notifikasi langsung ke penjual.
     */
    getForSeller: async () => {
      const response = await apiClient.get("/reports/seller");
      return response.data;
    },

    /**
     * Reset Reports
     * Menghapus semua laporan terkumpul untuk suatu barang (digunakan setelah barang diperbaiki).
     */
    reset: async (itemId) => {
      const response = await apiClient.delete(`/reports/item/${itemId}`);
      return response.data;
    },
  },
};

export default api;
