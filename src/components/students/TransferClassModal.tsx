import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ClassItem, Student } from '../../types';

interface TransferClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  classes: ClassItem[];
  onTransfer: (studentId: string, newClassId: string, newClassName: string, reason: string) => Promise<void>;
  isSubmitting: boolean;
}

export const TransferClassModal: React.FC<TransferClassModalProps> = ({
  isOpen,
  onClose,
  student,
  classes,
  onTransfer,
  isSubmitting
}) => {
  const [targetClassId, setTargetClassId] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const availableClasses = classes.filter(c => c.active && c.id !== student?.classId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;
    if (!targetClassId) {
      setError('Sila pilih kelas baharu.');
      return;
    }
    if (!reason.trim() || reason.trim().length < 3) {
      setError('Sila nyatakan sebab pertukaran kelas (minimum 3 aksara).');
      return;
    }

    const selectedClass = classes.find(c => c.id === targetClassId);
    try {
      await onTransfer(student.id, targetClassId, selectedClass?.name || 'Kelas', reason.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ralat semasa memindahkan murid.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pertukaran Kelas Murid"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
          <p><span className="text-slate-500">Nama Murid:</span> <strong className="text-slate-800">{student?.fullName}</strong></p>
          <p><span className="text-slate-500">Kelas Semasa:</span> <strong className="text-blue-700">{student?.className || 'Kelas'}</strong></p>
          <p className="text-[11px] text-slate-500 mt-1 italic">
            Nota: Rekod kehadiran lampau murid akan dikekalkan dengan nama kelas asal (snapshot).
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Pilih Kelas Baharu <span className="text-red-500">*</span>
          </label>
          <select
            value={targetClassId}
            onChange={(e) => setTargetClassId(e.target.value)}
            required
            className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">-- Sila Pilih Kelas --</option>
            {availableClasses.map(c => (
              <option key={c.id} value={c.id}>{c.name} (Tahun {c.yearLevel})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Sebab Pertukaran <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            required
            placeholder="Contoh: Penyelarasan aliran kelas tahun semasa mengikut keputusan pentaksiran."
            className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Sahkan Pertukaran
          </Button>
        </div>
      </form>
    </Modal>
  );
};
