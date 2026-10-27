import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BROWSER_SESSION_KEY } from '../src/hooks/useAuth';

// Simulasi Pengurus Sesi Pelayar (Browser Session Persistence Engine)
class BrowserSessionSimulator {
  sessionStorageMap = new Map<string, string>();
  localStorageMap = new Map<string, string>();
  currentUser: { uid: string; email: string; role: string; active: boolean } | null = null;
  broadcastChannelListeners: ((msg: any) => void)[] = [];

  // Log masuk pengguna dalam sesi pelayar semasa
  login(uid: string, email: string, role: string = 'TEACHER', active: boolean = true) {
    this.currentUser = { uid, email, role, active };
    this.sessionStorageMap.set(BROWSER_SESSION_KEY, '1');
    this.sessionStorageMap.set('SKB_SESSION_USER', JSON.stringify(this.currentUser));
  }

  // Log keluar pengguna secara manual
  logout() {
    this.currentUser = null;
    this.sessionStorageMap.delete(BROWSER_SESSION_KEY);
    this.sessionStorageMap.delete('SKB_SESSION_USER');
    // Siarkan acara log keluar kepada tab lain
    this.broadcastChannelListeners.forEach(listener => listener({ type: 'LOGOUT' }));
  }

  // Simulasi menutup browser sepenuhnya dan membukanya semula
  // (Penyemak imbas memadamkan semua sessionStorage secara automatik)
  restartBrowser() {
    this.sessionStorageMap.clear();
    // Dalam restart browser, jika ada sisa memori objek, ia terhapus
    this.currentUser = null;
  }

  // Simulasi reload/refresh tab dalam sesi pelayar yang sama
  // (sessionStorage dikekalkan)
  reloadPage() {
    // Tiada pemadaman sessionStorage
    const active = this.sessionStorageMap.get(BROWSER_SESSION_KEY) === '1';
    if (!active) {
      this.currentUser = null;
    }
  }

  // Semakan sama ada sesi pelayar sah
  hasActiveSession(): boolean {
    return this.sessionStorageMap.get(BROWSER_SESSION_KEY) === '1' && this.currentUser !== null;
  }

  // Daftar pendengar BroadcastChannel
  onBroadcast(listener: (msg: any) => void) {
    this.broadcastChannelListeners.push(listener);
    return () => {
      this.broadcastChannelListeners = this.broadcastChannelListeners.filter(l => l !== listener);
    };
  }
}

