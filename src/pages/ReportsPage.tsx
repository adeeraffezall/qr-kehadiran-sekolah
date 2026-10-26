import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getAttendanceByDateRange } from '../services/attendanceService';
import { getStudents } from '../services/studentService';
import { getClasses } from '../services/classService';
import { getSchoolDaysForRange, countEligibleDaysBetween } from '../services/calendarService';
import { 
  exportAttendanceToExcel, 
  exportDailyReportToExcel, 
  exportWeeklyReportToExcel, 
  exportRangeReportToExcel 
} from '../utils/exportExcel';
import { 
  getMonthNameBM, 
  getTodayMalaysianDate, 
  formatDateShortBM,
  getDayNameBM,
  getWeekDays,
  parseYMD,
  toYMD,
  formatDisplayTime
} from '../utils/dateUtils';
import { AttendanceRecord, ClassItem, SchoolDay, Student } from '../types';
import { Button } from '../components/ui/Button';
import { 
  Download, 
  Calendar, 
  CalendarDays, 
  BarChart3, 
  Sliders, 
  Search, 
  Printer, 
  Users, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ChevronLeft, 
  ChevronRight,
  Loader2,
  FileSpreadsheet
} from 'lucide-react';

export type ReportType = 'HARIAN' | 'MINGGUAN' | 'BULANAN' | 'SELA_MASA';

