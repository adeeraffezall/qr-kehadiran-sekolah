/**
 * Enjin Takwim Rasmi Persekolahan Kementerian Pendidikan Malaysia (KPM)
 * Khusus untuk Kumpulan B — Negeri Sabah (SK Batandok Beaufort XBA6003)
 * 
 * Meliputi:
 * 1. Hari Kelepasan Am Persekutuan (Kebangsaan)
 * 2. Hari Kelepasan Am Negeri Sabah (Pesta Kaamatan, TYT Sabah, dsb.)
 * 3. Cuti Penggal Persekolahan Rasmi KPM (Penggal 1, 2, 3 & Akhir Sesi)
 * 4. Cuti Perayaan Tambahan Peruntukan Rasmi KPM
 */

import { SchoolDay } from '../types';
import { isWeekend } from '../utils/dateUtils';

export interface KPMHolidayInfo {
  date: string; // YYYY-MM-DD
  name: string; // Sebab / Nama Cuti Rasmi
  category: 'NATIONAL' | 'STATE' | 'KPM_TERM' | 'KPM_FESTIVE';
  categoryLabel: string;
  badgeColor: 'red' | 'purple' | 'blue' | 'orange';
}

// Pangkalan Data Takwim Rasmi KPM & Cuti Am Sabah (Sesi 2025, 2026, 2027)
const KPM_HOLIDAYS_MAP: Record<string, Omit<KPMHolidayInfo, 'date'>> = {
  // =========================================================================
  // TAHUN 2026 (Sesi Persekolahan Utama)
  // =========================================================================
  // Januari 2026
  '2026-01-01': { name: 'Tahun Baharu 2026 (Hari Kelepasan Am Sabah)', category: 'STATE', categoryLabel: 'Cuti Negeri Sabah', badgeColor: 'purple' },
  '2026-01-17': { name: 'Cuti Akhir Sesi Persekolahan KPM 2025/2026', category: 'KPM_TERM', categoryLabel: 'Cuti Penggal KPM', badgeColor: 'blue' },
  '2026-01-18': { name: 'Cuti Akhir Sesi Persekolahan KPM 2025/2026', category: 'KPM_TERM', categoryLabel: 'Cuti Penggal KPM', badgeColor: 'blue' },
  '2026-01-19': { name: 'Cuti Akhir Sesi Persekolahan KPM 2025/2026', category: 'KPM_TERM', categoryLabel: 'Cuti Penggal KPM', badgeColor: 'blue' },
  '2026-01-20': { name: 'Cuti Akhir Sesi Persekolahan KPM 2025/2026', category: 'KPM_TERM', categoryLabel: 'Cuti Penggal KPM', badgeColor: 'blue' },
  '2026-01-21': { name: 'Cuti Akhir Sesi Persekolahan KPM 2025/2026', category: 'KPM_TERM', categoryLabel: 'Cuti Penggal KPM', badgeColor: 'blue' },
  '2026-01-22': { name: 'Cuti Akhir Sesi Persekolahan KPM 2025/2026', category: 'KPM_TERM', categoryLabel: 'Cuti Penggal KPM', badgeColor: 'blue' },
  '2026-01-23': { name: 'Cuti Akhir Sesi Persekolahan KPM 2025/2026', category: 'KPM_TERM', categoryLabel: 'Cuti Penggal KPM', badgeColor: 'blue' },

  // Februari 2026
  '2026-02-16': { name: 'Cuti Perayaan Tambahan KPM (Tahun Baharu Cina)', category: 'KPM_FESTIVE', categoryLabel: 'Cuti Tambahan KPM', badgeColor: 'orange' },
  '2026-02-17': { name: 'Tahun Baharu Cina (Hari Pertama)', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' },
  '2026-02-18': { name: 'Tahun Baharu Cina (Hari Kedua)', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' },
  '2026-02-19': { name: 'Cuti Perayaan Tambahan KPM (Tahun Baharu Cina)', category: 'KPM_FESTIVE', categoryLabel: 'Cuti Tambahan KPM', badgeColor: 'orange' },

  // Mac 2026
  '2026-03-18': { name: 'Cuti Perayaan Tambahan KPM (Hari Raya Aidilfitri)', category: 'KPM_FESTIVE', categoryLabel: 'Cuti Tambahan KPM', badgeColor: 'orange' },
  '2026-03-19': { name: 'Cuti Perayaan Tambahan KPM (Hari Raya Aidilfitri)', category: 'KPM_FESTIVE', categoryLabel: 'Cuti Tambahan KPM', badgeColor: 'orange' },
  '2026-03-20': { name: 'Hari Raya Aidilfitri (Hari Pertama)', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' },
  '2026-03-21': { name: 'Hari Raya Aidilfitri (Hari Kedua)', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' },
  '2026-03-23': { name: 'Cuti Perayaan Tambahan KPM (Hari Raya Aidilfitri)', category: 'KPM_FESTIVE', categoryLabel: 'Cuti Tambahan KPM', badgeColor: 'orange' },

  // April 2026
  '2026-04-03': { name: 'Good Friday / Jumaat Agung (Hari Kelepasan Am Sabah)', category: 'STATE', categoryLabel: 'Cuti Negeri Sabah', badgeColor: 'purple' },

  // Mei 2026
  '2026-05-01': { name: 'Hari Pekerja (Hari Kelepasan Am)', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' },
  '2026-05-23': { name: 'Cuti Penggal 1 Persekolahan KPM 2026/2027', category: 'KPM_TERM', categoryLabel: 'Cuti Penggal KPM', badgeColor: 'blue' },
  '2026-05-24': { name: 'Cuti Penggal 1 Persekolahan KPM 2026/2027', category: 'KPM_TERM', categoryLabel: 'Cuti Penggal KPM', badgeColor: 'blue' },
  '2026-05-25': { name: 'Cuti Penggal 1 Persekolahan KPM 2026/2027', category: 'KPM_TERM', categoryLabel: 'Cuti Penggal KPM', badgeColor: 'blue' },
  '2026-05-26': { name: 'Cuti Penggal 1 Persekolahan KPM 2026/2027', category: 'KPM_TERM', categoryLabel: 'Cuti Penggal KPM', badgeColor: 'blue' },
  '2026-05-27': { name: 'Hari Raya Haji / Aidiladha (Dalam Penggal 1)', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' },
  '2026-05-28': { name: 'Cuti Penggal 1 Persekolahan KPM 2026/2027', category: 'KPM_TERM', categoryLabel: 'Cuti Penggal KPM', badgeColor: 'blue' },
  '2026-05-29': { name: 'Cuti Penggal 1 Persekolahan KPM 2026/2027', category: 'KPM_TERM', categoryLabel: 'Cuti Penggal KPM', badgeColor: 'blue' },
  '2026-05-30': { name: 'Pesta Kaamatan (Hari Pertama - Cuti Am Sabah)', category: 'STATE', categoryLabel: 'Cuti Negeri Sabah', badgeColor: 'purple' },
  '2026-05-31': { name: 'Pesta Kaamatan (Hari Kedua - Cuti Am Sabah)', category: 'STATE', categoryLabel: 'Cuti Negeri Sabah', badgeColor: 'purple' },

  // Jun 2026
  '2026-06-01': { name: 'Hari Keputeraan Seri Paduka Baginda Yang di-Pertuan Agong', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' },
  '2026-06-16': { name: 'Awal Muharram / Maal Hijrah 1448H', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' },

  // Ogos 2026
  '2026-08-25': { name: 'Maulidur Rasul (Hari Kelepasan Am)', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' },
  '2026-08-29': { name: 'Cuti Penggal 2 Persekolahan KPM 2026/2027', category: 'KPM_TERM', categoryLabel: 'Cuti Penggal KPM', badgeColor: 'blue' },
  '2026-08-30': { name: 'Cuti Penggal 2 Persekolahan KPM 2026/2027', category: 'KPM_TERM', categoryLabel: 'Cuti Penggal KPM', badgeColor: 'blue' },
  '2026-08-31': { name: 'Hari Kebangsaan Malaysia (Hari Kelepasan Am Persekutuan)', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' },

  // September 2026
  '2026-09-01': { name: 'Cuti Penggal 2 Persekolahan KPM 2026/2027', category: 'KPM_TERM', categoryLabel: 'Cuti Penggal KPM', badgeColor: 'blue' },
  '2026-09-02': { name: 'Cuti Penggal 2 Persekolahan KPM 2026/2027', category: 'KPM_TERM', categoryLabel: 'Cuti Penggal KPM', badgeColor: 'blue' },
  '2026-09-03': { name: 'Cuti Penggal 2 Persekolahan KPM 2026/2027', category: 'KPM_TERM', categoryLabel: 'Cuti Penggal KPM', badgeColor: 'blue' },
  '2026-09-04': { name: 'Cuti Penggal 2 Persekolahan KPM 2026/2027', category: 'KPM_TERM', categoryLabel: 'Cuti Penggal KPM', badgeColor: 'blue' },
  '2026-09-05': { name: 'Cuti Penggal 2 Persekolahan KPM 2026/2027', category: 'KPM_TERM', categoryLabel: 'Cuti Penggal KPM', badgeColor: 'blue' },
  '2026-09-06': { name: 'Cuti Penggal 2 Persekolahan KPM 2026/2027', category: 'KPM_TERM', categoryLabel: 'Cuti Penggal KPM', badgeColor: 'blue' },
  '2026-09-16': { name: 'Hari Malaysia (Hari Kelepasan Am Persekutuan)', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' },

  // Oktober 2026 (Semua hari Isnin - Jumaat adalah Hari Persekolahan Biasa)
  '2026-10-03': { name: 'Hari Jadi Yang di-Pertua Negeri Sabah (Cuti Am Sabah)', category: 'STATE', categoryLabel: 'Cuti Negeri Sabah', badgeColor: 'purple' },

  // November 2026 (Perayaan Deepavali)
  '2026-11-08': { name: 'Hari Deepavali (Hari Kelepasan Am Persekutuan)', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' },
  '2026-11-09': { name: 'Cuti Perayaan Tambahan KPM (Deepavali Kumpulan B)', category: 'KPM_FESTIVE', categoryLabel: 'Cuti Tambahan KPM', badgeColor: 'orange' },
  '2026-11-10': { name: 'Cuti Perayaan Tambahan KPM (Deepavali Kumpulan B)', category: 'KPM_FESTIVE', categoryLabel: 'Cuti Tambahan KPM', badgeColor: 'orange' },

  // Disember 2026
  '2026-12-19': { name: 'Cuti Penggal 3 Persekolahan KPM 2026/2027', category: 'KPM_TERM', categoryLabel: 'Cuti Penggal KPM', badgeColor: 'blue' },
  '2026-12-20': { name: 'Cuti Penggal 3 Persekolahan KPM 2026/2027', category: 'KPM_TERM', categoryLabel: 'Cuti Penggal KPM', badgeColor: 'blue' },
  '2026-12-21': { name: 'Cuti Penggal 3 Persekolahan KPM 2026/2027', category: 'KPM_TERM', categoryLabel: 'Cuti Penggal KPM', badgeColor: 'blue' },
  '2026-12-22': { name: 'Cuti Penggal 3 Persekolahan KPM 2026/2027', category: 'KPM_TERM', categoryLabel: 'Cuti Penggal KPM', badgeColor: 'blue' },
  '2026-12-23': { name: 'Cuti Penggal 3 Persekolahan KPM 2026/2027', category: 'KPM_TERM', categoryLabel: 'Cuti Penggal KPM', badgeColor: 'blue' },
  '2026-12-24': { name: 'Cuti Sebelum Krismas (Hari Kelepasan Am Sabah)', category: 'STATE', categoryLabel: 'Cuti Negeri Sabah', badgeColor: 'purple' },
  '2026-12-25': { name: 'Hari Krismas (Hari Kelepasan Am Persekutuan)', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' },
  '2026-12-26': { name: 'Cuti Penggal 3 Persekolahan KPM 2026/2027', category: 'KPM_TERM', categoryLabel: 'Cuti Penggal KPM', badgeColor: 'blue' },
  '2026-12-27': { name: 'Cuti Penggal 3 Persekolahan KPM 2026/2027', category: 'KPM_TERM', categoryLabel: 'Cuti Penggal KPM', badgeColor: 'blue' },
  '2026-12-28': { name: 'Cuti Penggal 3 Persekolahan KPM 2026/2027', category: 'KPM_TERM', categoryLabel: 'Cuti Penggal KPM', badgeColor: 'blue' },
  '2026-12-29': { name: 'Cuti Penggal 3 Persekolahan KPM 2026/2027', category: 'KPM_TERM', categoryLabel: 'Cuti Penggal KPM', badgeColor: 'blue' },
  '2026-12-30': { name: 'Cuti Penggal 3 Persekolahan KPM 2026/2027', category: 'KPM_TERM', categoryLabel: 'Cuti Penggal KPM', badgeColor: 'blue' },
  '2026-12-31': { name: 'Cuti Penggal 3 Persekolahan KPM 2026/2027', category: 'KPM_TERM', categoryLabel: 'Cuti Penggal KPM', badgeColor: 'blue' },

  // =========================================================================
  // TAHUN 2027 (Kalendar Persekolahan)
  // =========================================================================
  '2027-02-06': { name: 'Tahun Baharu Cina (Hari Pertama)', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' },
  '2027-02-07': { name: 'Tahun Baharu Cina (Hari Kedua)', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' },
  '2027-03-10': { name: 'Hari Raya Aidilfitri (Hari Pertama)', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' },
  '2027-03-11': { name: 'Hari Raya Aidilfitri (Hari Kedua)', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' },
  '2027-05-17': { name: 'Hari Raya Haji / Aidiladha', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' },
  '2027-06-07': { name: 'Hari Keputeraan YDP Agong', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' },
  '2027-10-28': { name: 'Hari Deepavali', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' },

  // =========================================================================
  // TAHUN 2028
  // =========================================================================
  '2028-01-26': { name: 'Tahun Baharu Cina (Hari Pertama)', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' },
  '2028-01-27': { name: 'Tahun Baharu Cina (Hari Kedua)', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' },
  '2028-02-27': { name: 'Hari Raya Aidilfitri (Hari Pertama)', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' },
  '2028-02-28': { name: 'Hari Raya Aidilfitri (Hari Kedua)', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' },
  '2028-05-05': { name: 'Hari Raya Haji / Aidiladha', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' },
  '2028-06-05': { name: 'Hari Keputeraan YDP Agong', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' },
  '2028-10-17': { name: 'Hari Deepavali', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' },

  // =========================================================================
  // TAHUN 2029
  // =========================================================================
  '2029-02-13': { name: 'Tahun Baharu Cina (Hari Pertama)', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' },
  '2029-02-14': { name: 'Tahun Baharu Cina (Hari Kedua)', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' },
  '2029-02-15': { name: 'Hari Raya Aidilfitri (Hari Pertama)', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' },
  '2029-02-16': { name: 'Hari Raya Aidilfitri (Hari Kedua)', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' },
  '2029-11-05': { name: 'Hari Deepavali', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' },

  // =========================================================================
  // TAHUN 2030
  // =========================================================================
  '2030-02-03': { name: 'Tahun Baharu Cina (Hari Pertama)', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' },
  '2030-02-04': { name: 'Tahun Baharu Cina (Hari Kedua)', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' },
  '2030-02-05': { name: 'Hari Raya Aidilfitri (Hari Pertama)', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' },
  '2030-02-06': { name: 'Hari Raya Aidilfitri (Hari Kedua)', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' },
  '2030-10-26': { name: 'Hari Deepavali', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' },
};

/**
 * Semak sama ada sesuatu tarikh itu adalah cuti rasmi KPM / Kelepasan Am Sabah
 * Menyokong takwim automatik dari tahun 2025 sehingga 2030+
 */
export function getKPMHoliday(dateStr: string): KPMHolidayInfo | null {
  // 1. Semak entri eksplisit dalam KPM_HOLIDAYS_MAP
  const item = KPM_HOLIDAYS_MAP[dateStr];
  if (item) {
    return {
      date: dateStr,
      ...item
    };
  }

  // 2. Semak cuti kelepasan am tahunan bertarikh tetap (Menyokong 2025 sehingga 2030+)
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const mmdd = `${parts[1]}-${parts[2]}`;
    if (mmdd === '01-01') {
      return { date: dateStr, name: 'Tahun Baharu (Hari Kelepasan Am Sabah)', category: 'STATE', categoryLabel: 'Cuti Negeri Sabah', badgeColor: 'purple' };
    }
    if (mmdd === '05-01') {
      return { date: dateStr, name: 'Hari Pekerja (Hari Kelepasan Am)', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' };
    }
    if (mmdd === '05-30') {
      return { date: dateStr, name: 'Pesta Kaamatan (Hari Pertama - Cuti Am Sabah)', category: 'STATE', categoryLabel: 'Cuti Negeri Sabah', badgeColor: 'purple' };
    }
    if (mmdd === '05-31') {
      return { date: dateStr, name: 'Pesta Kaamatan (Hari Kedua - Cuti Am Sabah)', category: 'STATE', categoryLabel: 'Cuti Negeri Sabah', badgeColor: 'purple' };
    }
    if (mmdd === '08-31') {
      return { date: dateStr, name: 'Hari Kebangsaan Malaysia (Hari Kelepasan Am)', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' };
    }
    if (mmdd === '09-16') {
      return { date: dateStr, name: 'Hari Malaysia (Hari Kelepasan Am)', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' };
    }
    if (mmdd === '12-24') {
      return { date: dateStr, name: 'Cuti Sebelum Krismas (Hari Kelepasan Am Sabah)', category: 'STATE', categoryLabel: 'Cuti Negeri Sabah', badgeColor: 'purple' };
    }
    if (mmdd === '12-25') {
      return { date: dateStr, name: 'Hari Krismas (Hari Kelepasan Am)', category: 'NATIONAL', categoryLabel: 'Cuti Umum Kebangsaan', badgeColor: 'red' };
    }
  }

  return null;
}

/**
 * Dapatkan semua senarai cuti KPM bagi bulan berkenaan
 */
export function getKPMHolidaysForMonth(year: number, month: number): KPMHolidayInfo[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const list: KPMHolidayInfo[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = String(d).padStart(2, '0');
    const mStr = String(month).padStart(2, '0');
    const fullDate = `${year}-${mStr}-${dStr}`;
    const h = getKPMHoliday(fullDate);
    if (h) {
      list.push(h);
    }
  }

  return list;
}

/**
 * Menyelesaikan status hari persekolahan dengan mematuhi Hierarki Keutamaan:
 * 1. Pindaan Manual Pentadbir (Highest Priority - Kebal & Kekal)
 * 2. Takwim Auto-Sync Rasmi KPM / Cuti Sabah (Smart Baseline)
 * 3. Hujung Minggu Piawai (Sabtu & Ahad)
 * 4. Hari Persekolahan Biasa
 */
export function resolveSchoolDay(
  dateStr: string,
  manualCustomDay?: SchoolDay | null
): SchoolDay {
  // KEUTAMAAN #1: Pindaan Manual Pentadbir Sekolah
  if (manualCustomDay && typeof manualCustomDay.isSchoolDay === 'boolean') {
    return {
      ...manualCustomDay,
      source: 'MANUAL_OVERRIDE',
      badgeColor: manualCustomDay.isSchoolDay ? 'green' : 'yellow',
      categoryLabel: 'Pindaan Sekolah'
    };
  }

  // KEUTAMAAN #2: Takwim Auto-Sync Rasmi KPM & Kelepasan Am Sabah
  const kpmHoliday = getKPMHoliday(dateStr);
  if (kpmHoliday) {
    return {
      date: dateStr,
      isSchoolDay: false,
      dayType: 'HOLIDAY',
      notes: kpmHoliday.name,
      source: 'KPM_AUTO',
      badgeColor: kpmHoliday.badgeColor,
      categoryLabel: kpmHoliday.categoryLabel
    };
  }

  // KEUTAMAAN #3: Cuti Hujung Minggu Biasa (Sabtu & Ahad)
  if (isWeekend(dateStr)) {
    return {
      date: dateStr,
      isSchoolDay: false,
      dayType: 'HOLIDAY',
      notes: 'Hujung Minggu (Sabtu / Ahad)',
      source: 'WEEKEND',
      badgeColor: 'gray',
      categoryLabel: 'Hujung Minggu'
    };
  }

  // KEUTAMAAN #4: Hari Persekolahan Biasa Kumpulan B (Isnin - Jumaat)
  return {
    date: dateStr,
    isSchoolDay: true,
    dayType: 'REGULAR',
    notes: 'Hari Persekolahan Biasa',
    source: 'DEFAULT',
    badgeColor: 'green',
    categoryLabel: 'Persekolahan'
  };
}
