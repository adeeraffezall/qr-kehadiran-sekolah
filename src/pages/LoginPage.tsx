import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { resetPassword } from '../services/authService';
import { mockStore } from '../services/mockDataStore';
import { QrCode, Lock, Mail, AlertCircle, Loader2, Sparkles, Shield, UserCheck, RefreshCw, Key } from 'lucide-react';

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

  const { login, loginDemo } = useAuth();
  const navigate = useNavigate();

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
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Emel atau kata laluan tidak tepat. Sila semak semula.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Terlalu banyak percubaan log masuk gagal. Sila cuba sebentar lagi.');
      } else {
        // Fallback demo login jika akaun sepadan
        try {
          if (email.includes('admin')) {
            loginDemo('ADMIN');
            navigate('/');
            return;
          } else if (email.includes('guru') || email.includes('sarah')) {
            loginDemo('TEACHER');
            navigate('/');
            return;
          } else if (email.includes('staf') || email.includes('kamarul')) {
            loginDemo('STAFF');
            navigate('/');
            return;
          }
        } catch {
          // ignore
        }
        setError(err.message || 'Ralat log masuk.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAccount = (role: 'ADMIN' | 'TEACHER' | 'STAFF') => {
    if (role === 'ADMIN') {
      setEmail('admin@skbatandok.edu.my');
      setPassword('Batandok2026!');
    } else if (role === 'TEACHER') {
      setEmail('guru@skbatandok.edu.my');
      setPassword('Batandok2026!');
    } else {
      setEmail('staf@skbatandok.edu.my');
      setPassword('Batandok2026!');
    }
    setError(null);
  };

  const handleQuickDemo = (role: 'ADMIN' | 'TEACHER' | 'STAFF') => {
    loginDemo(role);
    navigate('/');
  };

  const handleResetData = () => {
    if (window.confirm('Set semula semua data murid, kelas dan rekod kehadiran kepada tetapan asal sekolah?')) {
      mockStore.resetToSeed();
      window.location.reload();
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
          <div className="w-20 h-20 mx-auto mb-3 flex items-center justify-center">
            <img 
              src="/logo.png" 
              alt="Lencana SK Batandok Beaufort" 
              className="w-20 h-20 object-contain drop-shadow-md" 
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
          <h2 className="text-lg font-bold text-slate-900 mb-1">Log Masuk Guru & Staf</h2>
          <p className="text-xs text-slate-500 mb-4">
            Pilih peranan di bawah untuk mengisi akaun rasmi secara automatik:
          </p>

          {/* Quick Select Buttons */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            <button
              type="button"
              onClick={() => handleSelectAccount('ADMIN')}
              className={`p-2 rounded-xl text-center border text-xs font-bold transition-all ${
                email === 'admin@skbatandok.edu.my'
                  ? 'bg-red-600 text-white border-red-600 shadow-xs'
                  : 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100'
              }`}
            >
              👑 Pentadbir
            </button>
            <button
              type="button"
              onClick={() => handleSelectAccount('TEACHER')}
              className={`p-2 rounded-xl text-center border text-xs font-bold transition-all ${
                email === 'guru@skbatandok.edu.my'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
              }`}
            >
              📘 Guru
            </button>
            <button
              type="button"
              onClick={() => handleSelectAccount('STAFF')}
              className={`p-2 rounded-xl text-center border text-xs font-bold transition-all ${
                email === 'staf@skbatandok.edu.my'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              📋 Staf
            </button>
          </div>

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
                  placeholder="admin@skbatandok.edu.my"
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

          {/* Quick Direct Demo Access */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">Akses Tanpa Taip Kata Laluan:</span>
            <button
              type="button"
              onClick={() => handleQuickDemo('ADMIN')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center space-x-1"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Masuk Terus (Demo)</span>
            </button>
          </div>

          <div className="mt-4 text-center text-[11px] text-slate-400">
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
