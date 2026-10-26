import * as XLSX from 'xlsx';
import { AttendanceRecord, Student, ClassItem } from '../types';
import { formatDisplayDate, formatDisplayTime } from './dateUtils';

/**
 * Mencegah spreadsheet formula injection (CSV/Excel Formula Injection / DDE)
 * Jika medan teks bermula dengan '=', '+', '-', atau '@', tambah tanda petikan tunggal di hadapan.
 */
export function sanitizeCellValue(val: any): any {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('=') || trimmed.startsWith('+') || trimmed.startsWith('-') || trimmed.startsWith('@')) {
      return `'${val}`;
    }
  }
  return val;
}

export interface MonthlyExportData {
  schoolName: string;
  monthName: string;
  year: number;
  totalSchoolDays: number;
  students: Student[];
  classes: ClassItem[];
  attendanceRecords: AttendanceRecord[];
}

export function exportAttendanceToExcel(data: MonthlyExportData): void {
  const wb = XLSX.utils.book_new();

  // 1. LEMBARAN 1: Ringkasan Bulanan (Monthly Summary)
  const summaryRows: any[] = [
    ['SISTEM KEHADIRAN QR SEKOLAH - LAPORAN BULANAN'],
    ['Nama Sekolah:', sanitizeCellValue(data.schoolName)],
    ['Bulan / Tahun:', `${data.monthName} ${data.year}`],
    ['Jumlah Hari Persekolahan:', data.totalSchoolDays],
    ['Jumlah Murid Berdaftar:', data.students.length],
    [],
    ['BIL', 'NO. MURID', 'NAMA PENUH', 'KELAS', 'HADIR (HARI)', 'LEWAT (HARI)', 'TIDAK HADIR (HARI)', 'PERATUS KEHADIRAN (%)']
  ];

  // Map student attendance
  const studentAttendanceMap = new Map<string, { hadir: number; lewat: number; tidakHadir: number }>();
  data.students.forEach(s => {
    studentAttendanceMap.set(s.id, { hadir: 0, lewat: 0, tidakHadir: 0 });
  });

  data.attendanceRecords.forEach(r => {
    const stat = studentAttendanceMap.get(r.studentId);
    if (stat) {
      if (r.status === 'HADIR') stat.hadir += 1;
      else if (r.status === 'LEWAT') stat.lewat += 1;
      else if (r.status === 'TIDAK_HADIR') stat.tidakHadir += 1;
    }
  });

  const classMap = new Map<string, string>();
  data.classes.forEach(c => classMap.set(c.id, c.name));

  let bil = 1;
  data.students.forEach(s => {
    const stat = studentAttendanceMap.get(s.id) || { hadir: 0, lewat: 0, tidakHadir: 0 };
    const eligibleDays = data.totalSchoolDays > 0 ? data.totalSchoolDays : 1;
    const percentage = ((stat.hadir + stat.lewat) / eligibleDays) * 100;
    const rounded = Math.min(100, Math.round(percentage * 10) / 10);

    summaryRows.push([
      bil++,
      sanitizeCellValue(s.studentNumber || '-'),
      sanitizeCellValue(s.fullName),
      sanitizeCellValue(classMap.get(s.classId) || s.className || '-'),
      stat.hadir,
      stat.lewat,
      stat.tidakHadir,
      `${rounded}%`
    ]);
  });

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Bulanan');

  // 2. LEMBARAN 2: Rekod Kehadiran Terperinci (Raw Attendance Records)
  const detailHeaders = [
    'BIL', 'TARIKH', 'SESI', 'NAMA MURID', 'NO. MURID', 'KELAS', 'STATUS', 'WAKTU IMBAS', 'SUMBER', 'CATATAN PEMBETULAN'
  ];
  const detailRows: any[] = [
    ['SENARAI REKOD TRANSAKSI KEHADIRAN'],
    detailHeaders
  ];

  let recordBil = 1;
  data.attendanceRecords.forEach(r => {
    detailRows.push([
      recordBil++,
      sanitizeCellValue(r.date),
      sanitizeCellValue(r.session),
      sanitizeCellValue(r.studentNameSnapshot),
      '-',
      sanitizeCellValue(r.classNameSnapshot),
      sanitizeCellValue(r.status),
      sanitizeCellValue(formatDisplayTime(r.scannedAt)),
      sanitizeCellValue(r.source),
      sanitizeCellValue(r.correctionReason || '-')
    ]);
  });

  const wsDetails = XLSX.utils.aoa_to_sheet(detailRows);
  XLSX.utils.book_append_sheet(wb, wsDetails, 'Rekod Kehadiran');

  // 3. LEMBARAN 3: Statistik Mengikut Kelas (Class Statistics)
  const classStatsHeaders = [
    'BIL', 'NAMA KELAS', 'TAHUN', 'JUMLAH MURID', 'PURATA KEHADIRAN (%)'
  ];
  const classRows: any[] = [
    ['STATISTIK PURATA KEHADIRAN MENGIKUT KELAS'],
    classStatsHeaders
  ];

  let classBil = 1;
  data.classes.forEach(c => {
    const classStudents = data.students.filter(s => s.classId === c.id);
    let totalHadirLewat = 0;
    classStudents.forEach(s => {
      const stat = studentAttendanceMap.get(s.id);
      if (stat) totalHadirLewat += (stat.hadir + stat.lewat);
    });

    const totalEligible = classStudents.length * (data.totalSchoolDays > 0 ? data.totalSchoolDays : 1);
    const avgPercentage = totalEligible > 0 ? Math.round((totalHadirLewat / totalEligible) * 1000) / 10 : 0;

    classRows.push([
      classBil++,
      sanitizeCellValue(c.name),
      c.yearLevel,
      classStudents.length,
      `${avgPercentage}%`
    ]);
  });

  const wsClasses = XLSX.utils.aoa_to_sheet(classRows);
  XLSX.utils.book_append_sheet(wb, wsClasses, 'Statistik Kelas');

  // 4. LEMBARAN 4: Rekod Individu Murid (Individual breakdown template)
  const individualRows: any[] = [
    ['REKOD INDIVIDU MURID - FORMAT KHAS KAUNSELING / HEM'],
    ['PANDUAN:', 'Gunakan data ini untuk tindakan susulan murid berisiko cicir atau ponteng tegar.'],
    [],
    ['BIL', 'NAMA MURID', 'KELAS', 'STATUS REKOD', 'JUMLAH KEHADIRAN PENUH', 'AMARAN PONTENG']
  ];

  let indBil = 1;
  data.students.forEach(s => {
    const stat = studentAttendanceMap.get(s.id) || { hadir: 0, lewat: 0, tidakHadir: 0 };
    const warning = stat.tidakHadir >= 3 ? 'PERLU SURAT AMARAN' : 'NORMAL';
    individualRows.push([
      indBil++,
      sanitizeCellValue(s.fullName),
      sanitizeCellValue(classMap.get(s.classId) || '-'),
      s.active ? 'Aktif' : 'Tidak Aktif',
      stat.hadir + stat.lewat,
      warning
    ]);
  });

  const wsInd = XLSX.utils.aoa_to_sheet(individualRows);
  XLSX.utils.book_append_sheet(wb, wsInd, 'Rekod Individu');

  // Muat turun fail Excel
  const filename = `Laporan_Kehadiran_${data.schoolName.replace(/\s+/g, '_')}_${data.monthName}_${data.year}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export interface DailyExportData {
  schoolName: string;
  dateStr: string;
  sessionFilter: string;
  students: Student[];
  classes: ClassItem[];
  attendanceRecords: AttendanceRecord[];
}

export function exportDailyReportToExcel(data: DailyExportData): void {
  const wb = XLSX.utils.book_new();
  const classMap = new Map<string, string>();
  data.classes.forEach(c => classMap.set(c.id, c.name));

  // Map attendance by student ID
  const attendanceByStudent = new Map<string, AttendanceRecord[]>();
  data.attendanceRecords.forEach(r => {
    const list = attendanceByStudent.get(r.studentId) || [];
    list.push(r);
    attendanceByStudent.set(r.studentId, list);
  });

  // 1. Lembaran Kehadiran Harian
  const rows: any[] = [
    ['SISTEM KEHADIRAN QR SEKOLAH - LAPORAN HARIAN'],
    ['Nama Sekolah:', sanitizeCellValue(data.schoolName)],
    ['Tarikh Laporan:', sanitizeCellValue(data.dateStr)],
    ['Sesi:', sanitizeCellValue(data.sessionFilter)],
    ['Jumlah Murid Terlibat:', data.students.length],
    [],
    ['BIL', 'NO. MURID', 'NAMA PENUH', 'KELAS', 'JANTINA', 'STATUS', 'WAKTU IMBAS', 'SESI', 'SUMBER', 'CATATAN']
  ];

  let hadirCount = 0;
  let lewatCount = 0;
  let tidakHadirCount = 0;

  let bil = 1;
  data.students.forEach(s => {
    const records = attendanceByStudent.get(s.id) || [];
    const primaryRecord = records[0];
    const status = primaryRecord ? primaryRecord.status : 'TIDAK_HADIR';
    
    if (status === 'HADIR') hadirCount++;
    else if (status === 'LEWAT') lewatCount++;
    else tidakHadirCount++;

    rows.push([
      bil++,
      sanitizeCellValue(s.studentNumber || '-'),
      sanitizeCellValue(s.fullName),
      sanitizeCellValue(classMap.get(s.classId) || s.className || '-'),
      sanitizeCellValue(s.gender || '-'),
      sanitizeCellValue(status),
      sanitizeCellValue(primaryRecord ? formatDisplayTime(primaryRecord.scannedAt) : '-'),
      sanitizeCellValue(primaryRecord ? primaryRecord.session : '-'),
      sanitizeCellValue(primaryRecord ? primaryRecord.source : '-'),
      sanitizeCellValue(primaryRecord?.correctionReason || '-')
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Kehadiran Harian');

  // 2. Lembaran Analisis Mengikut Kelas
  const classSummaryRows: any[] = [
    ['RINGKASAN KEHADIRAN HARIAN MENGIKUT KELAS'],
    ['Tarikh:', sanitizeCellValue(data.dateStr)],
    [],
    ['BIL', 'KELAS', 'TAHUN', 'ENROLMEN', 'HADIR TEPAT', 'LEWAT', 'TIDAK HADIR', 'PERATUSAN (%)']
  ];

  let cBil = 1;
  data.classes.forEach(c => {
    const cStudents = data.students.filter(s => s.classId === c.id);
    let cHadir = 0;
    let cLewat = 0;
    let cTidak = 0;

    cStudents.forEach(s => {
      const rec = attendanceByStudent.get(s.id)?.[0];
      if (rec?.status === 'HADIR') cHadir++;
      else if (rec?.status === 'LEWAT') cLewat++;
      else cTidak++;
    });

    const totalPresent = cHadir + cLewat;
    const pct = cStudents.length > 0 ? Math.round((totalPresent / cStudents.length) * 1000) / 10 : 0;

    classSummaryRows.push([
      cBil++,
      sanitizeCellValue(c.name),
      c.yearLevel,
      cStudents.length,
      cHadir,
      cLewat,
      cTidak,
      `${pct}%`
    ]);
  });

  const wsClass = XLSX.utils.aoa_to_sheet(classSummaryRows);
  XLSX.utils.book_append_sheet(wb, wsClass, 'Analisis Kelas');

  const filename = `Laporan_Harian_Kehadiran_${data.schoolName.replace(/\s+/g, '_')}_${data.dateStr}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export interface WeeklyExportData {
  schoolName: string;
  weekLabel: string;
  startDate: string;
  endDate: string;
  weekDays: { date: string; dayName: string; shortName: string }[];
  totalSchoolDays: number;
  students: Student[];
  classes: ClassItem[];
  attendanceRecords: AttendanceRecord[];
}

export function exportWeeklyReportToExcel(data: WeeklyExportData): void {
  const wb = XLSX.utils.book_new();
  const classMap = new Map<string, string>();
  data.classes.forEach(c => classMap.set(c.id, c.name));

  // Map attendance by student ID and date
  const studentDayStatus = new Map<string, Map<string, string>>();
  data.attendanceRecords.forEach(r => {
    let dayMap = studentDayStatus.get(r.studentId);
    if (!dayMap) {
      dayMap = new Map<string, string>();
      studentDayStatus.set(r.studentId, dayMap);
    }
    // If multiple sessions, HADIR or LEWAT takes precedence
    const prev = dayMap.get(r.date);
    if (!prev || prev === 'TIDAK_HADIR' || (prev === 'LEWAT' && r.status === 'HADIR')) {
      dayMap.set(r.date, r.status);
    }
  });

  // 1. Lembaran Matriks Mingguan
  const dayHeaders = data.weekDays.map(d => `${d.shortName} (${d.date.slice(5)})`);
  const headers = ['BIL', 'NO. MURID', 'NAMA PENUH', 'KELAS', ...dayHeaders, 'JUMLAH HADIR', 'LEWAT', 'TIDAK HADIR', 'PERATUSAN (%)'];

  const rows: any[] = [
    ['SISTEM KEHADIRAN QR SEKOLAH - LAPORAN MINGGUAN'],
    ['Nama Sekolah:', sanitizeCellValue(data.schoolName)],
    ['Minggu:', sanitizeCellValue(data.weekLabel)],
    ['Tempoh:', `${data.startDate} hingga ${data.endDate}`],
    ['Hari Persekolahan Layak:', data.totalSchoolDays],
    ['Jumlah Murid:', data.students.length],
    [],
    headers
  ];

  let bil = 1;
  data.students.forEach(s => {
    const dayMap = studentDayStatus.get(s.id) || new Map<string, string>();
    let hadirCount = 0;
    let lewatCount = 0;
    let tidakHadirCount = 0;

    const dayValues = data.weekDays.map(d => {
      const st = dayMap.get(d.date);
      if (st === 'HADIR') {
        hadirCount++;
        return 'HADIR';
      } else if (st === 'LEWAT') {
        lewatCount++;
        return 'LEWAT';
      } else {
        tidakHadirCount++;
        return 'TH';
      }
    });

    const eligible = data.totalSchoolDays > 0 ? data.totalSchoolDays : 5;
    const pct = Math.min(100, Math.round(((hadirCount + lewatCount) / eligible) * 1000) / 10);

    rows.push([
      bil++,
      sanitizeCellValue(s.studentNumber || '-'),
      sanitizeCellValue(s.fullName),
      sanitizeCellValue(classMap.get(s.classId) || s.className || '-'),
      ...dayValues,
      hadirCount,
      lewatCount,
      tidakHadirCount,
      `${pct}%`
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Matriks Mingguan');

  // 2. Lembaran Analisis Kelas
  const classRows: any[] = [
    ['ANALISIS KEHADIRAN MINGGUAN MENGIKUT KELAS'],
    ['Minggu:', sanitizeCellValue(data.weekLabel)],
    [],
    ['BIL', 'KELAS', 'TAHUN', 'ENROLMEN', 'PURATA KEHADIRAN (%)']
  ];

  let cBil = 1;
  data.classes.forEach(c => {
    const cStudents = data.students.filter(s => s.classId === c.id);
    let totalPresent = 0;
    cStudents.forEach(s => {
      const dayMap = studentDayStatus.get(s.id) || new Map<string, string>();
      data.weekDays.forEach(d => {
        const st = dayMap.get(d.date);
        if (st === 'HADIR' || st === 'LEWAT') totalPresent++;
      });
    });

    const totalEligible = cStudents.length * (data.totalSchoolDays > 0 ? data.totalSchoolDays : 5);
    const avgPct = totalEligible > 0 ? Math.round((totalPresent / totalEligible) * 1000) / 10 : 0;

    classRows.push([
      cBil++,
      sanitizeCellValue(c.name),
      c.yearLevel,
      cStudents.length,
      `${avgPct}%`
    ]);
  });

  const wsClass = XLSX.utils.aoa_to_sheet(classRows);
  XLSX.utils.book_append_sheet(wb, wsClass, 'Analisis Kelas');

  const filename = `Laporan_Mingguan_Kehadiran_${data.schoolName.replace(/\s+/g, '_')}_${data.startDate}_ke_${data.endDate}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export interface RangeExportData {
  schoolName: string;
  startDate: string;
  endDate: string;
  totalSchoolDays: number;
  students: Student[];
  classes: ClassItem[];
  attendanceRecords: AttendanceRecord[];
}

export function exportRangeReportToExcel(data: RangeExportData): void {
  const wb = XLSX.utils.book_new();
  const classMap = new Map<string, string>();
  data.classes.forEach(c => classMap.set(c.id, c.name));

  // Map student attendance
  const studentMap = new Map<string, { hadir: number; lewat: number; tidakHadir: number }>();
  data.students.forEach(s => studentMap.set(s.id, { hadir: 0, lewat: 0, tidakHadir: 0 }));

  data.attendanceRecords.forEach(r => {
    const stat = studentMap.get(r.studentId);
    if (stat) {
      if (r.status === 'HADIR') stat.hadir += 1;
      else if (r.status === 'LEWAT') stat.lewat += 1;
      else if (r.status === 'TIDAK_HADIR') stat.tidakHadir += 1;
    }
  });

  // 1. Lembaran Ringkasan Prestasi Murid
  const summaryRows: any[] = [
    ['SISTEM KEHADIRAN QR SEKOLAH - LAPORAN SELA MASA'],
    ['Nama Sekolah:', sanitizeCellValue(data.schoolName)],
    ['Julat Tarikh:', `${data.startDate} hingga ${data.endDate}`],
    ['Hari Persekolahan Layak:', data.totalSchoolDays],
    ['Jumlah Murid:', data.students.length],
    [],
    ['BIL', 'NO. MURID', 'NAMA PENUH', 'KELAS', 'HADIR (HARI)', 'LEWAT (HARI)', 'TIDAK HADIR (HARI)', 'PERATUS KEHADIRAN (%)', 'STATUS AMARAN']
  ];

  let bil = 1;
  data.students.forEach(s => {
    const stat = studentMap.get(s.id) || { hadir: 0, lewat: 0, tidakHadir: 0 };
    const eligible = data.totalSchoolDays > 0 ? data.totalSchoolDays : 1;
    const pct = Math.min(100, Math.round(((stat.hadir + stat.lewat) / eligible) * 1000) / 10);
    const warning = stat.tidakHadir >= 3 ? 'PERLU AMARAN' : 'NORMAL';

    summaryRows.push([
      bil++,
      sanitizeCellValue(s.studentNumber || '-'),
      sanitizeCellValue(s.fullName),
      sanitizeCellValue(classMap.get(s.classId) || s.className || '-'),
      stat.hadir,
      stat.lewat,
      stat.tidakHadir,
      `${pct}%`,
      warning
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, ws, 'Ringkasan Sela Masa');

  // 2. Lembaran Analisis Kelas
  const classRows: any[] = [
    ['ANALISIS SELA MASA MENGIKUT KELAS'],
    ['Tempoh:', `${data.startDate} hingga ${data.endDate}`],
    [],
    ['BIL', 'KELAS', 'TAHUN', 'ENROLMEN', 'PURATA KEHADIRAN (%)']
  ];

  let cBil = 1;
  data.classes.forEach(c => {
    const cStudents = data.students.filter(s => s.classId === c.id);
    let totalPresent = 0;
    cStudents.forEach(s => {
      const stat = studentMap.get(s.id);
      if (stat) totalPresent += (stat.hadir + stat.lewat);
    });

    const totalEligible = cStudents.length * (data.totalSchoolDays > 0 ? data.totalSchoolDays : 1);
    const avgPct = totalEligible > 0 ? Math.round((totalPresent / totalEligible) * 1000) / 10 : 0;

    classRows.push([
      cBil++,
      sanitizeCellValue(c.name),
      c.yearLevel,
      cStudents.length,
      `${avgPct}%`
    ]);
  });

  const wsClass = XLSX.utils.aoa_to_sheet(classRows);
  XLSX.utils.book_append_sheet(wb, wsClass, 'Analisis Kelas');

  // 3. Lembaran Log Transaksi Lengkap
  const detailRows: any[] = [
    ['LOG TRANSAKSI KEHADIRAN DALAM SELA MASA'],
    ['BIL', 'TARIKH', 'SESI', 'NAMA MURID', 'KELAS', 'STATUS', 'WAKTU IMBAS', 'SUMBER', 'CATATAN']
  ];

  let tBil = 1;
  data.attendanceRecords.forEach(r => {
    detailRows.push([
      tBil++,
      sanitizeCellValue(r.date),
      sanitizeCellValue(r.session),
      sanitizeCellValue(r.studentNameSnapshot),
      sanitizeCellValue(r.classNameSnapshot),
      sanitizeCellValue(r.status),
      sanitizeCellValue(formatDisplayTime(r.scannedAt)),
      sanitizeCellValue(r.source),
      sanitizeCellValue(r.correctionReason || '-')
    ]);
  });

  const wsLog = XLSX.utils.aoa_to_sheet(detailRows);
  XLSX.utils.book_append_sheet(wb, wsLog, 'Log Transaksi');

  const filename = `Laporan_Sela_Masa_${data.schoolName.replace(/\s+/g, '_')}_${data.startDate}_ke_${data.endDate}.xlsx`;
  XLSX.writeFile(wb, filename);
}
