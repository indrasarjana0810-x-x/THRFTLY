/* ==========================================
   Sistem Token Warna — Thriftly
========================================== */

const colors = {
  // ─── PRIMARY ──────────────────────────────────────────
  primary: {
    blue700: '#1A56DB',
    blue500: '#2979FF',   // Warna primer utama — header, logo, harga, ikon aktif
    blue400: '#5C9FFF',
    blue300: '#93BFFF',
    blue200: '#C8DCFF',
    blue100: '#E8F0FF',
    yellow500: '#FFD600', // Warna aksen utama — tombol CTA, badge HOT, nav tengah
    yellow300: '#FFEB6B',
  },

  /* ---------- Mode Terang (Struktur Identik dengan Mode Gelap) ---------- */
  light: {
    background: '#F5F7FA',
    surface: '#FFFFFF',
    border: '#E8ECF0',
    divider: '#CBD2DA',
    text: {
      placeholder: '#9AA3AF',
      secondary: '#6B7280',
      primary: '#374151',
      heading: '#1A1A2E',
    },
  },

  /* ---------- Mode Gelap (Struktur Identik dengan Mode Terang) ---------- */
  dark: {
    background: '#0A0A0A',
    surface: '#1A1A2E',
    border: '#2E2E45',
    divider: '#3D3D5C',
    text: {
      placeholder: '#6B6B8A',
      secondary: '#A0A3B1',
      primary: '#FFFFFF',
      heading: '#FFFFFF', // Di dark mode, heading juga putih
    },
  },

  /* ---------- Semantik ---------- */
  semantic: {
    success: { light: '#D1FAE5', main: '#10B981', dark: '#065F46' },
    warning: { light: '#FEF3C7', main: '#F59E0B', dark: '#92400E' },
    error: { light: '#FEE2E2', main: '#EF4444', dark: '#991B1B' },
    info: { light: '#DBEAFE', main: '#3B82F6', dark: '#1E40AF' },
    whatsapp: '#25D366', // Warna khas WhatsApp
  },

  /* ---------- Umum ---------- */
  common: {
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
  }
};

export default colors;
