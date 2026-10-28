import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share, PlusSquare, Check } from 'lucide-react';

const DISMISS_STORAGE_KEY = 'SKB_PWA_DISMISSED_UNTIL';
const COOLDOWN_DAYS = 14; // Jangan tanya semula selama 14 hari sekiranya pengguna tekan tutup

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // 1. Semak sama ada aplikasi sudah berjalan dalam mod PWA Standalone (Sudah dipasang)
    const inStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;
    
    if (inStandalone) {
      setIsStandalone(true);
      return; // Sekiranya sudah dipasang, JANGAN paparkan apa-apa prompt
    }

    // 2. Semak jika pengguna pernah menekan 'Tutup' / 'Nanti Dulu' dalam tempoh 14 hari
    try {
      const dismissedUntil = localStorage.getItem(DISMISS_STORAGE_KEY);
      if (dismissedUntil && Date.now() < Number(dismissedUntil)) {
        setDismissed(true);
        return;
      }
    } catch {
      // Abaikan jika localStorage tidak dapat diakses
    }

    // 3. Semak jenis peranti (iOS vs Android/Desktop)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleDevice);

    // 4. Tangkap acara `beforeinstallprompt` untuk Android / Chrome
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    // 5. Kesan apabila aplikasi telah berjaya dipasang oleh pengguna
    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDismissed(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Jika sudah dipasang (standalone) atau pengguna telah tutup banner
  if (isStandalone || dismissed) {
    return null;
  }

  // Jika tiada prompt Android dan bukan iOS
  if (!deferredPrompt && !isIOS) {
    return null;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
        setDismissed(true);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      // Simpan masa tamat bertenang (14 hari daripada sekarang)
      const expiry = Date.now() + (COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
      localStorage.setItem(DISMISS_STORAGE_KEY, String(expiry));
    } catch {
      // Abaikan
    }
  };

  return (
    <>
      {/* Banner Peringatan Pasang Aplikasi di Bahagian Bawah Skrin */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-3.5 rounded-2xl shadow-2xl border border-blue-400/30 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center flex-shrink-0 text-white border border-white/20">
            <Smartphone className="w-5 h-5 text-cyan-300" />
          </div>

          <div className="flex-1 min-w-0 pr-1">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-sm leading-tight text-white flex items-center gap-1.5">
                <span>Pasang Aplikasi HadirSKB</span>
              </h4>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-white/60 hover:text-white p-1 rounded-lg transition-colors"
                title="Tutup banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-blue-100 mt-0.5 leading-snug">
              Pasang terus ke skrin utama telefon anda untuk capaian pantas tanpa buka pelayar web.
            </p>

            <div className="mt-2.5 flex items-center space-x-2">
              <button
                type="button"
                onClick={handleInstallClick}
                className="px-3.5 py-1.5 bg-white text-blue-800 hover:bg-blue-50 active:scale-95 text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5 text-blue-700" />
                <span>{isIOS ? 'Cara Pasang (iOS)' : 'Pasang Sekarang'}</span>
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="px-2.5 py-1.5 text-white/80 hover:text-white text-xs font-medium transition-colors"
              >
                Nanti Dulu
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Panduan Pemasangan Khas Untuk Pengguna iPhone / iPad (Safari) */}
      {showIOSModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-slate-800 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center mb-4">
              <Smartphone className="w-6 h-6" />
            </div>

            <h3 className="font-bold text-base text-slate-900 mb-2">
              Cara Pasang di iPhone / iPad
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Apple Safari membenarkan pemasangan aplikasi terus ke skrin utama dengan 2 langkah mudah:
            </p>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-start space-x-3">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                  1
                </span>
                <p className="text-slate-700">
                  Tekan butang <strong className="text-blue-700">Kongsi (Share)</strong> <Share className="w-4 h-4 inline-block text-blue-600 mx-1" /> pada bar menu bawah Safari.
                </p>
              </div>

              <div className="flex items-start space-x-3">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                  2
                </span>
                <p className="text-slate-700">
                  Tatal ke bawah dan pilih <strong className="text-blue-700">"Tambah ke Skrin Utama" (Add to Home Screen)</strong> <PlusSquare className="w-4 h-4 inline-block text-blue-600 mx-1" />.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Faham & Tutup</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
