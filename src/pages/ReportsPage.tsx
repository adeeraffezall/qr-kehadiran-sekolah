import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getMonthlyAttendance } from '../services/attendanceService';
import { getStudents } from '../services/studentService';
import { getClasses } from '../services/classService';
import { getSchoolDaysForMonth, countEligibleSchoolDays } from '../services/calendarService';
import { exportAttendanceToExcel } from '../utils/exportExcel';
import { getMonthNameBM, getTodayMalaysianDate } from '../utils/dateUtils';
import { AttendanceRecord, ClassItem, SchoolDay, Student } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { 
  FileSpreadsheet, 
  Download, 
  Calendar, 
  Filter, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Loader2 
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { profile, isAdmin } = useAuth();
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');

  const [loading, setLoading] = useState<boolean>(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [schoolDaysMap, setSchoolDaysMap] = useState<Map<string, SchoolDay>>(new Map());

  const schoolName = import.meta.env.VITE_SCHOOL_NAME || 'SK BATANDOK BEAUFORT';

  useEffect(() => {
    async function loadReport() {
      setLoading(true);
      try {
        const [sList, cList, aRecords, sDays] = await Promise.all([
          getStudents(selectedClassId === 'ALL' ? undefined : selectedClassId, false),
          getClasses(),
          getMonthlyAttendance(selectedYear, selectedMonth),
          getSchoolDaysForMonth(selectedYear, selectedMonth)
        ]);

        const classMap = new Map<string, string>();
        cList.forEach(c => classMap.set(c.id, c.name));

        const enrichedStudents = sList.map(s => ({
          ...s,
          className: classMap.get(s.classId) || 'Kelas'
        }));

        setStudents(enrichedStudents);
        setClasses(cList);
        setRecords(aRecords);
        setSchoolDaysMap(sDays);
      } catch (err) {
        console.error('Ralat laporan bulanan:', err);
      } finally {
        setLoading(false);
      }
    }

    loadReport();
  }, [selectedYear, selectedMonth, selectedClassId]);

  // Kira jumlah hari persekolahan yang layak bagi bulan ini
  const todayStr = getTodayMalaysianDate();
  const totalEligibleSchoolDays = countEligibleSchoolDays(
    selectedYear, 
    selectedMonth, 
    schoolDaysMap,
    todayStr // Hanya kira hari persekolahan sehingga hari ini jika bulan semasa
  );

  // Kumpulkan statistik setiap murid
  const studentStatsMap = new Map<string, { hadir: number; lewat: number; tidakHadir: number }>();
  students.forEach(s => studentStatsMap.set(s.id, { hadir: 0, lewat: 0, tidakHadir: 0 }));

  records.forEach(r => {
    const stat = studentStatsMap.get(r.studentId);
    if (stat) {
      if (r.status === 'HADIR') stat.hadir += 1;
      else if (r.status === 'LEWAT') stat.lewat += 1;
      else if (r.status === 'TIDAK_HADIR') stat.tidakHadir += 1;
    }
  });

  // Hitung jumlah keseluruhan
  let totalHadirAll = 0;
  let totalLewatAll = 0;
  studentStatsMap.forEach(stat => {
    totalHadirAll += stat.hadir;
    totalLewatAll += stat.lewat;
  });

  const totalPossible = students.length * (totalEligibleSchoolDays > 0 ? totalEligibleSchoolDays : 1);
  const overallPercentage = totalPossible > 0 
    ? Math.min(100, Math.round(((totalHadirAll + totalLewatAll) / totalPossible) * 1000) / 10) 
    : 0;

  const handleExportExcel = () => {
    exportAttendanceToExcel({
      schoolName,
      monthName: getMonthNameBM(selectedMonth),
      year: selectedYear,
      totalSchoolDays: totalEligibleSchoolDays,
      students,
      classes,
      attendanceRecords: records
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Export Button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Laporan Bulanan Kehadiran Murid</h2>
          <p className="text-xs text-slate-500">
            Peratusan rasmi dihitung: <span className="font-mono font-semibold text-slate-700">(Hadir + Lewat) ÷ Hari Layak Persekolahan × 100%</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Pilih Tahun */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 shadow-xs"
          >
            {[2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* Pilih Bulan */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 shadow-xs"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
              <option key={m} value={m}>{getMonthNameBM(m)}</option>
            ))}
          </select>

          {/* Pilih Kelas */}
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 shadow-xs"
          >
            <option value="ALL">Semua Kelas</option>
            {classes.filter(c => c.active).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <Button
            variant="success"
            size="sm"
            onClick={handleExportExcel}
            icon={<Download className="w-4 h-4" />}
          >
            Eksport Buku Kerja Excel (.xlsx)
          </Button>
        </div>
      </div>

      {/* Ringkasan Eksekutif Bulan */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Hari Persekolahan Layak</span>
          <h3 className="text-2xl font-black text-slate-900 mt-1">{totalEligibleSchoolDays} Hari</h3>
          <span className="text-[11px] text-slate-400">Tidak termasuk cuti/hujung minggu</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Jumlah Murid Terlibat</span>
          <h3 className="text-2xl font-black text-blue-600 mt-1">{students.length} Murid</h3>
          <span className="text-[11px] text-slate-400">{selectedClassId === 'ALL' ? 'Seluruh Sekolah' : 'Kelas Terpilih'}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Jumlah Transaksi Hadir</span>
          <h3 className="text-2xl font-black text-emerald-600 mt-1">{totalHadirAll + totalLewatAll}</h3>
          <span className="text-[11px] text-emerald-700 font-semibold">{totalLewatAll} kes lewat direkod</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Purata Kehadiran Sekolah</span>
          <h3 className="text-2xl font-black text-indigo-700 mt-1">{overallPercentage}%</h3>
          <span className="text-[11px] text-slate-400">Sasaran KPM: ≥ 95.0%</span>
        </div>
      </div>

      {/* Jadual Prestasi Murid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">
              Rekod Kehadiran Individu — {getMonthNameBM(selectedMonth)} {selectedYear}
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              Formula: (Hadir + Lewat) ÷ {totalEligibleSchoolDays > 0 ? totalEligibleSchoolDays : 1} hari
            </span>
          </div>

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
                  <th className="py-3 px-4 text-right">Status Amaran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Tiada rekod murid bagi penapis ini.
                    </td>
                  </tr>
                ) : (
                  students.map((s, idx) => {
                    const stat = studentStatsMap.get(s.id) || { hadir: 0, lewat: 0, tidakHadir: 0 };
                    const eligible = totalEligibleSchoolDays > 0 ? totalEligibleSchoolDays : 1;
                    const percent = Math.min(100, Math.round(((stat.hadir + stat.lewat) / eligible) * 1000) / 10);

                    return (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{s.fullName}</td>
                        <td className="py-3 px-4 font-mono text-slate-500">{s.studentNumber || '-'}</td>
                        <td className="py-3 px-4 font-semibold text-blue-700">{s.className}</td>
                        <td className="py-3 px-4 text-center text-emerald-700 font-semibold">{stat.hadir}</td>
                        <td className="py-3 px-4 text-center text-amber-700 font-semibold">{stat.lewat}</td>
                        <td className="py-3 px-4 text-center text-rose-700 font-semibold">{stat.tidakHadir}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-xs ${
                            percent >= 90 ? 'bg-emerald-100 text-emerald-800' : percent >= 75 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {percent}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {stat.tidakHadir >= 3 ? (
                            <span className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
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
        </div>
      )}

    </div>
  );
};
