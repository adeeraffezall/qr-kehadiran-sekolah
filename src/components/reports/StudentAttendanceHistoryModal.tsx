import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { AttendanceRecord, Student } from '../../types';
import { formatDateShortBM, getDayNameBM, formatDisplayTime } from '../../utils/dateUtils';
import { Calendar, CheckCircle2, Clock, XCircle, User, ShieldCheck } from 'lucide-react';

interface StudentAttendanceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  periodLabel: string;
  eligibleDaysCount: number;
  records: AttendanceRecord[];
}

export const StudentAttendanceHistoryModal: React.FC<StudentAttendanceHistoryModalProps> = ({
  isOpen,
  onClose,
  student,
  periodLabel,
  eligibleDaysCount,
  records
}) => {
  if (!student) return null;

  // Tapis rekod murid berkenaan dan susun mengikut tarikh terkini
  const studentRecords = records
    .filter(r => r.studentId === student.id)
    .sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.session.localeCompare(a.session);
    });

  const hadirCount = studentRecords.filter(r => r.status === 'HADIR').length;
  const lewatCount = studentRecords.filter(r => r.status === 'LEWAT').length;
  const pulangCount = studentRecords.filter(r => r.status === 'PULANG').length;
  const attendedDays = hadirCount + lewatCount;
  const eligible = eligibleDaysCount > 0 ? eligibleDaysCount : 1;
  const rate = Math.min(100, Math.round((attendedDays / eligible) * 1000) / 10);
  const absentDays = Math.max(0, eligible - attendedDays);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sejarah Imbasan & Kehadiran Murid"
      maxWidth="lg"
    >
      <div className="space-y-4">
        
        {/* Profil Murid & Ringkasan */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center font-black text-sm">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">{student.fullName}</h3>
              <p className="text-xs text-slate-500 font-medium">
                No. Murid: <span className="font-mono text-slate-700">{student.studentNumber || '-'}</span> • Kelas: <span className="font-semibold text-blue-700">{student.className}</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Tempoh Laporan: <span className="font-semibold text-slate-600">{periodLabel}</span>
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Kadar Kehadiran</span>
            <span className={`inline-block text-lg font-black px-3 py-0.5 rounded-xl ${
              rate >= 95 ? 'bg-emerald-100 text-emerald-800' : rate >= 85 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {rate}%
            </span>
          </div>
        </div>

        {/* 4 Kad Metrik Pantas */}
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl">
            <span className="text-[11px] font-semibold text-emerald-700 block">Hadir Tepat</span>
            <span className="text-lg font-black text-emerald-800">{hadirCount}</span>
          </div>
          <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-xl">
            <span className="text-[11px] font-semibold text-amber-700 block">Lewat</span>
            <span className="text-lg font-black text-amber-800">{lewatCount}</span>
          </div>
          <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl">
            <span className="text-[11px] font-semibold text-indigo-700 block">Pulang</span>
            <span className="text-lg font-black text-indigo-800">{pulangCount}</span>
          </div>
          <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl">
            <span className="text-[11px] font-semibold text-rose-700 block">Tidak Hadir</span>
            <span className="text-lg font-black text-rose-800">{absentDays}</span>
          </div>
        </div>

        {/* Senarai Log Transaksi Imbasan */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              Log Transaksi Imbasan ({studentRecords.length} Rekod Ditemui)
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              Hari Layak: {eligibleDaysCount} Hari
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 text-xs">
            {studentRecords.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-500">Tiada transaksi imbasan direkodkan</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Murid ini belum pernah mengimbas kad QR dalam tempoh laporan yang dipilih.
                </p>
              </div>
            ) : (
              studentRecords.map(r => (
                <div key={r.id} className="p-3 hover:bg-slate-50 transition-colors flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-[11px]">
                      {r.session === 'PULANG' ? 'OUT' : 'IN'}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                        <span>{formatDateShortBM(r.date)}</span>
                        <span className="text-slate-400 font-normal">({getDayNameBM(r.date)})</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center space-x-2 mt-0.5">
                        <span>Sesi: <strong className="text-slate-700">{r.session}</strong></span>
                        <span>•</span>
                        <span>Masa: <strong className="font-mono text-slate-700">{formatDisplayTime(r.scannedAt)}</strong></span>
                        <span>•</span>
                        <span>Kaedah: <strong className="text-slate-600">{r.source}</strong></span>
                      </div>
                      {r.correctionReason && (
                        <p className="text-[10px] text-amber-700 italic mt-0.5">
                          ✏️ Catatan: {r.correctionReason}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Badge status={r.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Butang Batal / Tutup */}
        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </div>

      </div>
    </Modal>
  );
};
