/* ==========================================
   Klien API (Axios)
========================================== */
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Config from "./config";

const apiClient = axios.create({
  baseURL: Config.BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

/* ---------- Axios Interceptor ---------- */
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.log('Gagal mengambil token untuk interceptor', e);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

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
  },
  users: {
    /**
     * Get Profile
     * Mengambil data profil user yang sedang login dari token.
     */
    getProfile: async () => {
      const response = await apiClient.get("/profile");
      return response.data;
    },

    /**
     * Update Avatar
     * Menyimpan URL avatar baru ke database backend.
     */
    updateAvatar: async (profileUrl) => {
      const response = await apiClient.put("/profile/avatar", { profileUrl });
      return response.data;
    },

    /**
     * Update Profile
     * Memperbarui nama dan telepon pengguna.
     */
    updateProfile: async (name, phone) => {
      const response = await apiClient.put("/profile/update", { name, phone });
      return response.data;
    },

    /**
     * Change Password
     * Mengubah kata sandi pengguna dari Pusat Akun.
     */
    changePassword: async (oldPassword, newPassword, confirmPassword) => {
      const response = await apiClient.put("/profile/password", {
        oldPassword,
        newPassword,
        confirmPassword
      });
      return response.data;
    }
  },
  categories: {
    /**
     * Get Active Categories
     * Mengambil daftar kategori yang aktif untuk form posting dan filter.
     */
    getActive: async () => {
      const response = await apiClient.get("/category");
      return response.data;
    }
  },
  checksheet: {
    /**
     * Get Checksheet Templates
     * Mengambil template checksheet berdasarkan ID kategori.
     */
    getTemplates: async (categoryId) => {
      const response = await apiClient.get(`/checksheet/template/${categoryId}`);
      return response.data;
    }
  },
  cart: {
    get: async () => {
      const response = await apiClient.get("/cart");
      return response.data;
    },
    toggle: async (idItem) => {
      const response = await apiClient.post(`/cart/toggle/${idItem}`);
      return response.data;
    }
  },
  items: {
    /**
     * Create Item
     * Memposting listing barang baru ke backend.
     */
    create: async (itemData) => {
      const response = await apiClient.post("/item", itemData);
      return response.data;
    },

    /**
     * Get All Items
     * Mengambil daftar semua barang aktif dengan filter opsional.
     */
    getAll: async (params) => {
      const response = await apiClient.get("/item", { params });
      return response.data;
    },

    /**
     * Get My Items
     * Mengambil daftar barang milik user yang sedang login.
     */
    getMy: async (status) => {
      const response = await apiClient.get("/item/my", { params: { status } });
      return response.data;
    },

    /**
     * Get Item Detail
     * Mengambil data lengkap barang berdasarkan ID.
     */
    getById: async (id) => {
      const response = await apiClient.get(`/item/${id}`);
      return response.data;
    },

    /**
     * Update Item
     * Memperbarui detail informasi barang milik sendiri.
     */
    update: async (id, itemData) => {
      const response = await apiClient.put(`/item/${id}`, itemData);
      return response.data;
    },

    /**
     * Update Item Status
     * Mengubah status jualan barang (Available, Booked, Sold).
     */
    updateStatus: async (id, status) => {
      const response = await apiClient.put(`/item/${id}/status`, { status });
      return response.data;
    },

    /**
     * Delete Item
     * Menghapus listing barang milik sendiri dari server.
     */
    delete: async (id) => {
      const response = await apiClient.delete(`/item/${id}`);
      return response.data;
    }
  },
  transaction: {
    checkout: async (itemIds, meetingNote) => {
      const response = await apiClient.post("/transaction/checkout", { itemIds, meetingNote });
      return response.data;
    },
    getBuyerTransactions: async () => {
      const response = await apiClient.get("/transaction/buyer");
      return response.data;
    },
    getSellerTransactions: async () => {
      const response = await apiClient.get("/transaction/seller");
      return response.data;
    },
    updateStatus: async (id, status) => {
      const response = await apiClient.put(`/transaction/${id}/status`, { status });
      return response.data;
    }
  },
  checksheet: {
    getTemplates: async (categoryId) => {
      const response = await apiClient.get(`/checksheet/template/${categoryId}`);
      return response.data;
    }
  }
};

export default api;