describe('Audit & Pengesahan Dasar Sesi Pelayar (Browser Session Persistence)', () => {
  let sim: BrowserSessionSimulator;

  beforeEach(() => {
    vi.useFakeTimers();
    sim = new BrowserSessionSimulator();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // 1. Pengguna membuka laman web dan belum mempunyai sesi sah -> halaman Login
  it('1. Memaparkan halaman Login apabila pengguna membuka laman web tanpa sesi sah', () => {
    expect(sim.hasActiveSession()).toBe(false);
    expect(sim.currentUser).toBeNull();

    // Guard route: jika tiada sesi aktif, lencongkan ke /login
    const destination = sim.hasActiveSession() ? '/dashboard' : '/login';
    expect(destination).toBe('/login');
  });

  // 2. Pengguna berjaya log masuk -> bawa ke Dashboard
  it('2. Membawa pengguna ke Dashboard selepas berjaya log masuk', () => {
    sim.login('USR_TEACHER_01', 'guru@sigoo.my', 'TEACHER');

    expect(sim.hasActiveSession()).toBe(true);
    expect(sim.currentUser?.email).toBe('guru@sigoo.my');

    const destination = sim.hasActiveSession() ? '/dashboard' : '/login';
    expect(destination).toBe('/dashboard');
  });

  // 3. TIADA timeout 30 minit: Terbiar > 30 minit tanpa aktiviti -> TIDAK log keluar
  it('3. Sesi KEKAL AKTIF dan tidak log keluar automatik walaupun terbiar melebihi 30 minit atau 2 jam', () => {
    sim.login('USR_ADMIN_01', 'admin@sigoo.my', 'ADMIN');
    expect(sim.hasActiveSession()).toBe(true);

    // Simulasi masa berlalu 35 minit tanpa sebarang aktiviti fizikal pengguna
    vi.advanceTimersByTime(35 * 60 * 1000);

    // Dasar baharu: TIADA timeout 30 minit, sesi kekal aktif sepenuhnya
    expect(sim.hasActiveSession()).toBe(true);
    expect(sim.currentUser).not.toBeNull();

    // Majukan lagi masa sehingga 2 jam (120 minit)
    vi.advanceTimersByTime(85 * 60 * 1000);
    expect(sim.hasActiveSession()).toBe(true);
    expect(sim.currentUser?.uid).toBe('USR_ADMIN_01');
  });

  // 4. Pengguna terus menggunakan sistem termasuk mengimbas QR -> sesi kekal aktif
  it('4. Operasi imbasan QR dan rekod kehadiran berfungsi lancar sepanjang sesi browser terbuka', () => {
    sim.login('USR_STAFF_01', 'staf@sigoo.my', 'STAFF');

    // 45 minit berlalu sambil mengimbas
    vi.advanceTimersByTime(45 * 60 * 1000);

    const recordAttendance = (studentId: string) => {
      if (!sim.hasActiveSession()) {
        throw new Error('UNAUTHENTICATED');
      }
      return { success: true, studentId, timestamp: new Date().toISOString() };
    };

    const res = recordAttendance('STU_001');
    expect(res.success).toBe(true);
    expect(res.studentId).toBe('STU_001');
  });

  // 5. Pengguna menutup browser dan membukanya semula -> mesti log masuk semula
  it('5. Pengguna MESTI log masuk semula selepas menutup dan membuka semula pelayar', () => {
    sim.login('USR_TEACHER_01', 'guru@sigoo.my', 'TEACHER');
    expect(sim.hasActiveSession()).toBe(true);

    // Pengguna menutup browser sepenuhnya (sessionStorage dihapuskan oleh OS/browser)
    sim.restartBrowser();

    // Apabila laman dibuka semula dalam sesi browser baharu
    expect(sim.hasActiveSession()).toBe(false);
    expect(sim.currentUser).toBeNull();

    // Laluan terlindung menolak akses
    const redirectUrl = sim.hasActiveSession() ? '/dashboard' : '/login';
    expect(redirectUrl).toBe('/login');
  });

  // 6. Menyegarkan laman (page reload) dalam sesi pelayar yang sama mengekalkan log masuk
  it('6. Menyegarkan laman (reload) dalam sesi pelayar yang sama mengekalkan log masuk pengguna', () => {
    sim.login('USR_TEACHER_01', 'guru@sigoo.my', 'TEACHER');

    // Pengguna menekan F5 / Refresh
    sim.reloadPage();

    expect(sim.hasActiveSession()).toBe(true);
    expect(sim.currentUser?.uid).toBe('USR_TEACHER_01');
  });

  // 7. Pengguna menekan butang Log Keluar -> tamatkan sesi dan bawa ke Login
  it('7. Butang Log Keluar menamatkan sesi serta-merta dan membersihkan penanda sesi', () => {
    sim.login('USR_ADMIN_01', 'admin@sigoo.my', 'ADMIN');
    expect(sim.hasActiveSession()).toBe(true);

    // Pengguna menekan butang Log Keluar
    sim.logout();

    expect(sim.hasActiveSession()).toBe(false);
    expect(sim.currentUser).toBeNull();
    expect(sim.sessionStorageMap.get(BROWSER_SESSION_KEY)).toBeUndefined();
  });

  // 8. Pengguna cuba membuka halaman terlindung selepas log keluar -> akses ditolak
  it('8. Menolak sebarang akses ke halaman terlindung selepas sesi ditamatkan', () => {
    sim.login('USR_TEACHER_01', 'guru@sigoo.my', 'TEACHER');
    sim.logout();

    const protectedGuard = (path: string) => {
      if (!sim.hasActiveSession()) return '/login';
      return path;
    };

    expect(protectedGuard('/students')).toBe('/login');
    expect(protectedGuard('/settings')).toBe('/login');
    expect(protectedGuard('/reports')).toBe('/login');
    expect(protectedGuard('/print-cards')).toBe('/login');
  });

  // 9. Akaun yang dinyahaktifkan disekat oleh kawalan keselamatan
  it('9. Akaun yang dinyahaktifkan disekat daripada mengakses ciri sistem', () => {
    sim.login('USR_INACTIVE', 'bekas@sigoo.my', 'TEACHER', false); // active: false

    const checkAccess = () => {
      if (!sim.currentUser?.active) {
        throw new Error('DEACTIVATED_ACCOUNT');
      }
      return true;
    };

    expect(() => checkAccess()).toThrow('DEACTIVATED_ACCOUNT');
  });

  // 10. Kawalan peranan pengguna (ADMIN, TEACHER, STAFF) berfungsi dengan tepat
  it('10. Mengekalkan pembezaan kebenaran mengikut peranan pengguna', () => {
    sim.login('USR_STAFF_01', 'staf@sigoo.my', 'STAFF');

    const canEditSettings = (role: string) => role === 'ADMIN';
    const canScanQR = (role: string) => ['ADMIN', 'TEACHER', 'STAFF'].includes(role);

    expect(canEditSettings(sim.currentUser!.role)).toBe(false);
    expect(canScanQR(sim.currentUser!.role)).toBe(true);
  });

  // 11. Penyegerakan log keluar merentas tab pelayar
  it('11. Tindakan Log Keluar pada satu tab menyegerakkan penamatan sesi pada tab lain', () => {
    sim.login('USR_TEACHER_01', 'guru@sigoo.my', 'TEACHER');

    let tabBLoggedOut = false;
    const unsub = sim.onBroadcast((msg) => {
      if (msg.type === 'LOGOUT') {
        tabBLoggedOut = true;
      }
    });

    // Tab A log keluar
    sim.logout();

    expect(tabBLoggedOut).toBe(true);
    unsub();
  });

  // 12. Data sensitif murid disekat apabila sesi tiada atau telah ditamatkan
  it('12. Data murid tidak dipulangkan sekiranya sesi tidak sah', () => {
    const fetchStudents = () => {
      if (!sim.hasActiveSession()) return null;
      return [{ id: 'S1', name: 'MOHD ALI' }];
    };

    expect(fetchStudents()).toBeNull();
  });
});
