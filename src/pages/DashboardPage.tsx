import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getStudents } from '../services/studentService';
import { getClasses } from '../services/classService';
import { getAttendanceByDateAndSession, getSessionInfo } from '../services/attendanceService';
import { getTodayMalaysianDate, formatDisplayDate, formatDisplayTime } from '../utils/dateUtils';
import { Student, ClassItem, AttendanceRecord, SessionInfo } from '../types';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { 
  Users, 
  GraduationCap, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  LogOut, 
  QrCode, 
  ArrowRight, 
  Loader2, 
  Calendar 
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { profile, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [morningAttendance, setMorningAttendance] = useState<AttendanceRecord[]>([]);
  const [dismissalAttendance, setDismissalAttendance] = useState<AttendanceRecord[]>([]);
  const [morningSession, setMorningSession] = useState<SessionInfo | null>(null);

  const todayStr = getTodayMalaysianDate();

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        const [studList, classList, mRecords, dRecords, mSession] = await Promise.all([
          getStudents('ALL', true),
          getClasses(),
          getAttendanceByDateAndSession(todayStr, 'PAGI'),
          getAttendanceByDateAndSession(todayStr, 'PULANG'),
          getSessionInfo(todayStr, 'PAGI')
        ]);

        setStudents(studList);
        setClasses(classList);
        setMorningAttendance(mRecords);
        setDismissalAttendance(dRecords);
        setMorningSession(mSession);
      } catch (err) {
        console.error('Ralat memuatkan dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [todayStr]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <p className="text-xs text-slate-500 font-medium">Memuatkan data sekolah...</p>
      </div>
    );
  }

  // Pengiraan metrik kehadiran pagi
  const activeStudentCount = students.length;
  const morningHadir = morningAttendance.filter(r => r.status === 'HADIR').length;
  const morningLewat = morningAttendance.filter(r => r.status === 'LEWAT').length;
  const morningTotalRecorded = morningAttendance.length;
  const morningBelum = Math.max(0, activeStudentCount - morningTotalRecorded);
  const morningPercentage = activeStudentCount > 0 ? Math.round(((morningHadir + morningLewat) / activeStudentCount) * 100) : 0;

  // Imbasan terkini (gabungan rekod hari ini)
  const allScansToday = [...morningAttendance, ...dismissalAttendance].sort((a, b) => {
    const timeA = a.scannedAt?.seconds || 0;
    const timeB = b.scannedAt?.seconds || 0;
    return timeB - timeA;
  });

  return (
    <div className="space-y-6">
      
      {/* Header Selamat Datang */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-3xl p-6 text-white shadow-md">
        <div>
          <div className="flex items-center space-x-2 text-blue-200 text-xs font-semibold uppercase tracking-wider mb-1">
            <Calendar className="w-4 h-4" />
            <span>{formatDisplayDate(todayStr)}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            Selamat Datang, {profile?.displayName || 'Guru'}!
          </h2>
          <p className="text-xs text-blue-100 mt-1 max-w-xl">
            Sistem Kehadiran Murid Bersepadu Sekolah Rendah. Pantau status kehadiran harian sesi pagi dan kepulangan dengan tepat.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to="/scan"
            className="py-3 px-5 bg-white text-blue-900 hover:bg-blue-50 font-bold rounded-2xl shadow-sm transition-all flex items-center space-x-2 text-sm"
          >
            <QrCode className="w-4 h-4 text-blue-600" />
            <span>Buka Pengimbas QR</span>
          </Link>
        </div>
      </div>

      {/* Kad Statistik Utama */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Jumlah Murid Aktif */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Jumlah Murid Aktif</span>
            <h3 className="text-2xl font-black text-slate-900 leading-tight">{activeStudentCount}</h3>
            <span className="text-[11px] text-slate-400">{classes.length} buah kelas</span>
          </div>
        </div>

        {/* Hadir Pagi */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Hadir Tepat Masa</span>
            <h3 className="text-2xl font-black text-emerald-600 leading-tight">{morningHadir}</h3>
            <span className="text-[11px] text-emerald-700 font-semibold">{morningPercentage}% Peratus Pagi</span>
          </div>
        </div>

        {/* Lewat Pagi */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Hadir Lewat</span>
            <h3 className="text-2xl font-black text-amber-600 leading-tight">{morningLewat}</h3>
            <span className="text-[11px] text-slate-400">Ambang: {morningSession?.lateAfter || '07:30'}</span>
          </div>
        </div>

        {/* Belum Direkodkan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Belum Direkod</span>
            <h3 className="text-2xl font-black text-rose-600 leading-tight">{morningBelum}</h3>
            <span className="text-[11px] text-slate-400">Sesi Pagi Belum Selesai</span>
          </div>
        </div>

      </div>

      {/* Grid Bahagian: Statistik Mengikut Kelas & Imbasan Terkini */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Pecahan Kehadiran Mengikut Kelas (2 Kolum) */}
        <div className="lg:col-span-2">
          <Card 
            title="Prestasi Kehadiran Mengikut Kelas (Hari Ini)"
            subtitle="Ringkasan bilangan murid hadir dan peratusan bagi setiap kelas"
            action={
              <Link to="/attendance" className="text-xs text-blue-600 font-semibold hover:underline flex items-center space-x-1">
                <span>Semakan Lengkap</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            {classes.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Tiada kelas berdaftar. Sila daftarkan kelas terlebih dahulu.
              </div>
            ) : (
              <div className="space-y-3">
                {classes.filter(c => c.active).map(c => {
                  const classStudents = students.filter(s => s.classId === c.id);
                  const classMorningRecords = morningAttendance.filter(r => r.classIdSnapshot === c.id);
                  const hadirCount = classMorningRecords.filter(r => r.status === 'HADIR' || r.status === 'LEWAT').length;
                  const rate = classStudents.length > 0 ? Math.round((hadirCount / classStudents.length) * 100) : 0;

                  return (
                    <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                          {c.yearLevel}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">{c.name}</h4>
                          <span className="text-[11px] text-slate-500">
                            {hadirCount} / {classStudents.length} murid hadir
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden hidden sm:block">
                          <div 
                            className={`h-full ${rate >= 90 ? 'bg-emerald-500' : rate >= 75 ? 'bg-blue-500' : 'bg-amber-500'}`} 
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                          rate >= 90 ? 'bg-emerald-100 text-emerald-800' : rate >= 75 ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {rate}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Imbasan Terkini (1 Kolum) */}
        <div>
          <Card 
            title="Imbasan Terkini" 
            subtitle="Rekod transaksi QR yang baru disahkan"
          >
            {allScansToday.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Belum ada imbasan direkodkan untuk hari ini.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto">
                {allScansToday.slice(0, 8).map((record) => (
                  <div key={record.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900 text-xs uppercase line-clamp-1">
                        {record.studentNameSnapshot}
                      </p>
                      <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 mt-0.5">
                        <span className="font-semibold text-blue-700">{record.classNameSnapshot}</span>
                        <span>&bull;</span>
                        <span className="font-mono">{formatDisplayTime(record.scannedAt)}</span>
                      </div>
                    </div>
                    <Badge status={record.status} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

      </div>

    </div>
  );
};
