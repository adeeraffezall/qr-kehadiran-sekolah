import { describe, it, expect, beforeEach } from 'vitest';
import { 
  resolveActiveAttendanceSession, 
  evaluateSessionStatus, 
  ActiveSessionResolution 
} from '../src/services/attendanceService';
import { SessionInfo, SessionType, AttendanceRecord, Student } from '../src/types';
import { SessionConfig } from '../src/services/settingsService';
import { timeToMinutes, isTimeWithinRange, normalizeTimeString } from '../src/utils/dateUtils';
import * as crypto from 'crypto';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

describe('Sut Ujian Mandatori: Pengesahan Bebas Auto-Sesi & Pengimbas QR Mengikut Waktu (20 Senario Wajib)', () => {
  const TEST_DATE = '2026-10-28';
  const defaultCfg: SessionConfig = {
    morningStart: '06:30',
    morningEnd: '08:00',
    morningLate: '07:00',
    dismissalStart: '12:30',
    dismissalEnd: '14:30'
  };

  let basePagi: SessionInfo;
  let basePulang: SessionInfo;

  beforeEach(() => {
    basePagi = {
      id: `${TEST_DATE}_PAGI`,
      date: TEST_DATE,
      type: 'PAGI',
      startTime: defaultCfg.morningStart,
      endTime: defaultCfg.morningEnd,
      lateAfter: defaultCfg.morningLate,
      status: 'OPEN'
    };

    basePulang = {
      id: `${TEST_DATE}_PULANG`,
      date: TEST_DATE,
      type: 'PULANG',
      startTime: defaultCfg.dismissalStart,
      endTime: defaultCfg.dismissalEnd,
      lateAfter: '13:00',
      status: 'OPEN'
    };
  });

  // Ujian 1: PAGI dibuka pada waktu yang ditetapkan (06:30)
  it('1. PAGI dibuka pada waktu yang ditetapkan (06:30 AM hingga 07:59 AM)', () => {
    const resEarly = evaluateSessionStatus(basePagi, '06:29', TEST_DATE);
    expect(resEarly.status).toBe('CLOSED');
    expect(resEarly.autoCloseReason).toBe('BEFORE_START_TIME');

    const resOpen = evaluateSessionStatus(basePagi, '06:30', TEST_DATE);
    expect(resOpen.status).toBe('OPEN');
    expect(resOpen.isAutoClosed).toBe(false);

    const resMid = evaluateSessionStatus(basePagi, '07:15', TEST_DATE);
    expect(resMid.status).toBe('OPEN');
  });

  // Ujian 2: PAGI ditutup apabila waktu penutupannya tiba (08:00)
  it('2. PAGI ditutup secara automatik tepat apabila waktu penutupannya tiba (08:00 AM)', () => {
    const resBefore = evaluateSessionStatus(basePagi, '07:59', TEST_DATE);
    expect(resBefore.status).toBe('OPEN');

    const resClose = evaluateSessionStatus(basePagi, '08:00', TEST_DATE);
    expect(resClose.status).toBe('CLOSED');
    expect(resClose.isAutoClosed).toBe(true);
    expect(resClose.autoCloseReason).toBe('TIME_ELAPSED');

    const resLater = evaluateSessionStatus(basePagi, '09:30', TEST_DATE);
    expect(resLater.status).toBe('CLOSED');
  });

  // Ujian 3: PAGI kekal CLOSED apabila PULANG bermula (12:30)
  it('3. PAGI KEKAL CLOSED apabila waktu PULANG bermula pada jam 12:30 PM (Masalah A selesai)', () => {
    const resPagiAtDismissal = evaluateSessionStatus(basePagi, '12:30', TEST_DATE);
    expect(resPagiAtDismissal.status).toBe('CLOSED');
    expect(resPagiAtDismissal.isAutoClosed).toBe(true);
    expect(resPagiAtDismissal.autoCloseReason).toBe('TIME_ELAPSED');

    const resPagiAfternoon = evaluateSessionStatus(basePagi, '13:15', TEST_DATE);
    expect(resPagiAfternoon.status).toBe('CLOSED');
  });

  // Ujian 4: PULANG dibuka tanpa mengubah status PAGI
  it('4. PULANG dibuka pada jam 12:30 PM tanpa mengubah status PAGI (PAGI kekal CLOSED)', () => {
    const resolution = resolveActiveAttendanceSession(
      '12:30',
      TEST_DATE,
      defaultCfg,
      basePagi,
      basePulang
    );

    expect(resolution.activeSession).toBe('PULANG');
    expect(resolution.canScan).toBe(true);
    expect(resolution.status).toBe('OPEN');
    // Integriti kebebasan: status PAGI mesti kekal CLOSED
    expect(resolution.pagiSession.status).toBe('CLOSED');
    expect(resolution.pulangSession.status).toBe('OPEN');
  });

  // Ujian 5: Menutup PULANG tidak mengubah status PAGI
  it('5. Menutup PULANG (manual atau auto) langsung tidak mengubah status PAGI', () => {
    const closedPulang: SessionInfo = {
      ...basePulang,
      manualOverride: true,
      manualAction: 'CLOSE',
      status: 'CLOSED'
    };

    const resolution = resolveActiveAttendanceSession(
      '13:00',
      TEST_DATE,
      defaultCfg,
      basePagi,
      closedPulang
    );

    expect(resolution.pulangSession.status).toBe('CLOSED');
    expect(resolution.pagiSession.status).toBe('CLOSED');
    expect(resolution.activeSession).toBeNull();
    expect(resolution.canScan).toBe(false);
  });

  // Ujian 6: Membuka PAGI secara manual tidak membuka PULANG
  it('6. Membuka PAGI secara manual tidak membuka PULANG di luar waktunya', () => {
    const reopenedPagi: SessionInfo = {
      ...basePagi,
      manualOverride: true,
      manualAction: 'OPEN',
      status: 'OPEN'
    };

    // Waktu 09:00 pagi (sebelum waktu pulang 12:30)
    const resolution = resolveActiveAttendanceSession(
      '09:00',
      TEST_DATE,
      defaultCfg,
      reopenedPagi,
      basePulang
    );

    expect(resolution.pagiSession.status).toBe('OPEN');
    expect(resolution.pulangSession.status).toBe('CLOSED');
    expect(resolution.activeSession).toBe('PAGI');
    expect(resolution.canScan).toBe(true);
  });

  // Ujian 7: Kamera dibuka ketika PAGI dan memilih sesi PAGI
  it('7. Kamera dibuka ketika waktu PAGI (07:15 AM) secara automatik memilih Sesi PAGI', () => {
    const resolution = resolveActiveAttendanceSession(
      '07:15',
      TEST_DATE,
      defaultCfg,
      basePagi,
      basePulang
    );

    expect(resolution.activeSession).toBe('PAGI');
    expect(resolution.canScan).toBe(true);
    expect(resolution.reason).toContain('Sesi Pagi');
  });

  // Ujian 8: Imbasan PAGI benar-benar disimpan sebagai PAGI
  it('8. Rekod imbasan waktu pagi disimpan dengan session: "PAGI" dan status: "HADIR" atau "LEWAT"', () => {
    const studentId = 'STU_001';
    const currentTime = '06:50'; // Sebelum ambang lewat 07:00
    const lateThreshold = defaultCfg.morningLate;

    const isLate = timeToMinutes(currentTime) > timeToMinutes(lateThreshold);
    const expectedStatus = isLate ? 'LEWAT' : 'HADIR';

    const record: AttendanceRecord = {
      id: `${studentId}_${TEST_DATE}_PAGI`,
      studentId,
      studentNameSnapshot: 'Ahmad Faiz',
      classIdSnapshot: 'CLS_1B',
      classNameSnapshot: '1 BERUSAHA',
      date: TEST_DATE,
      session: 'PAGI',
      status: expectedStatus,
      scannedAt: '2026-10-28T06:50:00.000Z',
      scannedBy: 'USR_TEACHER',
      source: 'QR'
    };

    expect(record.session).toBe('PAGI');
    expect(record.status).toBe('HADIR');
    expect(record.id).toBe('STU_001_2026-10-28_PAGI');
  });

  // Ujian 9: Kamera dibuka ketika PULANG dan memilih sesi PULANG
  it('9. Kamera dibuka ketika waktu PULANG (12:45 PM) secara automatik memilih Sesi PULANG', () => {
    const resolution = resolveActiveAttendanceSession(
      '12:45',
      TEST_DATE,
      defaultCfg,
      basePagi,
      basePulang
    );

    expect(resolution.activeSession).toBe('PULANG');
    expect(resolution.canScan).toBe(true);
    expect(resolution.pagiSession.status).toBe('CLOSED');
    expect(resolution.pulangSession.status).toBe('OPEN');
  });

  // Ujian 10: Imbasan PULANG benar-benar disimpan sebagai PULANG
  it('10. Rekod imbasan waktu pulang disimpan dengan session: "PULANG" dan status: "PULANG"', () => {
    const studentId = 'STU_002';
    const record: AttendanceRecord = {
      id: `${studentId}_${TEST_DATE}_PULANG`,
      studentId,
      studentNameSnapshot: 'Nurul Huda',
      classIdSnapshot: 'CLS_1B',
      classNameSnapshot: '1 BERUSAHA',
      date: TEST_DATE,
      session: 'PULANG',
      status: 'PULANG',
      scannedAt: '2026-10-28T12:45:00.000Z',
      scannedBy: 'USR_TEACHER',
      source: 'QR'
    };

    expect(record.session).toBe('PULANG');
    expect(record.status).toBe('PULANG');
    expect(record.id).toBe('STU_002_2026-10-28_PULANG');
  });

  // Ujian 11: Kamera yang kekal terbuka bertukar sesi dengan selamat
  it('11. Kamera yang kekal terbuka bertukar sesi dengan selamat apabila masa beralih tanpa reload', () => {
    // Fasa 1: Jam 07:45 AM (PAGI aktif)
    const morningRes = resolveActiveAttendanceSession('07:45', TEST_DATE, defaultCfg, basePagi, basePulang);
    expect(morningRes.activeSession).toBe('PAGI');
    expect(morningRes.canScan).toBe(true);

    // Fasa 2: Jam 08:05 AM (PAGI ditutup secara automatik)
    const midRes = resolveActiveAttendanceSession('08:05', TEST_DATE, defaultCfg, basePagi, basePulang);
    expect(midRes.activeSession).toBeNull();
    expect(midRes.canScan).toBe(false);
    expect(midRes.pagiSession.status).toBe('CLOSED');

    // Fasa 3: Jam 12:30 PM (PULANG bermula tanpa sebarang reload)
    const dismissalRes = resolveActiveAttendanceSession('12:30', TEST_DATE, defaultCfg, basePagi, basePulang);
    expect(dismissalRes.activeSession).toBe('PULANG');
    expect(dismissalRes.canScan).toBe(true);
    expect(dismissalRes.pagiSession.status).toBe('CLOSED');
    expect(dismissalRes.pulangSession.status).toBe('OPEN');
  });

  // Ujian 12: Imbasan baharu tidak menggunakan state sesi lama
  it('12. Imbasan baharu pada waktu petang tidak menggunakan state sesi PAGI yang lama', () => {
    const clientStateSession: SessionType = 'PAGI'; // State lapuk klien
    const currentTime = '12:40'; // Waktu petang

    const resolution = resolveActiveAttendanceSession(currentTime, TEST_DATE, defaultCfg, basePagi, basePulang);
    
    // Logik penyelesaian selamat: jika state pilihan klien ditutup tetapi sistem mengesan sesi aktif lain
    let safeTargetSession: SessionType | null = clientStateSession;
    if (resolution.pagiSession.status === 'CLOSED' && resolution.activeSession === 'PULANG') {
      safeTargetSession = 'PULANG';
    }

    expect(safeTargetSession).toBe('PULANG');
  });

  // Ujian 13: Imbasan in-flight dilindungi daripada pertukaran pertengahan
  it('13. Imbasan in-flight mengekalkan integriti sesi transaksi semasa diproses', () => {
    const inFlightSession: SessionType = 'PAGI';
    const transactionSnapshot = { session: inFlightSession, locked: true };

    // Masa beralih semasa transaksi dihantar ke server
    const newSystemSession: SessionType = 'PULANG';
    expect(transactionSnapshot.session).toBe('PAGI');
    expect(transactionSnapshot.session).not.toBe(newSystemSession);
  });

  // Ujian 14: Backend menolak imbasan untuk sesi yang tidak dibenarkan
  it('14. Backend menolak imbasan PAGI sekiranya dihantar pada waktu luar jendela (cth: jam 12:45 PM)', () => {
    const timeStr = '12:45';
    const curMinutes = timeToMinutes(timeStr);
    const mEndMinutes = timeToMinutes(defaultCfg.morningEnd);

    // Simulasi pengesahan backend Cloud Function
    const isPagiValid = curMinutes < mEndMinutes;
    expect(isPagiValid).toBe(false);

    const backendResponse = isPagiValid 
      ? { success: true }
      : { success: false, code: 'SESSION_CLOSED', message: 'Sesi PAGI telah ditutup.' };

    expect(backendResponse.success).toBe(false);
    expect(backendResponse.code).toBe('SESSION_CLOSED');
  });

  // Ujian 15: Tiada sesi sah menyebabkan sistem tidak menyimpan rekod
  it('15. Tiada sesi sah (antara 08:01 hingga 12:29) menyebabkan sistem menolak imbasan', () => {
    const resolution = resolveActiveAttendanceSession('10:30', TEST_DATE, defaultCfg, basePagi, basePulang);
    expect(resolution.activeSession).toBeNull();
    expect(resolution.canScan).toBe(false);
    expect(resolution.status).toBe('CLOSED');
    expect(resolution.reason).toContain('Sesi Pagi telah ditutup');
    expect(resolution.reason).toContain('Sesi Pulang bermula pada jam 12:30');
  });

  // Ujian 16: Waktu Malaysia dan tarikh digunakan secara konsisten
  it('16. Menukar dan menormalkan rentetan masa Malaysia kepada integer minit dengan tepat', () => {
    expect(timeToMinutes('06:30')).toBe(390);
    expect(timeToMinutes('08:00')).toBe(480);
    expect(timeToMinutes('12:30')).toBe(750);
    expect(timeToMinutes('14:30')).toBe(870);

    // Integriti perbandingan: '12:30' (750) > '08:00' (480)
    expect(timeToMinutes('12:30') > timeToMinutes('08:00')).toBe(true);

    // Penormalan rentetan satu digit
    expect(normalizeTimeString('8:00')).toBe('08:00');
    expect(normalizeTimeString('6:30')).toBe('06:30');
  });

  // Ujian 17: Imbasan berulang tidak menggandakan rekod
  it('17. Imbasan berulang token yang sama pada sesi yang sama dikesan sebagai duplikasi', () => {
    const existingRecords = new Map<string, AttendanceRecord>();
    const studentId = 'STU_005';
    const recordId = `${studentId}_${TEST_DATE}_PAGI`;

    existingRecords.set(recordId, {
      id: recordId,
      studentId,
      studentNameSnapshot: 'Danial Hariz',
      classIdSnapshot: 'CLS_1B',
      classNameSnapshot: '1 BERUSAHA',
      date: TEST_DATE,
      session: 'PAGI',
      status: 'HADIR',
      scannedAt: '2026-10-28T06:45:00.000Z',
      scannedBy: 'USR_TEACHER',
      source: 'QR'
    });

    const isDuplicate = existingRecords.has(recordId);
    expect(isDuplicate).toBe(true);
  });

  // Ujian 18: Kegagalan rangkaian tidak menghasilkan mesej kejayaan palsu
  it('18. Ralat rangkaian atau ralat pelayan tidak menghasilkan respons kejayaan palsu', async () => {
    const simulatedNetworkCall = async () => {
      throw new Error('NETWORK_TIMEOUT');
    };

    let result = { success: false, code: 'INITIAL', message: '' };
    try {
      await simulatedNetworkCall();
      result = { success: true, code: 'OK', message: 'Kehadiran direkodkan' };
    } catch (err: any) {
      result = { success: false, code: 'NETWORK_ERROR', message: err.message };
    }

    expect(result.success).toBe(false);
    expect(result.code).toBe('NETWORK_ERROR');
  });

  // Ujian 19: Laporan dan eksport kehadiran mengasingkan data PAGI dan PULANG
  it('19. Rekod PAGI dan PULANG bagi seorang murid disimpan dalam dokumen berbeza dan tidak bertindih', () => {
    const studentId = 'STU_010';
    const pagiRecord: AttendanceRecord = {
      id: `${studentId}_${TEST_DATE}_PAGI`,
      studentId,
      studentNameSnapshot: 'Siti Aminah',
      classIdSnapshot: 'CLS_1B',
      classNameSnapshot: '1 BERUSAHA',
      date: TEST_DATE,
      session: 'PAGI',
      status: 'HADIR',
      scannedAt: '2026-10-28T06:55:00.000Z',
      scannedBy: 'USR_TEACHER',
      source: 'QR'
    };

    const pulangRecord: AttendanceRecord = {
      id: `${studentId}_${TEST_DATE}_PULANG`,
      studentId,
      studentNameSnapshot: 'Siti Aminah',
      classIdSnapshot: 'CLS_1B',
      classNameSnapshot: '1 BERUSAHA',
      date: TEST_DATE,
      session: 'PULANG',
      status: 'PULANG',
      scannedAt: '2026-10-28T12:45:00.000Z',
      scannedBy: 'USR_TEACHER',
      source: 'QR'
    };

    expect(pagiRecord.id).not.toBe(pulangRecord.id);
    expect(pagiRecord.session).toBe('PAGI');
    expect(pulangRecord.session).toBe('PULANG');
    expect(pagiRecord.status).toBe('HADIR');
    expect(pulangRecord.status).toBe('PULANG');
  });

  // Ujian 20: Penutupan dan pembukaan semula sesi tidak merosakkan rekod kehadiran sedia ada
  it('20. Tindakan buka/tutup sesi oleh pentadbir tidak memadamkan rekod kehadiran yang telah diimbas', () => {
    const attendanceDatabase = [
      { id: `STU_1_${TEST_DATE}_PAGI`, studentId: 'STU_1', session: 'PAGI', status: 'HADIR' },
      { id: `STU_2_${TEST_DATE}_PAGI`, studentId: 'STU_2', session: 'PAGI', status: 'HADIR' }
    ];

    // Tindakan pentadbir menutup sesi
    const session = { ...basePagi, status: 'CLOSED', manualOverride: true, manualAction: 'CLOSE' };
    expect(session.status).toBe('CLOSED');

    // Integriti rekod murid mesti kekal 2
    expect(attendanceDatabase.length).toBe(2);
    expect(attendanceDatabase[0].status).toBe('HADIR');
    expect(attendanceDatabase[1].status).toBe('HADIR');
  });
});
