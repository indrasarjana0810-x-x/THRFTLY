/* ==========================================
   Currency Formatter Utility
========================================== */

/**
 * formatCurrency
 * Mengubah angka menjadi format Rupiah (Rp).
 * 
 * @param {number} amount - Angka yang akan diubah
 * @returns {string} String dengan format Rp XX.XXX
 */
export const formatCurrency = (amount, locale = 'id') => {
  if (amount === undefined || amount === null) return locale === 'id' ? 'Rp 0' : 'IDR 0';
  
  if (locale === 'en') {
    return 'IDR ' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  return 'Rp ' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};
