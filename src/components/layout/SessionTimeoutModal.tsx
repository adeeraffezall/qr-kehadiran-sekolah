import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, ShieldAlert, LogOut, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';

interface SessionTimeoutModalProps {
  isOpen: boolean;
  remainingMs: number;
  onExtend: () => void;
  onLogout: () => void;
}

export const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({
  isOpen,
  remainingMs,
  onExtend,
  onLogout
}) => {
  if (!isOpen) return null;

  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-timeout-title"
        className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-200 text-center space-y-4"
      >
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <Clock className="w-8 h-8 animate-pulse text-amber-600" />
        </div>

        <div>
          <h3 id="session-timeout-title" className="text-xl font-black text-slate-900">
            Amaran Had Masa Sesi
          </h3>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
            Tiada aktiviti dikesan selama 28 minit. Untuk keselamatan rekod murid, sesi anda akan ditamatkan secara automatik dalam:
          </p>
        </div>

        {/* Paparan Kiraan Detik (Countdown Timer) */}
        <div className="py-3 px-6 bg-amber-50 border border-amber-200 rounded-2xl inline-block mx-auto">
          <div className="text-3xl font-black font-mono tracking-wider text-amber-700">
            {formattedTime}
          </div>
          <span className="text-[11px] text-amber-800 font-medium">Minit : Saat</span>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs text-slate-600 space-y-1">
          <div className="flex items-center space-x-2 font-semibold text-slate-800">
            <ShieldAlert className="w-4 h-4 text-blue-600" />
            <span>Polisi Keselamatan SK Batandok:</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Sesi log masuk tamat selepas 30 minit ketidakaktifan bagi mengelakkan akses tanpa kebenaran pada peranti yang dikongsi.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="md"
            className="w-full sm:w-auto flex-1 text-slate-700 hover:text-red-700 hover:bg-red-50 hover:border-red-200"
            onClick={onLogout}
            icon={<LogOut className="w-4 h-4" />}
          >
            Log Keluar Sekarang
          </Button>

          <Button
            variant="primary"
            size="md"
            className="w-full sm:w-auto flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md shadow-amber-600/20"
            onClick={onExtend}
            icon={<CheckCircle2 className="w-4 h-4" />}
          >
            Kekalkan Sesi
          </Button>
        </div>
      </div>
    </div>
  );
};
