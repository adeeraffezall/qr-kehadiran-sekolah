import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  XCircle, 
  Volume2, 
  VolumeX, 
  ShieldAlert, 
  X, 
  Scan, 
  QrCode, 
  FlipHorizontal,
  Maximize2
} from 'lucide-react';
import { ScanResult, SessionType } from '../../types';
import { Badge } from '../ui/Badge';

interface QRScannerProps {
  onScan: (token: string) => Promise<ScanResult>;
  currentSession: SessionType;
  isSessionOpen?: boolean;
  sessionReason?: string;
}

export const QRScanner: React.FC<QRScannerProps> = ({ 
  onScan, 
  currentSession,
  isSessionOpen = true,
  sessionReason
}) => {
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'reader-container';
  
  // Frontend suppression timer to prevent spamming duplicate scans
  const lastScannedTokenRef = useRef<string>('');
  const scanCoolDownRef = useRef<number>(0);

  // Audio feedback using Web Audio API
  const playBeep = (type: 'success' | 'duplicate' | 'error') => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
      } else if (type === 'duplicate') {
        osc.frequency.setValueAtTime(450, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } else {
        osc.frequency.setValueAtTime(250, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch {
      // AudioContext unavailable or blocked
    }
  };

  const triggerVibration = (type: 'success' | 'duplicate' | 'error') => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        if (type === 'success') navigator.vibrate([100]);
        else if (type === 'duplicate') navigator.vibrate([80, 50, 80]);
        else navigator.vibrate([250]);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    // Cari kamera yang tersedia pada peranti
    Html5Qrcode.getCameras()
      .then(devices => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Utamakan kamera belakang (back/environment camera) untuk telefon pintar
          const backCam = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('belakang') ||
            d.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          setCameraError('Tiada peranti kamera dikesan pada komputer/telefon anda.');
        }
      })
      .catch(err => {
        console.error('Ralat peranti kamera:', err);
        setCameraError('Kebenaran akses kamera ditolak. Sila benarkan akses kamera dalam tetapan pelayar anda.');
      });

    // Handle Escape key to close fullscreen scanner
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isScanning) {
        stopScanner();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
  }, [isScanning]);

  const handleScanSuccess = async (decodedText: string) => {
    const now = Date.now();
    // Sekatan pengimbasan berulang (Frontend Duplicate Suppression 3 saat)
    if (lastScannedTokenRef.current === decodedText && (now - scanCoolDownRef.current) < 3000) {
      return;
    }

    lastScannedTokenRef.current = decodedText;
    scanCoolDownRef.current = now;

    // Sekiranya sesi disahkan ditutup, tolak serta-merta dengan maklum balas audio/visual
    if (isSessionOpen === false) {
      const deniedMsg = sessionReason || `Sesi ${currentSession} telah ditutup. Imbasan tidak diproses.`;
      setLastResult({
        success: false,
        code: 'SESSION_CLOSED',
        message: deniedMsg
      });
      playBeep('error');
      triggerVibration('error');
      return;
    }

    setIsLoading(true);
    try {
      const res = await onScan(decodedText);
      setLastResult(res);

      if (res.success) {
        playBeep('success');
        triggerVibration('success');
      } else if (res.duplicate) {
        playBeep('duplicate');
        triggerVibration('duplicate');
      } else {
        playBeep('error');
        triggerVibration('error');
      }
    } catch (err: any) {
      setLastResult({
        success: false,
        code: 'SCAN_ERROR',
        message: err.message || 'Ralat semasa memproses imbasan.'
      });
      playBeep('error');
      triggerVibration('error');
    } finally {
      setIsLoading(false);
    }
  };

  const startScanner = async () => {
    if (!selectedCameraId) return;
    setCameraError(null);
    setLastResult(null);

    try {
      const html5QrCode = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        selectedCameraId,
        {
          fps: 15,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0
        },
        handleScanSuccess,
        () => {
          // Frame scanner callback tanpa QR ditemui (abaikan)
        }
      );

      setIsScanning(true);

      // Cuba minta browser fullscreen jika disokong
      try {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } catch {
        // ignore
      }
    } catch (err: any) {
      console.error('Ralat memulakan pengimbas:', err);
      setCameraError('Gagal mengaktifkan kamera. Sila pastikan kebenaran kamera dibenarkan dan tiada aplikasi lain sedang menggunakannya.');
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.error('Ralat menghentikan pengimbas:', err);
      }
    }
    setIsScanning(false);

    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    } catch {
      // ignore
    }
  };

  const handleSwitchCamera = async () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    setSelectedCameraId(nextCamera.id);

    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.start(
          nextCamera.id,
          {
            fps: 15,
            qrbox: { width: 260, height: 260 },
            aspectRatio: 1.0
          },
          handleScanSuccess,
          () => {}
        );
      } catch (err) {
        console.error('Ralat menukar kamera:', err);
      }
    }
  };

  return (
    <div className="w-full">

      {/* =========================================================================
          MOD 1: BILA KAMERA SEDANG AKTIF (FULLSCREEN OVERLAY VIEWPORT & KOTAK SCAN)
          ========================================================================= */}
      <div 
        className={
          isScanning 
            ? "fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden select-none"
            : "w-full bg-slate-900 rounded-3xl overflow-hidden shadow-lg border-2 border-slate-800 relative aspect-square max-h-[380px]"
        }
      >
        {/* Kontena Video Asal Html5Qrcode */}
        <div id={scannerContainerId} className="w-full h-full absolute inset-0" />

        {isScanning ? (
          <>
            {/* 1. Bar Header Atas Skrin Penuh */}
            <div className="relative z-20 flex items-center justify-between p-4 pt-6 bg-gradient-to-b from-black/85 via-black/40 to-transparent">
              {/* Butang Tutup / Keluar Skrin Penuh */}
              <button
                type="button"
                onClick={stopScanner}
                className="flex items-center space-x-1.5 px-3 py-2 bg-white/15 hover:bg-white/25 active:scale-95 text-white rounded-xl backdrop-blur-md transition-all text-xs font-bold border border-white/20 shadow-lg"
              >
                <X className="w-4 h-4" />
                <span>Tutup</span>
              </button>

              {/* Lencana Sesi Kehadiran Dinamik */}
              <div className={`px-3.5 py-1 backdrop-blur-md text-white text-xs font-extrabold rounded-full border shadow-lg tracking-wide uppercase flex items-center space-x-1 ${
                isSessionOpen
                  ? (currentSession === 'PULANG' ? 'bg-indigo-600/90 border-indigo-400/40' : 'bg-blue-600/90 border-blue-400/40')
                  : 'bg-red-600/90 border-red-400/40'
              }`}>
                <span className={`w-2 h-2 rounded-full inline-block mr-1 ${
                  isSessionOpen ? 'bg-emerald-400 animate-pulse' : 'bg-red-300'
                }`}></span>
                <span>{isSessionOpen ? `SESI AKTIF: ${currentSession}` : `SESI DITUTUP (${currentSession})`}</span>
              </div>

              {/* Kawalan Kamera & Bunyi */}
              <div className="flex items-center space-x-2">
                {cameras.length > 1 && (
                  <button
                    type="button"
                    onClick={handleSwitchCamera}
                    className="p-2 bg-white/15 hover:bg-white/25 active:scale-95 text-white rounded-xl backdrop-blur-md transition-all border border-white/20 shadow-lg"
                    title="Tukar Kamera Depan/Belakang"
                  >
                    <FlipHorizontal className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSoundEnabled(prev => !prev)}
                  className="p-2 bg-white/15 hover:bg-white/25 active:scale-95 text-white rounded-xl backdrop-blur-md transition-all border border-white/20 shadow-lg"
                  title={soundEnabled ? 'Bunyi Aktif' : 'Bunyi Senyap'}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-white/50" />}
                </button>
              </div>
            </div>

            {/* 2. Kotak Sasaran QR (Viewfinder Frame & Animasi Laser) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4 z-10">
              <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.52)] border-2 border-white/20 flex items-center justify-center overflow-hidden">
                {/* 4 Penjuru Cyan Berkualiti Tinggi */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-cyan-400 rounded-tl-2xl shadow-[0_0_10px_#22d3ee]"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-cyan-400 rounded-tr-2xl shadow-[0_0_10px_#22d3ee]"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-cyan-400 rounded-bl-2xl shadow-[0_0_10px_#22d3ee]"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-cyan-400 rounded-br-2xl shadow-[0_0_10px_#22d3ee]"></div>

                {/* Garisan Laser Imbasan Bergerak */}
                <div className="animate-scanner-laser left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee]"></div>

                {/* Ikon QR Samar di Tengah Kotak */}
                <div className="opacity-10">
                  <QrCode className="w-28 h-28 text-white" />
                </div>
              </div>

              {/* Panduan Teks Di Bawah Kotak */}
              <div className={`mt-5 px-4 py-1.5 backdrop-blur-md rounded-full border text-xs font-medium tracking-wide flex items-center space-x-1.5 shadow-lg ${
                isSessionOpen 
                  ? 'bg-black/60 border-white/15 text-white/90' 
                  : 'bg-red-950/80 border-red-500/50 text-red-200'
              }`}>
                <Scan className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isSessionOpen ? 'Halakan kotak sasaran ke Kod QR Murid' : 'Sesi ditutup — Imbasan baharu disekat'}</span>
              </div>
            </div>

            {/* 3. Bahagian Bawah Skrin: Kad Hasil Imbasan Terapung & Butang Keluar */}
            <div className="relative z-20 p-4 pb-8 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
              {lastResult && (
                <div className={`w-full max-w-md mx-auto p-4 rounded-2xl border backdrop-blur-lg shadow-2xl transition-all mb-3 animate-in fade-in slide-in-from-bottom-3 duration-300 ${
                  lastResult.success 
                    ? 'bg-emerald-950/90 border-emerald-500/50 text-white' 
                    : lastResult.duplicate
                      ? 'bg-amber-950/90 border-amber-500/50 text-white'
                      : 'bg-red-950/90 border-red-500/50 text-white'
                }`}>
                  <div className="flex items-start space-x-3">
                    {lastResult.success ? (
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center flex-shrink-0 text-emerald-400">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                    ) : lastResult.duplicate ? (
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center flex-shrink-0 text-amber-400">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-400/30 flex items-center justify-center flex-shrink-0 text-red-400">
                        <XCircle className="w-6 h-6" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-extrabold text-base leading-tight truncate">
                          {lastResult.student ? lastResult.student.fullName : 'Imbasan Ditolak'}
                        </h4>
                        {lastResult.status && <Badge status={lastResult.status} />}
                      </div>

                      {lastResult.student && (
                        <div className="flex items-center space-x-2 mt-1 text-xs text-white/80">
                          <span className="font-semibold px-2 py-0.5 bg-white/10 rounded-md">
                            {lastResult.student.className}
                          </span>
                          {lastResult.student.studentNumber && (
                            <span className="font-mono text-white/60">
                              {lastResult.student.studentNumber}
                            </span>
                          )}
                          {lastResult.time && (
                            <span className="font-mono text-cyan-300 ml-auto font-bold">
                              {lastResult.time}
                            </span>
                          )}
                        </div>
                      )}

                      <p className={`mt-1.5 text-xs font-medium ${
                        lastResult.success ? 'text-emerald-200' : lastResult.duplicate ? 'text-amber-200' : 'text-red-200'
                      }`}>
                        {lastResult.message}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={stopScanner}
                  className="px-6 py-2.5 bg-white/15 hover:bg-white/25 active:scale-95 text-white/90 rounded-full text-xs font-semibold backdrop-blur-md border border-white/20 flex items-center space-x-1.5 shadow-lg transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Selesai & Keluar Skrin Penuh</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Paparan Bila Kamera Tidak Aktif (Placeholder Preview) */
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 mb-3 border border-slate-700">
              <Camera className="w-8 h-8" />
            </div>
            <p className="text-sm font-bold text-slate-300">Kamera Sedang Dimatikan</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Tekan butang biru di bawah untuk membuka kamera skrin penuh bersama kotak sasaran QR.
            </p>
          </div>
        )}

        {/* Loading overlay semasa memproses backend */}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center text-white z-30">
            <RefreshCw className="w-9 h-9 animate-spin text-cyan-400 mb-2" />
            <p className="text-sm font-bold tracking-wide">Mengesahkan Kehadiran Murid...</p>
          </div>
        )}
      </div>


      {/* =========================================================================
          MOD 2: PANEL KAWALAN DI LUAR (PILIHAN KAMERA & BUTANG MULA MENGIMBAS)
          ========================================================================= */}
      <div className="mt-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        
        {/* Ralat Kamera */}
        {cameraError && (
          <div className="w-full p-4 mb-4 bg-red-50 border border-red-200 rounded-2xl flex items-start space-x-3 text-red-700 text-sm">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
            <div>
              <p className="font-semibold">Masalah Akses Kamera</p>
              <p className="text-xs text-red-600 mt-0.5">{cameraError}</p>
            </div>
          </div>
        )}

        {/* Pilihan Kamera Jika Lebih Daripada 1 */}
        {cameras.length > 1 && (
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Pilih Kamera Peranti:
            </label>
            <select
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              disabled={isScanning}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            >
              {cameras.map(cam => (
                <option key={cam.id} value={cam.id}>
                  {cam.label || `Kamera (${cam.id})`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Butang Utama Mula Mengimbas (Skrin Penuh) */}
        {!isScanning ? (
          <button
            type="button"
            onClick={startScanner}
            disabled={!selectedCameraId}
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center space-x-2 text-sm sm:text-base"
          >
            <Maximize2 className="w-5 h-5" />
            <span>Mula Mengimbas (Buka Skrin Penuh)</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={stopScanner}
            className="w-full py-3.5 px-4 bg-slate-800 hover:bg-slate-900 active:scale-[0.99] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 text-sm sm:text-base"
          >
            <XCircle className="w-5 h-5" />
            <span>Hentikan Kamera</span>
          </button>
        )}

        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => setSoundEnabled(prev => !prev)}
              className="p-1 rounded-md hover:bg-slate-100 text-slate-600 flex items-center space-x-1"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-blue-600" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
              <span>{soundEnabled ? 'Bunyi Aktif' : 'Bunyi Senyap'}</span>
            </button>
          </div>
          <span className="font-mono text-[11px] text-slate-400">
            {cameras.length} kamera dikesan
          </span>
        </div>
      </div>

      {/* Maklumat Imbasan Terakhir (Bila di luar skrin penuh) */}
      {!isScanning && lastResult && (
        <div className={`w-full mt-4 p-4 rounded-2xl border transition-all ${
          lastResult.success 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
            : lastResult.duplicate
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-red-50 border-red-300 text-red-900'
        }`}>
          <div className="flex items-start space-x-3">
            {lastResult.success ? (
              <CheckCircle2 className="w-7 h-7 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : lastResult.duplicate ? (
              <AlertCircle className="w-7 h-7 text-amber-600 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-7 h-7 text-red-600 flex-shrink-0 mt-0.5" />
            )}

            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-base leading-tight">
                  {lastResult.student ? lastResult.student.fullName : 'Pengesahan Gagal'}
                </h4>
                {lastResult.status && <Badge status={lastResult.status} />}
              </div>

              {lastResult.student && (
                <div className="mt-1 text-xs space-y-0.5 opacity-90">
                  <p>Kelas: <span className="font-semibold">{lastResult.student.className}</span></p>
                  {lastResult.student.studentNumber && (
                    <p>No. Murid: <span className="font-mono">{lastResult.student.studentNumber}</span></p>
                  )}
                </div>
              )}

              <p className="mt-2 text-xs font-medium">
                {lastResult.message}
              </p>
              
              {lastResult.time && (
                <p className="text-[11px] opacity-75 mt-1 font-mono">
                  Waktu Disahkan: {lastResult.time} (Waktu Malaysia)
                </p>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
