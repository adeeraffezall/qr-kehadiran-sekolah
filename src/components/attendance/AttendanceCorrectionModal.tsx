import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AttendanceRecord, AttendanceStatus } from '../../types';

interface AttendanceCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AttendanceRecord | null;
  onCorrect: (recordId: string, newStatus: AttendanceStatus, reason: string) => Promise<void>;
  isSubmitting: boolean;
}

export const AttendanceCorrectionModal: React.FC<AttendanceCorrectionModalProps> = ({
  isOpen,
  onClose,
  record,
  onCorrect,
  isSubmitting
}) => {
  const [newStatus, setNewStatus] = useState<AttendanceStatus>('HADIR');
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (record) {
      setNewStatus(record.status);
      setReason('');
      setError(null);
    }
  }, [record, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;
    if (!reason.trim() || reason.trim().length < 5) {
      setError('Sebab pembetulan wajib diisi sekurang-kurangnya 5 aksara.');
      return;
    }

    try {
      await onCorrect(record.id, newStatus, reason.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ralat semasa membuat pembetulan.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pembetulan Rekod Kehadiran"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
          <p><span className="text-slate-500">Nama Murid:</span> <strong className="text-slate-900">{record?.studentNameSnapshot}</strong></p>
          <p><span className="text-slate-500">Kelas:</span> <strong className="text-blue-700">{record?.classNameSnapshot}</strong></p>
          <p><span className="text-slate-500">Tarikh / Sesi:</span> {record?.date} (Sesi {record?.session})</p>
          <p><span className="text-slate-500">Status Semasa:</span> <strong className="font-semibold text-slate-800">{record?.status}</strong></p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Status {record?.session === 'PULANG' ? 'Kepulangan' : 'Kehadiran'} Baharu <span className="text-red-500">*</span>
          </label>
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as AttendanceStatus)}
            className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          >
            {record?.session === 'PULANG' ? (
              <>
                <option value="PULANG">PULANG</option>
                <option value="TIDAK_HADIR">TIDAK HADIR / BATAL REKOD</option>
              </>
            ) : (
              <>
                <option value="HADIR">HADIR</option>
                <option value="LEWAT">LEWAT</option>
                <option value="TIDAK_HADIR">TIDAK HADIR</option>
              </>
            )}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Sebab Pembetulan (Mandatori) <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            required
            placeholder="Contoh: Murid hadir mewakili sekolah dalam aktiviti ko-kurikulum / kad tertinggal di rumah."
            className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Setiap pembetulan akan direkodkan dalam Log Audit dengan nama penyemak dan sebab lengkap.
          </p>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Simpan Pembetulan
          </Button>
        </div>
      </form>
    </Modal>
  );
};
