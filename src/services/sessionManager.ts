/**
 * Pengurus Sesi Keselamatan & Had Masa Ketidakaktifan (Session Inactivity Manager)
 * Menguatkuasakan polisi keselamatan: Sesi kekal dengan had masa ketidakaktifan 30 minit.
 */

export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 Minit
export const WARNING_WINDOW_MS = 2 * 60 * 1000;      // 2 Minit Amaran Awal (pada minit ke-28)
export const THROTTLE_INTERVAL_MS = 5 * 1000;        // 5 Saat Had Penulisan Storan

export const SESSION_LAST_ACTIVE_KEY = 'SKB_SESSION_LAST_ACTIVE';
export const SESSION_USER_ID_KEY = 'SKB_SESSION_USER_ID';
export const SESSION_TERMINATED_MSG_KEY = 'SKB_SESSION_TERMINATED_MSG';
export const DEFAULT_TIMEOUT_MESSAGE = 'Sesi anda tamat selepas 30 minit tidak aktif. Sila log masuk semula.';

export type SessionEventType = 'ACTIVITY' | 'EXTEND' | 'TERMINATE' | 'LOGIN';

export interface SessionEvent {
  type: SessionEventType;
  timestamp: number;
  reason?: string;
}

class SessionManager {
  private lastActivityThrottle = 0;
  private listeners = new Set<(event: SessionEvent) => void>();
  private channel: BroadcastChannel | null = null;
  private storageEventListener: ((e: StorageEvent) => void) | null = null;
  private memoryStore = new Map<string, string>();

  constructor() {
    this.setupInterTabSync();
  }

  private getItem(key: string): string | null {
    if (typeof localStorage !== 'undefined') {
      try {
        const val = localStorage.getItem(key);
        if (val !== null) return val;
      } catch {
        // Abaikan
      }
    }
    return this.memoryStore.get(key) || null;
  }

