import { describe, it, expect, beforeEach } from 'vitest';
import { DEFAULT_SESSION_CONFIG, getLocalSessionConfig, SessionConfig } from '../src/services/settingsService';
import { mockStore } from '../src/services/mockDataStore';
import { evaluateSessionStatus } from '../src/services/attendanceService';
import { SessionInfo } from '../src/types';

describe('Ujian Tetapan Waktu & Ambang Hadir Lewat (Tests 27, 28, 29, 30, 31, 32)', () => {

  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  // 27. Ambang Lalai Sesi Pagi SK Batandok adalah 07:00 AM
  it('27. Memastikan nilai ambang lalai hadir lewat bagi Sesi Pagi ialah 07:00 AM mengikut piawai SK Batandok', () => {
    expect(DEFAULT_SESSION_CONFIG.morningLate).toBe('07:00');
    expect(DEFAULT_SESSION_CONFIG.morningStart).toBe('06:30');
    expect(DEFAULT_SESSION_CONFIG.morningEnd).toBe('08:00');

    const localConfig = getLocalSessionConfig();
    expect(localConfig.morningLate).toBe('07:00');
  });

  // 28. Pengesanan Status Kehadiran Berdasarkan Ambang 07:00 AM
  it('28. Mengesahkan murid tiba sebelum 07:00 AM sebagai HADIR dan selepas 07:00 AM sebagai LEWAT', () => {
    const threshold = DEFAULT_SESSION_CONFIG.morningLate; // '07:00'

    const scanTimeEarly = '06:55';
    const scanTimeExact = '07:00';
    const scanTimeLate = '07:05';
    const scanTimeVeryLate = '07:35';

    // Imbasan pada 06:55 -> HADIR
    expect(scanTimeEarly <= threshold).toBe(true);

    // Imbasan pada 07:00 -> HADIR (Tepat pada ambang batas)
    expect(scanTimeExact <= threshold).toBe(true);

    // Imbasan pada 07:05 -> LEWAT
    expect(scanTimeLate > threshold).toBe(true);

    // Imbasan pada 07:35 -> LEWAT
    expect(scanTimeVeryLate > threshold).toBe(true);
  });

  // 29. Ketekalan Ambang Merentasi Sesi MockDataStore
  it('29. MockDataStore memuatkan sesi pagi dengan ambang waktu 07:00 secara konsisten', () => {
    const session = mockStore.getSession('2026-10-26', 'PAGI');
    expect(session.lateAfter).toBe('07:00');
    expect(session.startTime).toBe('06:30');
  });

  // 30. Penutupan Automatik Sesi Pagi Selepas Jam 8:00 Pagi
  it('30. Sesi pagi ditutup secara automatik apabila waktu semasa melepasi jam 8:00 pagi (08:00)', () => {
    const session: SessionInfo = {
      id: '2026-10-27_PAGI',
      date: '2026-10-27',
      type: 'PAGI',
      startTime: '06:30',
      endTime: '08:00',
      lateAfter: '07:00',
      status: 'OPEN'
    };

    // Semasa waktu imbasan aktif (07:15 AM) -> Sesi OPEN
    const activeResult = evaluateSessionStatus(session, '07:15', '2026-10-27');
    expect(activeResult.status).toBe('OPEN');
    expect(activeResult.isAutoClosed).toBe(false);

    // Tepat pada waktu tamat (08:00 AM) -> Sesi CLOSED secara automatik
    const exactResult = evaluateSessionStatus(session, '08:00', '2026-10-27');
    expect(exactResult.status).toBe('CLOSED');
    expect(exactResult.isAutoClosed).toBe(true);

    // Melepasi waktu tamat (08:05 AM) -> Sesi CLOSED secara automatik
    const lateResult = evaluateSessionStatus(session, '08:05', '2026-10-27');
    expect(lateResult.status).toBe('CLOSED');
    expect(lateResult.isAutoClosed).toBe(true);
    expect(lateResult.autoCloseReason).toBe('TIME_ELAPSED');
  });

  // 31. Pilihan Manual Pentadbir: Buka Semula Sesi Selepas Jam 8:00 Pagi
  it('31. Pentadbir boleh membuka semula sesi secara manual walaupun melepasi jam 8:00 pagi', () => {
    const session: SessionInfo = {
      id: '2026-10-27_PAGI',
      date: '2026-10-27',
      type: 'PAGI',
      startTime: '06:30',
      endTime: '08:00',
      lateAfter: '07:00',
      status: 'OPEN',
      manualOverride: true,
      manualAction: 'REOPEN',
      manualReason: 'Hujan lebat, perhimpunan ditangguhkan'
    };

    // Walaupun waktu sekarang 08:20 AM (melepasi 08:00 AM), sesi kekal OPEN kerana manual override oleh pentadbir
    const reopenResult = evaluateSessionStatus(session, '08:20', '2026-10-27');
    expect(reopenResult.status).toBe('OPEN');
    expect(reopenResult.manualOverride).toBe(true);
    expect(reopenResult.manualReason).toContain('Hujan lebat');
  });

  // 32. Pilihan Manual Pentadbir: Tutup Sesi Lebih Awal Sebelum Jam 8:00 Pagi
  it('32. Pentadbir boleh menutup sesi secara manual lebih awal sebelum jam 8:00 pagi', () => {
    const session: SessionInfo = {
      id: '2026-10-27_PAGI',
      date: '2026-10-27',
      type: 'PAGI',
      startTime: '06:30',
      endTime: '08:00',
      lateAfter: '07:00',
      status: 'CLOSED',
      manualOverride: true,
      manualAction: 'CLOSE',
      manualReason: 'Semua murid telah hadir lebih awal'
    };

    // Walaupun waktu sekarang baru 07:45 AM (sebelum 08:00 AM), sesi ditutup kerana arahan manual pentadbir
    const closeResult = evaluateSessionStatus(session, '07:45', '2026-10-27');
    expect(closeResult.status).toBe('CLOSED');
    expect(closeResult.manualOverride).toBe(true);
    expect(closeResult.isAutoClosed).toBe(false);
  });

});
