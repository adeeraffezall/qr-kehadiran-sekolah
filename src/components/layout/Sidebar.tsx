import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { 
  LayoutDashboard, 
  QrCode, 
  Users, 
  GraduationCap, 
  ClipboardCheck, 
  FileSpreadsheet, 
  Printer, 
  ShieldCheck, 
  Settings, 
  History,
  X
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { isAdmin, isSchoolStaff } = useAuth();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, allowed: isSchoolStaff },
    { to: '/scan', label: 'Imbas QR', icon: QrCode, allowed: isSchoolStaff, highlight: true },
    { to: '/attendance', label: 'Semakan Kehadiran', icon: ClipboardCheck, allowed: isSchoolStaff },
    { to: '/students', label: 'Pengurusan Murid', icon: Users, allowed: isSchoolStaff },
    { to: '/classes', label: 'Senarai Kelas', icon: GraduationCap, allowed: isSchoolStaff },
    { to: '/reports', label: 'Laporan Bulanan', icon: FileSpreadsheet, allowed: isSchoolStaff },
    { to: '/print-cards', label: 'Cetak Kad QR', icon: Printer, allowed: isAdmin },
    { to: '/users', label: 'Pengurusan Akaun', icon: ShieldCheck, allowed: isAdmin },
    { to: '/settings', label: 'Tetapan & Takwim', icon: Settings, allowed: isAdmin },
    { to: '/audit-logs', label: 'Log Aktiviti', icon: History, allowed: isAdmin }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Drawer */}
      <aside className={`
        fixed top-0 bottom-0 left-0 w-64 bg-slate-900 text-white z-50 transform transition-transform duration-200 ease-in-out
        lg:translate-x-0 lg:static lg:z-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          
          {/* Header Mobile Close */}
          <div className="flex items-center justify-between p-4 border-b border-slate-800 lg:hidden">
            <span className="font-bold text-slate-100">Menu Navigasi</span>
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-white"
              aria-label="Tutup Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems
              .filter(item => item.allowed)
              .map(item => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) => `
                      flex items-center space-x-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all
                      ${isActive 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : item.highlight
                          ? 'bg-blue-950/60 text-blue-300 hover:bg-blue-900 hover:text-white border border-blue-800/40'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
          </nav>

          {/* Footer info */}
          <div className="p-4 border-t border-slate-800 text-xs text-slate-400 text-center">
            <p>Zon Masa: <span className="text-slate-200">Asia/Kuala_Lumpur</span></p>
            <p className="mt-1 text-slate-500">v1.0.0 &bull; SK Rendah Malaysia</p>
          </div>

        </div>
      </aside>
    </>
  );
};
