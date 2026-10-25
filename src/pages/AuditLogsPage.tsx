import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getAuditLogs } from '../services/auditService';
import { formatDisplayTime } from '../utils/dateUtils';
import { AuditLog } from '../types';
import { Card } from '../components/ui/Card';
import { History, Filter, Search, Shield, Loader2 } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await getAuditLogs(100, entityFilter);
      setLogs(data);
    } catch (err) {
      console.error('Ralat log aktiviti:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [entityFilter]);

  const filteredLogs = logs.filter(l => {
    const term = searchTerm.toLowerCase();
    const actionMatch = l.action.toLowerCase().includes(term);
    const emailMatch = l.actorEmail?.toLowerCase().includes(term) || false;
    const reasonMatch = l.reason?.toLowerCase().includes(term) || false;
    const entityIdMatch = l.entityId?.toLowerCase().includes(term) || false;
    return actionMatch || emailMatch || reasonMatch || entityIdMatch;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Jejak Audit & Log Aktiviti Rasmi</h2>
        <p className="text-xs text-slate-500">
          Rekod kekal transaksi keselamatan: pembetulan kehadiran, pembatalan kad QR, pertukaran peranan dan kawalan sesi.
        </p>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari tindakan, emel pegawai, atau sebab..."
            className="w-full text-xs pl-9 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 shadow-xs"
        >
          <option value="ALL">Semua Kategori Entiti</option>
          <option value="ATTENDANCE">Kehadiran (Pembetulan)</option>
          <option value="QR">Kad QR (Batal & Jana)</option>
          <option value="SESSION">Sesi (Buka / Tutup)</option>
          <option value="USER">Pengguna & Peranan</option>
          <option value="STUDENT">Murid & Pindah Kelas</option>
          <option value="SETTINGS">Tetapan & Takwim</option>
        </select>
      </div>

      {/* Audit Log Table */}
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
                  <th className="py-3 px-4">Masa Transaksi</th>
                  <th className="py-3 px-4">Tindakan</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Pegawai (Pelaku)</th>
                  <th className="py-3 px-4">ID Entiti</th>
                  <th className="py-3 px-4">Catatan Sebab Rasmi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Tiada log aktiviti ditemui.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, idx) => (
                    <tr key={log.id || idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                        {formatDisplayTime(log.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-mono">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-blue-700 text-[11px]">
                          {log.entityType}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-slate-700 font-medium">
                          {log.actorEmail || log.actorUid}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400 truncate max-w-[120px]" title={log.entityId}>
                        {log.entityId}
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-xs">
                        {log.reason ? (
                          <span className="italic" title={log.reason}>
                            "{log.reason}"
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
