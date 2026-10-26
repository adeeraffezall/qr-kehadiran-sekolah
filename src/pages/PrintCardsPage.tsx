import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getStudents } from '../services/studentService';
import { getClasses } from '../services/classService';
import { generateRandomToken, hashTokenClient } from '../services/qrService';
import { updateStudent } from '../services/studentService';
import { Student, ClassItem } from '../types';
import { StudentQRCard, QRBatchPrintView } from '../components/qr/QRCardView';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { 
  Printer, 
  Search, 
  Filter, 
  RefreshCw, 
  AlertTriangle, 
  ShieldAlert, 
  Loader2 
} from 'lucide-react';

export const PrintCardsPage: React.FC = () => {
  const { user, profile, isAdmin } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');

  // Print Mode: 'GRID_LIST' | 'BATCH_A4_PRINT'
  const [printMode, setPrintMode] = useState<'GRID_LIST' | 'BATCH_A4_PRINT'>('GRID_LIST');

  // Single Card Print Preview Modal
  const [selectedStudentForCard, setSelectedStudentForCard] = useState<Student | null>(null);
  const [singleToken, setSingleToken] = useState<string>('');

  // Revoke & Regenerate QR Modal
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [studentToRevoke, setStudentToRevoke] = useState<Student | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  // Map to hold transient plain tokens for printing
  const [studentTokenMap, setStudentTokenMap] = useState<Map<string, string>>(new Map());

  const loadData = async () => {
    setLoading(true);
    try {
      const [sList, cList] = await Promise.all([
        getStudents(classFilter === 'ALL' ? undefined : classFilter, true),
        getClasses()
      ]);

      const classMap = new Map<string, string>();
      cList.forEach(c => classMap.set(c.id, c.name));

      const enriched = sList.map(s => ({
        ...s,
        className: classMap.get(s.classId) || 'Kelas'
      }));

      // Jana token untuk paparan cetakan
      const tokenMap = new Map<string, string>();
      enriched.forEach(s => {
        const token = (s as any).plainToken || s.qrPlainToken || s.id;
        tokenMap.set(s.id, token);
      });

      setStudents(enriched);
      setClasses(cList);
      setStudentTokenMap(tokenMap);
    } catch (err) {
      console.error('Ralat kad QR:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [classFilter]);

  // Handle Revoke and Regenerate QR
  const handleConfirmRevoke = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !studentToRevoke) return;
    if (!revokeReason.trim() || revokeReason.trim().length < 3) {
      setRevokeError('Sila nyatakan sebab pembatalan kad (minimum 3 aksara).');
      return;
    }

    setIsRevoking(true);
    setRevokeError(null);
    try {
      // Hasilkan token kriptografi baharu
      const newToken = generateRandomToken();
      const newHash = await hashTokenClient(newToken);

      await updateStudent(
        user.uid,
        user.email || '',
        studentToRevoke.id,
        { qrTokenHash: newHash },
        `PEMBATALAN & JANA SEMULA KAD QR: ${revokeReason.trim()}`
      );

      // Kemaskini peta token
      setStudentTokenMap(prev => new Map(prev).set(studentToRevoke.id, newToken));
      setRevokeModalOpen(false);
      await loadData();
      alert(`Kad QR baharu untuk ${studentToRevoke.fullName} berjaya dijana! Kod lama telah dibatalkan.`);
    } catch (err: any) {
      setRevokeError(err.message || 'Ralat membatalkan kad.');
    } finally {
      setIsRevoking(false);
    }
  };

  const filteredStudents = students.filter(s => {
    return s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.studentNumber && s.studentNumber.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const studentsWithTokens = filteredStudents.map(s => ({
    student: s,
    token: studentTokenMap.get(s.id) || `SKB_${s.id}`
  }));

  if (printMode === 'BATCH_A4_PRINT') {
    return (
      <div className="space-y-4">
        <div className="no-print">
          <Button
            variant="outline"
            onClick={() => setPrintMode('GRID_LIST')}
          >
            &larr; Kembali ke Paparan Senarai
          </Button>
        </div>
        <QRBatchPrintView studentsWithTokens={studentsWithTokens} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Penjanaan & Cetakan Kad QR Murid</h2>
          <p className="text-xs text-slate-500">
            Cetak kad individu atau helaian A4 (8 kad setiap helaian). Kod QR mengandungi token rawak berkeselamatan tinggi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setPrintMode('BATCH_A4_PRINT')}
            icon={<Printer className="w-3.5 h-3.5" />}
            disabled={filteredStudents.length === 0}
          >
            Mod Cetakan Pukal A4 ({filteredStudents.length} Kad)
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari murid..."
            className="w-full text-xs pl-9 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 shadow-xs"
        >
          <option value="ALL">Semua Kelas</option>
          {classes.filter(c => c.active).map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Grid Kad Murid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredStudents.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 text-xs">
              Tiada murid ditemui bagi kriteria ini.
            </div>
          ) : (
            filteredStudents.map(student => {
              const token = studentTokenMap.get(student.id) || `SKB_${student.id}`;

              return (
                <div key={student.id} className="flex flex-col items-center bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
                  <StudentQRCard student={student} plainToken={token} />

                  <div className="w-full mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedStudentForCard(student);
                        setSingleToken(token);
                      }}
                      icon={<Printer className="w-3.5 h-3.5" />}
                    >
                      Cetak Kad
                    </Button>

                    {isAdmin && (
                      <button
                        onClick={() => {
                          setStudentToRevoke(student);
                          setRevokeReason('');
                          setRevokeError(null);
                          setRevokeModalOpen(true);
                        }}
                        className="text-xs text-red-600 hover:text-red-800 p-1.5 rounded-lg hover:bg-red-50 flex items-center space-x-1"
                        title="Batalkan kad yang hilang atau rosak"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Batal & Jana Baru</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal Cetak Kad Individu */}
      {selectedStudentForCard && (
        <Modal
          isOpen={!!selectedStudentForCard}
          onClose={() => setSelectedStudentForCard(null)}
          title="Pratonton Cetakan Kad Individu"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <StudentQRCard 
              student={selectedStudentForCard} 
              plainToken={singleToken} 
            />
            <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setSelectedStudentForCard(null)}>
                Tutup
              </Button>
              <Button variant="primary" onClick={() => window.print()} icon={<Printer className="w-4 h-4" />}>
                Cetak Kad Ini
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Batal & Jana Semula Kad QR */}
      {revokeModalOpen && (
        <Modal
          isOpen={revokeModalOpen}
          onClose={() => setRevokeModalOpen(false)}
          title="Pembatalan & Penjanaan Semula Kad QR"
          maxWidth="md"
        >
          <form onSubmit={handleConfirmRevoke} className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 text-red-900 rounded-xl text-xs flex items-start space-x-2">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
              <div>
                <p className="font-semibold">Amaran Keselamatan:</p>
                <p className="mt-0.5">
                  Tindakan ini akan <strong>membatalkan serta-merta token kod QR lama</strong> milik murid ini. Sekiranya kad fizikal lama dijumpai semula, ia akan ditolak oleh sistem pengimbas.
                </p>
              </div>
            </div>

            {revokeError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                {revokeError}
              </div>
            )}

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <p><span className="text-slate-500">Nama Murid:</span> <strong>{studentToRevoke?.fullName}</strong></p>
              <p><span className="text-slate-500">Kelas:</span> {studentToRevoke?.className}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sebab Pembatalan / Penggantian <span className="text-red-500">*</span>
              </label>
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                rows={3}
                required
                placeholder="Contoh: Kad fizikal dilaporkan hilang oleh ibu bapa / kad patah dan tidak dapat diimbas."
                className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setRevokeModalOpen(false)} disabled={isRevoking}>
                Batal
              </Button>
              <Button type="submit" variant="danger" isLoading={isRevoking}>
                Sahkan Batal & Jana Baharu
              </Button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
};