  private setItem(key: string, value: string): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, value);
      } catch {
        // Abaikan
      }
    }
    this.memoryStore.set(key, value);
  }

  private removeItem(key: string): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(key);
      } catch {
        // Abaikan
      }
    }
    this.memoryStore.delete(key);
  }

  clear(): void {
    this.removeItem(SESSION_LAST_ACTIVE_KEY);
    this.removeItem(SESSION_USER_ID_KEY);
    this.removeItem(SESSION_TERMINATED_MSG_KEY);
    this.memoryStore.clear();
    this.lastActivityThrottle = 0;
  }

  /**
   * Persiapkan saluran komunikasi merentas tab (Cross-Tab Synchronization)
   */
  private setupInterTabSync() {
    if (typeof window === 'undefined') return;

    try {
      if ('BroadcastChannel' in window) {
        this.channel = new BroadcastChannel('skb_session_sync_channel');
        this.channel.onmessage = (ev: MessageEvent<SessionEvent>) => {
          if (ev.data && ev.data.type) {
            this.notifyListeners(ev.data);
          }
        };
      }
    } catch {
      this.channel = null;
    }

    // Sandaran komunikasi rentas tab menggunakan StorageEvent
    this.storageEventListener = (e: StorageEvent) => {
      if (e.key === SESSION_LAST_ACTIVE_KEY && e.newValue) {
        this.notifyListeners({
          type: 'ACTIVITY',
          timestamp: Number(e.newValue)
        });
      } else if (e.key === SESSION_TERMINATED_MSG_KEY && e.newValue) {
        this.notifyListeners({
          type: 'TERMINATE',
          timestamp: Date.now(),
          reason: e.newValue
        });
      }
    };

    window.addEventListener('storage', this.storageEventListener);
  }

  /**
   * Mulakan sesi baharu semasa log masuk berjaya
   */
  initSession(uid: string): void {
    const now = Date.now();
    this.lastActivityThrottle = now;

    this.setItem(SESSION_USER_ID_KEY, uid);
    this.setItem(SESSION_LAST_ACTIVE_KEY, now.toString());
    this.removeItem(SESSION_TERMINATED_MSG_KEY);

    this.broadcast({
      type: 'LOGIN',
      timestamp: now
    });
  }

  /**
   * Rakam aktiviti fizikal pengguna sebenar (tetikus, papan kekunci, sentuhan, navigasi)
   * Menggunakan throttling 5 saat untuk mengelakkan bebanan I/O storan pelayar.
   * Background polling & automated requests TIDAK memanggil fungsi ini.
   */
  recordUserActivity(): void {
    const now = Date.now();
    if (now - this.lastActivityThrottle < THROTTLE_INTERVAL_MS) {
      return;
    }

    // Jika sesi telah tamat tempoh, jangan lanjutkan sesi secara senyap!
    if (!this.isSessionValid()) {
      return;
    }

    this.lastActivityThrottle = now;
    this.setItem(SESSION_LAST_ACTIVE_KEY, now.toString());

    this.broadcast({
      type: 'ACTIVITY',
      timestamp: now
    });
  }

  /**
   * Dapatkan cap masa aktiviti terakhir
   */
  getLastActiveTimestamp(): number {
    const raw = this.getItem(SESSION_LAST_ACTIVE_KEY);
    if (raw) {
      const parsed = Number(raw);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
    return 0;
  }

  /**
   * Periksa sama ada sesi masih sah mengikut had masa ketidakaktifan 30 minit
   */
  isSessionValid(): boolean {
    const lastActive = this.getLastActiveTimestamp();
    if (!lastActive) {
      return false;
    }

    const elapsed = Date.now() - lastActive;
    // Sesi sah jika ketidakaktifan kurang daripada 30 minit
    return elapsed < INACTIVITY_TIMEOUT_MS;
  }

  /**
   * Kira baki masa ketidakaktifan (dalam milisaat) sebelum tamat
   */
  getRemainingTimeMs(): number {
    const lastActive = this.getLastActiveTimestamp();
    if (!lastActive) return 0;

    const elapsed = Date.now() - lastActive;
    return Math.max(0, INACTIVITY_TIMEOUT_MS - elapsed);
  }

  /**
   * Semak sama ada sesi kini berada dalam jendela amaran 2 minit (antara minit 28 dan 30)
   */
  isWarningPeriod(): boolean {
    const remaining = this.getRemainingTimeMs();
    return remaining > 0 && remaining <= WARNING_WINDOW_MS;
  }

  /**
   * Sambung/Kekalkan Sesi ("Continue Session") apabila pengguna menekan butang pada modal amaran.
   * Keselamatan: Sesi yang SUDAH tamat tempoh tidak boleh dihidupkan semula!
   */
  extendSession(): boolean {
    if (!this.isSessionValid()) {
      // Sesi telah luput, tolak pembaharuan
      return false;
    }

    const now = Date.now();
    this.lastActivityThrottle = now;

    this.setItem(SESSION_LAST_ACTIVE_KEY, now.toString());
    this.removeItem(SESSION_TERMINATED_MSG_KEY);

    this.broadcast({
      type: 'EXTEND',
      timestamp: now
    });

    return true;
  }

  /**
   * Tamatkan sesi secara rasmi (sama ada akibat ketidakaktifan 30 minit atau log keluar manual)
   */
  terminateSession(reason: string = DEFAULT_TIMEOUT_MESSAGE, broadcast: boolean = true): void {
    this.removeItem(SESSION_LAST_ACTIVE_KEY);
    this.removeItem(SESSION_USER_ID_KEY);
    if (reason) {
      this.setItem(SESSION_TERMINATED_MSG_KEY, reason);
    }

    if (broadcast) {
      this.broadcast({
        type: 'TERMINATE',
        timestamp: Date.now(),
        reason
      });
    }
  }

  /**
   * Dapatkan mesej tamat sesi dan padamkannya supaya tidak berulang
   */
  consumeTerminatedMessage(): string | null {
    const msg = this.getItem(SESSION_TERMINATED_MSG_KEY);
    if (msg) {
      this.removeItem(SESSION_TERMINATED_MSG_KEY);
      return msg;
    }
    return null;
  }

  /**
   * Langgan acara sesi (untuk dikendalikan oleh React components/hooks)
   */
  onSessionEvent(listener: (event: SessionEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(event: SessionEvent): void {
    this.listeners.forEach(fn => {
      try {
        fn(event);
      } catch (err) {
        console.error('Session listener error:', err);
      }
    });
  }

  private broadcast(event: SessionEvent): void {
    this.notifyListeners(event);
    if (this.channel) {
      try {
        this.channel.postMessage(event);
      } catch {
        // Fallback ke storage event
      }
    }
  }

  /**
   * Pasang pendengar interaksi fizikal pengguna pada window (Throttled & Passive)
   */
  attachUserActivityListeners(): () => void {
    if (typeof window === 'undefined') return () => {};

    const handleActivity = () => {
      this.recordUserActivity();
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'pointerdown', 'scroll'];
    events.forEach(ev => {
      window.addEventListener(ev, handleActivity, { passive: true });
    });

    return () => {
      events.forEach(ev => {
        window.removeEventListener(ev, handleActivity);
      });
    };
  }

  destroy(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    if (typeof window !== 'undefined' && this.storageEventListener) {
      window.removeEventListener('storage', this.storageEventListener);
      this.storageEventListener = null;
    }
    this.listeners.clear();
  }
}

export const sessionManager = new SessionManager();
