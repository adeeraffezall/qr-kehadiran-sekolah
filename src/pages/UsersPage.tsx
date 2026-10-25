import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getAllUsers, updateUserRole, toggleUserActive } from '../services/authService';
import { UserProfile, UserRole } from '../types';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { ShieldCheck, UserCheck, UserX, Edit3, Loader2, KeyRound } from 'lucide-react';

export const UsersPage: React.FC = () => {
  const { user, profile, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Role Modal
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>('TEACHER');
  const [roleReason, setRoleReason] = useState('');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const list = await getAllUsers();
      setUsers(list);
    } catch (err) {
      console.error('Ralat senarai pengguna:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleOpenEditRole = (u: UserProfile) => {
    setSelectedUser(u);
    setSelectedRole(u.role);
    setRoleReason('');
    setError(null);
    setRoleModalOpen(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedUser) return;
    if (!roleReason.trim() || roleReason.trim().length < 3) {
      setError('Sila berikan catatan sebab perubahan peranan (minimum 3 aksara).');
      return;
    }

    setIsUpdatingRole(true);
    try {
      await updateUserRole(
        user.uid,
        user.email || '',
        selectedUser.uid,
        selectedRole,
        roleReason.trim()
      );
      setRoleModalOpen(false);
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Ralat mengemaskini peranan.');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleToggleActive = async (u: UserProfile) => {
    if (!user) return;
    if (u.uid === user.uid) {
      alert('Anda tidak boleh menyahaktifkan akaun anda sendiri!');
      return;
    }

    const action = u.active ? 'menyahaktifkan' : 'mengaktifkan semula';
    const reason = prompt(`Sila nyatakan sebab ${action} akaun ${u.displayName}:`);
    if (reason === null) return;
    if (reason.trim().length < 3) {
      alert('Sebab wajib diisi sekurang-kurangnya 3 aksara.');
      return;
    }

    try {
      await toggleUserActive(
        user.uid,
        user.email || '',
        u.uid,
        !u.active,
        reason.trim()
      );
      await loadUsers();
    } catch (err: any) {
      alert('Ralat: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Pengurusan Akaun Guru & Staf</h2>
        <p className="text-xs text-slate-500">
          Kawalan hak akses peranan (Pentadbir, Guru, Staf) dan status keaktifan akaun sekolah.
        </p>
      </div>

      {/* Users Table */}
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
                  <th className="py-3 px-4">Nama Pengguna</th>
                  <th className="py-3 px-4">Alamat Emel</th>
                  <th className="py-3 px-4">Peranan Semasa</th>
                  <th className="py-3 px-4">Status Akaun</th>
                  <th className="py-3 px-4 text-right">Tindakan Pentadbir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Tiada akaun pengguna ditemui.
                    </td>
                  </tr>
                ) : (
                  users.map(u => (
                    <tr key={u.uid} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {u.displayName || 'Pengguna'}
                        {u.uid === user?.uid && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-800 font-semibold">
                            (Akaun Anda)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{u.email}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-xs ${
                          u.role === 'ADMIN'
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : u.role === 'TEACHER'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {u.role === 'ADMIN' ? 'Pentadbir (Admin)' : u.role === 'TEACHER' ? 'Guru' : 'Staf'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded-full font-semibold text-[11px] ${
                          u.active 
                            ? 'bg-emerald-50 text-emerald-700' 
                            : 'bg-red-50 text-red-700 line-through'
                        }`}>
                          {u.active ? 'Aktif' : 'Dinayahaktifkan'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleOpenEditRole(u)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Tukar Peranan"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {u.uid !== user?.uid && (
                            <button
                              onClick={() => handleToggleActive(u)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                u.active 
                                  ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' 
                                  : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={u.active ? 'Nyahaktifkan Akaun' : 'Aktifkan Semula Akaun'}
                            >
                              {u.active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Tukar Peranan */}
      {selectedUser && (
        <Modal
          isOpen={roleModalOpen}
          onClose={() => setRoleModalOpen(false)}
          title="Tukar Peranan Pengguna"
          maxWidth="md"
        >
          <form onSubmit={handleSaveRole} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {error}
              </div>
            )}

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <p><span className="text-slate-500">Nama:</span> <strong>{selectedUser.displayName}</strong></p>
              <p><span className="text-slate-500">Emel:</span> <span className="font-mono">{selectedUser.email}</span></p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pilih Peranan Baharu <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white"
              >
                <option value="TEACHER">Guru (Boleh Mengimbas & Melihat Kehadiran)</option>
                <option value="STAFF">Staf (Boleh Mengimbas Sesi)</option>
                <option value="ADMIN">Pentadbir (Akses Penuh Semua Tetapan)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Catatan Sebab Perubahan (Mandatori) <span className="text-red-500">*</span>
              </label>
              <textarea
                value={roleReason}
                onChange={(e) => setRoleReason(e.target.value)}
                rows={2}
                required
                placeholder="Contoh: Dilantik sebagai Guru Bertugas Mingguan / Guru Penyelaras ICT."
                className="w-full text-sm p-3 rounded-xl border border-slate-200"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setRoleModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="primary" isLoading={isUpdatingRole}>
                Simpan Perubahan
              </Button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
};
