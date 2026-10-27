import React, { useState, useEffect } from 'react';
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
import { Button } from '../components/ui/Button';
import { 
  ClipboardCheck, 
  Search, 
  Filter, 
  Edit3, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Loader2 
} from 'lucide-react';

export const AttendancePage: React.FC = () => {
  const { user, profile, isAdmin } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(getTodayMalaysianDate());
  const [selectedSession, setSelectedSession] = useState<SessionType>('PAGI');
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
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

        // Langgan murid secara langsung
        unsubStudents = subscribeStudents(
          selectedClassId === 'ALL' ? undefined : selectedClassId,
          true,
          (sList) => {
            setStudents(sList);
          }
        );

        // Langgan kemas kini status sesi secara langsung (Real-Time Cloud)
        unsubSession = subscribeSessionInfo(selectedDate, selectedSession, (sInfo) => {
          setSessionInfo(sInfo);
        });

        // Langgan rekod kehadiran secara langsung (Real-Time Cloud)
        unsubAttendance = subscribeAttendance(selectedDate, selectedSession, (aRecords) => {
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
      const refreshedRecords = await getAttendanceByDateAndSession(selectedDate, selectedSession);
      setRecords(refreshedRecords);
    } finally {
      setIsCorrecting(false);
    }
  };

  // Peta rekod kehadiran mengikut studentId
  const attendanceMap = new Map<string, AttendanceRecord>();
  records.forEach(r => attendanceMap.set(r.studentId, r));

  // Tapis murid mengikut carian
  const filteredStudents = students.filter(s => {
    const matchName = s.fullName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchNo = s.studentNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    return matchName || matchNo;
  });

  return (
    <div className="space-y-6">
      
      {/* Tajuk & Kawalan Penapis */}
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
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 shadow-xs"
          />

          {/* Pemilihan Sesi */}
          <div className="bg-slate-200 p-1 rounded-xl flex items-center space-x-1">
            <button
              onClick={() => setSelectedSession('PAGI')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedSession === 'PAGI' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Pagi
            </button>
            <button
              onClick={() => setSelectedSession('PULANG')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedSession === 'PULANG' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Pulang
            </button>
          </div>

          {/* Penapis Kelas */}
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

      {/* Bar Carian & Statistik Pantas */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
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

        <div className="flex items-center space-x-3 text-xs">
          <span className="text-slate-500">
            Jumlah Murid: <strong className="text-slate-800">{filteredStudents.length}</strong>
          </span>
          {selectedSession === 'PULANG' ? (
            <>
              <span className="text-indigo-700">
                Telah Pulang: <strong className="font-bold">{records.length}</strong>
              </span>
              <span className="text-slate-500">
                Belum Pulang: <strong className="font-bold">{Math.max(0, filteredStudents.length - records.length)}</strong>
              </span>
            </>
          ) : (
            <>
              <span className="text-emerald-600">
                Hadir/Lewat: <strong className="font-bold">{records.length}</strong>
              </span>
              <span className="text-rose-600">
                Belum Rekod: <strong className="font-bold">{Math.max(0, filteredStudents.length - records.length)}</strong>
              </span>
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
                  <th className="py-3 px-4">Catatan / Pembetulan</th>
                  {isAdmin && <th className="py-3 px-4 text-right">Tindakan</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} className="py-8 text-center text-slate-400">
                      Tiada rekod murid ditemui bagi kriteria ini.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s, idx) => {
                    const record = attendanceMap.get(s.id);
                    const isRecorded = !!record;
                    const isPulangSession = selectedSession === 'PULANG' || record?.session === 'PULANG';

                    let badgeStatus: string;
                    if (isRecorded) {
                      badgeStatus = isPulangSession ? 'PULANG' : record.status;
                    } else {
                      badgeStatus = isPulangSession ? 'BELUM_PULANG' : 'BELUM_REKOD';
                    }

                    return (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{s.fullName}</td>
                        <td className="py-3 px-4 font-mono text-slate-500">{s.studentNumber || '-'}</td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-blue-700">
                            {record?.classNameSnapshot || s.className || '-'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge status={badgeStatus} />
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {isRecorded ? formatDisplayTime(record.scannedAt) : '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                          {record?.correctionReason ? (
                            <span className="italic text-amber-700 font-medium" title={record.correctionReason}>
                              ✏️ {record.correctionReason}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4 text-right">
                            {isRecorded ? (
                              <button
                                onClick={() => setSelectedRecordForCorrection(record)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Betulkan Rekod"
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
