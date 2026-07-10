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
export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return 'Rp 0';
  
  return 'Rp ' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};
