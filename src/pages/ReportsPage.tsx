import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getAttendanceByDateRange } from '../services/attendanceService';
import { getStudents } from '../services/studentService';
import { getClasses } from '../services/classService';
import { getSchoolDaysForRange, countEligibleDaysBetween } from '../services/calendarService';
import { exportAttendanceToPowerPoint } from '../utils/exportPPTX';
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
import { AttendanceRecord, ClassItem, SchoolDay, Student, ClassAttendancePerformance } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { StudentAttendanceHistoryModal } from '../components/reports/StudentAttendanceHistoryModal';
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
  Sparkles,
  Info,
  ArrowUpDown,
  History,
  CheckCircle,
  HelpCircle,
  Filter,
  AlertCircle,
  Presentation
} from 'lucide-react';

export type ReportType = 'HARIAN' | 'MINGGUAN' | 'BULANAN' | 'SELA_MASA';
export type SortOption = 'name_asc' | 'name_desc' | 'class_asc' | 'rate_desc' | 'rate_asc';
export type StatusFilterOption = 'ALL' | 'EXCELLENT' | 'ATTENTION' | 'CRITICAL' | 'UNRECORDED';

export const ReportsPage: React.FC = () => {
  const { profile, isAdmin } = useAuth();
  const schoolName = import.meta.env.VITE_SCHOOL_NAME || 'SK BATANDOK BEAUFORT';
  const schoolCode = import.meta.env.VITE_SCHOOL_CODE || 'XBA6003';
  const todayStr = getTodayMalaysianDate();
  const currentDate = parseYMD(todayStr);

  // 1. Mod Sistem: Mod Percubaan (Trial Mode) Aktif Sebagai Lalai
  const [isTrialMode, setIsTrialMode] = useState<boolean>(true);
  const [operationalFilter, setOperationalFilter] = useState<'ALL' | 'OFFICIAL_ONLY'>('ALL');
  const [officialStartDate, setOfficialStartDate] = useState<string>('2026-10-26');

  // 2. Mod Pilihan Laporan
  const [reportType, setReportType] = useState<ReportType>('BULANAN');

  // 3. State Penapis Mengikut Mod
  // A. Harian
  const [dailyDate, setDailyDate] = useState<string>(todayStr);
  const [dailySession, setDailySession] = useState<'SEMUA' | 'PAGI' | 'PULANG'>('SEMUA');
  const [dailyStatusFilter, setDailyStatusFilter] = useState<'SEMUA' | 'HADIR' | 'LEWAT' | 'TIDAK_HADIR' | 'BELUM_PULANG' | 'TIADA_REKOD'>('SEMUA');

  // B. Mingguan
  const [weekAnchorDate, setWeekAnchorDate] = useState<string>(todayStr);

  // C. Bulanan
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);

  // D. Sela Masa (Custom Date Range)
  const initialStartDate = useMemo(() => {
    const d = parseYMD(todayStr);
    d.setDate(d.getDate() - 6);
    return toYMD(d);
  }, [todayStr]);
  const [rangeStartDate, setRangeStartDate] = useState<string>(initialStartDate);
  const [rangeEndDate, setRangeEndDate] = useState<string>(todayStr);

  // E. Penapis & Isihan Umum
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('name_asc');
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>('ALL');

  // F. Modal Sejarah Murid
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<Student | null>(null);
  const [isExportingPPTX, setIsExportingPPTX] = useState<boolean>(false);

  // 4. State Data
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

  // Muat data pangkalan data
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
      const d = parseYMD(dailyDate);
      const day = d.getDay();
      return (day >= 1 && day <= 5) ? 1 : 0;
    }

    // Jika mod rasmi aktif dan penapis "Operasi Rasmi Sahaja" dipilih, hadkan tarikh mula kepada officialStartDate
    let actualStart = effectiveStartDate;
    if (!isTrialMode && operationalFilter === 'OFFICIAL_ONLY' && officialStartDate > effectiveStartDate) {
      actualStart = officialStartDate;
    }

    return countEligibleDaysBetween(
      actualStart,
      effectiveEndDate,
      schoolDaysMap,
      todayStr // Hadkan kepada hari ini jika tempoh melangkaui masa hadapan
    );
  }, [reportType, dailyDate, effectiveStartDate, effectiveEndDate, schoolDaysMap, todayStr, isTrialMode, operationalFilter, officialStartDate]);

  // Tapis rekod jika penapis Operasi Rasmi dipilih
  const filteredRecords = useMemo(() => {
    if (!isTrialMode && operationalFilter === 'OFFICIAL_ONLY') {
      return records.filter(r => r.date >= officialStartDate);
    }
    return records;
  }, [records, isTrialMode, operationalFilter, officialStartDate]);

  // Statistik Kehadiran Murid
  const studentStatsMap = useMemo(() => {
    const map = new Map<string, { hadir: number; lewat: number; tidakHadir: number; records: AttendanceRecord[] }>();
    students.forEach(s => map.set(s.id, { hadir: 0, lewat: 0, tidakHadir: 0, records: [] }));

    filteredRecords.forEach(r => {
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
  }, [students, filteredRecords, reportType, dailySession]);

  // Kumpulan statistik keseluruhan
  const summary = useMemo(() => {
    let totalHadir = 0;
    let totalLewat = 0;
    let uniqueStudentsRecorded = 0;

    studentStatsMap.forEach(stat => {
      totalHadir += stat.hadir;
      totalLewat += stat.lewat;
      if (stat.records.length > 0) {
        uniqueStudentsRecorded++;
      }
    });

    const activeEnrolment = students.length;
    const totalTransactions = totalHadir + totalLewat;

    let overallPercentage = 0;
    let totalTidakHadirEstimated = 0;

    if (reportType === 'HARIAN') {
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

    const coveragePercentage = activeEnrolment > 0
      ? Math.round((uniqueStudentsRecorded / activeEnrolment) * 1000) / 10
      : 0;

    return {
      totalHadir,
      totalLewat,
      totalTransactions,
      activeEnrolment,
      overallPercentage,
      totalTidakHadirEstimated,
      uniqueStudentsRecorded,
      coveragePercentage
    };
  }, [studentStatsMap, students.length, totalEligibleDays, reportType]);

  // Analisis Prestasi Mengikut Kelas (Reka bentuk visual persis rujukan gambar pengguna)
  const classPerformanceList = useMemo<ClassAttendancePerformance[]>(() => {
    const eligibleDays = totalEligibleDays > 0 ? totalEligibleDays : 1;

    return classes
      .filter(c => c.active)
      .map(c => {
        const classStudents = students.filter(s => s.classId === c.id);
        let classHadirLewat = 0;
        let uniqueAttended = 0;

        classStudents.forEach(s => {
          const stat = studentStatsMap.get(s.id);
          if (stat) {
            classHadirLewat += (stat.hadir + stat.lewat);
            if (stat.records.length > 0) uniqueAttended++;
          }
        });

        const classPossible = classStudents.length * eligibleDays;
        const rate = classPossible > 0 ? Math.round((classHadirLewat / classPossible) * 1000) / 10 : 0;

        let statusColor: 'green' | 'yellow' | 'red' | 'gray' = 'gray';
        if (uniqueAttended === 0 && classHadirLewat === 0) {
          statusColor = 'gray';
        } else if (rate >= 95) {
          statusColor = 'green';
        } else if (rate >= 85) {
          statusColor = 'yellow';
        } else {
          statusColor = 'red';
        }

        return {
          classId: c.id,
          className: c.name,
          yearLevel: c.yearLevel,
          studentCount: classStudents.length,
          uniqueAttendedCount: uniqueAttended,
          totalPresentSessions: classHadirLewat,
          attendanceRate: rate,
          statusColor
        };
      })
      .sort((a, b) => a.yearLevel - b.yearLevel || a.className.localeCompare(b.className));
  }, [classes, students, studentStatsMap, totalEligibleDays]);

  // Tapis & Susun Murid
  const filteredStudents = useMemo(() => {
    const eligibleDays = totalEligibleDays > 0 ? totalEligibleDays : 1;

    let result = students.filter(s => {
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
        if (dailySession === 'PULANG') {
          const pagi = filteredRecords.find(r => r.studentId === s.id && r.date === dailyDate && r.session === 'PAGI');
          const pulang = filteredRecords.find(r => r.studentId === s.id && r.date === dailyDate && r.session === 'PULANG');
          const hasMorning = !!pagi && (pagi.status === 'HADIR' || pagi.status === 'LEWAT');
          const hasPulang = !!pulang;

          if (dailyStatusFilter === 'HADIR' && !hasPulang) return false;
          if (dailyStatusFilter === 'BELUM_PULANG' && (!hasMorning || hasPulang)) return false;
          if (dailyStatusFilter === 'TIADA_REKOD' && (hasMorning || hasPulang)) return false;
          if (dailyStatusFilter === 'TIDAK_HADIR' && (pagi?.status !== 'TIDAK_HADIR' || hasPulang)) return false;
        } else {
          const stat = studentStatsMap.get(s.id);
          const hasHadir = (stat?.hadir || 0) > 0;
          const hasLewat = (stat?.lewat || 0) > 0;
          const isPresent = hasHadir || hasLewat;

          if (dailyStatusFilter === 'HADIR' && !hasHadir) return false;
          if (dailyStatusFilter === 'LEWAT' && !hasLewat) return false;
          if (dailyStatusFilter === 'TIDAK_HADIR' && isPresent) return false;
        }
      }

      // Tapis status kelayakan bulanan/sela masa
      if ((reportType === 'BULANAN' || reportType === 'SELA_MASA') && statusFilter !== 'ALL') {
        const stat = studentStatsMap.get(s.id);
        const attended = (stat?.hadir || 0) + (stat?.lewat || 0);
        const rate = Math.round((attended / eligibleDays) * 100);
        const hasRecords = (stat?.records.length || 0) > 0;

        if (statusFilter === 'EXCELLENT' && rate < 95) return false;
        if (statusFilter === 'ATTENTION' && (rate < 85 || rate >= 95)) return false;
        if (statusFilter === 'CRITICAL' && (rate >= 85 || !hasRecords)) return false;
        if (statusFilter === 'UNRECORDED' && hasRecords) return false;
      }

      return true;
    });

    // Isihan (Sorting)
    result.sort((a, b) => {
      if (sortBy === 'name_asc') return a.fullName.localeCompare(b.fullName);
      if (sortBy === 'name_desc') return b.fullName.localeCompare(a.fullName);
      if (sortBy === 'class_asc') return (a.className || '').localeCompare(b.className || '');
      
      const statA = studentStatsMap.get(a.id);
      const statB = studentStatsMap.get(b.id);
      const rateA = ((statA?.hadir || 0) + (statA?.lewat || 0)) / eligibleDays;
      const rateB = ((statB?.hadir || 0) + (statB?.lewat || 0)) / eligibleDays;

      if (sortBy === 'rate_desc') return rateB - rateA;
      if (sortBy === 'rate_asc') return rateA - rateB;
      return 0;
    });

    return result;
  }, [students, searchQuery, reportType, dailyStatusFilter, statusFilter, sortBy, studentStatsMap, totalEligibleDays]);

  // Pengendali Eksport Excel Mengikut Mod
  const handleExportExcel = () => {
    if (reportType === 'HARIAN') {
      exportDailyReportToExcel({
        schoolName,
        dateStr: dailyDate,
        sessionFilter: dailySession,
        students,
        classes,
        attendanceRecords: filteredRecords
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
        attendanceRecords: filteredRecords
      });
    } else if (reportType === 'BULANAN') {
      exportAttendanceToExcel({
        schoolName,
        monthName: getMonthNameBM(selectedMonth),
        year: selectedYear,
        totalSchoolDays: totalEligibleDays,
        students,
        classes,
        attendanceRecords: filteredRecords,
        isTrialMode,
        schoolDaysMap
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
        attendanceRecords: filteredRecords
      });
    }
  };

  // Pengendali Eksport Persembahan Slaid PowerPoint (.pptx)
  const handleExportPPTX = async () => {
    try {
      setIsExportingPPTX(true);
      
      let periodName = getMonthNameBM(selectedMonth);
      let periodYear = selectedYear;

      if (reportType === 'HARIAN') {
        periodName = `Harian (${formatDateShortBM(dailyDate)})`;
        periodYear = parseYMD(dailyDate).getFullYear();
      } else if (reportType === 'MINGGUAN') {
        periodName = `Mingguan (${weekInfo.label})`;
      } else if (reportType === 'SELA_MASA') {
        periodName = `Sela Masa (${formatDateShortBM(rangeStartDate)} - ${formatDateShortBM(rangeEndDate)})`;
      }

      await exportAttendanceToPowerPoint({
        schoolName,
        schoolCode,
        motto: 'BERUSAHA BERILMU JAYA',
        monthName: periodName,
        year: periodYear,
        periodLabel: periodDescription,
        isTrialMode,
        eligibleDays: totalEligibleDays,
        totalEnrolment: summary.activeEnrolment,
        uniqueStudentsRecorded: summary.uniqueStudentsRecorded,
        coveragePercentage: summary.coveragePercentage,
        totalTransactions: summary.totalTransactions,
        totalHadir: summary.totalHadir,
        totalLewat: summary.totalLewat,
        overallPercentage: summary.overallPercentage,
        classPerformanceList
      });
    } catch (err) {
      console.error('Ralat mengeksport PowerPoint:', err);
      alert('Gagal menjana slaid PowerPoint. Sila pastikan pelayar tidak menyekat muat turun.');
    } finally {
      setIsExportingPPTX(false);
    }
  };

  // Navigasi Minggu
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
        <p className="text-xs text-slate-600 font-medium">
          {periodDescription} | Enrolmen Layak: {students.length} Murid | Status: {isTrialMode ? 'MOD PERCUBAAN' : 'OPERASI RASMI'}
        </p>
      </div>

      {/* ============================================================== */}
      {/* 2. BAR MOD SISTEM & PILIHAN LAPORAN                            */}
      {/* ============================================================== */}
      <div className="no-print bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        
        {/* Mod Laporan Segmented Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setReportType('HARIAN')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              reportType === 'HARIAN'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Harian</span>
          </button>

          <button
            onClick={() => setReportType('MINGGUAN')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              reportType === 'MINGGUAN'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Mingguan</span>
          </button>

          <button
            onClick={() => setReportType('BULANAN')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              reportType === 'BULANAN'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Bulanan</span>
          </button>

          <button
            onClick={() => setReportType('SELA_MASA')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              reportType === 'SELA_MASA'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Sela Masa</span>
          </button>
        </div>

        {/* Status Mod Percubaan & Tindakan */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Suis Mod Percubaan / Operasi Rasmi */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setIsTrialMode(true)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center space-x-1 ${
                isTrialMode 
                  ? 'bg-amber-500 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Sistem dalam tempoh ujian & penentukuran"
            >
              <Sparkles className="w-3 h-3" />
              <span>Mod Percubaan</span>
            </button>
            <button
              onClick={() => setIsTrialMode(false)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center space-x-1 ${
                !isTrialMode 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Operasi kehadiran rasmi sekolah"
            >
              <CheckCircle className="w-3 h-3" />
              <span>Operasi Rasmi</span>
            </button>
          </div>

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

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPPTX}
            disabled={isExportingPPTX}
            icon={isExportingPPTX ? <Loader2 className="w-4 h-4 animate-spin text-orange-600" /> : <Presentation className="w-4 h-4 text-orange-600" />}
            className="text-orange-700 bg-orange-50 hover:bg-orange-100 border-orange-200"
            title="Eksport Persembahan Slaid PowerPoint Rasmi (.pptx) dengan Graf Interaktif"
          >
            {isExportingPPTX ? 'Menjana Slaid...' : 'Slaid PowerPoint (.pptx)'}
          </Button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. KOMPONEN PENUNJUK LIPUTAN REKOD KEHADIRAN (Data Coverage)    */}
      {/* ============================================================== */}
      <div className={`p-4 rounded-2xl border shadow-xs transition-all ${
        isTrialMode 
          ? 'bg-amber-50/80 border-amber-200 text-amber-950' 
          : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5 max-w-2xl">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 font-bold text-xs mt-0.5 ${
              isTrialMode ? 'bg-amber-200 text-amber-900' : 'bg-emerald-200 text-emerald-900'
            }`}>
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="font-bold text-slate-900 text-xs">
                  Liputan Rekod Kehadiran Murid
                </h4>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  isTrialMode 
                    ? 'bg-amber-200 text-amber-900 border border-amber-300' 
                    : 'bg-emerald-200 text-emerald-900 border border-emerald-300'
                }`}>
                  {isTrialMode ? 'MOD PERCUBAAN' : 'OPERASI RASMI'}
                </span>
              </div>

              <p className="text-xs text-slate-800 mt-1 font-medium">
                <strong className="font-bold text-slate-950">{summary.uniqueStudentsRecorded} daripada {summary.activeEnrolment} murid</strong> mempunyai rekod kehadiran dalam tempoh ini ({summary.coveragePercentage}% Liputan).
              </p>

              <p className="text-[11px] text-slate-600 mt-0.5">
                {isTrialMode 
                  ? `Sistem sedang dalam mod percubaan. Purata kumulatif sekolah (${summary.overallPercentage}%) mencerminkan ${summary.totalTransactions} transaksi imbasan daripada ${summary.activeEnrolment * totalEligibleDays} hari-murid layak (${totalEligibleDays} hari persekolahan layak).`
                  : `Kadar kehadiran rasmi sekolah ialah ${summary.overallPercentage}% berasaskan kehadiran kumulatif fizikal sepanjang ${totalEligibleDays} hari persekolahan layak.`}
              </p>
            </div>
          </div>

          {/* Bar Kemajuan Liputan Data */}
          <div className="min-w-[220px]">
            <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
              <span>Liputan Murid Imbas:</span>
              <span className={`font-mono ${isTrialMode ? 'text-amber-800' : 'text-emerald-800'}`}>
                {summary.coveragePercentage}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  isTrialMode ? 'bg-amber-600' : 'bg-emerald-600'
                }`} 
                style={{ width: `${Math.min(100, Math.max(0, summary.coveragePercentage))}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block text-right font-medium">
              {summary.activeEnrolment - summary.uniqueStudentsRecorded} murid belum mula mengimbas
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. BAR KAWALAN PENAPIS DINAMIK                                  */}
      {/* ============================================================== */}
      <div className="no-print bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          
          {/* A. Kawalan Harian */}
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

          {/* B. Kawalan Mingguan */}
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

          {/* C. Kawalan Bulanan */}
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
                  {[2025, 2026, 2027, 2028, 2029, 2030].map(y => (
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

          {/* D. Kawalan Sela Masa */}
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

          {/* E. Penapis Kelas Sejagat */}
          <div className="flex flex-wrap items-center gap-3 ml-auto">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Penapis Kelas
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 shadow-xs focus:ring-2 focus:ring-blue-500 min-w-[160px]"
              >
                <option value="ALL">Semua Kelas ({students.length} Murid)</option>
                {classes.filter(c => c.active).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

        </div>

        {/* Bar Carian, Isihan, & Penapis Prestasi */}
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

          <div className="flex flex-wrap items-center gap-2">
            
            {/* Isihan Murid */}
            <div className="flex items-center space-x-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Susun:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium"
              >
                <option value="name_asc">Nama (A - Z)</option>
                <option value="name_desc">Nama (Z - A)</option>
                <option value="class_asc">Kelas</option>
                <option value="rate_desc">Kadar Kehadiran (Tinggi ke Rendah)</option>
                <option value="rate_asc">Kadar Kehadiran (Rendah ke Tinggi)</option>
              </select>
            </div>

            {/* Penapis Status Prestasi (Bulanan / Sela Masa) */}
            {(reportType === 'BULANAN' || reportType === 'SELA_MASA') && (
              <div className="flex items-center space-x-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="EXCELLENT">Cemerlang (≥95%)</option>
                  <option value="ATTENTION">Perhatian (85% - 94%)</option>
                  <option value="CRITICAL">Perlu Semakan (&lt;85%)</option>
                  <option value="UNRECORDED">Belum Ada Rekod</option>
                </select>
              </div>
            )}

            {/* Penapis Pantas Status untuk Harian */}
            {reportType === 'HARIAN' && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Tapis:</span>
                <button
                  type="button"
                  onClick={() => setDailyStatusFilter('SEMUA')}
                  className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors ${
                    dailyStatusFilter === 'SEMUA' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Semua
                </button>

                {dailySession === 'PULANG' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setDailyStatusFilter('HADIR')}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors ${
                        dailyStatusFilter === 'HADIR' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                      }`}
                    >
                      Telah Pulang
                    </button>
                    <button
                      type="button"
                      onClick={() => setDailyStatusFilter('BELUM_PULANG')}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors ${
                        dailyStatusFilter === 'BELUM_PULANG' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                      }`}
                    >
                      Belum Pulang
                    </button>
                    <button
                      type="button"
                      onClick={() => setDailyStatusFilter('TIADA_REKOD')}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors ${
                        dailyStatusFilter === 'TIADA_REKOD' ? 'bg-slate-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Tiada Rekod Masuk
                    </button>
                  </>
                ) : (
                  <>
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
                      Belum Hadir
                    </button>
                  </>
                )}
              </div>
            )}

          </div>

        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. KAD RINGKASAN EKSEKUTIF (KPI Cards)                         */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Kad 1: Hari Persekolahan Layak */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Hari Persekolahan Layak</span>
          <h3 className="text-2xl font-black text-slate-900 mt-1">
            {totalEligibleDays} Hari
          </h3>
          <span className="text-[11px] text-slate-400">
            {reportType === 'HARIAN' 
              ? (totalEligibleDays > 0 ? 'Hari Persekolahan Rasmi' : 'Cuti / Hujung Minggu')
              : 'Tidak termasuk cuti rasmi & hujung minggu'}
          </span>
        </div>

        {/* Kad 2: Jumlah Murid Terlibat */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Jumlah Murid Layak</span>
          <h3 className="text-2xl font-black text-blue-600 mt-1">
            {summary.activeEnrolment} Murid
          </h3>
          <span className="text-[11px] text-slate-400">
            {selectedClassId === 'ALL' ? 'Enrolmen 7 Kelas SK Batandok' : 'Kelas Terpilih'}
          </span>
        </div>

        {/* Kad 3: Transaksi Hadir vs Murid Unik */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">
            {dailySession === 'PULANG' ? 'Transaksi Imbasan Pulang' : 'Jumlah Transaksi Hadir'}
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className={`text-2xl font-black ${dailySession === 'PULANG' ? 'text-indigo-600' : 'text-emerald-600'}`}>
              {summary.totalTransactions}
            </h3>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
              {summary.uniqueStudentsRecorded} murid unik
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            {summary.totalHadir} tepat • {summary.totalLewat} lewat direkodkan
          </span>
        </div>

        {/* Kad 4: Purata Kehadiran Rasmi Sekolah */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs relative group">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Purata Kehadiran Rasmi</span>
            <div className="cursor-help text-slate-400 hover:text-slate-600" title="Klik untuk penjelasan formula">
              <Info className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <h3 className={`text-2xl font-black ${
              summary.overallPercentage >= 95 ? 'text-emerald-700' : summary.overallPercentage >= 85 ? 'text-amber-600' : 'text-rose-700'
            }`}>
              {summary.overallPercentage}%
            </h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              summary.overallPercentage >= 95 
                ? 'bg-emerald-100 text-emerald-800' 
                : summary.overallPercentage >= 85 
                ? 'bg-amber-100 text-amber-800' 
                : 'bg-rose-100 text-rose-800'
            }`}>
              {summary.overallPercentage >= 95 ? 'Cemerlang' : summary.overallPercentage >= 85 ? 'Perhatian' : 'Perlu Semakan'}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 block truncate">
            Formula: (Hadir+Lewat) ÷ ({summary.activeEnrolment}×{totalEligibleDays})
          </span>
        </div>

      </div>

      {/* ============================================================== */}
      {/* 6. KOMPONEN PRESTASI KELAS (Persis Gambar Rujukan Pengguna)     */}
      {/* ============================================================== */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Prestasi kelas</h3>
            <p className="text-[11px] text-slate-500">
              Analisis Kehadiran Mengikut Kelas (SK Batandok Beaufort)
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-slate-400 font-mono">
              {isTrialMode ? 'Data Percubaan' : 'Data Operasi Rasmi'}
            </span>
            {selectedClassId !== 'ALL' && (
              <button
                onClick={() => setSelectedClassId('ALL')}
                className="text-xs font-bold text-blue-600 hover:underline px-2 py-1 bg-blue-50 rounded-lg"
              >
                Tunjuk Semua Kelas
              </button>
            )}
          </div>
        </div>

        {/* Senarai Bar Prestasi Kelas (Sesuai dengan Tangkap Layar Rujukan) */}
        <div className="space-y-4">
          {classPerformanceList.map((cp) => {
            const isSelected = selectedClassId === cp.classId;

            return (
              <div 
                key={cp.classId}
                onClick={() => setSelectedClassId(isSelected ? 'ALL' : cp.classId)}
                className={`group cursor-pointer p-3 rounded-xl transition-all ${
                  isSelected 
                    ? 'bg-blue-50/80 border border-blue-300 ring-2 ring-blue-500/20' 
                    : 'hover:bg-slate-50 border border-transparent'
                }`}
                title={`Klik untuk menapis senarai murid kelas ${cp.className}`}
              >
                <div className="flex items-center justify-between text-xs font-bold mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-900 group-hover:text-blue-700 transition-colors">
                      {cp.className}
                    </span>
                    <span className="text-[11px] font-normal text-slate-400">
                      ({cp.studentCount} murid • {cp.uniqueAttendedCount} telah imbas)
                    </span>
                    {isSelected && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-blue-600 text-white rounded">
                        Dipilih
                      </span>
                    )}
                  </div>

                  <span className={`font-mono text-sm font-black ${
                    cp.statusColor === 'green' ? 'text-emerald-600' :
                    cp.statusColor === 'yellow' ? 'text-amber-500' :
                    cp.statusColor === 'red' ? 'text-rose-600' : 'text-slate-400'
                  }`}>
                    {cp.uniqueAttendedCount === 0 && cp.totalPresentSessions === 0 
                      ? '0%' 
                      : `${cp.attendanceRate}%`}
                  </span>
                </div>

                {/* Progress Bar Horizontal Tebal (Persis Gambar) */}
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-700 ${
                      cp.statusColor === 'green' ? 'bg-emerald-600' :
                      cp.statusColor === 'yellow' ? 'bg-amber-500' :
                      cp.statusColor === 'red' ? 'bg-rose-600' : 'bg-slate-300'
                    }`}
                    style={{ width: `${Math.max(cp.attendanceRate, cp.uniqueAttendedCount > 0 ? 3 : 0)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Nota Kaki */}
        <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
          <p>
            Pentadbir boleh klik nama kelas untuk melihat senarai murid dan butiran kehadiran bagi kelas tersebut.
          </p>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 7. JADUAL DATA UTAMA INDIVIDU MURID                             */}
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
                {selectedClassId !== 'ALL' && ` (Ditapis untuk Kelas ${classes.find(c => c.id === selectedClassId)?.name})`}
              </p>
            </div>

            <div className="text-right text-[11px] font-mono text-slate-500">
              {reportType === 'HARIAN' ? (
                <span>Status Semakan: {dailySession === 'SEMUA' ? 'Pagi & Pulang' : `Sesi ${dailySession}`}</span>
              ) : (
                <span>Formula Rasmi: (Hadir + Lewat) ÷ {totalEligibleDays > 0 ? totalEligibleDays : 1} hari layak × 100%</span>
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
                    <th className="py-3 px-4 text-right">Tindakan</th>
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
                      const pagi = filteredRecords.find(r => r.studentId === s.id && r.date === dailyDate && r.session === 'PAGI');
                      const pulang = filteredRecords.find(r => r.studentId === s.id && r.date === dailyDate && r.session === 'PULANG');
                      const isMorningPresent = !!pagi && (pagi.status === 'HADIR' || pagi.status === 'LEWAT');
                      const isMorningLate = pagi?.status === 'LEWAT';
                      const hasPulang = !!pulang;

                      let badge: React.ReactNode;
                      let displayRec: AttendanceRecord | undefined;

                      if (dailySession === 'PULANG') {
                        if (hasPulang && isMorningPresent) {
                          badge = (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-xs bg-indigo-100 text-indigo-800 border border-indigo-200">
                              <CheckCircle2 className="w-3 h-3" />
                              TELAH PULANG
                            </span>
                          );
                          displayRec = pulang;
                        } else if (hasPulang && !isMorningPresent) {
                          badge = (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-xs bg-purple-100 text-purple-900 border border-purple-300" title="Murid pulang tanpa rekod masuk pagi">
                              <AlertCircle className="w-3 h-3" />
                              PULANG (TIADA REKOD PAGI)
                            </span>
                          );
                          displayRec = pulang;
                        } else if (!hasPulang && isMorningPresent) {
                          badge = (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-xs bg-amber-100 text-amber-900 border border-amber-300">
                              <Clock className="w-3 h-3" />
                              BELUM PULANG
                            </span>
                          );
                          displayRec = pagi;
                        } else if (pagi?.status === 'TIDAK_HADIR') {
                          badge = (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-xs bg-red-100 text-red-800 border border-red-200">
                              <XCircle className="w-3 h-3" />
                              TIDAK HADIR DISAHKAN
                            </span>
                          );
                          displayRec = pagi;
                        } else {
                          badge = (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium text-xs bg-slate-100 text-slate-500 border border-slate-200">
                              <XCircle className="w-3 h-3" />
                              TIADA REKOD MASUK
                            </span>
                          );
                          displayRec = undefined;
                        }
                      } else {
                        // Sesi PAGI atau SEMUA
                        if (isMorningLate) {
                          badge = (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-xs bg-amber-100 text-amber-800 border border-amber-200">
                              <Clock className="w-3 h-3" />
                              Lewat
                            </span>
                          );
                          displayRec = pagi;
                        } else if (isMorningPresent) {
                          badge = (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-xs bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Hadir Tepat
                            </span>
                          );
                          displayRec = pagi;
                        } else if (pagi?.status === 'TIDAK_HADIR') {
                          badge = (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-xs bg-red-100 text-red-800 border border-red-200">
                              <XCircle className="w-3 h-3" />
                              Tidak Hadir Disahkan
                            </span>
                          );
                          displayRec = pagi;
                        } else {
                          badge = (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium text-xs bg-slate-100 text-slate-500 border border-slate-200">
                              <XCircle className="w-3 h-3" />
                              Belum Hadir
                            </span>
                          );
                          displayRec = undefined;
                        }
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
                            {displayRec ? formatDisplayTime(displayRec.scannedAt) : '-'}
                          </td>
                          <td className="py-3 px-4 text-center font-semibold text-slate-600">
                            {dailySession === 'PULANG' ? (displayRec?.session || 'PULANG') : (displayRec?.session || 'PAGI')}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {displayRec ? (
                              <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-mono text-slate-600 border border-slate-200">
                                {displayRec.source}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setSelectedStudentForHistory(s)}
                              className="px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center space-x-1"
                              title="Lihat Sejarah Imbasan Murid"
                            >
                              <History className="w-3.5 h-3.5" />
                              <span>Sejarah</span>
                            </button>
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
          {/* B. PAPARAN KHAS: LAPORAN MINGGUAN                           */}
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
                    <th className="py-3 px-3 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400">
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
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => setSelectedStudentForHistory(s)}
                              className="px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center space-x-1"
                              title="Lihat Sejarah"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
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
                    <th className="py-3 px-4 text-center">Status Kelengkapan</th>
                    <th className="py-3 px-4 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        Tiada rekod murid yang sepadan dengan kriteria carian/penapis.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s, idx) => {
                      const stat = studentStatsMap.get(s.id) || { hadir: 0, lewat: 0, tidakHadir: 0, records: [] };
                      const eligible = totalEligibleDays > 0 ? totalEligibleDays : 1;
                      const attended = stat.hadir + stat.lewat;
                      const percent = Math.min(100, Math.round((attended / eligible) * 1000) / 10);
                      const estimatedAbsent = Math.max(0, eligible - attended);
                      const hasRecords = stat.records.length > 0;

                      let rateBadgeClass = 'bg-slate-100 text-slate-600';
                      if (hasRecords) {
                        if (percent >= 95) rateBadgeClass = 'bg-emerald-100 text-emerald-800';
                        else if (percent >= 85) rateBadgeClass = 'bg-amber-100 text-amber-800';
                        else rateBadgeClass = 'bg-rose-100 text-rose-800';
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
                          <td className="py-3 px-4 text-center text-emerald-700 font-bold">{stat.hadir}</td>
                          <td className="py-3 px-4 text-center text-amber-700 font-bold">{stat.lewat}</td>
                          <td className="py-3 px-4 text-center text-rose-700 font-bold">
                            {hasRecords ? estimatedAbsent : '-'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-xs ${rateBadgeClass}`}>
                              {percent}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {hasRecords ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Lengkap ({stat.records.length} Imbasan)
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                Belum Ada Rekod
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setSelectedStudentForHistory(s)}
                              className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center space-x-1"
                              title="Buka Sejarah Imbasan Murid"
                            >
                              <History className="w-3.5 h-3.5" />
                              <span>Sejarah</span>
                            </button>
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
      {/* 8. RUANG TANDATANGAN PENGESAHAN (Muncul ketika cetak laporan)   */}
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
              PK HEM (SK Batandok)
            </div>
            <p className="text-[10px] text-slate-500">SK Batandok Beaufort</p>
          </div>
        </div>
      </div>

      {/* Modal Sejarah Imbasan Harian Murid */}
      {selectedStudentForHistory && (
        <StudentAttendanceHistoryModal
          isOpen={!!selectedStudentForHistory}
          onClose={() => setSelectedStudentForHistory(null)}
          student={selectedStudentForHistory}
          periodLabel={periodDescription}
          eligibleDaysCount={totalEligibleDays}
          records={filteredRecords}
        />
      )}

    </div>
  );
};
