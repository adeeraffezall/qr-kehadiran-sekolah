import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  getStudents, 
  subscribeStudents,
  ensureBaselineStudentsInFirestore,
  addStudent, 
  updateStudent, 
  deleteStudent,
  transferStudentClass, 
  toggleStudentActive,
  updateStudentRole,
  transferStudentRole,
  executeAnnualRollover,
  RolloverOptions,
  RolloverResult,
  ImportRow
} from '../services/studentService';
import { getClasses, ensureBaselineClassesInFirestore } from '../services/classService';
import { Student, ClassItem } from '../types';
import { StudentModal } from '../components/students/StudentModal';
import { TransferClassModal } from '../components/students/TransferClassModal';
import { TransferRoleModal } from '../components/students/TransferRoleModal';
import { ImportModal } from '../components/students/ImportModal';
import { AnnualRolloverModal } from '../components/classes/AnnualRolloverModal';
import { Button } from '../components/ui/Button';
import { 
  Users, 
  UserPlus, 
  Upload, 
  Download, 
  Search, 
  Edit2, 
  Trash2,
  ArrowRightLeft, 
  UserX, 
  UserCheck, 
  Loader2, 
  QrCode,
  Award,
  GraduationCap
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const StudentsPage: React.FC = () => {
  const { user, profile, isAdmin } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');

  // Modals
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isSavingStudent, setIsSavingStudent] = useState(false);

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [studentToTransfer, setStudentToTransfer] = useState<Student | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [studentForRole, setStudentForRole] = useState<Student | null>(null);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [rolloverModalOpen, setRolloverModalOpen] = useState(false);
  const [isRollingOver, setIsRollingOver] = useState(false);

  useEffect(() => {
    let unsubStudents: () => void = () => {};
    let isMounted = true;

    const initData = async () => {
      setLoading(true);
      try {
        // Pastikan kelas dan murid asas disegerakkan ke pangkalan data awan
        await Promise.all([
          ensureBaselineClassesInFirestore(),
          ensureBaselineStudentsInFirestore()
        ]);

        const cList = await getClasses();
        if (isMounted) setClasses(cList);

        const classMap = new Map<string, string>();
        cList.forEach(c => classMap.set(c.id, c.name));

        // Langganan MASA NYATA (Realtime Listener): Segerak automatik antara laptop & telefon
        unsubStudents = subscribeStudents(
          classFilter === 'ALL' ? undefined : classFilter,
          false,
          (sList) => {
            if (isMounted) {
              const enriched = sList.map(s => ({
                ...s,
                className: classMap.get(s.classId) || s.className || 'Kelas Tidak Ditemui'
              }));
              setStudents(enriched);
              setLoading(false);
            }
          }
        );
      } catch (err) {
        console.error('Ralat senarai murid:', err);
        if (isMounted) setLoading(false);
      }
    };

    initData();

    return () => {
      isMounted = false;
      unsubStudents();
    };
  }, [classFilter]);

  const loadData = async () => {
    // Fungsi bantuan sekiranya dipanggil secara manual
    try {
      const [sList, cList] = await Promise.all([
        getStudents(classFilter === 'ALL' ? undefined : classFilter, false),
        getClasses()
      ]);
      const classMap = new Map<string, string>();
      cList.forEach(c => classMap.set(c.id, c.name));
      const enriched = sList.map(s => ({
        ...s,
        className: classMap.get(s.classId) || s.className || 'Kelas Tidak Ditemui'
      }));
      setStudents(enriched);
      setClasses(cList);
    } catch (e) {
      console.warn('Manual loadData error:', e);
    }
  };

  // Handle Add / Edit Student
  const handleSaveStudent = async (data: { 
    fullName: string; 
    studentNumber: string; 
    classId: string;
    gender?: string;
    role?: string;
  }) => {
    if (!user) return;
    setIsSavingStudent(true);
    try {
      if (editingStudent) {
        await updateStudent(user.uid, user.email || '', editingStudent.id, {
          fullName: data.fullName,
          studentNumber: data.studentNumber,
          classId: data.classId,
          gender: data.gender,
          role: data.role || 'Murid'
        });
      } else {
        await addStudent(user.uid, user.email || '', data);
      }
      await loadData();
    } finally {
      setIsSavingStudent(false);
    }
  };

  // Handle Update Role Directly
  const handleUpdateRole = async (studentId: string, newRole: string, reason: string) => {
    if (!user) return;
    setIsUpdatingRole(true);
    try {
      await updateStudentRole(user.uid, user.email || '', studentId, newRole, reason);
      await loadData();
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // Handle Transfer / Swap Role
  const handleTransferRole = async (
    fromStudentId: string, 
    toStudentId: string, 
    mode: 'DIRECT' | 'SWAP', 
    reason: string
  ) => {
    if (!user) return;
    setIsUpdatingRole(true);
    try {
      await transferStudentRole(user.uid, user.email || '', fromStudentId, toStudentId, mode, reason);
      await loadData();
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // Handle Transfer Class
  const handleTransfer = async (studentId: string, newClassId: string, newClassName: string, reason: string) => {
    if (!user) return;
    setIsTransferring(true);
    try {
      await transferStudentClass(user.uid, user.email || '', studentId, newClassId, newClassName, reason);
      await loadData();
    } finally {
      setIsTransferring(false);
    }
  };

  // Handle Toggle Active/Inactive
  const handleToggleActive = async (student: Student) => {
    if (!user) return;
    const confirmMsg = student.active
      ? `Adakah anda pasti ingin menyahaktifkan ${student.fullName}? Murid ini tidak akan dapat diimbas.`
      : `Adakah anda ingin mengaktifkan semula ${student.fullName}?`;
    
    if (!window.confirm(confirmMsg)) return;

    try {
      await toggleStudentActive(
        user.uid,
        user.email || '',
        student.id,
        !student.active,
        student.active ? 'Nyahaktif murid' : 'Aktifkan semula murid'
      );
      await loadData();
    } catch (err: any) {
      alert('Ralat menukar status: ' + err.message);
    }
  };

  // Handle Delete Student
  const handleDeleteStudent = async (student: Student) => {
    if (!user) return;
    if (!window.confirm(`Adakah anda pasti mahu memadamkan murid "${student.fullName}" secara kekal? Tindakan ini tidak boleh dibatalkan.`)) return;

    try {
      await deleteStudent(user.uid, user.email || '', student.id, student.fullName);
      await loadData();
    } catch (err: any) {
      alert('Ralat memadam murid: ' + err.message);
    }
  };

  // Handle Batch Import
  const handleCommitImport = async (validRows: ImportRow[]) => {
    if (!user) return;
    setIsImporting(true);
    try {
      for (const row of validRows) {
        if (row.classId) {
          await addStudent(user.uid, user.email || '', {
            fullName: row.fullName,
            studentNumber: row.studentNumber,
            classId: row.classId
          });
        }
      }
      await loadData();
    } finally {
      setIsImporting(false);
    }
  };

  // Handle Annual Rollover
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

  // Export Student List to Excel
  const handleExportStudents = () => {
    const rows = filteredStudents.map((s, idx) => ({
      'BIL': idx + 1,
      'NAMA PENUH': s.fullName,
      'NO. MURID': s.studentNumber || '-',
      'KELAS': s.className || '-',
      'STATUS': s.active ? 'Aktif' : 'Tidak Aktif'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Senarai Murid');
    XLSX.writeFile(wb, `Senarai_Murid_${classFilter}.xlsx`);
  };

  // Filter students
  const filteredStudents = students.filter(s => {
    const matchesSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.studentNumber && s.studentNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'ALL' 
      ? true 
      : statusFilter === 'ACTIVE' ? s.active : !s.active;

    return matchesSearch && matchesStatus;
  });

  const existingStudentNumbers = new Set(
    students.filter(s => s.studentNumber).map(s => (s.studentNumber as string).toUpperCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Header & Main Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Pengurusan Murid</h2>
          <p className="text-xs text-slate-500">
            Daftar, kemaskini maklumat murid, pindah kelas dan jana kod QR kehadiran rasmi.
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

            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportModalOpen(true)}
              icon={<Upload className="w-3.5 h-3.5" />}
              className="bg-white"
            >
              Import Fail Excel
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportStudents}
              icon={<Download className="w-3.5 h-3.5" />}
              className="bg-white"
            >
              Eksport Senarai
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingStudent(null);
                setStudentModalOpen(true);
              }}
              icon={<UserPlus className="w-3.5 h-3.5" />}
            >
              Tambah Murid
            </Button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari murid mengikut nama atau no. murid..."
            className="w-full text-xs pl-9 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center space-x-2">
          {/* Class Filter */}
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

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 shadow-xs"
          >
            <option value="ACTIVE">Aktif Sahaja</option>
            <option value="INACTIVE">Tidak Aktif</option>
            <option value="ALL">Semua Status</option>
          </select>
        </div>
      </div>

      {/* Students Table */}
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
                  <th className="py-3 px-4">ID Murid</th>
                  <th className="py-3 px-4">Kelas Semasa</th>
                  <th className="py-3 px-4">Jantina</th>
                  <th className="py-3 px-4">Jawatan</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Token QR</th>
                  {isAdmin && <th className="py-3 px-4 text-right">Tindakan</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 9 : 8} className="py-8 text-center text-slate-400">
                      Tiada murid ditemui dalam carian atau kriteria ini.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{s.fullName}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{s.studentNumber || s.id}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">{s.className}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${
                          s.gender === 'Lelaki' 
                            ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {s.gender || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={() => {
                              setStudentForRole(s);
                              setRoleModalOpen(true);
                            }}
                            className="group flex items-center gap-1.5 cursor-pointer text-left focus:outline-hidden hover:opacity-80 transition-opacity"
                            title="Klik untuk kemaskini atau pindahkan jawatan murid ini"
                          >
                            {s.role && s.role !== 'Murid' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 group-hover:bg-amber-100 group-hover:border-amber-300 transition-colors">
                                ★ {s.role}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px] group-hover:text-blue-600 group-hover:underline transition-colors">
                                Murid
                              </span>
                            )}
                          </button>
                        ) : (
                          s.role && s.role !== 'Murid' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              ★ {s.role}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Murid</span>
                          )
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          s.active 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-slate-100 text-slate-500 line-through'
                        }`}>
                          {s.active ? 'Aktif' : 'Nyahaktif'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400 truncate max-w-[100px]" title={s.qrTokenHash}>
                        {s.qrTokenHash ? `SHA256: ${s.qrTokenHash.substring(0, 8)}...` : 'Tiada Token'}
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => {
                                setEditingStudent(s);
                                setStudentModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Profil"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => {
                                setStudentForRole(s);
                                setRoleModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Urus & Pindah Jawatan"
                            >
                              <Award className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => {
                                setStudentToTransfer(s);
                                setTransferModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Pindah Kelas"
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleToggleActive(s)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                s.active 
                                  ? 'text-slate-500 hover:text-amber-600 hover:bg-amber-50' 
                                  : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={s.active ? 'Nyahaktifkan Murid' : 'Aktifkan Semula'}
                            >
                              {s.active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </button>

                            <button
                              onClick={() => handleDeleteStudent(s)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Padam Murid Secara Kekal"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <StudentModal
        isOpen={studentModalOpen}
        onClose={() => setStudentModalOpen(false)}
        onSubmit={handleSaveStudent}
        initialData={editingStudent}
        classes={classes}
        isSubmitting={isSavingStudent}
      />

      <TransferClassModal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        student={studentToTransfer}
        classes={classes}
        onTransfer={handleTransfer}
        isSubmitting={isTransferring}
      />

      <TransferRoleModal
        isOpen={roleModalOpen}
        onClose={() => {
          setRoleModalOpen(false);
          setStudentForRole(null);
        }}
        student={studentForRole}
        allStudents={students}
        onUpdateRole={handleUpdateRole}
        onTransferRole={handleTransferRole}
        isSubmitting={isUpdatingRole}
      />

      <ImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        classes={classes}
        existingStudentNumbers={existingStudentNumbers}
        onCommitImport={handleCommitImport}
        isImporting={isImporting}
      />

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
