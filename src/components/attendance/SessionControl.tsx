import React, { useState } from 'react';
import { SessionInfo, SessionType } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Lock, Unlock, Clock, AlertTriangle } from 'lucide-react';
import { getLocalSessionConfig } from '../../services/settingsService';

interface SessionControlProps {
  sessionInfo: SessionInfo;
  onManageSession: (action: 'OPEN' | 'CLOSE' | 'REOPEN', lateAfter: string, reason?: string) => Promise<void>;
  isAdmin: boolean;
  isLoading: boolean;
}

export const SessionControl: React.FC<SessionControlProps> = ({
  sessionInfo,
  onManageSession,
  isAdmin,
  isLoading
}) => {
  const currentConfig = getLocalSessionConfig();
  const defaultMorningThreshold = currentConfig.morningLate || '07:00';
  const defaultThreshold = sessionInfo.type === 'PAGI' ? defaultMorningThreshold : '13:00';

  const [modalOpen, setModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'OPEN' | 'CLOSE' | 'REOPEN'>('CLOSE');
  const [lateAfterTime, setLateAfterTime] = useState(sessionInfo.lateAfter || defaultThreshold);
  const [reason, setReason] = useState('');

  const isOpen = sessionInfo.status === 'OPEN';

  const handleOpenModal = (act: 'OPEN' | 'CLOSE' | 'REOPEN') => {
    setActionType(act);
    setReason('');
    setLateAfterTime(sessionInfo.lateAfter || defaultThreshold);
    setModalOpen(true);
  };

  const handleConfirm = async () => {
    await onManageSession(actionType, lateAfterTime, reason);
    setModalOpen(false);
  };

  return (
    <>
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
          }`}>
            {isOpen ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="font-bold text-slate-900 text-sm">
                Sesi {sessionInfo.type} &bull; {sessionInfo.date}
              </h4>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                isOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
              }`}>
                {isOpen ? 'SESI DIBUKA' : 'SESI DITUTUP'}
              </span>
            </div>
            <div className="flex items-center space-x-3 text-xs text-slate-500 mt-0.5">
              <span className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Ambang Lewat: <strong className="text-slate-700">{sessionInfo.lateAfter || defaultThreshold}</strong></span>
              </span>
              <span>Waktu Sesi: {sessionInfo.startTime || '06:30'} - {sessionInfo.endTime || '08:00'}</span>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center space-x-2">
            {isOpen ? (
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleOpenModal('CLOSE')}
                icon={<Lock className="w-3.5 h-3.5" />}
                isLoading={isLoading}
              >
                Tutup Sesi
              </Button>
            ) : (
              <Button
                variant="success"
                size="sm"
                onClick={() => handleOpenModal('REOPEN')}
                icon={<Unlock className="w-3.5 h-3.5" />}
                isLoading={isLoading}
              >
                Buka Semula Sesi
              </Button>
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={actionType === 'CLOSE' ? 'Tutup Sesi Kehadiran' : 'Buka Semula Sesi Kehadiran'}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
            <div>
              {actionType === 'CLOSE' ? (
                <p>
                  Menutup sesi akan menyebabkan sebarang imbasan kad QR selepas ini <strong>ditolak serta-merta</strong> oleh pelayan backend.
                </p>
              ) : (
                <p>
                  Membuka semula sesi yang telah ditutup memerlukan catatan alasan audit bagi mengekalkan ketelusan rekod sekolah.
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ambang Masa Hadir Lewat (HH:mm)
            </label>
            <input
              type="time"
              value={lateAfterTime}
              onChange={(e) => setLateAfterTime(e.target.value)}
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Imbasan selepas waktu ini akan ditandakan secara automatik sebagai status <strong>LEWAT</strong>.
            </p>
          </div>

          {actionType === 'REOPEN' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sebab Pembukaan Semula (Mandatori) <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                required
                placeholder="Contoh: Perhimpunan rasmi tamat lewat / masalah sambungan rangkaian sekolah."
                className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant={actionType === 'CLOSE' ? 'danger' : 'success'}
              onClick={handleConfirm}
              isLoading={isLoading}
            >
              {actionType === 'CLOSE' ? 'Sahkan Tutup Sesi' : 'Sahkan Buka Semula Sesi'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
