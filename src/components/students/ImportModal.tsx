import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ClassItem } from '../../types';
import { parseAndValidateImport, ImportRow, downloadStudentImportTemplate } from '../../services/studentService';
import { Download, Upload, AlertCircle, CheckCircle2, FileSpreadsheet } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassItem[];
  existingStudentNumbers: Set<string>;
  onCommitImport: (validRows: ImportRow[]) => Promise<void>;
  isImporting: boolean;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  classes,
  existingStudentNumbers,
  onCommitImport,
  isImporting
}) => {
  const [parsedRows, setParsedRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (!data || data.length === 0) {
          setError('Fail Excel/CSV kosong atau format tidak sah.');
          setParsedRows([]);
          return;
        }

        const validated = parseAndValidateImport(
          data,
          classes.map(c => ({ id: c.id, name: c.name })),
          existingStudentNumbers
        );

        setParsedRows(validated);
      } catch (err: any) {
        setError('Ralat membaca fail: ' + (err.message || 'Format fail tidak disokong.'));
        setParsedRows([]);
      }
    };

    reader.readAsBinaryString(file);
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.filter(r => !r.isValid).length;

  const handleConfirm = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      setError('Tiada rekod sah untuk diimport.');
      return;
    }

    try {
      await onCommitImport(validRows);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ralat semasa memproses import.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Murid Melalui Fail Excel / CSV"
      maxWidth="2xl"
    >
      <div className="space-y-4">
        
        {/* Template download & file input */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
          <div className="flex items-center space-x-3">
            <FileSpreadsheet className="w-8 h-8 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-blue-900">Templat Rasmi Import Murid</p>
              <p className="text-xs text-blue-700">Muat turun format templat Excel standard untuk mengelakkan ralat lajur.</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={downloadStudentImportTemplate}
            icon={<Download className="w-3.5 h-3.5" />}
            className="bg-white"
          >
            Muat Turun Templat
          </Button>
        </div>

        {/* Upload box */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Pilih Fail Excel (.xlsx, .xls) atau CSV:
          </label>
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileUpload}
            className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800"
          />
          {fileName && <p className="text-xs text-slate-500 mt-1">Fail dipilih: <span className="font-mono">{fileName}</span></p>}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Summary stats */}
        {parsedRows.length > 0 && (
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 bg-slate-100 rounded-xl">
              <span className="block text-slate-500">Jumlah Baris</span>
              <strong className="text-base text-slate-800">{parsedRows.length}</strong>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl">
              <span className="block text-emerald-600">Sah (Boleh Diimport)</span>
              <strong className="text-base text-emerald-700">{validCount}</strong>
            </div>
            <div className="p-2.5 bg-red-50 text-red-800 border border-red-200 rounded-xl">
              <span className="block text-red-600">Ada Ralat</span>
              <strong className="text-base text-red-700">{invalidCount}</strong>
            </div>
          </div>
        )}

        {/* Table Preview */}
        {parsedRows.length > 0 && (
          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 sticky top-0">
                <tr>
                  <th className="p-2">Baris</th>
                  <th className="p-2">Nama Penuh</th>
                  <th className="p-2">No. Murid</th>
                  <th className="p-2">Kelas</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsedRows.map((r, i) => (
                  <tr key={i} className={r.isValid ? 'bg-white hover:bg-slate-50' : 'bg-red-50/50'}>
                    <td className="p-2 font-mono text-slate-400">{r.rowNumber}</td>
                    <td className="p-2 font-medium text-slate-800">{r.fullName}</td>
                    <td className="p-2 font-mono text-slate-600">{r.studentNumber || '-'}</td>
                    <td className="p-2 text-slate-600">{r.className}</td>
                    <td className="p-2">
                      {r.isValid ? (
                        <span className="inline-flex items-center text-emerald-600 font-semibold space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Sah</span>
                        </span>
                      ) : (
                        <span className="text-red-600 font-medium text-[11px]" title={r.errors.join(' | ')}>
                          {r.errors[0]}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isImporting}>
            Batal
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleConfirm}
            isLoading={isImporting}
            disabled={validCount === 0 || isImporting}
            icon={<Upload className="w-4 h-4" />}
          >
            Import {validCount} Murid Sah
          </Button>
        </div>

      </div>
    </Modal>
  );
};
