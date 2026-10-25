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
