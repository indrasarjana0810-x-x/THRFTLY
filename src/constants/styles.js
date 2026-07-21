/* ==========================================
   Sistem Gaya Visual & Bayangan (Shadows)
========================================== */
import { Platform, StyleSheet } from 'react-native';
import Colors from './colors';

export const Shadows = {
  light: {
    shadowColor: Colors.common.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: Colors.common.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  primary: {
    shadowColor: Colors.primary.blue500,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  success: {
    shadowColor: Colors.semantic.success.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  }
};

export const UIStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    ...Shadows.light,
  },
  pill: {
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
