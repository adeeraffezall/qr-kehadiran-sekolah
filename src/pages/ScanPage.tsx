import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { QRScanner } from '../components/qr/QRScanner';
import { 
  recordStudentAttendance, 
  subscribeSessionInfo,
  resolveActiveAttendanceSession,
  ActiveSessionResolution
} from '../services/attendanceService';
import { getTodayMalaysianDate, getMalaysianCurrentTime } from '../utils/dateUtils';
import { SessionInfo, SessionType, Student } from '../types';
import { getStudents } from '../services/studentService';
import { getLocalSessionConfig, getSessionConfig, SessionConfig } from '../services/settingsService';
import { Sun, Sunset, AlertCircle, Info, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react';

export const ScanPage: React.FC = () => {
  const { user } = useAuth();
  const todayStr = getTodayMalaysianDate();

  const [selectedSession, setSelectedSession] = useState<SessionType>('PAGI');
  const [pagiInfo, setPagiInfo] = useState<SessionInfo | null>(null);
  const [pulangInfo, setPulangInfo] = useState<SessionInfo | null>(null);
  const [sessionConfig, setSessionConfig] = useState<SessionConfig>(getLocalSessionConfig());
  const [resolution, setResolution] = useState<ActiveSessionResolution | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Muatkan tetapan waktu & senarai murid semasa mula
  useEffect(() => {
    getSessionConfig().then(setSessionConfig).catch(console.error);
    getStudents(undefined, true).then(setStudents).catch(console.error);
  }, []);

  // Langgan status kedua-dua Sesi PAGI dan PULANG serentak secara masa nyata
  useEffect(() => {
    const unsubPagi = subscribeSessionInfo(todayStr, 'PAGI', (info) => {
      setPagiInfo(info);
    });
    const unsubPulang = subscribeSessionInfo(todayStr, 'PULANG', (info) => {
      setPulangInfo(info);
    });

    return () => {
      unsubPagi();
      unsubPulang();
    };
  }, [todayStr]);

  // Fungsi pengiraan sesi aktif pusat (Single Source of Truth)
  const updateSessionResolution = useCallback(() => {
    const currentTime = getMalaysianCurrentTime();
    const res = resolveActiveAttendanceSession(
      currentTime,
      todayStr,
      sessionConfig,
      pagiInfo,
      pulangInfo
    );
    setResolution(res);

    // Pertukaran Sesi Automatik:
    // Sekiranya sesi aktif semasa berubah (contoh: melepasi jam 12:30 PM dan Sesi Pulang bermula)
    // dan sesi yang sedang dipilih telah ditutup, kemas kini sesi pilihan secara automatik
    // tanpa memerlukan guru menutup kamera atau memuat semula (reload) halaman!
    if (res.activeSession && res.activeSession !== selectedSession) {
      const currentSelectedDoc = selectedSession === 'PAGI' ? pagiInfo : pulangInfo;
      // Jika sesi yang dipilih sekarang telah CLOSED, alihkan ke sesi aktif baharu
      if (!currentSelectedDoc || currentSelectedDoc.status === 'CLOSED') {
        setSelectedSession(res.activeSession);
      }
    } else if (!res.activeSession && selectedSession === 'PAGI' && pagiInfo?.status === 'CLOSED') {
      // Jika PAGI baru ditutup dan PULANG belum tiba
      // Kekal di pilihan semasa dengan amaran penutupan
    }
  }, [sessionConfig, pagiInfo, pulangInfo, selectedSession, todayStr]);

  // Kemas kini resolusi setiap kali data Firestore berubah
  useEffect(() => {
    updateSessionResolution();
  }, [updateSessionResolution]);

  // Pemasa semakan waktu setiap 4 saat dan pendengar visibility pelayar
  useEffect(() => {
    const interval = setInterval(updateSessionResolution, 4000);

    const handleVisibilityOrFocus = () => {
      updateSessionResolution();
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [updateSessionResolution]);

  // Maklumat sesi yang sedang dipilih dalam UI
  const currentSessionDoc = selectedSession === 'PAGI' 
    ? (resolution?.pagiSession || pagiInfo) 
    : (resolution?.pulangSession || pulangInfo);
  const isCurrentSessionOpen = currentSessionDoc?.status === 'OPEN';

  const handleScan = async (token: string) => {
    const actorUid = user?.uid || 'USR_SCANNER';
    const currentTime = getMalaysianCurrentTime();
    
    // Nilai resolusi masa nyata tepat pada saat imbasan dijalankan
    const freshRes = resolveActiveAttendanceSession(
      currentTime,
      todayStr,
      sessionConfig,
      pagiInfo,
      pulangInfo
    );

    // Tentukan sesi imbasan yang sah
    let targetSession: SessionType = selectedSession;
    const selectedDoc = selectedSession === 'PAGI' ? freshRes.pagiSession : freshRes.pulangSession;

    if (selectedDoc.status === 'OPEN') {
      targetSession = selectedSession;
    } else if (freshRes.canScan && freshRes.activeSession) {
      // Keadaan di mana kamera masih memaparkan sesi lama tetapi waktu sesi baharu telah aktif
      targetSession = freshRes.activeSession;
      setSelectedSession(freshRes.activeSession);
    } else {
      // Semua sesi ditutup — sekat imbasan serta-merta
      return {
        success: false,
        code: 'SESSION_CLOSED',
        message: freshRes.reason
      };
    }

    const res = await recordStudentAttendance(token, actorUid, targetSession);
    return res;
  };

  const handleSimulateScan = async (token: string, name: string) => {
    setTestResult('Memproses imbasan simulasi untuk ' + name + '...');
    try {
      const res = await handleScan(token);
      setTestResult(res.message);
    } catch (e: any) {
      setTestResult('Ralat: ' + e.message);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      
      {/* Penunjuk Status Masa Nyata Sesi Sekolah */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className={`w-2.5 h-2.5 rounded-full ${
            resolution?.canScan ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
          }`}></span>
          <span className="text-xs font-bold text-slate-800">
            {resolution?.canScan 
              ? `SESI AKTIF: ${resolution.activeSession}` 
              : 'SEMUA SESI DITUTUP BUAT MASA INI'}
          </span>
        </div>
        <span className="text-[11px] font-medium text-slate-500">
          Waktu Malaysia: <strong className="text-slate-700">{resolution?.currentTime || getMalaysianCurrentTime()}</strong>
        </span>
      </div>

      {/* Tab Pemilihan Sesi: Pagi atau Pulang */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-2">
        <button
          type="button"
          onClick={() => setSelectedSession('PAGI')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all ${
            selectedSession === 'PAGI'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sun className="w-4 h-4" />
          <span>Sesi Pagi</span>
          {resolution?.pagiSession?.status === 'OPEN' ? (
            <span className="text-[10px] bg-emerald-400 text-emerald-950 px-1.5 py-0.5 rounded-md font-extrabold ml-1">
              BUKA
            </span>
          ) : (
            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-md font-semibold ml-1">
              TUTUP
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setSelectedSession('PULANG')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all ${
            selectedSession === 'PULANG'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sunset className="w-4 h-4" />
          <span>Sesi Pulang</span>
          {resolution?.pulangSession?.status === 'OPEN' ? (
            <span className="text-[10px] bg-emerald-400 text-emerald-950 px-1.5 py-0.5 rounded-md font-extrabold ml-1">
              BUKA
            </span>
          ) : (
            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-md font-semibold ml-1">
              TUTUP
            </span>
          )}
        </button>
      </div>

      {/* Banner Maklumat & Peringatan Pengesahan Visual */}
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-2.5 text-xs text-amber-900">
        <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p>
          <strong>Peringatan Keselamatan:</strong> Sesi imbasan diselaraskan secara automatik mengikut waktu rasmi sekolah. Pastikan guru membuat <strong>pengesahan visual wajah murid</strong> semasa imbasan dijalankan.
        </p>
      </div>

      {/* Status Sesi Jika Ditutup (Automatik atau Manual) */}
      {currentSessionDoc && currentSessionDoc.status === 'CLOSED' && (
        <div className={`p-4 rounded-2xl text-xs flex items-start space-x-3 font-medium ${
          currentSessionDoc.isAutoClosed 
            ? 'bg-amber-50 border border-amber-300 text-amber-950' 
            : 'bg-rose-50 border border-rose-300 text-rose-950'
        }`}>
          <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
            currentSessionDoc.isAutoClosed ? 'text-amber-600' : 'text-rose-600'
          }`} />
          <div className="space-y-0.5">
            <p className="font-bold">
              {currentSessionDoc.isAutoClosed 
                ? `Sesi ${selectedSession} Ditutup Secara Automatik` 
                : `Sesi ${selectedSession} Ditutup Secara Manual`}
            </p>
            <p className="text-[11px] leading-relaxed opacity-90">
              {currentSessionDoc.isAutoClosed 
                ? (currentSessionDoc.autoCloseReason === 'BEFORE_START_TIME'
                    ? `Waktu imbasan rasmi murid bermula pada jam ${currentSessionDoc.startTime || '06:30'} AM. Imbasan baharu ditolak sehingga sesi dibuka.`
                    : `Waktu imbasan rasmi murid (${currentSessionDoc.startTime || '06:30'} - ${currentSessionDoc.endTime || '08:00'}) telah tamat pada jam ${currentSessionDoc.endTime || '08:00'}. Imbasan ditolak secara automatik kecuali dibuka semula oleh pentadbir.`
                  )
                : (currentSessionDoc.manualReason 
                    ? `Sesi ditutup oleh pihak pentadbir (${currentSessionDoc.manualReason}). Imbasan baharu ditolak.`
                    : 'Sesi telah ditutup secara manual oleh pentadbir sekolah. Imbasan baharu ditolak.'
                  )
              }
            </p>
          </div>
        </div>
      )}

      {/* Maklumat Sesi Jika Dibuka Secara Manual Oleh Pentadbir */}
      {currentSessionDoc && currentSessionDoc.status === 'OPEN' && currentSessionDoc.manualOverride && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950 text-xs flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0"></span>
          <span>
            <strong>Sesi Dibuka Secara Manual oleh Pentadbir</strong>
            {currentSessionDoc.manualReason ? ` (${currentSessionDoc.manualReason})` : ''}. Imbasan kad QR dibenarkan.
          </span>
        </div>
      )}

      {/* Komponen Pengimbas Kamera */}
      <QRScanner
        onScan={handleScan}
        currentSession={selectedSession}
        isSessionOpen={isCurrentSessionOpen}
        sessionReason={resolution?.reason}
      />

      {/* Ujian Imbasan Simulasi Pantas */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2 mb-2 text-xs font-bold text-slate-800">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Ujian Simulasi Imbasan (Pilihan Pantas Tanpa Kamera)</span>
        </div>
        <p className="text-[11px] text-slate-500 mb-3">
          Tekan mana-mana murid di bawah untuk menguji reaksi pengimbas secara maya:
        </p>

        <div className="flex flex-wrap gap-2">
          {students.slice(0, 4).map(s => {
            const token = (s as any).plainToken || `SKB_TOKEN_${s.fullName.replace(/\s+/g, '_')}`;
            return (
              <button
                key={s.id}
                onClick={() => handleSimulateScan(token, s.fullName)}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs rounded-xl font-medium transition-colors border border-slate-200"
              >
                Imbas: {s.fullName.split(' ')[0]} ({s.className})
              </button>
            );
          })}
        </div>

        {testResult && (
          <div className="mt-3 p-2.5 bg-blue-50 text-blue-900 rounded-xl text-xs font-medium">
            {testResult}
          </div>
        )}
      </div>

    </div>
  );
};
