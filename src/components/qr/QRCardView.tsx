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

  useEffect(() => {
    if (plainToken) {
      generateQRDataUrl(plainToken).then(setQrSrc).catch(console.error);
    }
  }, [plainToken]);

  return (
    <div className="qr-card-item bg-white border-2 border-slate-700 rounded-xl p-3.5 flex flex-col justify-between items-center text-center shadow-xs w-full max-w-[280px] h-[360px] mx-auto relative overflow-hidden">
      
      {/* Header Kad */}
      <div className="w-full border-b border-slate-300 pb-2 flex items-center justify-center space-x-1.5">
        <img src="/logo.png" alt="Lencana SK Batandok" className="w-5 h-5 object-contain" />
        <span className="font-extrabold text-[12px] uppercase tracking-tight text-slate-800">
          {schoolName}
        </span>
      </div>

      {/* QR Code */}
      <div className="my-auto p-1.5 bg-white rounded-lg border border-slate-200">
        {qrSrc ? (
          <img src={qrSrc} alt={`QR Murid ${student.fullName}`} className="w-36 h-36 object-contain" />
        ) : (
          <div className="w-36 h-36 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        )}
      </div>

      {/* Maklumat Murid */}
      <div className="w-full border-t border-slate-300 pt-2 text-center">
        <h4 className="font-black text-slate-900 text-xs sm:text-sm uppercase tracking-tight line-clamp-2">
          {student.fullName}
        </h4>
        <div className="flex items-center justify-center space-x-2 mt-1">
          <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-900 font-bold rounded text-[11px]">
            {student.className || 'Kelas'}
          </span>
          {student.studentNumber && (
            <span className="font-mono text-[10px] text-slate-600">
              No: {student.studentNumber}
            </span>
          )}
        </div>
        <p className="text-[9px] text-slate-600 mt-1 font-medium">KAD KEHADIRAN DIGITAL MURID</p>
      </div>

      {/* Tanda Potong */}
      <div className="absolute top-1 right-1 text-[8px] text-slate-600 font-mono">✂</div>
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
