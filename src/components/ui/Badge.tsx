import React from 'react';
import { AttendanceStatus } from '../../types';

interface BadgeProps {
  status: AttendanceStatus | string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  switch (status) {
    case 'HADIR':
      return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
          HADIR
        </span>
      );
    case 'LEWAT':
      return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />
          LEWAT
        </span>
      );
    case 'TIDAK_HADIR':
    case 'TIDAK_HADIR_DISAHKAN':
      return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5" />
          TIDAK HADIR
        </span>
      );
    case 'PULANG':
    case 'TELAH_PULANG':
      return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-1.5" />
          TELAH PULANG
        </span>
      );
    case 'BELUM_PULANG':
      return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 ${className}`} title="Murid hadir sesi pagi tetapi belum merekodkan pulang">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />
          BELUM PULANG
        </span>
      );
    case 'TIADA_REKOD_MASUK':
      return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200 ${className}`} title="Murid tiada rekod masuk sesi pagi">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5" />
          TIADA REKOD MASUK
        </span>
      );
    case 'PULANG_TIADA_MASUK':
      return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300 ${className}`} title="Perhatian: Murid mempunyai rekod pulang tetapi tiada rekod masuk sesi pagi">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mr-1.5" />
          PULANG (TIADA REKOD PAGI)
        </span>
      );
    case 'TIADA_STATUS':
    case 'BELUM_REKOD':
    case 'BELUM_HADIR':
    default:
      return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5" />
          BELUM DIREKOD
        </span>
      );
  }
};
