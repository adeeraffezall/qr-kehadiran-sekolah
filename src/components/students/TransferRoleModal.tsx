import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Student } from '../../types';
import { Award, ArrowRightLeft, Shield, CheckCircle2, User, Search } from 'lucide-react';

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

interface TransferRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  allStudents: Student[];
  onUpdateRole: (studentId: string, newRole: string, reason: string) => Promise<void>;
  onTransferRole: (fromStudentId: string, toStudentId: string, mode: 'DIRECT' | 'SWAP', reason: string) => Promise<void>;
  isSubmitting: boolean;
}

export const TransferRoleModal: React.FC<TransferRoleModalProps> = ({
  isOpen,
  onClose,
  student,
  allStudents,
  onUpdateRole,
  onTransferRole,
  isSubmitting
}) => {
  const [tabMode, setTabMode] = useState<'UPDATE' | 'TRANSFER'>('UPDATE');
  
  // Tab 1: Update Self Role State
  const [selectedRole, setSelectedRole] = useState<string>('Murid');
  const [customRole, setCustomRole] = useState<string>('');
  const [updateReason, setUpdateReason] = useState<string>('');

  // Tab 2: Transfer Role State
  const [targetStudentId, setTargetStudentId] = useState<string>('');
  const [transferMode, setTransferMode] = useState<'DIRECT' | 'SWAP'>('DIRECT');
  const [transferReason, setTransferReason] = useState<string>('');
  const [sameClassOnly, setSameClassOnly] = useState<boolean>(true);
  const [searchTarget, setSearchTarget] = useState<string>('');

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (student) {
      const curRole = student.role || 'Murid';
      if (STANDARD_ROLES.includes(curRole)) {
        setSelectedRole(curRole);
        setCustomRole('');
      } else {
        setSelectedRole('Lain-lain');
        setCustomRole(curRole);
      }
      setUpdateReason('');
      setTargetStudentId('');
      setTransferReason('');
      setError(null);
      setTabMode(curRole !== 'Murid' ? 'TRANSFER' : 'UPDATE');
    }
  }, [student, isOpen]);

  if (!student) return null;

  const currentRole = student.role || 'Murid';

  // Senarai murid sasaran yang layak (tidak termasuk murid semasa)
  const candidateStudents = allStudents.filter(s => {
    if (s.id === student.id) return false;
    if (sameClassOnly && s.classId !== student.classId) return false;
    if (searchTarget.trim()) {
      const q = searchTarget.toLowerCase().trim();
      const matchName = s.fullName.toLowerCase().includes(q);
      const matchNo = s.studentNumber?.toLowerCase().includes(q);
      if (!matchName && !matchNo) return false;
    }
    return true;
  });

  const targetStudent = allStudents.find(s => s.id === targetStudentId);

  // Pengendali Simpan Jawatan Secara Terus
  const handleUpdateSelf = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const finalRole = selectedRole === 'Lain-lain' ? customRole.trim() : selectedRole;
    if (!finalRole) {
      setError('Sila nyatakan jawatan murid.');
      return;
    }

    try {
      const defaultReason = `Kemas kini jawatan ${student.fullName} kepada ${finalRole}`;
      await onUpdateRole(student.id, finalRole, updateReason.trim() || defaultReason);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ralat mengemas kini jawatan.');
    }
  };

  // Pengendali Pindahan Jawatan Kepada Murid Lain
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!targetStudentId) {
      setError('Sila pilih murid penerima jawatan.');
      return;
    }

    if (!targetStudent) {
      setError('Murid penerima tidak ditemui.');
      return;
    }

    try {
      const defaultReason = transferMode === 'SWAP'
        ? `Pertukaran timbal balik jawatan antara ${student.fullName} (${currentRole}) dan ${targetStudent.fullName} (${targetStudent.role || 'Murid'})`
        : `Pindahan jawatan ${currentRole} dari ${student.fullName} kepada ${targetStudent.fullName}`;

      await onTransferRole(
        student.id,
        targetStudentId,
        transferMode,
        transferReason.trim() || defaultReason
      );
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ralat melakukan pindahan jawatan.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pengurusan & Pindahan Jawatan Murid"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Kad Info Murid Semasa */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase block">Murid Semasa</span>
            <h4 className="text-sm font-bold text-slate-900">{student.fullName}</h4>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className="font-semibold text-blue-700">{student.className || 'Kelas'}</span>
              <span className="text-slate-300">•</span>
              <span className="font-mono text-slate-500">{student.studentNumber || '-'}</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-bold text-slate-400 uppercase block">Jawatan Sekarang</span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold mt-1 ${
              currentRole !== 'Murid'
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-slate-200/70 text-slate-700'
            }`}>
              ★ {currentRole}
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Tab Pilihan Mod Tindakan */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => { setTabMode('UPDATE'); setError(null); }}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 flex items-center justify-center gap-2 transition-all ${
              tabMode === 'UPDATE'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Ubah Jawatan Murid Ini</span>
          </button>

          <button
            type="button"
            onClick={() => { setTabMode('TRANSFER'); setError(null); }}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 flex items-center justify-center gap-2 transition-all ${
              tabMode === 'TRANSFER'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Pindahkan Jawatan Kepada Murid Lain</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* MOD 1: UBAH JAWATAN MURID SECARA TERUS                   */}
        {/* ======================================================== */}
        {tabMode === 'UPDATE' && (
          <form onSubmit={handleUpdateSelf} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Pilih Jawatan Baharu <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              >
                {STANDARD_ROLES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {selectedRole === 'Lain-lain' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Jawatan Kustom <span className="text-red-500">*</span>
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Catatan / Sebab Pelantikan (Pilihan)
              </label>
              <input
                type="text"
                value={updateReason}
                onChange={(e) => setUpdateReason(e.target.value)}
                placeholder="Contoh: Pelantikan rasmi Majlis Watikah Pelantikan Pemimpin Murid 2026"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Batal
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting}>
                Simpan Jawatan
              </Button>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* MOD 2: PINDAHKAN JAWATAN KEPADA MURID LAIN               */}
        {/* ======================================================== */}
        {tabMode === 'TRANSFER' && (
          <form onSubmit={handleTransfer} className="space-y-4 pt-2">
            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-950 flex items-start space-x-2.5">
              <Shield className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Pindahan Jawatan:</strong> Anda akan memindahkan jawatan <span className="font-bold underline">{currentRole}</span> daripada <span className="font-semibold">{student.fullName}</span> kepada murid sasaran yang dipilih.
              </div>
            </div>

            {/* Kawalan Penapis Sasaran */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Pilih Murid Sasaran Penerima Jawatan <span className="text-red-500">*</span>
                </label>
                <label className="flex items-center space-x-1.5 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sameClassOnly}
                    onChange={(e) => setSameClassOnly(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Kelas Sama ({student.className}) Sahaja</span>
                </label>
              </div>

              {/* Carian Pantas Nama Murid Sasaran */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTarget}
                  onChange={(e) => setSearchTarget(e.target.value)}
                  placeholder="Cari nama murid sasaran..."
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Senarai Pilihan Dropdown Murid Sasaran */}
              <select
                value={targetStudentId}
                onChange={(e) => setTargetStudentId(e.target.value)}
                required
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">-- Sila Pilih Murid Penerima --</option>
                {candidateStudents.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} ({c.className || 'Kelas'}) — Jawatan Semasa: {c.role || 'Murid'}
                  </option>
                ))}
              </select>
            </div>

            {/* Pilihan Mod Pindahan: Pindah Terus atau Tukar Saling */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kaedah Pindahan Jawatan
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  transferMode === 'DIRECT' 
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 font-semibold' 
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}>
                  <input
                    type="radio"
                    name="transferMode"
                    value="DIRECT"
                    checked={transferMode === 'DIRECT'}
                    onChange={() => setTransferMode('DIRECT')}
                    className="sr-only"
                  />
                  <div className="text-xs font-bold">1. Pindah Terus</div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Murid sasaran menerima jawatan <strong>{currentRole}</strong>. Murid semasa kembali kepada <strong>Murid biasa</strong>.
                  </p>
                </label>

                <label className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  transferMode === 'SWAP' 
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 font-semibold' 
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}>
                  <input
                    type="radio"
                    name="transferMode"
                    value="SWAP"
                    checked={transferMode === 'SWAP'}
                    onChange={() => setTransferMode('SWAP')}
                    className="sr-only"
                  />
                  <div className="text-xs font-bold">2. Tukar Saling (Swap)</div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Kedua-dua murid bertukar jawatan sesama sendiri (cth: Ketua Kelas bertukar dengan Penolong Kelas).
                  </p>
                </label>
              </div>
            </div>

            {/* Preview Hasil Pindahan */}
            {targetStudent && (
              <div className="p-3 bg-slate-100 rounded-xl text-xs space-y-1.5 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Pratonton Keputusan Selepas Pindahan:</span>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">{student.fullName}:</span>
                  <strong className="text-blue-700">
                    {transferMode === 'DIRECT' ? 'Murid' : (targetStudent.role || 'Murid')}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">{targetStudent.fullName}:</span>
                  <strong className="text-indigo-700">{currentRole}</strong>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sebab / Justifikasi Pindahan Jawatan (Audit Log)
              </label>
              <input
                type="text"
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                placeholder="Contoh: Penstrukturan semula jawatan kelas bagi penggal 2"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Batal
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmitting}>
                Laksanakan Pindahan Jawatan
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
