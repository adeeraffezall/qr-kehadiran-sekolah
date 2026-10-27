import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../hooks/useAuth';
import { SessionTimeoutModal } from './SessionTimeoutModal';

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isWarningModalOpen, sessionRemainingMs, extendSession, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar onToggleSidebar={() => setSidebarOpen(prev => !prev)} />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Modal Amaran Had Masa Ketidakaktifan Sesi (2 Minit Sebelum Tamat) */}
      <SessionTimeoutModal
        isOpen={isWarningModalOpen}
        remainingMs={sessionRemainingMs}
        onExtend={extendSession}
        onLogout={logout}
      />
    </div>
  );
};
