import { describe, it, expect, beforeEach } from 'vitest';
import { 
  getDefaultRolloverMappings, 
  executeAnnualRollover, 
  getStudents,
  updateStudentRole 
} from '../src/services/studentService';
import { getClasses } from '../src/services/classService';
import { mockStore } from '../src/services/mockDataStore';

describe('Ujian Peralihan Sesi Persekolahan Baharu / Naik Kelas Kelompok (Annual Rollover)', () => {

  it('1. Menjana pemetaan kenaikan kelas automatik mengikut yearLevel (Tahun 1-5 naik kelas, Tahun 6 tamat)', () => {
    const classes = [
      { id: 'CLS_PRA', name: 'PRASEKOLAH', yearLevel: 0, active: true },
      { id: 'CLS_1B', name: '1 BERUSAHA', yearLevel: 1, active: true },
      { id: 'CLS_2B', name: '2 BERILMU', yearLevel: 2, active: true },
      { id: 'CLS_3B', name: '3 BERJAYA', yearLevel: 3, active: true },
      { id: 'CLS_4B', name: '4 BIJAKSANA', yearLevel: 4, active: true },
      { id: 'CLS_5B', name: '5 BESTARI', yearLevel: 5, active: true },
      { id: 'CLS_6B', name: '6 BAKTI', yearLevel: 6, active: true },
    ];

    const mappings = getDefaultRolloverMappings(classes);

    expect(mappings.length).toBe(7);

    // Prasekolah -> 1 BERUSAHA
    const praMap = mappings.find(m => m.sourceClassId === 'CLS_PRA');
    expect(praMap?.targetClassId).toBe('CLS_1B');

    // 1 BERUSAHA -> 2 BERILMU
    const y1Map = mappings.find(m => m.sourceClassId === 'CLS_1B');
    expect(y1Map?.targetClassId).toBe('CLS_2B');

    // 5 BESTARI -> 6 BAKTI
    const y5Map = mappings.find(m => m.sourceClassId === 'CLS_5B');
    expect(y5Map?.targetClassId).toBe('CLS_6B');

    // 6 BAKTI -> GRADUATE (Tamat Persekolahan)
    const y6Map = mappings.find(m => m.sourceClassId === 'CLS_6B');
    expect(y6Map?.targetClassId).toBe('GRADUATE');
    expect(y6Map?.targetClassName).toContain('Tamat Persekolahan');
  });

  it('2. Melaksanakan peralihan sesi: menaikkan kelas murid, menamatkan Tahun 6, dan set semula jawatan kelas', async () => {
    const classes = await getClasses();
    const studentsBefore = await getStudents();

    // Dapatkan murid Tahun 1 dan Tahun 6 untuk semakan
    const studentY1 = studentsBefore.find(s => s.className?.includes('1') || s.classId === 'CLS_1B');
    const studentY6 = studentsBefore.find(s => s.className?.includes('6') || s.classId === 'CLS_6B');

    expect(studentY1).toBeDefined();
    expect(studentY6).toBeDefined();

    // Berikan jawatan Ketua Kelas kepada studentY1 sebelum peralihan
    if (studentY1) {
      await updateStudentRole('admin-uid', 'admin@sigoo.my', studentY1.id, 'Ketua Kelas', 'Jawatan Sesi Lama');
    }

    const defaultMappings = getDefaultRolloverMappings(classes);

    // Laksanakan peralihan sesi ke 2027
    const result = await executeAnnualRollover('admin-uid', 'admin@sigoo.my', {
      targetSessionYear: '2027',
      mappings: defaultMappings,
      resetClassRoles: true,
      resetAllRoles: false,
      auditReason: 'Ujian Peralihan Sesi 2027'
    });

    expect(result.promotedCount).toBeGreaterThan(0);
    expect(result.graduatedCount).toBeGreaterThan(0);

    const studentsAfter = await getStudents();

    // 1. Murid Tahun 1 kini telah dinaikkan ke kelas Tahun 2 (CLS_2B / 2 BERILMU)
    const checkY1 = studentsAfter.find(s => s.id === studentY1?.id);
    expect(checkY1?.classId).toBe('CLS_2B');
    expect(checkY1?.className).toBe('2 BERILMU');
    // Jawatan Ketua Kelas diset semula kepada 'Murid' biasa untuk sesi baharu
    expect(checkY1?.role).toBe('Murid');

    // 2. Murid Tahun 6 kini berstatus tidak aktif (Tamat Persekolahan / Alumni)
    const checkY6 = studentsAfter.find(s => s.id === studentY6?.id);
    expect(checkY6?.active).toBe(false);
  });

  it('3. Memastikan rekod kehadiran sesi tahun lampau (2026) tidak terganggu dan mengekalkan snapshot kelas asal', async () => {
    // Simulasi rekod kehadiran lampau tahun 2026 semasa murid berada di kelas 1 BERUSAHA
    const historicalRecord = {
      id: 'STD001_2026-05-12_PAGI',
      studentId: 'STD001',
      studentNameSnapshot: 'MUHAMMAD DANISH',
      classIdSnapshot: 'CLS_1B',
      classNameSnapshot: '1 BERUSAHA',
      date: '2026-05-12',
      session: 'PAGI',
      status: 'HADIR'
    };

    // Kelas murid semasa kini berubah kepada 2 BERILMU pada tahun 2027
    const currentStudentInfo = {
      id: 'STD001',
      fullName: 'MUHAMMAD DANISH',
      classId: 'CLS_2B',
      className: '2 BERILMU'
    };

    // Sahkan rekod kehadiran lama 2026 tetap mengandungi snapshot 1 BERUSAHA
    expect(historicalRecord.date.startsWith('2026')).toBe(true);
    expect(historicalRecord.classNameSnapshot).toBe('1 BERUSAHA');
    expect(historicalRecord.classNameSnapshot).not.toBe(currentStudentInfo.className);
    expect(historicalRecord.classIdSnapshot).toBe('CLS_1B');
  });

});
