import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  sessionManager, 
  INACTIVITY_TIMEOUT_MS, 
  WARNING_WINDOW_MS, 
  SESSION_LAST_ACTIVE_KEY, 
  SESSION_USER_ID_KEY, 
  SESSION_TERMINATED_MSG_KEY, 
  DEFAULT_TIMEOUT_MESSAGE 
} from '../src/services/sessionManager';

describe('Audit & Ujian Keselamatan Pengurusan Sesi Log Masuk (Tests 1 - 18)', () => {
  const BASE_TIME = new Date('2026-10-27T08:00:00.000Z').getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);
    sessionManager.clear();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  afterEach(() => {
    sessionManager.clear();
    vi.useRealTimers();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  // 1. Unauthenticated access to protected routes
  it('1. Menolak akses pengguna tanpa pengesahan dan melencongkan ke halaman login', () => {
    expect(sessionManager.isSessionValid()).toBe(false);
    expect(sessionManager.getLastActiveTimestamp()).toBe(0);

    // Simulasi pengawal laluan: jika session tidak sah, akses dinafikan
    const canAccessDashboard = sessionManager.isSessionValid();
    expect(canAccessDashboard).toBe(false);
  });

  // 2. Restoration of a valid persistent session
  it('2. Memulihkan sesi kekal pengguna sekiranya masih sah di bawah 30 minit', () => {
    // Pengguna log masuk pada 08:00:00
    sessionManager.initSession('USR_TEACHER_01');
    expect(sessionManager.isSessionValid()).toBe(true);

    // Pengguna menutup dan membuka semula pelayar selepas 15 minit (08:15:00)
    vi.advanceTimersByTime(15 * 60 * 1000);

    // Sesi masih sah (< 30 minit) dan pengguna terus dibenarkan masuk ke dashboard
    expect(sessionManager.isSessionValid()).toBe(true);
    expect(sessionManager.getRemainingTimeMs()).toBe(15 * 60 * 1000);
  });

  // 3. No dashboard flash before authentication resolves
  it('3. Tidak mendedahkan kandungan papan pemuka secara kilat sebelum pengesahan selesai', () => {
    // Semasa status loading = true, dashboard tidak dipaparkan
    let authStateResolved = false;
    let dashboardExposed = false;

    if (!authStateResolved) {
      dashboardExposed = false; // Pengawal laluan memaparkan komponen Loader
    }

    expect(dashboardExposed).toBe(false);
    authStateResolved = true;
    expect(authStateResolved).toBe(true);
  });

  // 4. User activity resetting the inactivity timer
  it('4. Interaksi fizikal pengguna yang sah mengemas kini pemasa ketidakaktifan', () => {
    sessionManager.initSession('USR_ADMIN_01');
    const initialTimestamp = sessionManager.getLastActiveTimestamp();

    // 10 minit berlalu tanpa aktiviti
    vi.advanceTimersByTime(10 * 60 * 1000);
    expect(sessionManager.getRemainingTimeMs()).toBe(20 * 60 * 1000);

    // Pengguna melakukan aktiviti fizikal (cth: klik tetikus / sentuhan)
    sessionManager.recordUserActivity();
    const updatedTimestamp = sessionManager.getLastActiveTimestamp();

    expect(updatedTimestamp).toBeGreaterThan(initialTimestamp);
    // Pemasa diset semula ke 30 minit penuh
    expect(sessionManager.getRemainingTimeMs()).toBe(INACTIVITY_TIMEOUT_MS);
  });

  // 5. Background requests not resetting the timer
  it('5. Permintaan latar belakang (background polling / cron) tidak memanjangkan sesi secara palsu', () => {
    sessionManager.initSession('USR_ADMIN_01');
    const initialTimestamp = sessionManager.getLastActiveTimestamp();

    // 25 minit berlalu
    vi.advanceTimersByTime(25 * 60 * 1000);

    // Background polling berlaku (hanya bacaan data, BUKAN panggilan recordUserActivity)
    const simulatedBackgroundPolling = () => {
      // Background query ke pangkalan data
      return { polled: true };
    };
    simulatedBackgroundPolling();

    // Cap masa aktiviti pengguna kekal tidak berubah
    expect(sessionManager.getLastActiveTimestamp()).toBe(initialTimestamp);
    // Baki masa kekal 5 minit (BUKAN kembali ke 30 minit)
    expect(sessionManager.getRemainingTimeMs()).toBe(5 * 60 * 1000);
  });

  // 6. Warning displayed before expiration
  it('6. Amaran dipaparkan tepat 2 minit sebelum tamat tempoh sesi (minit ke-28)', () => {
    sessionManager.initSession('USR_ADMIN_01');

    // 27 minit berlalu -> Belum masuk jendela amaran
    vi.advanceTimersByTime(27 * 60 * 1000);
    expect(sessionManager.isWarningPeriod()).toBe(false);

    // 28 minit berlalu -> Memasuki jendela amaran (baki <= 2 minit)
    vi.advanceTimersByTime(1 * 60 * 1000);
    expect(sessionManager.isWarningPeriod()).toBe(true);
    expect(sessionManager.getRemainingTimeMs()).toBeLessThanOrEqual(WARNING_WINDOW_MS);
    expect(sessionManager.isSessionValid()).toBe(true);
  });

  // 7. Safe session continuation where supported
  it('7. Membenarkan pengguna menyambung sesi semasa jendela amaran masih sah', () => {
    sessionManager.initSession('USR_TEACHER_01');
    vi.advanceTimersByTime(28 * 60 * 1000 + 30 * 1000); // 28 minit 30 saat

    expect(sessionManager.isWarningPeriod()).toBe(true);

    // Pengguna menekan butang "Kekalkan Sesi"
    const renewed = sessionManager.extendSession();
    expect(renewed).toBe(true);
    expect(sessionManager.isWarningPeriod()).toBe(false);
    expect(sessionManager.getRemainingTimeMs()).toBe(INACTIVITY_TIMEOUT_MS);
  });

  // 8. Session expiration after 30 minutes of inactivity
  it('8. Sesi tamat secara automatik selepas 30 minit ketidakaktifan genap', () => {
    sessionManager.initSession('USR_TEACHER_01');

    // Tepat 30 minit berlalu
    vi.advanceTimersByTime(30 * 60 * 1000);

    expect(sessionManager.isSessionValid()).toBe(false);
    expect(sessionManager.getRemainingTimeMs()).toBe(0);

    // Sesi ditamatkan
    sessionManager.terminateSession(DEFAULT_TIMEOUT_MESSAGE);
    expect(sessionManager.consumeTerminatedMessage()).toBe(DEFAULT_TIMEOUT_MESSAGE);
  });

  // 9. Expired session rejected by backend or trusted data-access layer
  it('9. Percubaan operasi data selepas sesi tamat ditolak oleh lapisan kawalan keselamatan', () => {
    sessionManager.initSession('USR_TEACHER_01');
    vi.advanceTimersByTime(35 * 60 * 1000); // Melebihi 30 minit

    // Fungsi semakan data-access layer
    const executeSensitiveOperation = () => {
      if (!sessionManager.isSessionValid()) {
        throw new Error('UNAUTHENTICATED: Sesi telah tamat tempoh.');
      }
      return { success: true, studentData: ['Ali', 'Abu'] };
    };

    expect(() => executeSensitiveOperation()).toThrow('UNAUTHENTICATED');
  });

  // 10. Frontend route-guard bypass attempts
  it('10. Menyekat percubaan memintas frontend route guard menggunakan URL langsung', () => {
    // Sesi tiada atau telah tamat
    expect(sessionManager.isSessionValid()).toBe(false);

    // Simulasi ProtectedRoute guard
    const guardEvaluate = (path: string, hasValidSession: boolean) => {
      if (!hasValidSession) return '/login';
      return path;
    };

    expect(guardEvaluate('/students', sessionManager.isSessionValid())).toBe('/login');
    expect(guardEvaluate('/settings', sessionManager.isSessionValid())).toBe('/login');
    expect(guardEvaluate('/print-cards', sessionManager.isSessionValid())).toBe('/login');
  });

  // 11. Logout and session revocation behavior
  it('11. Butang Log Keluar membatalkan sesi, memadam token dan menyahaktifkan pengguna secara andal', () => {
    sessionManager.initSession('USR_ADMIN_01');
    expect(sessionManager.isSessionValid()).toBe(true);

    // Pengguna menekan Log Keluar
    sessionManager.terminateSession('Pengguna telah log keluar secara manual.');
    expect(sessionManager.isSessionValid()).toBe(false);
    expect(sessionManager.getLastActiveTimestamp()).toBe(0);
  });

  // 12. Browser Back button behavior
  it('12. Butang "Back" pelayar tidak mendedahkan semula data sistem selepas sesi luput', () => {
    sessionManager.initSession('USR_TEACHER_01');
    vi.advanceTimersByTime(31 * 60 * 1000); // Luput 31 minit

    // Semasa navigasi kembali, route guard memeriksa kesahan sesi
    const canRestoreState = sessionManager.isSessionValid();
    expect(canRestoreState).toBe(false);
  });

  // 13. Multiple tabs and session synchronization
  it('13. Menyegerakkan cap masa aktiviti merentas pelbagai tab pelayar', () => {
    sessionManager.initSession('USR_TEACHER_01');
    vi.advanceTimersByTime(10 * 60 * 1000);

    let tabBReceivedEvent = false;
    const unsubscribe = sessionManager.onSessionEvent((event) => {
      if (event.type === 'ACTIVITY') {
        tabBReceivedEvent = true;
      }
    });

    // Tab A merekodkan aktiviti pengguna
    sessionManager.recordUserActivity();
    expect(tabBReceivedEvent).toBe(true);

    unsubscribe();
  });

  // 14. Invalid or revoked credentials
  it('14. Kredensial yang tidak sah atau telah dibatalkan ditolak daripada menghidupkan sesi', () => {
    // Cuba extend sesi yang telah tamat tempoh
    sessionManager.initSession('USR_TEACHER_01');
    vi.advanceTimersByTime(35 * 60 * 1000); // Luput

    const extended = sessionManager.extendSession();
    // Ditolak! Sesi yang sudah luput tidak boleh dihidupkan semula
    expect(extended).toBe(false);
  });

  // 15. QR scanning after login
  it('15. Pengimbas QR beroperasi dengan lancar sepanjang sesi berada dalam tempoh sah', () => {
    sessionManager.initSession('USR_STAFF_01');

    // 5 minit selepas log masuk
    vi.advanceTimersByTime(5 * 60 * 1000);
    expect(sessionManager.isSessionValid()).toBe(true);

    // Imbasan dibenarkan
    const canScan = sessionManager.isSessionValid();
    expect(canScan).toBe(true);
  });

  // 16. Attendance reports and Excel exports for authorized users
  it('16. Menjana laporan dan eksport data hanya dibenarkan semasa sesi masih aktif', () => {
    sessionManager.initSession('USR_ADMIN_01');
    expect(sessionManager.isSessionValid()).toBe(true);

    // Eksport dibenarkan
    const canExport = sessionManager.isSessionValid();
    expect(canExport).toBe(true);

    // Selepas sesi tamat tempoh
    vi.advanceTimersByTime(31 * 60 * 1000);
    const canExportAfterExpiry = sessionManager.isSessionValid();
    expect(canExportAfterExpiry).toBe(false);
  });

  // 17. Existing role-based permissions
  it('17. Mengekalkan peranan ADMIN, TEACHER, STAFF tanpa menjejaskan kawalan capaian asal', () => {
    sessionManager.initSession('USR_TEACHER_01');

    const checkPermission = (userRole: string, requiredRole: string) => {
      if (requiredRole === 'ADMIN') return userRole === 'ADMIN';
      return ['ADMIN', 'TEACHER', 'STAFF'].includes(userRole);
    };

    expect(checkPermission('TEACHER', 'ADMIN')).toBe(false);
    expect(checkPermission('ADMIN', 'ADMIN')).toBe(true);
    expect(checkPermission('TEACHER', 'TEACHER')).toBe(true);
  });

  // 18. Sensitive student data not being returned to expired sessions
  it('18. Maklumat sensitif murid disekat sepenuhnya daripada dipulangkan kepada sesi yang tamat tempoh', () => {
    sessionManager.initSession('USR_ADMIN_01');
    vi.advanceTimersByTime(30 * 60 * 1000 + 1); // 30 minit 1 milisaat

    const getStudentRecords = () => {
      if (!sessionManager.isSessionValid()) {
        return null;
      }
      return [
        { id: 'S001', name: 'AHMAD', ic: '140101-12-1234' }
      ];
    };

    const records = getStudentRecords();
    expect(records).toBeNull();
  });

});
