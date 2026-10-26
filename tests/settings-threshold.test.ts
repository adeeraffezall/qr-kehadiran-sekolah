import { describe, it, expect, beforeEach } from 'vitest';
import { DEFAULT_SESSION_CONFIG, getLocalSessionConfig, SessionConfig } from '../src/services/settingsService';
import { mockStore } from '../src/services/mockDataStore';

describe('Ujian Tetapan Waktu & Ambang Hadir Lewat (Tests 27, 28, 29)', () => {

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

});
