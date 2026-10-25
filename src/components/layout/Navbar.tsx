import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { LogOut, UserCircle, QrCode, School, Menu } from 'lucide-react';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, profile, role, logout } = useAuth();
  const schoolName = import.meta.env.VITE_SCHOOL_NAME || 'SK SERI MAKMUR';
  const schoolCode = import.meta.env.VITE_SCHOOL_CODE || 'BBA1234';

  const getRoleBadge = (r: string | null) => {
    switch (r) {
      case 'ADMIN':
        return <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-red-200">Pentadbir</span>;
      case 'TEACHER':
        return <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-blue-200">Guru</span>;
      case 'STAFF':
        return <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-emerald-200">Staf</span>;
      default:
        return <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">Tetamu</span>;
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Mobile Menu Toggle */}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-hidden"
              aria-label="Buka Menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-slate-900 text-base sm:text-lg leading-tight">
                    {schoolName}
                  </span>
                  <span className="text-xs bg-slate-100 text-slate-500 font-mono px-1.5 py-0.5 rounded">
                    {schoolCode}
                  </span>
                </div>
                <p className="text-xs text-slate-500 hidden sm:block">Sistem Kehadiran QR Sekolah Rendah</p>
              </div>
            </div>
          </div>

          {/* User info & Logout */}
          {user && (
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex flex-col items-end text-right">
                <div className="flex items-center space-x-1.5">
                  <span className="text-sm font-medium text-slate-800">
                    {profile?.displayName || user.email}
                  </span>
                  {getRoleBadge(role)}
                </div>
                <span className="text-xs text-slate-400 font-mono">{user.email}</span>
              </div>

              <button
                onClick={() => logout()}
                className="flex items-center space-x-1.5 text-sm text-slate-600 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                title="Log Keluar"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          )}

        </div>
      </div>
    </header>
  );
};
