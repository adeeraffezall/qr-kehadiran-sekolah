import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types';
import { checkIfAdminExists } from '../../services/authService';
import { ShieldAlert, AlertTriangle, KeyRound, Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles 
}) => {
  const { user, profile, role, loading, isDeactivated, bootstrapAdmin } = useAuth();
  const [checkingBootstrap, setCheckingBootstrap] = useState(false);
  const [noAdminExists, setNoAdminExists] = useState(false);
  const [bootstrapLoading, setBootstrapLoading] = useState(false);
  const [bootstrapSuccess, setBootstrapSuccess] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      if (user && !profile) {
        setCheckingBootstrap(true);
        try {
          const exists = await checkIfAdminExists();
          setNoAdminExists(!exists);
        } catch (e) {
          console.error(e);
        } finally {
          setCheckingBootstrap(false);
        }
      }
    }
    checkAdmin();
  }, [user, profile]);

  if (loading || checkingBootstrap) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-600 font-medium">Memuatkan maklumat akaun pengesahan...</p>
      </div>
    );
  }

  // Belum log masuk
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Akaun dinayahaktifkan oleh pentadbir
  if (isDeactivated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-red-200">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Akaun Dinayahaktifkan</h2>
          <p className="text-slate-600 text-sm mb-6">
            Akaun anda telah dinyahaktifkan oleh pihak pentadbir sekolah. Anda tidak lagi mempunyai kebenaran untuk mengakses sistem ini.
          </p>
          <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 font-mono">
            ID Pengguna: {user.uid}
          </div>
        </div>
      </div>
    );
  }

  // Akaun baharu tanpa profil: Semak prosedur First-Admin Bootstrap
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-200">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Penyediaan Akaun Sekolah</h2>
          
          {noAdminExists ? (
            <div>
              <p className="text-slate-600 text-sm mb-6">
                Sistem mengesan bahawa belum ada <strong>Pentadbir (ADMIN)</strong> yang didaftarkan. Anda boleh menginisialisasi sistem ini sekarang dan menjadikan akaun anda sebagai Pentadbir Utama.
              </p>
              <button
                onClick={async () => {
                  setBootstrapLoading(true);
                  try {
                    const ok = await bootstrapAdmin();
                    if (ok) setBootstrapSuccess(true);
                  } catch (err: any) {
                    alert('Ralat bootstrap: ' + err.message);
                  } finally {
                    setBootstrapLoading(false);
                  }
                }}
                disabled={bootstrapLoading}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-md transition-colors flex items-center justify-center space-x-2"
              >
                {bootstrapLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Menetapkan Akaun...</span>
                  </>
                ) : (
                  <span>Lantik Sebagai Pentadbir Utama (ADMIN)</span>
                )}
              </button>
            </div>
          ) : (
            <div>
              <p className="text-slate-600 text-sm mb-6">
                Akaun anda (<span className="font-mono text-slate-800">{user.email}</span>) telah didaftarkan tetapi belum diberikan peranan oleh Pentadbir Sekolah. Sila hubungi Guru Penyelaras / Pentadbir untuk pengaktifan.
              </p>
              <div className="p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs">
                Status: Menunggu kelulusan peranan (Guru / Staf)
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Semak peranan jika dihadkan
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-amber-200">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Akses Tidak Dibenarkan</h2>
          <p className="text-slate-600 text-sm mb-4">
            Anda tidak mempunyai hak akses ke halaman ini. Halaman ini dikhaskan untuk peranan: <span className="font-semibold text-slate-800">{allowedRoles.join(', ')}</span>.
          </p>
          <a
            href="/"
            className="inline-block py-2.5 px-6 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Kembali ke Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
