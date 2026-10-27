import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ClassItem, Student } from '../../types';
import { 
  RolloverClassMapping, 
  RolloverOptions, 
  RolloverResult,
  getDefaultRolloverMappings 
} from '../../services/studentService';
import { 
  GraduationCap, 
  ArrowRight, 
  AlertTriangle, 
  CheckCircle2, 
  Users, 
  Sparkles, 
  RotateCcw,
  ShieldCheck,
  ChevronRight,
  Info
} from 'lucide-react';

interface AnnualRolloverModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassItem[];
  students: Student[];
  onExecuteRollover: (options: RolloverOptions) => Promise<RolloverResult>;
  isExecuting: boolean;
}

export const AnnualRolloverModal: React.FC<AnnualRolloverModalProps> = ({
  isOpen,
  onClose,
  classes,
  students,
  onExecuteRollover,
  isExecuting
}) => {
  const currentCalendarYear = new Date().getFullYear();
  const nextCalendarYear = currentCalendarYear + 1;

  const [targetYear, setTargetYear] = useState<string>(String(nextCalendarYear));
  const [mappings, setMappings] = useState<RolloverClassMapping[]>([]);
  const [resetClassRoles, setResetClassRoles] = useState<boolean>(true);
  const [resetAllRoles, setResetAllRoles] = useState<boolean>(false);
  const [auditReason, setAuditReason] = useState<string>('');
  const [confirmationInput, setConfirmationInput] = useState<string>('');
  const [step, setStep] = useState<'CONFIGURE' | 'CONFIRM' | 'SUCCESS'>('CONFIGURE');
  const [lastResult, setLastResult] = useState<RolloverResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Inisialisasi pemetaan kelas lalai apabila modal dibuka
  useEffect(() => {
    if (isOpen) {
      const initial = getDefaultRolloverMappings(classes);
      setMappings(initial);
      setTargetYear(String(nextCalendarYear));
      setResetClassRoles(true);
      setResetAllRoles(false);
      setAuditReason(`Peralihan Sesi Persekolahan ke ${nextCalendarYear}`);
      setConfirmationInput('');
      setStep('CONFIGURE');
      setLastResult(null);
      setErrorMsg(null);
    }
  }, [isOpen, classes]);

  // Kiraan murid aktif mengikut kelas
  const activeStudents = useMemo(() => students.filter(s => s.active), [students]);

  const studentCountByClass = useMemo(() => {
    const map = new Map<string, number>();
    activeStudents.forEach(s => {
      map.set(s.classId, (map.get(s.classId) || 0) + 1);
    });
    return map;
  }, [activeStudents]);

  // Statistik Pratonton (Preview Metrics)
  const previewStats = useMemo(() => {
    let promoteCount = 0;
    let graduateCount = 0;
    let retainCount = 0;

    mappings.forEach(m => {
      const count = studentCountByClass.get(m.sourceClassId) || 0;
      if (m.targetClassId === 'GRADUATE') {
        graduateCount += count;
      } else if (m.targetClassId === 'RETAIN' || m.targetClassId === m.sourceClassId) {
        retainCount += count;
      } else {
        promoteCount += count;
      }
    });

    return {
      total: activeStudents.length,
      promoteCount,
      graduateCount,
      retainCount
    };
  }, [mappings, studentCountByClass, activeStudents]);

  // Tukar sasaran kelas bagi satu pemetaan
  const handleTargetChange = (sourceClassId: string, newTargetId: string) => {
    setMappings(prev => prev.map(m => {
      if (m.sourceClassId !== sourceClassId) return m;

      if (newTargetId === 'GRADUATE') {
        return {
          ...m,
          targetClassId: 'GRADUATE',
          targetClassName: 'Tamat Persekolahan (Alumni)'
        };
      }
      if (newTargetId === 'RETAIN') {
        return {
          ...m,
          targetClassId: 'RETAIN',
          targetClassName: `Kekal (${m.sourceClassName})`
        };
      }
      const targetClass = classes.find(c => c.id === newTargetId);
      return {
        ...m,
        targetClassId: newTargetId,
        targetClassName: targetClass?.name || 'Kelas Baharu'
      };
    }));
  };

  // Butang reset kepada tetapan pintar lalai
  const handleResetDefaults = () => {
    setMappings(getDefaultRolloverMappings(classes));
  };

  // Jalankan proses peralihan
  const handleExecute = async () => {
    if (confirmationInput.trim() !== 'SAHKAN') {
      setErrorMsg('Sila taip "SAHKAN" dalam kotak pengesahan sebelum meneruskan.');
      return;
    }

    setErrorMsg(null);
    try {
      const res = await onExecuteRollover({
        targetSessionYear: targetYear.trim(),
        mappings,
        resetClassRoles,
        resetAllRoles,
        auditReason: auditReason.trim()
      });
      setLastResult(res);
      setStep('SUCCESS');
    } catch (err: any) {
      setErrorMsg(err.message || 'Ralat berlaku semasa memproses peralihan sesi.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isExecuting ? () => {} : onClose}
      title="Peralihan Sesi Persekolahan Baharu (Naik Kelas Kelompok)"
      maxWidth="2xl"
    >
      <div className="space-y-5 text-slate-800">

        {/* Notis Keselamatan Arkib Lampau */}
        <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-blue-900">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">Integriti Rekod Kehadiran Terpelihara:</span> Sejarah kehadiran murid bagi tahun lampau (seperti 2026 dan sebelumnya) <strong>TIDAK akan terjejas</strong> kerana disimpan dengan snapshot kelas asal murid pada tarikh tersebut. Laporan arkib lampau kekal utuh.
          </div>
        </div>

        {/* LANGKAH 1: KONFIGURASI PEMETAAN */}
        {step === 'CONFIGURE' && (
          <div className="space-y-4">
            {/* Input Tahun Sesi */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700">Tahun Sesi Baharu / Takwim</label>
                <p className="text-[11px] text-slate-500">Tentukan tahun sesi persekolahan yang akan didaftarkan</p>
              </div>
              <input
                type="text"
                value={targetYear}
                onChange={(e) => {
                  setTargetYear(e.target.value);
                  setAuditReason(`Peralihan Sesi Persekolahan ke ${e.target.value}`);
                }}
                placeholder="CONTOH: 2027"
                className="w-32 text-center text-sm font-bold font-mono px-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Jadual Pemetaan Kelas */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Pemetaan Kenaikan Kelas (Sumber ➔ Sasaran)</span>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Tetapan Lalai Pintar
                </button>
              </div>

              <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                {mappings.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">Tiada kelas aktif untuk dipetakan.</div>
                ) : (
                  mappings.map((m) => {
                    const studentCount = studentCountByClass.get(m.sourceClassId) || 0;
                    const isGraduating = m.targetClassId === 'GRADUATE';
                    const isRetaining = m.targetClassId === 'RETAIN';

                    return (
                      <div key={m.sourceClassId} className="p-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 hover:bg-slate-50">
                        {/* Kelas Sumber */}
                        <div className="min-w-[140px] flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-xs">{m.sourceClassName}</span>
                          <span className="text-[11px] font-mono text-slate-400">({studentCount} murid)</span>
                        </div>

                        <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />

                        {/* Dropdown Pilihan Sasaran */}
                        <div className="flex-1 w-full sm:w-auto">
                          <select
                            value={m.targetClassId}
                            onChange={(e) => handleTargetChange(m.sourceClassId, e.target.value)}
                            className={`w-full text-xs font-semibold px-3 py-1.5 rounded-lg border focus:outline-hidden focus:ring-2 ${
                              isGraduating 
                                ? 'bg-purple-50 text-purple-800 border-purple-200 focus:ring-purple-400' 
                                : isRetaining 
                                  ? 'bg-amber-50 text-amber-800 border-amber-200 focus:ring-amber-400'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 focus:ring-emerald-400'
                            }`}
                          >
                            <optgroup label="Tindakan Khas">
                              <option value="GRADUATE">🎓 Tamat Persekolahan (Tahun 6 / Alumni)</option>
                              <option value="RETAIN">⏸ Kekal Dalam Kelas Ini (Tiada Pertukaran)</option>
                            </optgroup>
                            <optgroup label="Naik Kelas Ke:">
                              {classes.filter(c => c.active).map(c => (
                                <option key={c.id} value={c.id}>
                                  ➡ Naik ke {c.name} ({c.yearLevel === 0 ? 'Pra' : `Tahun ${c.yearLevel}`})
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Pilihan Pelantikan & Rawatan Jawatan */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <span className="block text-xs font-bold text-slate-700">Pelantikan & Status Jawatan Murid</span>
              
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={resetClassRoles}
                  onChange={(e) => setResetClassRoles(e.target.checked)}
                  className="mt-0.5 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-700 leading-snug">
                  <strong>Set semula jawatan kelas (Ketua & Penolong Kelas) kepada 'Murid' biasa</strong> untuk membolehkan pemilihan jawatan baharu bagi sesi {targetYear}.
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={resetAllRoles}
                  onChange={(e) => setResetAllRoles(e.target.checked)}
                  className="mt-0.5 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-600 leading-snug">
                  Set semula semua jawatan lain (Pengawas Sekolah, PRS, SPBT) kepada 'Murid' (Biarkan kosong jika mahu kekalkan senarai pengawas sedia ada).
                </span>
              </label>
            </div>

            {/* Kad Ringkasan Metrik */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="bg-slate-100 p-2.5 rounded-xl text-center">
                <div className="text-[11px] text-slate-500 font-medium">Jumlah Murid</div>
                <div className="text-lg font-bold text-slate-800">{previewStats.total}</div>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl text-center">
                <div className="text-[11px] text-emerald-700 font-medium">Naik Kelas</div>
                <div className="text-lg font-bold text-emerald-700">{previewStats.promoteCount}</div>
              </div>
              <div className="bg-purple-50 border border-purple-100 p-2.5 rounded-xl text-center">
                <div className="text-[11px] text-purple-700 font-medium">Tamat Sekolah</div>
                <div className="text-lg font-bold text-purple-700">{previewStats.graduateCount}</div>
              </div>
              <div className="bg-amber-50 border border-amber-100 p-2.5 rounded-xl text-center">
                <div className="text-[11px] text-amber-700 font-medium">Kekal Kelas</div>
                <div className="text-lg font-bold text-amber-700">{previewStats.retainCount}</div>
              </div>
            </div>

            {/* Butang Tindakan Seterusnya */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={onClose}>
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setStep('CONFIRM')}
                icon={<ChevronRight className="w-4 h-4" />}
              >
                Semak & Sahkan Peralihan
              </Button>
            </div>
          </div>
        )}

        {/* LANGKAH 2: PENGESAHAN KESELAMATAN BERGANDA */}
        {step === 'CONFIRM' && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
              <div className="space-y-1 text-xs text-amber-900">
                <div className="font-bold text-sm">Pengesahan Akhir Pelaksanaan Peralihan Sesi {targetYear}</div>
                <p>
                  Anda akan menaikkan <strong>{previewStats.promoteCount} orang murid</strong> ke kelas baharu dan menandakan <strong>{previewStats.graduateCount} orang murid Tahun 6</strong> sebagai tamat persekolahan (alumni).
                </p>
                <p className="text-[11px] text-amber-700 pt-1">
                  * Tindakan ini direkodkan secara rasmi dalam Log Audit Sistem bersama ID Pentadbir anda.
                </p>
              </div>
            </div>

            {/* Input Sebab / Catatan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Log Audit (Pilihan)</label>
              <input
                type="text"
                value={auditReason}
                onChange={(e) => setAuditReason(e.target.value)}
                placeholder="Contoh: Kenaikan kelas tahunan sesi 2027"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Kotak Menaip Pengesahan */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Sila taip perkataan <span className="text-red-600 font-mono text-sm uppercase px-1 bg-red-50 rounded-sm">SAHKAN</span> untuk mengesahkan:
              </label>
              <input
                type="text"
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder="Taip perkataan: SAHKAN"
                className="w-full text-xs font-mono px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-red-400"
              />
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 p-3 rounded-xl text-xs text-red-700">
                {errorMsg}
              </div>
            )}

            {/* Butang Tindakan */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep('CONFIGURE')}
                disabled={isExecuting}
              >
                Kembali Ubah Pemetaan
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleExecute}
                isLoading={isExecuting}
                disabled={confirmationInput.trim() !== 'SAHKAN' || isExecuting}
                icon={<GraduationCap className="w-4 h-4" />}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isExecuting ? 'Sedang Memproses Peralihan...' : `Laksanakan Peralihan Sesi ${targetYear}`}
              </Button>
            </div>
          </div>
        )}

        {/* LANGKAH 3: KEJAYAAN / SELESAI */}
        {step === 'SUCCESS' && lastResult && (
          <div className="space-y-4 py-3 text-center">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">Peralihan Sesi {targetYear} Berjaya!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Semua rekod kelas murid telah diselaraskan dengan sempurna ke pangkalan data awan.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div className="text-center">
                <div className="text-slate-500 font-medium">Dinaikkan Kelas</div>
                <div className="text-xl font-bold text-emerald-600 mt-0.5">{lastResult.promotedCount}</div>
              </div>
              <div className="text-center border-x border-slate-200">
                <div className="text-slate-500 font-medium">Tamat Sekolah (Alumni)</div>
                <div className="text-xl font-bold text-purple-600 mt-0.5">{lastResult.graduatedCount}</div>
              </div>
              <div className="text-center">
                <div className="text-slate-500 font-medium">Kekal Kelas</div>
                <div className="text-xl font-bold text-amber-600 mt-0.5">{lastResult.retainedCount}</div>
              </div>
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={onClose}
                className="w-full sm:w-auto px-8"
              >
                Selesai & Tutup
              </Button>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
};