export const ReportsPage: React.FC = () => {
  const { profile } = useAuth();
  const schoolName = import.meta.env.VITE_SCHOOL_NAME || 'SK BATANDOK BEAUFORT';
  const schoolCode = import.meta.env.VITE_SCHOOL_CODE || 'XBA6003';
  const todayStr = getTodayMalaysianDate();
  const currentDate = parseYMD(todayStr);

  // 1. Mod Pilihan Laporan
  const [reportType, setReportType] = useState<ReportType>('HARIAN');

  // 2. State Penapis Mengikut Mod
  // A. Harian
  const [dailyDate, setDailyDate] = useState<string>(todayStr);
  const [dailySession, setDailySession] = useState<'SEMUA' | 'PAGI' | 'PULANG'>('SEMUA');
  const [dailyStatusFilter, setDailyStatusFilter] = useState<'SEMUA' | 'HADIR' | 'LEWAT' | 'TIDAK_HADIR'>('SEMUA');

  // B. Mingguan
  const [weekAnchorDate, setWeekAnchorDate] = useState<string>(todayStr);

  // C. Bulanan
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);

  // D. Sela Masa (Custom Date Range)
  // Default: 7 hari terakhir sehingga hari ini
  const initialStartDate = useMemo(() => {
    const d = parseYMD(todayStr);
    d.setDate(d.getDate() - 6);
    return toYMD(d);
  }, [todayStr]);
  const [rangeStartDate, setRangeStartDate] = useState<string>(initialStartDate);
  const [rangeEndDate, setRangeEndDate] = useState<string>(todayStr);

  // E. Penapis Umum
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 3. State Data
  const [loading, setLoading] = useState<boolean>(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [schoolDaysMap, setSchoolDaysMap] = useState<Map<string, SchoolDay>>(new Map());

  // Pengiraan Tarikh Berdasarkan Mod
  const weekInfo = useMemo(() => {
    return getWeekDays(weekAnchorDate);
  }, [weekAnchorDate]);

  const { effectiveStartDate, effectiveEndDate, reportTitleLabel, periodDescription } = useMemo(() => {
    if (reportType === 'HARIAN') {
      const dayName = getDayNameBM(dailyDate);
      return {
        effectiveStartDate: dailyDate,
        effectiveEndDate: dailyDate,
        reportTitleLabel: `Laporan Kehadiran Harian — ${dayName}, ${formatDateShortBM(dailyDate)}`,
        periodDescription: `Tarikh: ${dailyDate} (${dayName}) | Sesi: ${dailySession}`
      };
    } else if (reportType === 'MINGGUAN') {
      return {
        effectiveStartDate: weekInfo.startDate,
        effectiveEndDate: weekInfo.endDate,
        reportTitleLabel: `Laporan Kehadiran Mingguan — ${weekInfo.label}`,
        periodDescription: `Tempoh: ${formatDateShortBM(weekInfo.startDate)} hingga ${formatDateShortBM(weekInfo.endDate)} (${weekInfo.days.length} Hari)`
      };
    } else if (reportType === 'BULANAN') {
      const monthStr = String(selectedMonth).padStart(2, '0');
      const start = `${selectedYear}-${monthStr}-01`;
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      const end = `${selectedYear}-${monthStr}-${String(lastDay).padStart(2, '0')}`;
      return {
        effectiveStartDate: start,
        effectiveEndDate: end,
        reportTitleLabel: `Laporan Kehadiran Bulanan — ${getMonthNameBM(selectedMonth)} ${selectedYear}`,
        periodDescription: `Bulan: ${getMonthNameBM(selectedMonth)} ${selectedYear}`
      };
    } else {
      // SELA MASA
      return {
        effectiveStartDate: rangeStartDate,
        effectiveEndDate: rangeEndDate,
        reportTitleLabel: `Laporan Kehadiran Sela Masa (${formatDateShortBM(rangeStartDate)} – ${formatDateShortBM(rangeEndDate)})`,
        periodDescription: `Julat Tarikh: ${rangeStartDate} hingga ${rangeEndDate}`
      };
    }
  }, [reportType, dailyDate, dailySession, weekInfo, selectedYear, selectedMonth, rangeStartDate, rangeEndDate]);

  // Muat turun data pangkalan data
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        const [sList, cList, aRecords, sDays] = await Promise.all([
          getStudents(selectedClassId === 'ALL' ? undefined : selectedClassId, false),
          getClasses(),
          getAttendanceByDateRange(effectiveStartDate, effectiveEndDate),
          getSchoolDaysForRange(effectiveStartDate, effectiveEndDate)
        ]);

        if (isCancelled) return;

        const classMap = new Map<string, string>();
        cList.forEach(c => classMap.set(c.id, c.name));

        const enrichedStudents = sList.map(s => ({
          ...s,
          className: classMap.get(s.classId) || s.className || 'Kelas'
        }));

        setStudents(enrichedStudents);
        setClasses(cList);
        setRecords(aRecords);
        setSchoolDaysMap(sDays);
      } catch (err) {
        console.error('Ralat memuatkan laporan:', err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [effectiveStartDate, effectiveEndDate, selectedClassId]);

  // Kira hari persekolahan yang layak
  const totalEligibleDays = useMemo(() => {
    if (reportType === 'HARIAN') {
      const dayCustom = schoolDaysMap.get(dailyDate);
      if (dayCustom) return dayCustom.isSchoolDay ? 1 : 0;
      // Isnin-Jumaat = 1
      const d = parseYMD(dailyDate);
      const day = d.getDay();
      return (day >= 1 && day <= 5) ? 1 : 0;
    }

    return countEligibleDaysBetween(
      effectiveStartDate,
      effectiveEndDate,
      schoolDaysMap,
      todayStr // Hadkan kepada hari ini jika tempoh melangkaui masa hadapan
    );
  }, [reportType, dailyDate, effectiveStartDate, effectiveEndDate, schoolDaysMap, todayStr]);

  // Statistik Kehadiran Murid
  const studentStatsMap = useMemo(() => {
    const map = new Map<string, { hadir: number; lewat: number; tidakHadir: number; records: AttendanceRecord[] }>();
    students.forEach(s => map.set(s.id, { hadir: 0, lewat: 0, tidakHadir: 0, records: [] }));

    records.forEach(r => {
      // Tapis sesi jika Laporan Harian memilih sesi tertentu
      if (reportType === 'HARIAN' && dailySession !== 'SEMUA' && r.session !== dailySession) {
        return;
      }

      const stat = map.get(r.studentId);
      if (stat) {
        stat.records.push(r);
        if (r.status === 'HADIR') stat.hadir += 1;
        else if (r.status === 'LEWAT') stat.lewat += 1;
        else if (r.status === 'TIDAK_HADIR') stat.tidakHadir += 1;
      }
    });

    return map;
  }, [students, records, reportType, dailySession]);

  // Kumpulan statistik keseluruhan
  const summary = useMemo(() => {
    let totalHadir = 0;
    let totalLewat = 0;

    studentStatsMap.forEach(stat => {
      totalHadir += stat.hadir;
      totalLewat += stat.lewat;
    });

    const activeEnrolment = students.length;
    const totalTransactions = totalHadir + totalLewat;

    let overallPercentage = 0;
    let totalTidakHadirEstimated = 0;

    if (reportType === 'HARIAN') {
      // Untuk harian: setiap murid hanya dikira hadir atau tidak hadir 1 kali
      const attendedCount = Array.from(studentStatsMap.values()).filter(s => (s.hadir + s.lewat) > 0).length;
      totalTidakHadirEstimated = Math.max(0, activeEnrolment - attendedCount);
      overallPercentage = activeEnrolment > 0 ? Math.round((attendedCount / activeEnrolment) * 1000) / 10 : 0;
    } else {
      const eligibleDays = totalEligibleDays > 0 ? totalEligibleDays : 1;
      const totalPossibleDays = activeEnrolment * eligibleDays;
      overallPercentage = totalPossibleDays > 0 
        ? Math.min(100, Math.round((totalTransactions / totalPossibleDays) * 1000) / 10) 
        : 0;
      totalTidakHadirEstimated = Math.max(0, totalPossibleDays - totalTransactions);
    }

    return {
      totalHadir,
      totalLewat,
      totalTransactions,
      activeEnrolment,
      overallPercentage,
      totalTidakHadirEstimated
    };
  }, [studentStatsMap, students.length, totalEligibleDays, reportType]);

  // Tapis senarai murid untuk carian
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      // Carian teks
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = s.fullName.toLowerCase().includes(q);
        const matchNumber = s.studentNumber?.toLowerCase().includes(q);
        const matchClass = s.className?.toLowerCase().includes(q);
        if (!matchName && !matchNumber && !matchClass) return false;
      }

      // Tapis status jika mod HARIAN
      if (reportType === 'HARIAN' && dailyStatusFilter !== 'SEMUA') {
        const stat = studentStatsMap.get(s.id);
        const hasHadir = (stat?.hadir || 0) > 0;
        const hasLewat = (stat?.lewat || 0) > 0;
        const isPresent = hasHadir || hasLewat;

        if (dailyStatusFilter === 'HADIR' && !hasHadir) return false;
        if (dailyStatusFilter === 'LEWAT' && !hasLewat) return false;
        if (dailyStatusFilter === 'TIDAK_HADIR' && isPresent) return false;
      }

      return true;
    });
  }, [students, searchQuery, reportType, dailyStatusFilter, studentStatsMap]);

  // Pengendali Eksport Excel Mengikut Mod
  const handleExportExcel = () => {
    if (reportType === 'HARIAN') {
      exportDailyReportToExcel({
        schoolName,
        dateStr: dailyDate,
        sessionFilter: dailySession,
        students,
        classes,
        attendanceRecords: records
      });
    } else if (reportType === 'MINGGUAN') {
      exportWeeklyReportToExcel({
        schoolName,
        weekLabel: weekInfo.label,
        startDate: weekInfo.startDate,
        endDate: weekInfo.endDate,
        weekDays: weekInfo.days,
        totalSchoolDays: totalEligibleDays,
        students,
        classes,
        attendanceRecords: records
      });
    } else if (reportType === 'BULANAN') {
      exportAttendanceToExcel({
        schoolName,
        monthName: getMonthNameBM(selectedMonth),
        year: selectedYear,
        totalSchoolDays: totalEligibleDays,
        students,
        classes,
        attendanceRecords: records
      });
    } else {
      // SELA MASA
      exportRangeReportToExcel({
        schoolName,
        startDate: rangeStartDate,
        endDate: rangeEndDate,
        totalSchoolDays: totalEligibleDays,
        students,
        classes,
        attendanceRecords: records
      });
    }
  };

  // Butang Pintas Tempoh Mingguan
  const handleWeekShift = (offsetWeeks: number) => {
    const cur = parseYMD(weekAnchorDate);
    cur.setDate(cur.getDate() + (offsetWeeks * 7));
    setWeekAnchorDate(toYMD(cur));
  };

  // Butang Pintas Sela Masa
  const handleSetQuickRange = (daysCount: number) => {
    const end = parseYMD(todayStr);
    const start = parseYMD(todayStr);
    start.setDate(start.getDate() - (daysCount - 1));
    setRangeStartDate(toYMD(start));
    setRangeEndDate(toYMD(end));
  };

  return (
    <div className="space-y-6">
      
      {/* ============================================================== */}
      {/* 1. KEPALA SURAT RASMI (Hanya muncul ketika dicetak ke PDF/Kertas) */}
      {/* ============================================================== */}
      <div className="print-only pb-4 mb-4 border-b-2 border-slate-800 text-center">
        <div className="flex items-center justify-center gap-4 mb-2">
          <img src="/logo.png" alt="Logo Sekolah" className="w-16 h-16 object-contain" />
          <div className="text-left">
            <h1 className="text-lg font-black tracking-tight text-slate-900">{schoolName}</h1>
            <p className="text-xs font-semibold text-slate-700">KOD SEKOLAH: {schoolCode} • BEAUFORT, SABAH</p>
            <p className="text-[11px] font-bold italic text-blue-800">"BERUSAHA BERILMU JAYA"</p>
          </div>
        </div>
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 mt-2">{reportTitleLabel}</h2>
        <p className="text-xs text-slate-600 font-medium">{periodDescription} | Enrolmen: {students.length} Murid</p>
      </div>

      {/* ============================================================== */}
      {/* 2. PILIHAN MOD LAPORAN (Segmented Control Tabs)                 */}
      {/* ============================================================== */}
      <div className="no-print bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setReportType('HARIAN')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              reportType === 'HARIAN'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Laporan Harian</span>
          </button>

          <button
            onClick={() => setReportType('MINGGUAN')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              reportType === 'MINGGUAN'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Laporan Mingguan</span>
          </button>

          <button
            onClick={() => setReportType('BULANAN')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              reportType === 'BULANAN'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Laporan Bulanan</span>
          </button>

          <button
            onClick={() => setReportType('SELA_MASA')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              reportType === 'SELA_MASA'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Sela Masa (Julat Tarikh)</span>
          </button>
        </div>

        {/* Butang Tindakan Eksport & Cetak */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            icon={<Printer className="w-4 h-4 text-slate-600" />}
            title="Cetak atau Simpan sebagai PDF"
          >
            Cetak / PDF
          </Button>

          <Button
            variant="success"
            size="sm"
            onClick={handleExportExcel}
            icon={<Download className="w-4 h-4" />}
          >
            Eksport Excel (.xlsx)
          </Button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. BAR PENAPIS DINAMIK MENGIKUT JENIS LAPORAN                   */}
      {/* ============================================================== */}
      <div className="no-print bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          {/* A. Kawalan Untuk Laporan Harian */}
          {reportType === 'HARIAN' && (
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Pilih Tarikh
                </label>
                <input
                  type="date"
                  value={dailyDate}
                  onChange={(e) => setDailyDate(e.target.value)}
                  className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 shadow-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-end gap-1.5 pt-4">
                <button
                  type="button"
                  onClick={() => setDailyDate(todayStr)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                    dailyDate === todayStr 
                      ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = parseYMD(todayStr);
                    d.setDate(d.getDate() - 1);
                    setDailyDate(toYMD(d));
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Semalam
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Sesi Imbasan
                </label>
                <select
                  value={dailySession}
                  onChange={(e) => setDailySession(e.target.value as any)}
                  className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 shadow-xs focus:ring-2 focus:ring-blue-500"
                >
                  <option value="SEMUA">Semua Sesi (Pagi & Pulang)</option>
                  <option value="PAGI">Sesi Pagi (Kedatangan)</option>
                  <option value="PULANG">Sesi Pulang (Balik)</option>
                </select>
              </div>
            </div>
          )}

          {/* B. Kawalan Untuk Laporan Mingguan */}
          {reportType === 'MINGGUAN' && (
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Pilih Tarikh dalam Minggu
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleWeekShift(-1)}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                    title="Minggu Sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <input
                    type="date"
                    value={weekAnchorDate}
                    onChange={(e) => setWeekAnchorDate(e.target.value)}
                    className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 shadow-xs focus:ring-2 focus:ring-blue-500"
                  />

                  <button
                    type="button"
                    onClick={() => handleWeekShift(1)}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                    title="Minggu Seterusnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-end gap-1.5 pt-4">
                <button
                  type="button"
                  onClick={() => setWeekAnchorDate(todayStr)}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                >
                  Minggu Ini
                </button>
              </div>

              <div className="pt-4">
                <span className="inline-block text-xs font-bold text-slate-700 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200">
                  {weekInfo.label}
                </span>
              </div>
            </div>
          )}

          {/* C. Kawalan Untuk Laporan Bulanan */}
          {reportType === 'BULANAN' && (
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Tahun
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 shadow-xs focus:ring-2 focus:ring-blue-500"
                >
                  {[2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Bulan
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 shadow-xs focus:ring-2 focus:ring-blue-500"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                    <option key={m} value={m}>{getMonthNameBM(m)}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* D. Kawalan Untuk Laporan Sela Masa (Custom Range) */}
          {reportType === 'SELA_MASA' && (
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Tarikh Mula
                </label>
                <input
                  type="date"
                  value={rangeStartDate}
                  onChange={(e) => setRangeStartDate(e.target.value)}
                  className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 shadow-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Tarikh Akhir
                </label>
                <input
                  type="date"
                  value={rangeEndDate}
                  onChange={(e) => setRangeEndDate(e.target.value)}
                  className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 shadow-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-end gap-1.5 pt-4">
                <button
                  type="button"
                  onClick={() => handleSetQuickRange(7)}
                  className="px-2.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  7 Hari
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickRange(14)}
                  className="px-2.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  14 Hari
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickRange(30)}
                  className="px-2.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  30 Hari
                </button>
              </div>
            </div>
          )}

          {/* E. Penapis Kelas (Sentiasa Ada Untuk Semua Mod) */}
          <div className="flex flex-wrap items-center gap-3 ml-auto">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Penapis Kelas
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 shadow-xs focus:ring-2 focus:ring-blue-500 min-w-[150px]"
              >
                <option value="ALL">Semua Kelas ({students.length} Murid)</option>
                {classes.filter(c => c.active).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

        </div>

        {/* Bar Carian Pantas & Penapis Status Harian */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama murid, no. murid, atau kelas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all text-slate-800"
            />
          </div>

          {/* Penapis Pantas Status untuk Harian */}
          {reportType === 'HARIAN' && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Tapis Status:</span>
              <button
                type="button"
                onClick={() => setDailyStatusFilter('SEMUA')}
                className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  dailyStatusFilter === 'SEMUA' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setDailyStatusFilter('HADIR')}
                className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  dailyStatusFilter === 'HADIR' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                Hadir Tepat
              </button>
              <button
                type="button"
                onClick={() => setDailyStatusFilter('LEWAT')}
                className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  dailyStatusFilter === 'LEWAT' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                Lewat
              </button>
              <button
                type="button"
                onClick={() => setDailyStatusFilter('TIDAK_HADIR')}
                className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  dailyStatusFilter === 'TIDAK_HADIR' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                Belum / Tidak Hadir
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. KAD RINGKASAN EKSEKUTIF (KPI Cards)                         */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Kad 1: Hari Persekolahan / Tarikh */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Hari Persekolahan Layak</span>
          <h3 className="text-2xl font-black text-slate-900 mt-1">
            {totalEligibleDays} {totalEligibleDays === 1 ? 'Hari' : 'Hari'}
          </h3>
          <span className="text-[11px] text-slate-400">
            {reportType === 'HARIAN' 
              ? (totalEligibleDays > 0 ? 'Hari Persekolahan Rasmi' : 'Cuti / Hujung Minggu')
              : 'Tidak termasuk cuti/hujung minggu'}
          </span>
        </div>

        {/* Kad 2: Jumlah Murid Terlibat */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Jumlah Murid Terlibat</span>
          <h3 className="text-2xl font-black text-blue-600 mt-1">
            {students.length} Murid
          </h3>
          <span className="text-[11px] text-slate-400">
            {selectedClassId === 'ALL' ? 'Seluruh SK Batandok (7 Kelas)' : 'Kelas Terpilih'}
          </span>
        </div>

        {/* Kad 3: Transaksi Kehadiran (Hadir + Lewat) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Kehadiran Fizikal</span>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className="text-2xl font-black text-emerald-600">
              {summary.totalTransactions}
            </h3>
            {summary.totalLewat > 0 && (
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                {summary.totalLewat} lewat
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400">
            {summary.totalHadir} tepat • {summary.totalLewat} lewat direkodkan
          </span>
        </div>

        {/* Kad 4: Purata Peratusan Kehadiran */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Purata Peratusan Kehadiran</span>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className={`text-2xl font-black ${
              summary.overallPercentage >= 95 ? 'text-emerald-700' : summary.overallPercentage >= 85 ? 'text-blue-700' : 'text-rose-700'
            }`}>
              {summary.overallPercentage}%
            </h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              summary.overallPercentage >= 95 
                ? 'bg-emerald-100 text-emerald-800' 
                : summary.overallPercentage >= 85 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-rose-100 text-rose-800'
            }`}>
              {summary.overallPercentage >= 95 ? 'Cemerlang' : summary.overallPercentage >= 85 ? 'Sederhana' : 'Perhatian'}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Sasaran KPM: ≥ 95.0%
          </span>
        </div>

      </div>

      {/* ============================================================== */}
      {/* 5. JADUAL DATA UTAMA (Mengikut Mod Pilihan)                     */}
      {/* ============================================================== */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-600">Memuatkan data kehadiran dari pelayan awan...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          
          {/* Header Jadual */}
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {reportTitleLabel}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Memaparkan {filteredStudents.length} daripada {students.length} murid berdaftar
              </p>
            </div>

            <div className="text-right text-[11px] font-mono text-slate-500">
              {reportType === 'HARIAN' ? (
                <span>Status Semakan: {dailySession === 'SEMUA' ? 'Pagi & Pulang' : `Sesi ${dailySession}`}</span>
              ) : (
                <span>Formula: (Hadir + Lewat) ÷ {totalEligibleDays > 0 ? totalEligibleDays : 1} hari layak × 100%</span>
              )}
            </div>
          </div>

          {/* ========================================================== */}
          {/* A. PAPARAN KHAS: LAPORAN HARIAN                             */}
          {/* ========================================================== */}
          {reportType === 'HARIAN' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Bil</th>
                    <th className="py-3 px-4">Nama Murid</th>
                    <th className="py-3 px-4">No. Murid</th>
                    <th className="py-3 px-4">Kelas</th>
                    <th className="py-3 px-4 text-center">Status Kehadiran</th>
                    <th className="py-3 px-4 text-center">Waktu Imbasan</th>
                    <th className="py-3 px-4 text-center">Sesi</th>
                    <th className="py-3 px-4 text-center">Kaedah</th>
                    <th className="py-3 px-4 text-right">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        Tiada murid yang sepadan dengan carian / penapis.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s, idx) => {
                      const stat = studentStatsMap.get(s.id);
                      const recs = stat?.records || [];
                      const primaryRec = recs[0];
                      const isPresent = recs.length > 0;
                      const isLate = recs.some(r => r.status === 'LEWAT');

                      let badge = (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-xs bg-rose-100 text-rose-800 border border-rose-200">
                          <XCircle className="w-3 h-3" />
                          Tidak Hadir
                        </span>
                      );

                      if (isLate) {
                        badge = (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-xs bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            Lewat
                          </span>
                        );
                      } else if (isPresent) {
                        badge = (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-xs bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Hadir Tepat
                          </span>
                        );
                      }

                      return (
                        <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{s.fullName}</div>
                            {s.role && s.role !== 'Murid' && (
                              <span className="text-[10px] text-blue-600 font-semibold">{s.role}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500">{s.studentNumber || '-'}</td>
                          <td className="py-3 px-4 font-semibold text-blue-700">{s.className}</td>
                          <td className="py-3 px-4 text-center">{badge}</td>
                          <td className="py-3 px-4 text-center font-mono text-slate-700">
                            {primaryRec ? formatDisplayTime(primaryRec.scannedAt) : '-'}
                          </td>
                          <td className="py-3 px-4 text-center font-semibold text-slate-600">
                            {primaryRec ? primaryRec.session : '-'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {primaryRec ? (
                              <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-mono text-slate-600 border border-slate-200">
                                {primaryRec.source}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-400 text-[11px]">
                            {primaryRec?.correctionReason || '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ========================================================== */}
          {/* B. PAPARAN KHAS: LAPORAN MINGGUAN (Matriks 5 Hari Isnin-Jum)*/}
          {/* ========================================================== */}
          {reportType === 'MINGGUAN' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3">Bil</th>
                    <th className="py-3 px-3">Nama Murid</th>
                    <th className="py-3 px-3">Kelas</th>
                    {weekInfo.days.map(d => (
                      <th key={d.date} className="py-3 px-2 text-center">
                        <div>{d.shortName}</div>
                        <div className="text-[10px] font-mono text-slate-400 font-normal">{d.date.slice(5)}</div>
                      </th>
                    ))}
                    <th className="py-3 px-3 text-center">Hadir</th>
                    <th className="py-3 px-3 text-center">Lewat</th>
                    <th className="py-3 px-3 text-center">Peratusan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        Tiada murid yang sepadan dengan carian.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s, idx) => {
                      const stat = studentStatsMap.get(s.id);
                      const recs = stat?.records || [];
                      const recMap = new Map<string, string>();
                      recs.forEach(r => {
                        const prev = recMap.get(r.date);
                        if (!prev || (prev === 'LEWAT' && r.status === 'HADIR')) {
                          recMap.set(r.date, r.status);
                        }
                      });

                      let hadirCount = 0;
                      let lewatCount = 0;

                      const dayCells = weekInfo.days.map(d => {
                        const st = recMap.get(d.date);
                        if (st === 'HADIR') {
                          hadirCount++;
                          return (
                            <td key={d.date} className="py-2.5 px-2 text-center">
                              <span className="inline-block w-6 h-6 leading-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]" title="Hadir Tepat">
                                H
                              </span>
                            </td>
                          );
                        } else if (st === 'LEWAT') {
                          lewatCount++;
                          return (
                            <td key={d.date} className="py-2.5 px-2 text-center">
                              <span className="inline-block w-6 h-6 leading-6 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px]" title="Lewat">
                                L
                              </span>
                            </td>
                          );
                        } else {
                          // Semak sama ada hari tersebut hari hadapan
                          const isFuture = d.date > todayStr;
                          return (
                            <td key={d.date} className="py-2.5 px-2 text-center">
                              <span className={`inline-block w-6 h-6 leading-6 rounded-full font-bold text-[11px] ${
                                isFuture ? 'bg-slate-100 text-slate-300' : 'bg-rose-50 text-rose-600 border border-rose-200'
                              }`} title={isFuture ? 'Belum tiba' : 'Tidak Hadir'}>
                                {isFuture ? '-' : 'TH'}
                              </span>
                            </td>
                          );
                        }
                      });

                      const eligible = totalEligibleDays > 0 ? totalEligibleDays : 5;
                      const pct = Math.min(100, Math.round(((hadirCount + lewatCount) / eligible) * 1000) / 10);

                      return (
                        <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{s.fullName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{s.studentNumber || '-'}</div>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-blue-700">{s.className}</td>
                          {dayCells}
                          <td className="py-2.5 px-3 text-center font-bold text-emerald-700">{hadirCount}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-amber-700">{lewatCount}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-xs ${
                              pct >= 90 ? 'bg-emerald-100 text-emerald-800' : pct >= 75 ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {pct}%
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ========================================================== */}
          {/* C. PAPARAN KHAS: LAPORAN BULANAN & SELA MASA               */}
          {/* ========================================================== */}
          {(reportType === 'BULANAN' || reportType === 'SELA_MASA') && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Bil</th>
                    <th className="py-3 px-4">Nama Murid</th>
                    <th className="py-3 px-4">No. Murid</th>
                    <th className="py-3 px-4">Kelas</th>
                    <th className="py-3 px-4 text-center">Hadir Tepat</th>
                    <th className="py-3 px-4 text-center">Lewat</th>
                    <th className="py-3 px-4 text-center">Tidak Hadir</th>
                    <th className="py-3 px-4 text-center">Peratusan (%)</th>
                    <th className="py-3 px-4 text-right">Tindakan HEM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        Tiada rekod murid yang sepadan dengan carian.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s, idx) => {
                      const stat = studentStatsMap.get(s.id) || { hadir: 0, lewat: 0, tidakHadir: 0, records: [] };
                      const eligible = totalEligibleDays > 0 ? totalEligibleDays : 1;
                      const attended = stat.hadir + stat.lewat;
                      const percent = Math.min(100, Math.round((attended / eligible) * 1000) / 10);
                      const estimatedAbsent = Math.max(0, eligible - attended);

                      return (
                        <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{s.fullName}</td>
                          <td className="py-3 px-4 font-mono text-slate-500">{s.studentNumber || '-'}</td>
                          <td className="py-3 px-4 font-semibold text-blue-700">{s.className}</td>
                          <td className="py-3 px-4 text-center text-emerald-700 font-bold">{stat.hadir}</td>
                          <td className="py-3 px-4 text-center text-amber-700 font-bold">{stat.lewat}</td>
                          <td className="py-3 px-4 text-center text-rose-700 font-bold">{estimatedAbsent}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-xs ${
                              percent >= 90 ? 'bg-emerald-100 text-emerald-800' : percent >= 75 ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {percent}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {estimatedAbsent >= 3 ? (
                              <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full inline-block">
                                Surat Amaran
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">Normal</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* ============================================================== */}
      {/* 6. RUANG TANDATANGAN PENGESAHAN (Muncul ketika cetak laporan)   */}
      {/* ============================================================== */}
      <div className="print-only pt-8 mt-12 border-t border-slate-300">
        <div className="grid grid-cols-2 gap-12 text-center text-xs">
          <div>
            <p className="font-semibold text-slate-700 mb-16">Disediakan Oleh:</p>
            <div className="border-t border-slate-400 w-48 mx-auto pt-1 font-bold text-slate-900">
              Guru Bertugas Mingguan
            </div>
            <p className="text-[10px] text-slate-500">SK Batandok Beaufort</p>
          </div>
          <div>
            <p className="font-semibold text-slate-700 mb-16">Disahkan Oleh:</p>
            <div className="border-t border-slate-400 w-48 mx-auto pt-1 font-bold text-slate-900">
              Penolong Kanan HEM
            </div>
            <p className="text-[10px] text-slate-500">SK Batandok Beaufort</p>
          </div>
        </div>
      </div>

    </div>
  );
};
