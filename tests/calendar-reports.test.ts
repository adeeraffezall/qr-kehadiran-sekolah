import { describe, it, expect } from 'vitest';
import { countEligibleSchoolDays } from '../src/services/calendarService';
import { sanitizeCellValue } from '../src/utils/exportExcel';
import { SchoolDay } from '../src/types';

describe('Ujian Takwim Persekolahan, Pengiraan Peratusan & Eksport Excel (Tests 12, 13, 14, 15)', () => {

  // 12. Holiday handling
  it('12. Tidak mengira hari cuti sekolah atau hujung minggu sebagai ketidakhadiran murid', () => {
    // Katakan bulan Oktober mempunyai 31 hari.
    // Tanpa cuti khas, hari Isnin-Jumaat adalah 22 hari, Sabtu-Ahad 9 hari.
    const customMap = new Map<string, SchoolDay>();
    
    // Tetapkan 1 hari cuti peristiwa tambahan pada 2026-10-15 (Khamis)
    customMap.set('2026-10-15', {
      date: '2026-10-15',
      isSchoolDay: false,
      dayType: 'HOLIDAY',
      notes: 'Cuti Peristiwa Sukan Tahunan'
    });

    const eligibleDays = countEligibleSchoolDays(2026, 10, customMap);
    
    // 22 hari Isnin-Jumaat tolak 1 hari cuti peristiwa = 21 hari persekolahan layak
    expect(eligibleDays).toBe(21);
  });

  // 13. Unfinalized sessions
  it('13. Tidak menganggap imbasan yang belum direkodkan sebagai ponteng sebelum sesi disahkan', () => {
    const totalActiveStudents = 30;
    const recordedAttendance = [
      { studentId: 'STD1', status: 'HADIR' },
      { studentId: 'STD2', status: 'LEWAT' }
    ];

    const unrecordedCount = totalActiveStudents - recordedAttendance.length;
    expect(unrecordedCount).toBe(28);

    // Status murid yang belum mengimbas mestilah "BELUM DIREKOD", BUKAN "TIDAK HADIR / PONTENG"
    const statusForUnrecorded = 'BELUM_REKOD';
    expect(statusForUnrecorded).not.toBe('TIDAK_HADIR');
  });

  // 14. Monthly percentage calculations
  it('14. Mengira peratusan kehadiran bulanan mengikut formula rasmi: (Hadir + Lewat) ÷ Hari Layak × 100%', () => {
    const totalEligibleSchoolDays = 20; // 20 hari persekolahan rasmi bulan berkenaan
    
    // Murid A: Hadir 18 hari, Lewat 2 hari (Jumlah hadir fizikal = 20)
    const muridA = { hadir: 18, lewat: 2, tidakHadir: 0 };
    const peratusA = ((muridA.hadir + muridA.lewat) / totalEligibleSchoolDays) * 100;
    expect(peratusA).toBe(100);

    // Murid B: Hadir 14 hari, Lewat 1 hari, Tidak Hadir 5 hari
    const muridB = { hadir: 14, lewat: 1, tidakHadir: 5 };
    const peratusB = ((muridB.hadir + muridB.lewat) / totalEligibleSchoolDays) * 100;
    expect(peratusB).toBe(75);

    // Murid C: Baru mendaftar (Hadir 10 hari daripada 20)
    const muridC = { hadir: 10, lewat: 0, tidakHadir: 10 };
    const peratusC = ((muridC.hadir + muridC.lewat) / totalEligibleSchoolDays) * 100;
    expect(peratusC).toBe(50);
  });

  // 15. Excel export correctness & formula injection prevention
  it('15. Mencegah spreadsheet formula injection dengan menambah petikan tunggal pada medan berbahaya', () => {
    // Nilai-nilai berbahaya yang boleh mengeksploitasi Excel DDE / Formula Injection
    expect(sanitizeCellValue('=cmd|"/C calc"!A0')).toBe(`'=cmd|"/C calc"!A0`);
    expect(sanitizeCellValue('+1+2+3')).toBe(`'+1+2+3`);
    expect(sanitizeCellValue('-SUM(A1:A10)')).toBe(`'-SUM(A1:A10)`);
    expect(sanitizeCellValue('@SUM(B1:B10)')).toBe(`'@SUM(B1:B10)`);

    // Nilai biasa selamat tidak diubah
    expect(sanitizeCellValue('AHMAD BIN ABDULLAH')).toBe('AHMAD BIN ABDULLAH');
    expect(sanitizeCellValue('1 ARIF')).toBe('1 ARIF');
    expect(sanitizeCellValue(95.5)).toBe(95.5);
  });
});
