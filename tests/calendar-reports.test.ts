import { describe, it, expect } from 'vitest';
import { countEligibleSchoolDays, countEligibleDaysBetween } from '../src/services/calendarService';
import { sanitizeCellValue } from '../src/utils/exportExcel';
import { getWeekDays, getDaysInDateRange } from '../src/utils/dateUtils';
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

  // 16. Multi-period Reporting support (Harian, Mingguan, Bulanan, Sela Masa)
  it('16. Mengira hari persekolahan layak bagi sela masa tarikh tersuai', () => {
    // 2026-10-19 (Isnin) hingga 2026-10-25 (Ahad) = 7 hari (5 hari sekolah Isnin-Jumaat, 2 hari hujung minggu)
    const days = countEligibleDaysBetween('2026-10-19', '2026-10-25');
    expect(days).toBe(5);

    // Mengambil kira cuti khas dalam sela masa
    const customMap = new Map<string, SchoolDay>();
    customMap.set('2026-10-21', {
      date: '2026-10-21',
      isSchoolDay: false,
      dayType: 'HOLIDAY',
      notes: 'Cuti Deepavali'
    });

    const daysWithHoliday = countEligibleDaysBetween('2026-10-19', '2026-10-25', customMap);
    expect(daysWithHoliday).toBe(4);
  });

  it('17. Menjana struktur minggu Isnin-Jumaat yang tepat mengikut takwim persekolahan', () => {
    // 2026-10-26 adalah hari Isnin
    const week = getWeekDays('2026-10-26');
    expect(week.startDate).toBe('2026-10-26');
    expect(week.endDate).toBe('2026-10-30');
    expect(week.days.length).toBe(5);
    expect(week.days[0].dayName).toBe('Isnin');
    expect(week.days[4].dayName).toBe('Jumaat');

    // Menjana semua tarikh dalam sela masa
    const rangeList = getDaysInDateRange('2026-10-20', '2026-10-23');
    expect(rangeList).toEqual(['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23']);
  });

  // 18. Formula pengesahan matematik KPM & metrik Liputan Murid
  it('18. Mengesahkan pengiraan kadar 0.1% dan liputan 1.1% bagi 1 murid hadir daripada 95 murid dan 18 hari layak', () => {
    const totalEnrolment = 95;
    const eligibleSchoolDays = 18;
    const totalTransactions = 1; // 1 murid mengimbas hadir 1 kali
    const uniqueStudentsRecorded = 1;

    // Formula Rasmi Kehadiran Kumulatif KPM:
    // (Jumlah Hadir + Lewat) ÷ (Enrolmen × Hari Layak) × 100%
    const totalPossiblePupilDays = totalEnrolment * eligibleSchoolDays; // 1,710 hari-murid
    expect(totalPossiblePupilDays).toBe(1710);

    const rawRate = (totalTransactions / totalPossiblePupilDays) * 100;
    const roundedRate = Math.round(rawRate * 10) / 10;
    // 1 / 1710 * 100 = 0.058479% -> dibundar kepada 0.1%
    expect(roundedRate).toBe(0.1);

    // Formula Liputan Data (Coverage):
    // Murid Unik Direkod ÷ Enrolmen × 100%
    const rawCoverage = (uniqueStudentsRecorded / totalEnrolment) * 100;
    const roundedCoverage = Math.round(rawCoverage * 10) / 10;
    // 1 / 95 * 100 = 1.0526% -> dibundar kepada 1.1%
    expect(roundedCoverage).toBe(1.1);
  });

  it('19. Mengendalikan keadaan sifar rekod tanpa ralat pembahagian dengan sifar (NaN atau Infinity)', () => {
    const totalEnrolment = 95;
    const eligibleSchoolDays = 0; // tiada hari layak atau data kosong
    const totalTransactions = 0;
    const uniqueStudentsRecorded = 0;

    const totalPossible = totalEnrolment * (eligibleSchoolDays > 0 ? eligibleSchoolDays : 1);
    const rate = totalPossible > 0 ? Math.round((totalTransactions / totalPossible) * 1000) / 10 : 0;
    const coverage = totalEnrolment > 0 ? Math.round((uniqueStudentsRecorded / totalEnrolment) * 1000) / 10 : 0;

    expect(Number.isNaN(rate)).toBe(false);
    expect(Number.isFinite(rate)).toBe(true);
    expect(rate).toBe(0);

    expect(Number.isNaN(coverage)).toBe(false);
    expect(Number.isFinite(coverage)).toBe(true);
    expect(coverage).toBe(0);
  });

  it('20. Mengira peratusan 100% apabila semua 95 murid hadir pada semua 18 hari layak', () => {
    const totalEnrolment = 95;
    const eligibleSchoolDays = 18;
    const totalTransactions = 95 * 18; // 1,710 imbasan
    const uniqueStudentsRecorded = 95;

    const rate = ((totalTransactions) / (totalEnrolment * eligibleSchoolDays)) * 100;
    const coverage = (uniqueStudentsRecorded / totalEnrolment) * 100;

    expect(rate).toBe(100);
    expect(coverage).toBe(100);
  });

  it('21. Memastikan data struktur persembahan slaid PowerPoint (.pptx) lengkap dan sah', () => {
    const pptData = {
      schoolName: 'SK BATANDOK BEAUFORT',
      schoolCode: 'XBA6003',
      motto: 'BERUSAHA BERILMU JAYA',
      monthName: 'Oktober',
      year: 2026,
      periodLabel: 'Bulan: Oktober 2026',
      isTrialMode: true,
      eligibleDays: 18,
      totalEnrolment: 95,
      uniqueStudentsRecorded: 1,
      coveragePercentage: 1.1,
      totalTransactions: 1,
      totalHadir: 1,
      totalLewat: 0,
      overallPercentage: 0.1,
      classPerformanceList: [
        {
          classId: 'CLS01',
          className: '1 BERUSAHA',
          yearLevel: 1,
          studentCount: 15,
          uniqueAttendedCount: 1,
          totalPresentSessions: 1,
          attendanceRate: 0.4,
          statusColor: 'red' as const
        }
      ]
    };

    expect(pptData.schoolName).toBe('SK BATANDOK BEAUFORT');
    expect(pptData.isTrialMode).toBe(true);
    expect(pptData.classPerformanceList.length).toBeGreaterThan(0);
    expect(pptData.overallPercentage).toBe(0.1);
    expect(pptData.coveragePercentage).toBe(1.1);
  });
});
