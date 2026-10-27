import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { QRScanner } from '../components/qr/QRScanner';
import { 
  recordStudentAttendance, 
  getSessionInfo, 
  subscribeSessionInfo,
  evaluateSessionStatus 
} from '../services/attendanceService';
import { getTodayMalaysianDate } from '../utils/dateUtils';
import { SessionInfo, SessionType, Student } from '../types';
import { getStudents } from '../services/studentService';
import { Sun, Sunset, AlertCircle, Info, Sparkles, QrCode } from 'lucide-react';

export const ScanPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedSession, setSelectedSession] = useState<SessionType>('PAGI');
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [testResult, setTestResult] = useState<string | null>(null);

  const todayStr = getTodayMalaysianDate();

  useEffect(() => {
    const hour = new Date().getHours();
    setSelectedSession(hour < 12 ? 'PAGI' : 'PULANG');
    getStudents(undefined, true).then(setStudents).catch(console.error);
  }, []);

  useEffect(() => {
    const unsub = subscribeSessionInfo(todayStr, selectedSession, (sInfo) => {
      setSessionInfo(sInfo);
    });
    return () => unsub();
  }, [selectedSession, todayStr]);

  // Pemeriksaan masa berkala untuk menutup sesi secara automatik sebaik melepasi jam 8:00 pagi
  useEffect(() => {
    const timer = setInterval(() => {
      if (sessionInfo) {
        const reevaluated = evaluateSessionStatus(sessionInfo);
        if (reevaluated.status !== sessionInfo.status || reevaluated.isAutoClosed !== sessionInfo.isAutoClosed) {
          setSessionInfo(reevaluated);
        }
      }
    }, 10000);
    return () => clearInterval(timer);
  }, [sessionInfo]);

  const handleScan = async (token: string) => {
    const actorUid = user?.uid || 'USR_SCANNER';
    const res = await recordStudentAttendance(token, actorUid, selectedSession);
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
      
      {/* Tab Pemilihan Sesi: Pagi atau Pulang */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-2">
        <button
          type="button"
          onClick={() => setSelectedSession('PAGI')}
          className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all ${
            selectedSession === 'PAGI'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sun className="w-4 h-4" />
          <span>Sesi Pagi (Kehadiran Masuk)</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedSession('PULANG')}
          className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all ${
            selectedSession === 'PULANG'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sunset className="w-4 h-4" />
          <span>Sesi Pulang (Waktu Balik)</span>
        </button>
      </div>

      {/* Banner Maklumat & Peringatan Pengesahan Visual */}
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-2.5 text-xs text-amber-900">
        <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p>
          <strong>Peringatan Keselamatan:</strong> Imbasan kad QR adalah bukti fizikal kad telah diimbas. Guru dan staf bertugas dinasihatkan membuat <strong>pengesahan visual wajah murid</strong> semasa imbasan dijalankan.
        </p>
      </div>

      {/* Status Sesi Jika Ditutup (Automatik atau Manual) */}
      {sessionInfo && sessionInfo.status === 'CLOSED' && (
        <div className={`p-4 rounded-2xl text-xs flex items-start space-x-3 font-medium ${
          sessionInfo.isAutoClosed 
            ? 'bg-amber-50 border border-amber-300 text-amber-950' 
            : 'bg-rose-50 border border-rose-300 text-rose-950'
        }`}>
          <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
            sessionInfo.isAutoClosed ? 'text-amber-600' : 'text-rose-600'
          }`} />
          <div className="space-y-0.5">
            <p className="font-bold">
              {sessionInfo.isAutoClosed 
                ? `Sesi ${selectedSession} Ditutup Secara Automatik` 
                : `Sesi ${selectedSession} Ditutup Secara Manual`}
            </p>
            <p className="text-[11px] leading-relaxed opacity-90">
              {sessionInfo.isAutoClosed 
                ? (sessionInfo.autoCloseReason === 'BEFORE_START_TIME'
                    ? `Waktu imbasan rasmi murid bermula pada jam ${sessionInfo.startTime || '06:30'} AM. Imbasan baharu ditolak sehingga sesi dibuka.`
                    : `Waktu imbasan rasmi murid (${sessionInfo.startTime || '06:30'} - ${sessionInfo.endTime || '08:00'}) telah tamat pada jam ${sessionInfo.endTime || '08:00'} AM. Imbasan baharu ditolak secara automatik kecuali dibuka semula oleh pentadbir.`
                  )
                : (sessionInfo.manualReason 
                    ? `Sesi ditutup oleh pihak pentadbir (${sessionInfo.manualReason}). Imbasan baharu ditolak.`
                    : 'Sesi telah ditutup secara manual oleh pentadbir sekolah. Imbasan baharu ditolak.'
                  )
              }
            </p>
          </div>
        </div>
      )}

      {/* Maklumat Sesi Jika Dibuka Secara Manual Oleh Pentadbir */}
      {sessionInfo && sessionInfo.status === 'OPEN' && sessionInfo.manualOverride && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950 text-xs flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0"></span>
          <span>
            <strong>Sesi Dibuka Secara Manual oleh Pentadbir</strong>
            {sessionInfo.manualReason ? ` (${sessionInfo.manualReason})` : ''}. Imbasan kad QR dibenarkan.
          </span>
        </div>
      )}

      {/* Komponen Pengimbas Kamera */}
      <QRScanner
        onScan={handleScan}
        currentSession={selectedSession}
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
