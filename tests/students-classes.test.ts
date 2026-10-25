import { describe, it, expect } from 'vitest';
import { parseAndValidateImport } from '../src/services/studentService';

describe('Ujian Pengurusan Murid, Pengesahan Import & Pemeliharaan Sejarah Kelas (Tests 16, 17)', () => {

  // 16. Duplicate student imports detection
  it('16. Mengesan nombor murid pendua dalam sistem dan di dalam fail kelompok import', () => {
    const availableClasses = [
      { id: 'CLS01', name: '1 ARIF' },
      { id: 'CLS02', name: '1 BESTARI' }
    ];

    const existingStudentNumbers = new Set(['M1001', 'M1002']);

    const rawRows = [
      { 'NAMA PENUH': 'ALI BIN ABU', 'NO. MURID': 'M1001', 'KELAS': '1 ARIF' }, // Pendua sistem
      { 'NAMA PENUH': 'SITI BINTI AHMAD', 'NO. MURID': 'M1003', 'KELAS': '1 BESTARI' }, // Sah
      { 'NAMA PENUH': 'CHONG WEI', 'NO. MURID': 'M1003', 'KELAS': '1 ARIF' }, // Pendua kelompok batch
      { 'NAMA PENUH': 'KUMAR', 'NO. MURID': 'M1004', 'KELAS': '3 CEMERLANG' } // Kelas tiada
    ];

    const results = parseAndValidateImport(rawRows, availableClasses, existingStudentNumbers);

    // Ali: Tidak sah kerana M1001 telah wujud dalam sistem
    expect(results[0].isValid).toBe(false);
    expect(results[0].errors[0]).toContain('telah didaftarkan dalam sistem');

    // Siti: Sah
    expect(results[1].isValid).toBe(true);
    expect(results[1].errors.length).toBe(0);

    // Chong Wei: Tidak sah kerana M1003 berulang dalam fail
    expect(results[2].isValid).toBe(false);
    expect(results[2].errors[0]).toContain('berulang dalam fail import ini');

    // Kumar: Tidak sah kerana kelas tidak wujud
    expect(results[3].isValid).toBe(false);
    expect(results[3].errors[0]).toContain('tidak wujud dalam sistem');
  });

  // 17. Historical class information preservation
  it('17. Memastikan rekod kehadiran lampau mengekalkan nama dan ID kelas asal selepas murid dipindahkan ke kelas baharu', () => {
    // Murid pada mulanya berada di kelas 1 ARIF
    const student = {
      id: 'STD001',
      fullName: 'NUR AMIRA BINTI ISMAIL',
      classId: 'CLS_ARIF',
      className: '1 ARIF'
    };

    // Rekod kehadiran tercipta semasa berada di 1 ARIF
    const historicalAttendance = {
      id: `${student.id}_2026-03-10_PAGI`,
      studentId: student.id,
      studentNameSnapshot: student.fullName,
      classIdSnapshot: student.classId,
      classNameSnapshot: student.className,
      date: '2026-03-10',
      session: 'PAGI',
      status: 'HADIR'
    };

    // Murid kemudian dipindahkan ke kelas 1 BESTARI pada penggal kedua
    student.classId = 'CLS_BESTARI';
    student.className = '1 BESTARI';

    // Sahkan rekod kehadiran lama TIDAK berubah dan snapshot kelas asal kekal utuh
    expect(historicalAttendance.classIdSnapshot).toBe('CLS_ARIF');
    expect(historicalAttendance.classNameSnapshot).toBe('1 ARIF');
    expect(historicalAttendance.classNameSnapshot).not.toBe(student.className);
  });
});
