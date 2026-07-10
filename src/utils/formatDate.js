/* ==========================================
   Date Formatter Utility
========================================== */

/**
 * formatDate
 * Mengubah string ISO date menjadi format tanggal lokal (Indonesia).
 * 
 * @param {string} dateString - ISO Date string (misal: 2026-04-18T15:49:28)
 * @returns {string} Tanggal yang diformat (misal: 18 April 2026)
 */
export const formatDate = (dateString) => {
  if (!dateString) return '-';
  
  const options = { day: 'numeric', month: 'long', year: 'numeric' };
  const date = new Date(dateString);
  
  // Gunakan fallback manual jika toLocaleDateString bermasalah di RN lama
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};
