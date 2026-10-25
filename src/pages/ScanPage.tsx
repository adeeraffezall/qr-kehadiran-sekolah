import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { QRScanner } from '../components/qr/QRScanner';
import { recordStudentAttendance, getSessionInfo } from '../services/attendanceService';
import { getTodayMalaysianDate } from '../utils/dateUtils';
import { SessionInfo, SessionType } from '../types';
import { Sun, Sunset, AlertCircle, Info } from 'lucide-react';

export const ScanPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedSession, setSelectedSession] = useState<SessionType>('PAGI');
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  const todayStr = getTodayMalaysianDate();

  // Tentukan sesi lalai mengikut waktu semasa
  useEffect(() => {
    const hour = new Date().getHours();
    setSelectedSession(hour < 12 ? 'PAGI' : 'PULANG');
  }, []);

  useEffect(() => {
    async function loadSession() {
      setLoadingSession(true);
      try {
        const sInfo = await getSessionInfo(todayStr, selectedSession);
        setSessionInfo(sInfo);
      } catch (err) {
        console.error('Ralat memuatkan sesi:', err);
      } finally {
        setLoadingSession(false);
      }
    }
    loadSession();
  }, [selectedSession, todayStr]);

  const handleScan = async (token: string) => {
    if (!user) throw new Error('Pengguna tidak disahkan.');
    return await recordStudentAttendance(token, user.uid, selectedSession);
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

      {/* Status Sesi Jika Ditutup */}
      {sessionInfo && sessionInfo.status === 'CLOSED' && (
        <div className="p-4 bg-red-100 border border-red-300 rounded-2xl text-red-900 text-xs flex items-center space-x-2 font-semibold">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span>PERHATIAN: Sesi {selectedSession} hari ini telah DITUTUP oleh pentadbir sekolah. Imbasan baharu akan ditolak.</span>
        </div>
      )}

      {/* Komponen Pengimbas Kamera */}
      <QRScanner
        onScan={handleScan}
        currentSession={selectedSession}
      />

    </div>
  );
};
