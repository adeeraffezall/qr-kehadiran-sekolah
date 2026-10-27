import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getClasses } from '../services/classService';
import { getStudents, subscribeStudents } from '../services/studentService';
import { 
  getAttendanceByDateAndSession, 
  getSessionInfo, 
  manageSession, 
  correctAttendanceRecord,
  subscribeSessionInfo,
  subscribeAttendance
} from '../services/attendanceService';
import { getTodayMalaysianDate, formatDisplayDate, formatDisplayTime } from '../utils/dateUtils';
import { AttendanceRecord, AttendanceStatus, ClassItem, SessionInfo, SessionType, Student } from '../types';
import { SessionControl } from '../components/attendance/SessionControl';
import { AttendanceCorrectionModal } from '../components/attendance/AttendanceCorrectionModal';
import { Badge } from '../components/ui/Badge';
import { 
  Search, 
  Edit3, 
  Loader2,
  AlertTriangle,
  UserCheck,
  UserX,
  LogOut,
  Clock
} from 'lucide-react';

export const AttendancePage: React.FC = () => {
  const { user, profile, isAdmin } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(getTodayMalaysianDate());
  const [selectedSession, setSelectedSession] = useState<SessionType>('PAGI');
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('SEMUA');
  
  const [loading, setLoading] = useState<boolean>(true);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  
  // Correction Modal State
  const [selectedRecordForCorrection, setSelectedRecordForCorrection] = useState<AttendanceRecord | null>(null);
  const [isCorrecting, setIsCorrecting] = useState<boolean>(false);
  const [sessionManaging, setSessionManaging] = useState<boolean>(false);

  useEffect(() => {
    let unsubSession: () => void = () => {};
    let unsubAttendance: () => void = () => {};
    let unsubStudents: () => void = () => {};

    async function loadData() {
      setLoading(true);
      try {
        const cList = await getClasses();
        setClasses(cList);

        // Langgan murid mengikut kelas yang dipilih
        unsubStudents = subscribeStudents(
          selectedClassId === 'ALL' ? undefined : selectedClassId,
          true,
          (sList) => {
            setStudents(sList);
          }
        );

        // Langgan status sesi secara langsung (Pagi atau Pulang)
        unsubSession = subscribeSessionInfo(selectedDate, selectedSession, (sInfo) => {
          setSessionInfo(sInfo);
        });

        // Langgan KESELURUHAN rekod kehadiran bagi tarikh ini (PAGI & PULANG)
        // Ini memastikan status sesi pulang dapat disahkan berdasarkan rekod sebenar sesi pagi
        unsubAttendance = subscribeAttendance(selectedDate, undefined, (aRecords) => {
          setRecords(aRecords);
        });
      } catch (err) {
        console.error('Ralat data kehadiran:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();

    return () => {
      unsubSession();
      unsubAttendance();
      unsubStudents();
    };
  }, [selectedDate, selectedSession, selectedClassId]);

  // Reset penapis status apabila sesi bertukar
  useEffect(() => {
    setStatusFilter('SEMUA');
  }, [selectedSession]);

  const handleManageSession = async (action: 'OPEN' | 'CLOSE' | 'REOPEN' | 'AUTO', lateAfter: string, reason?: string) => {
    if (!user) return;
    setSessionManaging(true);
    try {
      await manageSession(
        user.uid,
        user.email || '',
        selectedDate,
        selectedSession,
        action,
        lateAfter,
        reason
      );
      const updated = await getSessionInfo(selectedDate, selectedSession);
      setSessionInfo(updated);
    } catch (err: any) {
      alert('Ralat menukar status sesi: ' + err.message);
    } finally {
      setSessionManaging(false);
    }
  };

  const handleCorrectRecord = async (recordId: string, newStatus: AttendanceStatus, reason: string) => {
    if (!user) return;
    setIsCorrecting(true);
    try {
      await correctAttendanceRecord(user.uid, user.email || '', recordId, newStatus, reason);
      const refreshedRecords = await getAttendanceByDateAndSession(selectedDate);
      setRecords(refreshedRecords);
    } finally {
      setIsCorrecting(false);
    }
  };

  // Peta Rekod Kehadiran Pagi & Pulang Unik mengikut studentId
  const { pagiMap, pulangMap } = useMemo(() => {
    const pMap = new Map<string, AttendanceRecord>();
    const puMap = new Map<string, AttendanceRecord>();

    records.forEach(r => {
      if (r.session === 'PAGI') {
        if (!pMap.has(r.studentId)) pMap.set(r.studentId, r);
      } else if (r.session === 'PULANG') {
        if (!puMap.has(r.studentId)) puMap.set(r.studentId, r);
      }
    });

    return { pagiMap: pMap, pulangMap: puMap };
  }, [records]);

  // Himpunkan status logik kehadiran bagi setiap murid
  const studentRows = useMemo(() => {
    return students.map(s => {
      const pagi = pagiMap.get(s.id);
      const pulang = pulangMap.get(s.id);

      const isMorningPresent = !!pagi && (pagi.status === 'HADIR' || pagi.status === 'LEWAT');
      const isMorningTidakHadir = pagi?.status === 'TIDAK_HADIR';
      const hasPulang = !!pulang && (pulang.status === 'PULANG' || pulang.session === 'PULANG');

      let computedStatus: string;
      let displayTime: string = '-';
      let relevantRecord: AttendanceRecord | null = null;
      let note: string = '-';
      let isMismatch: boolean = false;

      if (selectedSession === 'PULANG') {
        // Logik Sesi Pulang:
        if (hasPulang && isMorningPresent) {
          // A. TELAH PULANG: Hadir pagi yang sah & imbas pulang sah
          computedStatus = 'TELAH_PULANG';
          displayTime = formatDisplayTime(pulang.scannedAt);
          relevantRecord = pulang;
          note = pulang.correctionReason || '-';
        } else if (hasPulang && !isMorningPresent) {
          // KES KHAS: Rekod pulang tanpa rekod masuk pagi
          computedStatus = 'PULANG_TIADA_MASUK';
          displayTime = formatDisplayTime(pulang.scannedAt);
          relevantRecord = pulang;
          note = pulang.correctionReason ? `✏️ ${pulang.correctionReason}` : '⚠️ Rekod pulang tanpa imbasan masuk sesi pagi';
          isMismatch = true;
        } else if (!hasPulang && isMorningPresent) {
          // B. BELUM PULANG: Hadir pagi yang sah tetapi belum pulang
          computedStatus = 'BELUM_PULANG';
          displayTime = pagi ? `Masuk: ${formatDisplayTime(pagi.scannedAt)}` : '-';
          relevantRecord = pagi;
          note = pagi?.correctionReason ? `Masuk: ${pagi.correctionReason}` : 'Menunggu imbasan kepulangan';
        } else if (!hasPulang && isMorningTidakHadir) {
          // D. TIDAK HADIR DISAHKAN: Murid telah disahkan tidak hadir pagi
          computedStatus = 'TIDAK_HADIR_DISAHKAN';
          displayTime = '-';
          relevantRecord = pagi;
          note = pagi?.correctionReason ? `Tidak Hadir: ${pagi.correctionReason}` : '-';
        } else {
          // C. TIADA REKOD MASUK: Murid tiada rekod masuk sesi pagi (jangan anggap Belum Pulang)
          computedStatus = 'TIADA_REKOD_MASUK';
          displayTime = '-';
          relevantRecord = null;
          note = 'Tiada imbasan masuk sesi pagi';
        }
      } else {
        // Logik Sesi Pagi:
        if (pagi?.status === 'HADIR') {
          computedStatus = 'HADIR';
          displayTime = formatDisplayTime(pagi.scannedAt);
          relevantRecord = pagi;
          note = pagi.correctionReason || '-';
        } else if (pagi?.status === 'LEWAT') {
          computedStatus = 'LEWAT';
          displayTime = formatDisplayTime(pagi.scannedAt);
          relevantRecord = pagi;
          note = pagi.correctionReason ? `✏️ ${pagi.correctionReason}` : 'Hadir melepasi ambang masa';
        } else if (pagi?.status === 'TIDAK_HADIR') {
          computedStatus = 'TIDAK_HADIR_DISAHKAN';
          displayTime = '-';
          relevantRecord = pagi;
          note = pagi.correctionReason || 'Ketidakhadiran disahkan';
        } else {
          computedStatus = 'BELUM_HADIR';
          displayTime = '-';
          relevantRecord = null;
          note = 'Belum merekodkan kehadiran pagi';
        }
      }

      return {
        student: s,
        pagiRecord: pagi,
        pulangRecord: pulang,
        status: computedStatus,
        displayTime,
        relevantRecord,
        note,
        isMismatch
      };
    });
  }, [students, pagiMap, pulangMap, selectedSession]);

  // Statistik Keseluruhan bagi Sesi Terpilih
  const stats = useMemo(() => {
    const totalEnrolment = studentRows.length;
    
    // Pagi counts
    const morningEntered = studentRows.filter(r => r.pagiRecord && (r.pagiRecord.status === 'HADIR' || r.pagiRecord.status === 'LEWAT')).length;
    const morningHadir = studentRows.filter(r => r.pagiRecord?.status === 'HADIR').length;
    const morningLewat = studentRows.filter(r => r.pagiRecord?.status === 'LEWAT').length;
    const morningTidakHadir = studentRows.filter(r => r.pagiRecord?.status === 'TIDAK_HADIR').length;
    const morningBelumHadir = studentRows.filter(r => !r.pagiRecord).length;

    // Pulang counts
    const telahPulang = studentRows.filter(r => r.status === 'TELAH_PULANG').length;
    const belumPulang = studentRows.filter(r => r.status === 'BELUM_PULANG').length;
    const tiadaRekodMasuk = studentRows.filter(r => r.status === 'TIADA_REKOD_MASUK').length;
    const pulangTanpaMasuk = studentRows.filter(r => r.status === 'PULANG_TIADA_MASUK').length;
    const tidakHadirPulang = studentRows.filter(r => r.status === 'TIDAK_HADIR_DISAHKAN').length;
    const totalPulangRecorded = telahPulang + pulangTanpaMasuk;

    return {
      totalEnrolment,
      morningEntered,
      morningHadir,
      morningLewat,
      morningTidakHadir,
      morningBelumHadir,
      telahPulang,
      belumPulang,
      tiadaRekodMasuk,
      pulangTanpaMasuk,
      tidakHadirPulang,
      totalPulangRecorded
    };
  }, [studentRows]);

  // Tapis murid mengikut carian teks dan penapis status
  const filteredRows = useMemo(() => {
    return studentRows.filter(item => {
      // 1. Carian teks (Nama atau No. Murid)
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchName = item.student.fullName.toLowerCase().includes(q);
        const matchNo = item.student.studentNumber?.toLowerCase().includes(q) || false;
        if (!matchName && !matchNo) return false;
      }

      // 2. Penapis Status Pantas
      if (statusFilter !== 'SEMUA') {
        if (item.status !== statusFilter) return false;
      }

      return true;
    });
  }, [studentRows, searchTerm, statusFilter]);

  return (
    <div className="space-y-6">
      
      {/* Tajuk & Kawalan Penapis Utama */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Semakan Rekod Kehadiran</h2>
          <p className="text-xs text-slate-500">
            Paparan rekod rasmi bagi tarikh: <span className="font-semibold text-slate-700">{formatDisplayDate(selectedDate)}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Pemilihan Tarikh */}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 shadow-xs focus:ring-2 focus:ring-blue-500/20"
          />

          {/* Pemilihan Sesi */}
          <div className="bg-slate-200 p-1 rounded-xl flex items-center space-x-1">
            <button
              onClick={() => setSelectedSession('PAGI')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedSession === 'PAGI' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sesi Pagi
            </button>
            <button
              onClick={() => setSelectedSession('PULANG')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedSession === 'PULANG' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sesi Pulang
            </button>
          </div>

          {/* Penapis Kelas */}
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 shadow-xs focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">Semua Kelas</option>
            {classes.filter(c => c.active).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Kawalan Sesi (Buka / Tutup / Ambang Lewat) */}
      {sessionInfo && (
        <SessionControl
          sessionInfo={sessionInfo}
          onManageSession={handleManageSession}
          isAdmin={isAdmin}
          isLoading={sessionManaging}
        />
      )}

      {/* Bar Statistik Ketepatan Kehadiran Mengikut Sesi */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            {selectedSession === 'PULANG' ? (
              <>
                <LogOut className="w-4 h-4 text-indigo-600" />
                <span>Statistik Sesi Pulang (Berdasarkan Rekod Masuk Pagi Sah)</span>
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Statistik Sesi Pagi (Kedatangan Rasmi)</span>
              </>
            )}
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Enrolmen Layak: <strong className="text-slate-900">{stats.totalEnrolment} Murid</strong>
          </span>
        </div>

        {/* Kotak Metrik Angka Sebenar */}
        {selectedSession === 'PULANG' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
              <span className="text-[11px] font-semibold text-blue-700 block">Direkod Masuk Pagi</span>
              <strong className="text-xl font-black text-blue-900">{stats.morningEntered}</strong>
              <span className="text-[10px] text-blue-600 block mt-0.5">Asas Kelayakan Pulang</span>
            </div>
            
            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl">
              <span className="text-[11px] font-semibold text-indigo-700 block">Telah Pulang (Sah)</span>
              <strong className="text-xl font-black text-indigo-900">{stats.telahPulang}</strong>
              <span className="text-[10px] text-indigo-600 block mt-0.5">Hadir Pagi & Rekod Pulang</span>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
              <span className="text-[11px] font-semibold text-amber-800 block">Belum Pulang</span>
              <strong className="text-xl font-black text-amber-900">{stats.belumPulang}</strong>
              <span className="text-[10px] text-amber-700 block mt-0.5">Hadir Pagi, Belum Imbas</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-600 block">Tiada Rekod Masuk</span>
              <strong className="text-xl font-black text-slate-800">{stats.tiadaRekodMasuk}</strong>
              <span className="text-[10px] text-slate-500 block mt-0.5">Tiada Imbasan Pagi</span>
            </div>

            {stats.pulangTanpaMasuk > 0 ? (
              <div className="p-3 bg-purple-50 border border-purple-300 rounded-xl">
                <span className="text-[11px] font-semibold text-purple-800 block">⚠️ Pulang Tanpa Pagi</span>
                <strong className="text-xl font-black text-purple-950">{stats.pulangTanpaMasuk}</strong>
                <span className="text-[10px] text-purple-700 block mt-0.5">Perlu Semakan Guru</span>
              </div>
            ) : (
              <div className="p-3 bg-slate-50/50 border border-slate-200 rounded-xl">
                <span className="text-[11px] font-semibold text-slate-500 block">Tidak Hadir Disahkan</span>
                <strong className="text-xl font-black text-slate-700">{stats.tidakHadirPulang}</strong>
                <span className="text-[10px] text-slate-400 block mt-0.5">Pengesahan Rasmi</span>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
              <span className="text-[11px] font-semibold text-emerald-700 block">Hadir Tepat</span>
              <strong className="text-xl font-black text-emerald-900">{stats.morningHadir}</strong>
              <span className="text-[10px] text-emerald-600 block mt-0.5">Sebelum Ambang Masa</span>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
              <span className="text-[11px] font-semibold text-amber-800 block">Hadir Lewat</span>
              <strong className="text-xl font-black text-amber-900">{stats.morningLewat}</strong>
              <span className="text-[10px] text-amber-700 block mt-0.5">Selepas Ambang Masa</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-600 block">Belum Hadir</span>
              <strong className="text-xl font-black text-slate-800">{stats.morningBelumHadir}</strong>
              <span className="text-[10px] text-slate-500 block mt-0.5">Belum Ada Rekod Pagi</span>
            </div>

            <div className="p-3 bg-red-50/60 border border-red-200 rounded-xl">
              <span className="text-[11px] font-semibold text-red-700 block">Tidak Hadir Disahkan</span>
              <strong className="text-xl font-black text-red-900">{stats.morningTidakHadir}</strong>
              <span className="text-[10px] text-red-600 block mt-0.5">Pengesahan Rasmi</span>
            </div>
          </div>
        )}

        {/* Amaran Ketidakpadanan Rekod Jika Wujud Imbasan Pulang Tanpa Masuk Pagi */}
        {selectedSession === 'PULANG' && stats.pulangTanpaMasuk > 0 && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-start space-x-2 text-xs text-purple-900">
            <AlertTriangle className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Perhatian Pentadbir / Guru Bertugas:</strong> Terdapat {stats.pulangTanpaMasuk} rekod imbasan kepulangan bagi murid yang tiada rekod masuk sesi pagi. Rekod ini kekal disimpan sebagai bukti fizikal dan ditandakan sebagai ketidakpadanan untuk semakan lanjut.
            </div>
          </div>
        )}
      </div>

      {/* Bar Carian & Penapis Butang Pantas */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama murid atau no. murid..."
              className="w-full text-xs pl-9 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Memaparkan <strong className="text-slate-800">{filteredRows.length}</strong> daripada {stats.totalEnrolment} murid
          </div>
        </div>

        {/* Butang Penapis Pantas Mengikut Status */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Tapis Status:</span>
          
          <button
            type="button"
            onClick={() => setStatusFilter('SEMUA')}
            className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors ${
              statusFilter === 'SEMUA' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({stats.totalEnrolment})
          </button>

          {selectedSession === 'PULANG' ? (
            <>
              <button
                type="button"
                onClick={() => setStatusFilter('TELAH_PULANG')}
                className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  statusFilter === 'TELAH_PULANG' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                }`}
              >
                Telah Pulang ({stats.telahPulang})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('BELUM_PULANG')}
                className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  statusFilter === 'BELUM_PULANG' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                Belum Pulang ({stats.belumPulang})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('TIADA_REKOD_MASUK')}
                className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  statusFilter === 'TIADA_REKOD_MASUK' ? 'bg-slate-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tiada Rekod Masuk ({stats.tiadaRekodMasuk})
              </button>

              {stats.pulangTanpaMasuk > 0 && (
                <button
                  type="button"
                  onClick={() => setStatusFilter('PULANG_TIADA_MASUK')}
                  className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors ${
                    statusFilter === 'PULANG_TIADA_MASUK' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                  }`}
                >
                  Pulang Tanpa Masuk ({stats.pulangTanpaMasuk})
                </button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStatusFilter('HADIR')}
                className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  statusFilter === 'HADIR' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                Hadir Tepat ({stats.morningHadir})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('LEWAT')}
                className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  statusFilter === 'LEWAT' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                Lewat ({stats.morningLewat})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('BELUM_HADIR')}
                className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  statusFilter === 'BELUM_HADIR' ? 'bg-slate-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Belum Hadir ({stats.morningBelumHadir})
              </button>

              {stats.morningTidakHadir > 0 && (
                <button
                  type="button"
                  onClick={() => setStatusFilter('TIDAK_HADIR_DISAHKAN')}
                  className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors ${
                    statusFilter === 'TIDAK_HADIR_DISAHKAN' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'
                  }`}
                >
                  Tidak Hadir ({stats.morningTidakHadir})
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Jadual Senarai Kehadiran Murid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Bil</th>
                  <th className="py-3 px-4">Nama Penuh Murid</th>
                  <th className="py-3 px-4">No. Murid</th>
                  <th className="py-3 px-4">Kelas</th>
                  <th className="py-3 px-4">
                    {selectedSession === 'PULANG' ? 'Status Kepulangan' : 'Status Kehadiran'}
                  </th>
                  <th className="py-3 px-4">Waktu Imbasan</th>
                  <th className="py-3 px-4">Catatan / Keterangan</th>
                  {isAdmin && <th className="py-3 px-4 text-right">Tindakan</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} className="py-8 text-center text-slate-400">
                      Tiada rekod murid ditemui bagi kriteria carian atau penapis ini.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((item, idx) => {
                    const { student, relevantRecord, status, displayTime, note, isMismatch } = item;

                    return (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{student.fullName}</td>
                        <td className="py-3 px-4 font-mono text-slate-500">{student.studentNumber || '-'}</td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-blue-700">
                            {relevantRecord?.classNameSnapshot || student.className || '-'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge status={status} />
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {displayTime}
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                          {isMismatch ? (
                            <span className="text-purple-700 font-semibold text-[11px]" title={note}>
                              {note}
                            </span>
                          ) : relevantRecord?.correctionReason ? (
                            <span className="italic text-amber-700 font-medium" title={relevantRecord.correctionReason}>
                              ✏️ {relevantRecord.correctionReason}
                            </span>
                          ) : (
                            <span className="text-slate-400">{note}</span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4 text-right">
                            {relevantRecord ? (
                              <button
                                onClick={() => setSelectedRecordForCorrection(relevantRecord)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Betulkan Rekod Kehadiran"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Pembetulan Rekod */}
      {selectedRecordForCorrection && (
        <AttendanceCorrectionModal
          isOpen={!!selectedRecordForCorrection}
          onClose={() => setSelectedRecordForCorrection(null)}
          record={selectedRecordForCorrection}
          onCorrect={handleCorrectRecord}
          isSubmitting={isCorrecting}
        />
      )}

    </div>
  );
};
