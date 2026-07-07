// src/constants/Colors.js
// Design Token Color System — Thriftly (Digital Gen-Z)

const Colors = {
  // ─── PRIMARY ──────────────────────────────────────────
  primary: {
    blue700: '#1A56DB',
    blue500: '#2979FF',   // Main primary — header, logo, harga, ikon aktif
    blue400: '#5C9FFF',
    blue300: '#93BFFF',
    blue200: '#C8DCFF',
    blue100: '#E8F0FF',
    yellow500: '#FFD600', // Main accent — CTA button, badge HOT, center nav
    yellow300: '#FFEB6B',
  },

  // ─── NEUTRAL LIGHT MODE (Struktur Kunci Identik dengan Dark) ───
  light: {
    background: '#F5F7FA',
    surface:    '#FFFFFF',
    border:     '#E8ECF0',
    divider:    '#CBD2DA',
    text: {
      placeholder: '#9AA3AF',
      secondary:   '#6B7280',
      primary:     '#374151',
      heading:     '#1A1A2E',
    },
  },

  // ─── NEUTRAL DARK MODE (Struktur Kunci Identik dengan Light) ───
  dark: {
    background: '#0F0F1A',
    surface:    '#1A1A2E',
    border:     '#2E2E45',
    divider:    '#3D3D5C',
    text: {
      placeholder: '#6B6B8A',
      secondary:   '#A0A3B1',
      primary:     '#FFFFFF',
      heading:     '#FFFFFF', // Di dark mode, heading juga putih
    },
  },

  // ─── SEMANTIC ─────────────────────────────────────────
  semantic: {
    success: { light: '#D1FAE5', main: '#10B981', dark: '#065F46' },
    warning: { light: '#FEF3C7', main: '#F59E0B', dark: '#92400E' },
    error:   { light: '#FEE2E2', main: '#EF4444', dark: '#991B1B' },
    info:    { light: '#DBEAFE', main: '#3B82F6', dark: '#1E40AF' },
  },
};

export default Colors;
