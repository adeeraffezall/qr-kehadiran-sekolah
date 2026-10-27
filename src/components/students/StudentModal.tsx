import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ClassItem, Student } from '../../types';

export const STANDARD_ROLES = [
  'Murid',
  'Ketua Kelas',
  'Penolong Kelas',
  'Pengawas Sekolah',
  'Pengawas Pusat Sumber',
  'Pengawas SPBT',
  'Pembimbing Rakan Sebaya (PRS)',
  'Ketua Kebersihan',
  'Lain-lain'
];

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { 
    fullName: string; 
    studentNumber: string; 
    classId: string;
    gender?: string;
    role?: string;
  }) => Promise<void>;
  initialData?: Student | null;
  classes: ClassItem[];
  isSubmitting: boolean;
}

export const StudentModal: React.FC<StudentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  classes,
  isSubmitting
}) => {
  const [fullName, setFullName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [classId, setClassId] = useState('');
  const [gender, setGender] = useState('Lelaki');
  const [role, setRole] = useState('Murid');
  const [customRole, setCustomRole] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFullName(initialData.fullName || '');
      setStudentNumber(initialData.studentNumber || '');
      setClassId(initialData.classId || (classes[0]?.id || ''));
      setGender(initialData.gender || 'Lelaki');
      
      const curRole = initialData.role || 'Murid';
      if (STANDARD_ROLES.includes(curRole)) {
        setRole(curRole);
        setCustomRole('');
      } else {
        setRole('Lain-lain');
        setCustomRole(curRole);
      }
    } else {
      setFullName('');
      setStudentNumber('');
      setClassId(classes[0]?.id || '');
      setGender('Lelaki');
      setRole('Murid');
      setCustomRole('');
    }
    setError(null);
  }, [initialData, isOpen, classes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || fullName.trim().length < 3) {
      setError('Nama murid wajib diisi sekurang-kurangnya 3 aksara.');
      return;
    }
    if (!classId) {
      setError('Sila pilih kelas untuk murid ini.');
      return;
    }

    const finalRole = role === 'Lain-lain' ? customRole.trim() : role;
    if (!finalRole) {
      setError('Sila nyatakan jawatan murid.');
      return;
    }

    try {
      await onSubmit({
        fullName: fullName.trim(),
        studentNumber: studentNumber.trim(),
        classId,
        gender,
        role: finalRole
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ralat menyimpan data murid.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Kemaskini Maklumat Profil Murid' : 'Daftar Murid Baharu'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nama Penuh Murid <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="CONTOH: MUHAMMAD HAZIQ BIN AZMAN"
            className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 uppercase"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              No. Murid / ID Murid (Pilihan)
            </label>
            <input
              type="text"
              value={studentNumber}
              onChange={(e) => setStudentNumber(e.target.value)}
              placeholder="CONTOH: S059"
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Jantina <span className="text-red-500">*</span>
            </label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="Lelaki">Lelaki</option>
              <option value="Perempuan">Perempuan</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kelas <span className="text-red-500">*</span>
            </label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            >
              {classes.filter(c => c.active).map(c => (
                <option key={c.id} value={c.id}>{c.name} (Tahun {c.yearLevel})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Jawatan Murid <span className="text-red-500">*</span>
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            >
              {STANDARD_ROLES.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        {role === 'Lain-lain' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nyatakan Nama Jawatan Kustom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={customRole}
              onChange={(e) => setCustomRole(e.target.value)}
              placeholder="Contoh: Pengawas ICT / Bendahari Kelas"
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {initialData ? 'Simpan Perubahan' : 'Daftar & Jana QR'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
