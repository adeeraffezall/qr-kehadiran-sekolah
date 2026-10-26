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
  isTrialMode?: boolean;
  schoolDaysMap?: Map<string, any>;
}

export function exportAttendanceToExcel(data: MonthlyExportData): void {
  const wb = XLSX.utils.book_new();
  const isTrial = data.isTrialMode !== false; // Lalai: true (Mod Percubaan)
  const nowStr = new Date().toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' });

  // Map student attendance
  const studentAttendanceMap = new Map<string, { hadir: number; lewat: number; tidakHadir: number; records: AttendanceRecord[] }>();
  data.students.forEach(s => {
    studentAttendanceMap.set(s.id, { hadir: 0, lewat: 0, tidakHadir: 0, records: [] });
  });

  data.attendanceRecords.forEach(r => {
    const stat = studentAttendanceMap.get(r.studentId);
    if (stat) {
      stat.records.push(r);
      if (r.status === 'HADIR') stat.hadir += 1;
      else if (r.status === 'LEWAT') stat.lewat += 1;
      else if (r.status === 'TIDAK_HADIR') stat.tidakHadir += 1;
    }
  });

  const classMap = new Map<string, string>();
  data.classes.forEach(c => classMap.set(c.id, c.name));

  let totalHadirAll = 0;
  let totalLewatAll = 0;
  let uniqueStudentsWithRecords = 0;

  studentAttendanceMap.forEach(stat => {
    totalHadirAll += stat.hadir;
    totalLewatAll += stat.lewat;
    if ((stat.hadir + stat.lewat + stat.records.length) > 0) {
      uniqueStudentsWithRecords++;
    }
  });

  const eligibleDays = data.totalSchoolDays > 0 ? data.totalSchoolDays : 1;
  const totalPossibleDays = data.students.length * eligibleDays;
  const overallPercentage = totalPossibleDays > 0 
    ? Math.min(100, Math.round(((totalHadirAll + totalLewatAll) / totalPossibleDays) * 1000) / 10) 
    : 0;
  const coveragePercent = data.students.length > 0 
    ? Math.round((uniqueStudentsWithRecords / data.students.length) * 1000) / 10 
    : 0;

  // 1. LEMBARAN 1: Ringkasan Eksekutif (Executive Summary)
  const summaryRows: any[] = [
    ['SISTEM PENGURUSAN KEHADIRAN QR SEKOLAH - LAPORAN BULANAN'],
    ['Nama Sekolah:', sanitizeCellValue(data.schoolName)],
    ['Bulan / Tahun:', `${data.monthName} ${data.year}`],
    ['Status Mod Sistem:', isTrial ? 'MOD PERCUBAAN (TRIAL MODE)' : 'OPERASI RASMI SEBENAR'],
    ['Tarikh & Masa Jana Fail:', sanitizeCellValue(nowStr)],
    [],
    ['METRIK UTAMA', 'NILAI', 'CATATAN / FORMULA'],
    ['Hari Persekolahan Layak', eligibleDays, 'Hari Isnin-Jumaat layak tolak cuti rasmi'],
    ['Jumlah Murid Layak (Enrolmen)', data.students.length, 'Murid aktif berdaftar'],
    ['Murid Unik Mempunyai Rekod', uniqueStudentsWithRecords, 'Murid yang telah mengimbas sekurang-kurangnya 1 kali'],
    ['Liputan Rekod Kehadiran', `${coveragePercent}%`, 'Murid Unik Direkod ÷ Jumlah Murid Layak × 100%'],
    ['Jumlah Transaksi Hadir', totalHadirAll + totalLewatAll, `${totalHadirAll} Hadir Tepat, ${totalLewatAll} Lewat`],
    ['Purata Kehadiran Rasmi Sekolah', `${overallPercentage}%`, '(Hadir + Lewat) ÷ (Murid × Hari Layak) × 100%'],
    [],
    ['NOTA AUDIT: Mod percubaan aktif bagi tujuan penentukuran sistem sebelum operasi penuh diumumkan.']
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');

  // 2. LEMBARAN 2: Rekod Kehadiran Murid (Student Attendance Roster)
  const studentRows: any[] = [
    ['SENARAI KEHADIRAN INDIVIDU MURID'],
    ['BIL', 'NO. MURID', 'NAMA PENUH', 'KELAS', 'JANTINA', 'JAWATAN', 'STATUS REKOD', 'HADIR (HARI)', 'LEWAT (HARI)', 'TIDAK HADIR (HARI)', 'PERATUS KEHADIRAN (%)', 'STATUS AMARAN HEM']
  ];

  let bil = 1;
  data.students.forEach(s => {
    const stat = studentAttendanceMap.get(s.id) || { hadir: 0, lewat: 0, tidakHadir: 0, records: [] };
    const attended = stat.hadir + stat.lewat;
    const percentage = ((stat.hadir + stat.lewat) / eligibleDays) * 100;
    const rounded = Math.min(100, Math.round(percentage * 10) / 10);
    const estimatedAbsent = Math.max(0, eligibleDays - attended);
    const hasRecord = stat.records.length > 0;
    const recordCompleteness = hasRecord ? 'Mempunyai Rekod' : 'Belum Ada Rekod';
    const warning = estimatedAbsent >= 3 ? 'PERLU SURAT AMARAN' : 'NORMAL';

    studentRows.push([
      bil++,
      sanitizeCellValue(s.studentNumber || '-'),
      sanitizeCellValue(s.fullName),
      sanitizeCellValue(classMap.get(s.classId) || s.className || '-'),
      sanitizeCellValue(s.gender || '-'),
      sanitizeCellValue(s.role || 'Murid'),
      sanitizeCellValue(recordCompleteness),
      stat.hadir,
      stat.lewat,
      estimatedAbsent,
      `${rounded}%`,
      warning
    ]);
  });

  const wsStudents = XLSX.utils.aoa_to_sheet(studentRows);
  XLSX.utils.book_append_sheet(wb, wsStudents, 'Kehadiran Murid');

  // 3. LEMBARAN 3: Analisis Mengikut Kelas (Class Performance Analysis)
  const classRows: any[] = [
    ['ANALISIS KEHADIRAN MENGIKUT KELAS'],
    ['BIL', 'NAMA KELAS', 'TAHUN', 'ENROLMEN', 'MURID MEMPUNYAI REKOD', 'LIPUTAN KELAS (%)', 'JUMLAH TRANSAKSI HADIR', 'PURATA KEHADIRAN (%)', 'STATUS PRESTASI']
  ];

  let classBil = 1;
  data.classes.forEach(c => {
    const classStudents = data.students.filter(s => s.classId === c.id);
    let classHadirLewat = 0;
    let classUniqueRecorded = 0;

    classStudents.forEach(s => {
      const stat = studentAttendanceMap.get(s.id);
      if (stat) {
        classHadirLewat += (stat.hadir + stat.lewat);
        if (stat.records.length > 0) classUniqueRecorded++;
      }
    });

    const classPossible = classStudents.length * eligibleDays;
    const avgPercentage = classPossible > 0 ? Math.round((classHadirLewat / classPossible) * 1000) / 10 : 0;
    const classCoverage = classStudents.length > 0 ? Math.round((classUniqueRecorded / classStudents.length) * 1000) / 10 : 0;

    let performanceLabel = 'Perlu Semakan (<85%)';
    if (avgPercentage >= 95) performanceLabel = 'Cemerlang (>=95%)';
    else if (avgPercentage >= 85) performanceLabel = 'Sederhana (85-94%)';
    if (classUniqueRecorded === 0) performanceLabel = 'Belum Ada Rekod Imbasan';

    classRows.push([
      classBil++,
      sanitizeCellValue(c.name),
      c.yearLevel,
      classStudents.length,
      classUniqueRecorded,
      `${classCoverage}%`,
      classHadirLewat,
      `${avgPercentage}%`,
      performanceLabel
    ]);
  });

  const wsClasses = XLSX.utils.aoa_to_sheet(classRows);
  XLSX.utils.book_append_sheet(wb, wsClasses, 'Analisis Kelas');

  // 4. LEMBARAN 4: Log Rekod Harian (Daily Scan Transaction Logs)
  const detailHeaders = [
    'BIL', 'TARIKH', 'SESI', 'NAMA MURID', 'NO. MURID', 'KELAS', 'STATUS', 'WAKTU IMBAS', 'SUMBER', 'CATATAN PEMBETULAN'
  ];
  const detailRows: any[] = [
    ['LOG TRANSAKSI IMBASAN KEHADIRAN DALAM BULAN'],
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
  XLSX.utils.book_append_sheet(wb, wsDetails, 'Rekod Harian');

  // 5. LEMBARAN 5: Kalendar Sekolah (School Days Calendar Breakdown)
  const calendarRows: any[] = [
    ['TAKWIM HARI PERSEKOLAHAN BULAN BERKENAAN'],
    ['BIL', 'TARIKH', 'STATUS HARI PERSEKOLAHAN', 'JENIS HARI', 'CATATAN']
  ];

  const daysInMonth = new Date(data.year, getMonthIndexFromName(data.monthName), 0).getDate();
  let calBil = 1;
  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = String(day).padStart(2, '0');
    const mNum = getMonthNumberFromName(data.monthName);
    const dateStr = `${data.year}-${String(mNum).padStart(2, '0')}-${dayStr}`;
    const custom = data.schoolDaysMap ? data.schoolDaysMap.get(dateStr) : undefined;

    let isSchool = false;
    let type = 'REGULAR';
    let notes = 'Hari Persekolahan Biasa';

    const d = new Date(data.year, mNum - 1, day);
    const isWk = d.getDay() === 0 || d.getDay() === 6;

    if (custom) {
      isSchool = custom.isSchoolDay;
      type = custom.dayType || 'REGULAR';
      notes = custom.notes || (isSchool ? 'Hari Sekolah' : 'Cuti');
    } else {
      isSchool = !isWk;
      type = isWk ? 'WEEKEND' : 'REGULAR';
      notes = isWk ? 'Hujung Minggu (Sabtu/Ahad)' : 'Hari Persekolahan Biasa';
    }

    calendarRows.push([
      calBil++,
      dateStr,
      isSchool ? 'HARI PERSEKOLAHAN' : 'CUTI / HUJUNG MINGGU',
      type,
      sanitizeCellValue(notes)
    ]);
  }

  const wsCal = XLSX.utils.aoa_to_sheet(calendarRows);
  XLSX.utils.book_append_sheet(wb, wsCal, 'Kalendar Sekolah');

  // 6. LEMBARAN 6: Catatan Pengiraan (Formulas & Notes)
  const formulaRows: any[] = [
    ['DOKUMENTASI FORMULA & PANDUAN PENGIRAAN KEHADIRAN KPM'],
    [],
    ['1. KADAR KEHADIRAN BULANAN (KPM):'],
    ['Formula:', '(Jumlah Hari Hadir + Jumlah Hari Lewat) ÷ (Jumlah Murid Layak × Jumlah Hari Persekolahan Layak) × 100%'],
    ['Keterangan:', 'Mengambil kira kehadiran kumulatif fizikal murid sepanjang bulan dibahagi dengan jumlah hari-murid yang boleh hadir.'],
    [],
    ['2. LIPUTAN REKOD KEHADIRAN (COVERAGE):'],
    ['Formula:', 'Jumlah Murid Mempunyai Rekod ÷ Jumlah Murid Layak × 100%'],
    ['Keterangan:', 'Mengukur tahap penerimaan dan penggunaan kad QR sekolah dalam kalangan murid.'],
    [],
    ['3. STATUS AMARAN PONTENG HEM:'],
    ['Peraturan:', 'Murid yang tidak hadir 3 hari berturut-turut atau 10 hari berkala dikeluarkan Surat Peringatan Pertama mengikut pekeliling KPM.'],
    [],
    ['4. PENJELASAN MOD PERCUBAAN:'],
    ['Nota:', 'Semasa sistem dalam mod percubaan, peratusan kumulatif bulanan mungkin kelihatan rendah jika imbasan baru dimulakan di penghujung bulan kerana penyebut mengira kesemua hari persekolahan lalu. Gunakan metrik Liputan Rekod untuk menilai kemajuan ujian sebenar.']
  ];

  const wsFormulas = XLSX.utils.aoa_to_sheet(formulaRows);
  XLSX.utils.book_append_sheet(wb, wsFormulas, 'Catatan Pengiraan');

  // Muat turun fail Excel
  const modeTag = isTrial ? 'MOD_PERCUBAAN' : 'RASMI';
  const filename = `Laporan_Bulanan_${data.schoolName.replace(/\s+/g, '_')}_${data.monthName}_${data.year}_${modeTag}.xlsx`;
  XLSX.writeFile(wb, filename);
}

function getMonthNumberFromName(mName: string): number {
  const months = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];
  const idx = months.indexOf(mName);
  return idx >= 0 ? idx + 1 : 10;
}

function getMonthIndexFromName(mName: string): number {
  return getMonthNumberFromName(mName);
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
    const isPulang = data.sessionFilter === 'PULANG' || primaryRecord?.session === 'PULANG';

    let status = 'TIDAK_HADIR';
    if (primaryRecord) {
      status = isPulang ? 'PULANG' : primaryRecord.status;
    } else if (isPulang) {
      status = 'BELUM_PULANG';
    }
    
    if (status === 'HADIR' || status === 'PULANG') hadirCount++;
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
      sanitizeCellValue(primaryRecord ? primaryRecord.session : (isPulang ? 'PULANG' : '-')),
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
