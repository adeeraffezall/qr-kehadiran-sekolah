import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CheckCircle2, AlertCircle, RefreshCw, XCircle, Volume2, VolumeX, ShieldAlert } from 'lucide-react';
import { ScanResult, SessionType } from '../../types';
import { Badge } from '../ui/Badge';

interface QRScannerProps {
  onScan: (token: string) => Promise<ScanResult>;
  currentSession: SessionType;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, currentSession }) => {
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
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
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

  useEffect(() => {
    // Cari kamera yang tersedia pada peranti
    Html5Qrcode.getCameras()
      .then(devices => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Utamakan kamera belakang (back/environment camera) untuk telefon pintar
          const backCam = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          setCameraError('Tiada peranti kamera dikesan pada komputer/telefon anda.');
        }
      })
      .catch(err => {
        console.error('Ralat peranti kamera:', err);
        setCameraError('Kebenaran akses kamera ditolak. Sila benarkan akses kamera dalam tetapan pelayar anda.');
      });

    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
  }, []);

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
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        async (decodedText) => {
          const now = Date.now();
          // Sekatan pengimbasan berulang (Frontend Duplicate Suppression 3 saat)
          if (lastScannedTokenRef.current === decodedText && (now - scanCoolDownRef.current) < 3000) {
            return;
          }

          lastScannedTokenRef.current = decodedText;
          scanCoolDownRef.current = now;

          setIsLoading(true);
          try {
            const res = await onScan(decodedText);
            setLastResult(res);

            if (res.success) {
              playBeep('success');
            } else if (res.duplicate) {
              playBeep('duplicate');
            } else {
              playBeep('error');
            }
          } catch (err: any) {
            setLastResult({
              success: false,
              code: 'SCAN_ERROR',
              message: err.message || 'Ralat semasa memproses imbasan.'
            });
            playBeep('error');
          } finally {
            setIsLoading(false);
          }
        },
        () => {
          // Frame scanner callback tanpa QR ditemui (abaikan)
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Ralat memulakan pengimbas:', err);
      setCameraError('Gagal mengaktifkan kamera. Sila pastikan tiada aplikasi lain yang sedang menggunakan kamera.');
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
        setIsScanning(false);
      } catch (err) {
        console.error('Ralat menghentikan pengimbas:', err);
      }
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-xl mx-auto">
      
      {/* Kawalan Pengimbas & Pilihan Kamera */}
      <div className="w-full bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-slate-800 text-sm">Pengimbas QR Kehadiran</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(prev => !prev)}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
              title={soundEnabled ? 'Bunyi Aktif' : 'Bunyi Senyap'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-blue-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>

            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200">
              SESI {currentSession}
            </span>
          </div>
        </div>

        {cameras.length > 1 && (
          <div className="mb-3">
            <label className="block text-xs font-medium text-slate-600 mb-1">Pilih Kamera:</label>
            <select
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              disabled={isScanning}
              className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            >
              {cameras.map(cam => (
                <option key={cam.id} value={cam.id}>{cam.label || `Kamera ${cam.id}`}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center space-x-2">
          {!isScanning ? (
            <button
              onClick={startScanner}
              disabled={!selectedCameraId}
              className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 text-sm"
            >
              <Camera className="w-4 h-4" />
              <span>Mula Mengimbas</span>
            </button>
          ) : (
            <button
              onClick={stopScanner}
              className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 text-sm"
            >
              <XCircle className="w-4 h-4" />
              <span>Hentikan Kamera</span>
            </button>
          )}
        </div>
      </div>

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

      {/* Viewport Kamera Html5Qrcode */}
      <div className="w-full bg-slate-900 rounded-3xl overflow-hidden shadow-lg border-2 border-slate-800 relative aspect-square max-h-[380px]">
        <div id={scannerContainerId} className="w-full h-full" />
        
        {!isScanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
            <Camera className="w-12 h-12 mb-2 text-slate-600" />
            <p className="text-sm font-medium">Kamera Sedang Dimatikan</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              Tekan butang "Mula Mengimbas" di atas untuk memulakan pengimbasan kad QR murid.
            </p>
          </div>
        )}

        {/* Loading overlay semasa memproses backend */}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-400 mb-2" />
            <p className="text-sm font-semibold">Mengesahkan Kehadiran...</p>
          </div>
        )}
      </div>

      {/* Paparan Maklumat Keputusan Imbasan */}
      {lastResult && (
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
