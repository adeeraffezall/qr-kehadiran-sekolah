import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { resetPassword } from '../services/authService';
import { Lock, Mail, AlertCircle, Loader2, Eye, EyeOff, ShieldCheck, Clock } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Password Reset state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const { user, login, sessionExpiredMessage, clearExpiredMessage } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const schoolName = import.meta.env.VITE_SCHOOL_NAME || 'SK BATANDOK BEAUFORT';
  const schoolCode = import.meta.env.VITE_SCHOOL_CODE || 'XBA6003';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Emel atau kata laluan tidak tepat. Sila semak semula.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setResetLoading(true);
    setResetMsg(null);

    try {
      await resetPassword(resetEmail);
      setResetMsg('Pautan penetapan semula kata laluan telah dihantar ke emel anda.');
    } catch (err: any) {
      setResetMsg('Gagal menghantar emel: ' + (err.message || 'Sila pastikan emel sah.'));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 py-8">
      <div className="max-w-md w-full">
        
        {/* School Branding Header */}
        <div className="text-center mb-6">
          <div className="w-24 h-24 mx-auto mb-3 flex items-center justify-center">
            <img 
              src="/logo.png?v=20261026b" 
              alt="Lencana SK Batandok Beaufort" 
              className="w-24 h-24 object-contain drop-shadow-md" 
            />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {schoolName}
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">Kod Sekolah: {schoolCode}</p>
          <div className="inline-block mt-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-blue-800 text-xs font-semibold">
            Sistem Kehadiran QR Bersepadu
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 p-6 sm:p-8">
          <div className="flex items-center space-x-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Log Masuk Pengguna</h2>
          </div>
          <p className="text-xs text-slate-500 mb-5">
            Sila masukkan alamat emel rasmi dan kata laluan anda untuk mengakses sistem.
          </p>

          {sessionExpiredMessage && (
            <div className="mb-4 p-3.5 bg-amber-50 border border-amber-300 text-amber-950 text-xs rounded-xl flex items-start space-x-2.5 animate-in fade-in duration-200">
              <Clock className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
              <div>
                <strong className="block font-bold">Sesi Tamat Tempoh</strong>
                <span>{sessionExpiredMessage}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start space-x-2 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Emel Rasmi
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cth: admin@sigoo.my"
                  className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Kata Laluan
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setResetModalOpen(true);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Lupa kata laluan?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata laluan"
                  className="w-full text-sm pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-md focus:outline-hidden"
                  tabIndex={-1}
                  aria-label={showPassword ? "Sembunyikan kata laluan" : "Tunjukkan kata laluan"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] disabled:bg-blue-400 text-white font-semibold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 text-sm mt-3"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengesahkan Maklumat...</span>
                </>
              ) : (
                <span>Log Masuk</span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center text-[11px] text-slate-400">
            Akses dikhaskan untuk PK HEM, Guru & Staf Sekolah Sahaja.
          </div>
        </div>

      </div>

      {/* Modal Lupa Kata Laluan */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="font-bold text-slate-900 text-base mb-1">Set Semula Kata Laluan</h3>
            <p className="text-xs text-slate-500 mb-4">
              Pautan untuk menetapkan semula kata laluan akan dihantar ke emel akaun anda.
            </p>

            {resetMsg && (
              <div className="mb-4 p-3 bg-blue-50 text-blue-800 text-xs rounded-xl font-medium">
                {resetMsg}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3">
              <input
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="Masukkan emel anda"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200"
              />
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  {resetLoading ? 'Menghantar...' : 'Hantar Pautan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
