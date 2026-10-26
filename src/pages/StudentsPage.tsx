import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  getStudents, 
  addStudent, 
  updateStudent, 
  deleteStudent,
  transferStudentClass, 
  toggleStudentActive,
  ImportRow
} from '../services/studentService';
import { getClasses } from '../services/classService';
import { Student, ClassItem } from '../types';
import { StudentModal } from '../components/students/StudentModal';
import { TransferClassModal } from '../components/students/TransferClassModal';
import { ImportModal } from '../components/students/ImportModal';
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
  QrCode 
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

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sList, cList] = await Promise.all([
        getStudents(classFilter === 'ALL' ? undefined : classFilter, false),
        getClasses()
      ]);

      const classMap = new Map<string, string>();
      cList.forEach(c => classMap.set(c.id, c.name));

      const enriched = sList.map(s => ({
        ...s,
        className: classMap.get(s.classId) || 'Kelas Tidak Ditemui'
      }));

      setStudents(enriched);
      setClasses(cList);
    } catch (err) {
      console.error('Ralat senarai murid:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [classFilter]);

  // Handle Add / Edit Student
  const handleSaveStudent = async (data: { fullName: string; studentNumber: string; classId: string }) => {
    if (!user) return;
    setIsSavingStudent(true);
    try {
      if (editingStudent) {
        await updateStudent(user.uid, user.email || '', editingStudent.id, {
          fullName: data.fullName,
          studentNumber: data.studentNumber,
          classId: data.classId
        });
      } else {
        await addStudent(user.uid, user.email || '', data);
      }
      await loadData();
    } finally {
      setIsSavingStudent(false);
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
                  <th className="py-3 px-4">No. Murid</th>
                  <th className="py-3 px-4">Kelas Semasa</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Token QR</th>
                  {isAdmin && <th className="py-3 px-4 text-right">Tindakan</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="py-8 text-center text-slate-400">
                      Tiada murid ditemui dalam carian atau kriteria ini.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{s.fullName}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{s.studentNumber || '-'}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-blue-700">{s.className}</span>
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
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400 truncate max-w-[120px]" title={s.qrTokenHash}>
                        {s.qrTokenHash ? `SHA256: ${s.qrTokenHash.substring(0, 10)}...` : 'Tiada Token'}
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
                                setStudentToTransfer(s);
                                setTransferModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
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

      <ImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        classes={classes}
        existingStudentNumbers={existingStudentNumbers}
        onCommitImport={handleCommitImport}
        isImporting={isImporting}
      />

    </div>
  );
};
