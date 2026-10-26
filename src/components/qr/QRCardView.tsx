import React, { useEffect, useState } from 'react';
import { Student } from '../../types';
import { generateQRDataUrl } from '../../services/qrService';
import { School, Printer, Loader2 } from 'lucide-react';

interface QRCardItemProps {
  student: Student;
  plainToken: string;
}

export const StudentQRCard: React.FC<QRCardItemProps> = ({ student, plainToken }) => {
  const [qrSrc, setQrSrc] = useState<string>('');
  const schoolName = import.meta.env.VITE_SCHOOL_NAME || 'SK BATANDOK BEAUFORT';
  const schoolCode = import.meta.env.VITE_SCHOOL_CODE || 'XBA6003';

  useEffect(() => {
    if (plainToken) {
      generateQRDataUrl(plainToken).then(setQrSrc).catch(console.error);
    }
  }, [plainToken]);

  return (
    <div className="qr-card-item relative bg-white border border-slate-300 rounded-2xl shadow-sm w-full max-w-[275px] h-[385px] mx-auto overflow-hidden flex flex-col justify-between text-center select-none">
      
      {/* Background Graphic */}
      <img 
        src="/card-bg.png?v=20261026c" 
        alt="Latar Belakang Kad" 
        className="absolute inset-0 w-full h-full object-fill pointer-events-none z-0" 
      />

      {/* Card Content (Layered over background) */}
      <div className="relative z-10 flex flex-col justify-between h-full p-3 pt-2.5 pb-2">
        
        {/* Header: Centered School Branding in White Dome */}
        <div className="flex flex-col items-center justify-center text-center px-2">
          <img 
            src="/logo.png?v=20261026b" 
            alt="Lencana SK Batandok" 
            className="w-10 h-10 object-contain drop-shadow-xs mb-1" 
          />
          <h3 className="font-black text-[13px] sm:text-[13.5px] text-slate-900 tracking-tight uppercase leading-tight">
            {schoolName}
          </h3>
          <p className="text-[9px] font-bold text-blue-700 tracking-wider font-mono mt-0.5">
            KOD SEKOLAH: {schoolCode} &bull; BEAUFORT
          </p>
          <div className="w-14 h-0.5 bg-blue-500/25 rounded-full mt-1" />
        </div>

        {/* QR Code Container */}
        <div className="my-auto flex flex-col items-center justify-center">
          <div className="p-2 bg-white rounded-2xl shadow-xs border border-slate-200">
            {qrSrc ? (
              <img 
                src={qrSrc} 
                alt={`QR Murid ${student.fullName}`} 
                className="w-32 h-32 object-contain" 
              />
            ) : (
              <div className="w-32 h-32 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            )}
          </div>
          <span className="text-[8.5px] font-mono font-bold text-slate-500 mt-1 tracking-wider uppercase">
            Imbas Untuk Kehadiran
          </span>
        </div>

        {/* Student Details */}
        <div className="mb-3 px-1">
          <h4 className="font-black text-slate-900 text-xs sm:text-[13px] uppercase tracking-tight line-clamp-2 leading-tight">
            {student.fullName}
          </h4>
          
          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1.5">
            <span className="inline-block px-2.5 py-0.5 bg-blue-600 text-white font-extrabold rounded-full text-[10px] shadow-xs">
              {student.className || 'Kelas'}
            </span>
            {student.studentNumber && (
              <span className="font-mono text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-full shadow-2xs">
                ID: {student.studentNumber}
              </span>
            )}
            {student.role && student.role !== 'Murid' && (
              <span className="text-[10px] font-bold bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full shadow-xs">
                ★ {student.role}
              </span>
            )}
          </div>
        </div>

        {/* Footer Text over Blue Wave */}
        <div className="mt-auto pb-1">
          <p className="text-[9px] font-black text-white tracking-widest uppercase drop-shadow-sm">
            KAD KEHADIRAN DIGITAL MURID
          </p>
        </div>

      </div>

      {/* Cut mark helper */}
      <div className="absolute top-1 right-1 text-[8px] text-blue-900/40 font-mono z-20">✂</div>
    </div>
  );
};

interface QRBatchPrintViewProps {
  studentsWithTokens: { student: Student; token: string }[];
}

export const QRBatchPrintView: React.FC<QRBatchPrintViewProps> = ({ studentsWithTokens }) => {
  const handlePrint = () => {
    window.print();
  };

  // Kumpulkan 8 kad per muka surat A4 (2 lajur x 4 baris)
  const pageSize = 8;
  const pages: { student: Student; token: string }[][] = [];
  for (let i = 0; i < studentsWithTokens.length; i += pageSize) {
    pages.push(studentsWithTokens.slice(i, i + pageSize));
  }

  return (
    <div>
      <div className="no-print flex items-center justify-between mb-6 p-4 bg-white rounded-2xl border border-slate-200">
        <div>
          <h3 className="font-bold text-slate-900 text-base">Cetakan Pukal Kad QR Murid</h3>
          <p className="text-xs text-slate-500">
            Jumlah: {studentsWithTokens.length} murid &bull; Disusun 8 kad bagi setiap helaian kertas A4.
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center space-x-2 text-sm shadow-xs transition-colors"
        >
          <Printer className="w-4 h-4" />
          <span>Cetak Sekarang (A4)</span>
        </button>
      </div>

      {/* Pages Container */}
      <div className="print-container space-y-8 print:space-y-0">
        {pages.map((pageGroup, pIdx) => (
          <div key={pIdx} className="qr-card-page bg-white p-4 print:p-0 rounded-2xl border border-slate-200 print:border-none shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 print:grid-cols-2 gap-4">
            {pageGroup.map(item => (
              <StudentQRCard 
                key={item.student.id} 
                student={item.student} 
                plainToken={item.token} 
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
