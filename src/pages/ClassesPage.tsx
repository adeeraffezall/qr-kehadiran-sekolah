import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  getClasses, 
  subscribeClasses, 
  ensureBaselineClassesInFirestore, 
  addClass, 
  updateClass, 
  deleteClass, 
  clearAllSchoolData 
} from '../services/classService';
import { 
  getStudents, 
  executeAnnualRollover, 
  RolloverOptions, 
  RolloverResult 
} from '../services/studentService';
import { ClassItem, Student } from '../types';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { AnnualRolloverModal } from '../components/classes/AnnualRolloverModal';
import { GraduationCap, Plus, Edit2, Trash2, Users, Loader2, ArrowUpRight } from 'lucide-react';

export const ClassesPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [className, setClassName] = useState('');
  const [yearLevel, setYearLevel] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rollover State
  const [rolloverModalOpen, setRolloverModalOpen] = useState(false);
  const [isRollingOver, setIsRollingOver] = useState(false);

  useEffect(() => {
    let unsubClasses: () => void = () => {};
    let isMounted = true;

    const init = async () => {
      setLoading(true);
      try {
        await ensureBaselineClassesInFirestore();
        const sList = await getStudents(undefined, true);
        if (isMounted) setStudents(sList);

        // Langganan Masa Nyata bagi senarai kelas
        unsubClasses = subscribeClasses((cList) => {
          if (isMounted) {
            setClasses(cList);
            setLoading(false);
          }
        });
      } catch (err) {
        console.error('Ralat senarai kelas:', err);
        if (isMounted) setLoading(false);
      }
    };

    init();

    return () => {
      isMounted = false;
      unsubClasses();
    };
  }, []);

  const loadData = async () => {
    try {
      const [cList, sList] = await Promise.all([
        getClasses(),
        getStudents(undefined, true)
      ]);
      setClasses(cList);
      setStudents(sList);
    } catch (err) {
      console.error('Ralat senarai kelas:', err);
    }
  };

  const handleOpenAdd = () => {
    setEditingClass(null);
    setClassName('');
    setYearLevel(1);
    setError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (c: ClassItem) => {
    setEditingClass(c);
    setClassName(c.name);
    setYearLevel(c.yearLevel);
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!className.trim()) {
      setError('Nama kelas wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingClass) {
        await updateClass(user.uid, user.email || '', editingClass.id, {
          name: className.trim(),
          yearLevel
        });
      } else {
        await addClass(user.uid, user.email || '', className.trim(), yearLevel);
      }
      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Ralat menyimpan data kelas.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClass = async (c: ClassItem) => {
    if (!user) return;
    const studentCount = students.filter(s => s.classId === c.id).length;
    let msg = `Adakah anda pasti mahu memadamkan kelas "${c.name}"?`;
    if (studentCount > 0) {
      msg += `\n\nAMARAN: Kelas ini mengandungi ${studentCount} orang murid berdaftar. Murid akan dinyahpautkan kepada status 'Tiada Kelas'.`;
    }
    if (!window.confirm(msg)) return;

    try {
      await deleteClass(user.uid, user.email || '', c.id, c.name);
      await loadData();
    } catch (err: any) {
      alert('Ralat memadam kelas: ' + err.message);
    }
  };

  const handleClearSampleData = async () => {
    if (!user) return;
    const confirmText = prompt(
      'AMARAN: Tindakan ini akan memadamkan SEMUA kelas, murid, dan rekod kehadiran sampel untuk membolehkan SK Batandok bermula dari sifar.\n\nSila taip "PADAM" untuk mengesahkan:'
    );
    if (confirmText !== 'PADAM') return;

    try {
      await clearAllSchoolData(user.uid, user.email || '');
      await loadData();
      alert('Semua data sampel telah berjaya dikosongkan. Anda kini boleh mendaftar kelas dan murid sebenar SK Batandok!');
    } catch (err: any) {
      alert('Ralat: ' + err.message);
    }
  };

  const handleToggleActiveClass = async (c: ClassItem) => {
    if (!user) return;
    const confirmMsg = c.active
      ? `Nyahaktifkan kelas "${c.name}"? Murid sedia ada tidak akan dipadamkan.`
      : `Aktifkan semula kelas "${c.name}"?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await updateClass(user.uid, user.email || '', c.id, { active: !c.active });
      await loadData();
    } catch (err: any) {
      alert('Ralat: ' + err.message);
    }
  };

  const handleExecuteRollover = async (options: RolloverOptions): Promise<RolloverResult> => {
    if (!user) throw new Error('Pengguna tidak disahkan.');
    setIsRollingOver(true);
    try {
      const res = await executeAnnualRollover(user.uid, user.email || '', options);
      await loadData();
      return res;
    } finally {
      setIsRollingOver(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Add Button */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Senarai Kelas Sekolah</h2>
          <p className="text-xs text-slate-500">
            Pengurusan kelas Tahun 1 hingga Tahun 6 dan bilangan murid semasa.
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRolloverModalOpen(true)}
              icon={<GraduationCap className="w-3.5 h-3.5 text-blue-600" />}
              className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              Peralihan Sesi (Naik Kelas)
            </Button>

            {classes.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearSampleData}
                icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />}
                className="text-red-600 hover:bg-red-50 border-red-200"
              >
                Kosongkan Data Sampel
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenAdd}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Tambah Kelas Baharu
            </Button>
          </div>
        )}
      </div>

      {/* Grid Kelas */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 text-xs">
              Belum ada kelas didaftarkan. Sila klik "Tambah Kelas Baharu".
            </div>
          ) : (
            classes.map(c => {
              const studentCount = students.filter(s => s.classId === c.id).length;

              return (
                <div 
                  key={c.id} 
                  className={`bg-white p-5 rounded-2xl border shadow-xs transition-all ${
                    c.active ? 'border-slate-200 hover:border-blue-300' : 'border-slate-200 bg-slate-50/70 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-black text-sm sm:text-base">
                        {c.yearLevel === 0 ? 'PRA' : c.yearLevel}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">{c.name}</h3>
                        <span className="text-xs text-slate-400">{c.yearLevel === 0 ? 'Prasekolah' : `Tahun ${c.yearLevel}`}</span>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Nama Kelas"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClass(c)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Padam Kelas Ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1.5 text-slate-600">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span><strong>{studentCount}</strong> murid berdaftar</span>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full font-semibold text-[11px] ${
                      c.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {c.active ? 'Aktif' : 'Nyahaktif'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal Tambah / Edit Kelas */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingClass ? 'Kemaskini Maklumat Kelas' : 'Tambah Kelas Baharu'}
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
              Tingkatan / Tahun Persekolahan <span className="text-red-500">*</span>
            </label>
            <select
              value={yearLevel}
              onChange={(e) => setYearLevel(Number(e.target.value))}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
            >
              <option value={0}>Prasekolah</option>
              {[1, 2, 3, 4, 5, 6].map(lvl => (
                <option key={lvl} value={lvl}>Tahun {lvl}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Kelas <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="Contoh: 1 ARIF, 2 BESTARI, dsb."
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 uppercase"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {editingClass ? 'Simpan Perubahan' : 'Daftar Kelas'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Peralihan Sesi / Naik Kelas Kelompok */}
      <AnnualRolloverModal
        isOpen={rolloverModalOpen}
        onClose={() => setRolloverModalOpen(false)}
        classes={classes}
        students={students}
        onExecuteRollover={handleExecuteRollover}
        isExecuting={isRollingOver}
      />

    </div>
  );
};
