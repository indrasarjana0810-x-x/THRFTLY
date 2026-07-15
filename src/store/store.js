/* ==========================================
   Redux Store Configuration
========================================== */
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
  // Tambahkan middleware lain kalau butuh
});

export default store;
