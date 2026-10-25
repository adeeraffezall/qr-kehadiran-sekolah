import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { resetPassword } from '../services/authService';
import { QrCode, Lock, Mail, AlertCircle, CheckCircle2, Loader2, School } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Password Reset state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const schoolName = import.meta.env.VITE_SCHOOL_NAME || 'SK SERI MAKMUR';
  const schoolCode = import.meta.env.VITE_SCHOOL_CODE || 'BBA1234';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Emel atau kata laluan tidak tepat. Sila semak semula.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Terlalu banyak percubaan log masuk gagal. Sila cuba sebentar lagi.');
      } else {
        setError(err.message || 'Ralat log masuk.');
      }
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
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="max-w-md w-full">
        
        {/* School Branding Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white mx-auto shadow-lg shadow-blue-500/20 mb-4">
            <QrCode className="w-9 h-9" />
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
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Log Masuk Guru & Staf</h2>
          <p className="text-xs text-slate-500 mb-6">
            Sila masukkan akaun rasmi sekolah yang telah didaftarkan.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="guru@moe.edu.my"
                  className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
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
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl shadow-md transition-colors flex items-center justify-center space-x-2 text-sm mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengesahkan...</span>
                </>
              ) : (
                <span>Log Masuk</span>
              )}
            </button>
          </form>

          {/* Info footer */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center text-[11px] text-slate-400">
            Murid tidak memerlukan akaun &bull; Dioperasikan oleh Guru & Staf
          </div>
        </div>

      </div>

      {/* Modal Lupa Kata Laluan */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="font-bold text-slate-900 text-base mb-1">Set Semula Kata Laluan</h3>
            <p className="text-xs text-slate-500 mb-4">
              Pautan untuk menetapkan semula kata laluan akan dihantar ke emel akaun anda.
            </p>

            {resetMsg && (
              <div className="mb-4 p-3 bg-blue-50 text-blue-800 text-xs rounded-xl">
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
