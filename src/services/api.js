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
};

export default api;
