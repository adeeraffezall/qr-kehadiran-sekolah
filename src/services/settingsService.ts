import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface SessionConfig {
  morningStart: string;
  morningEnd: string;
  morningLate: string;
  dismissalStart: string;
  dismissalEnd: string;
  updatedAt?: any;
}

const SETTINGS_STORAGE_KEY = 'SKB_SESSION_CONFIG_V2';

export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  morningStart: '06:30',
  morningEnd: '08:00',
  morningLate: '07:00', // Ambang piawai SK Batandok (07:00 AM)
  dismissalStart: '12:30',
  dismissalEnd: '14:30'
};

/**
 * Dapatkan konfigurasi waktu sesi dari storan tempatan (localStorage)
 */
export function getLocalSessionConfig(): SessionConfig {
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        return { ...DEFAULT_SESSION_CONFIG, ...JSON.parse(raw) };
      }
    } catch {
      // Abaikan
    }
  }
  return DEFAULT_SESSION_CONFIG;
}

/**
 * Dapatkan konfigurasi waktu sesi daripada pangkalan data awan (Firestore)
 */
export async function getSessionConfig(): Promise<SessionConfig> {
  try {
    const ref = doc(db, 'settings', 'sessionConfig');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() as SessionConfig;
      const merged = { ...DEFAULT_SESSION_CONFIG, ...data };
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
      }
      return merged;
    }
  } catch (err) {
    console.warn('Gagal memuatkan tetapan waktu dari Firestore:', err);
  }
  return getLocalSessionConfig();
}

/**
 * Simpan konfigurasi waktu sesi secara kekal (Firestore & LocalStorage)
 */
export async function saveSessionConfig(
  actorUid: string,
  actorEmail: string,
  config: SessionConfig
): Promise<void> {
  // 1. Simpan ke storan tempatan serta-merta
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  // 2. Simpan ke Firestore
  try {
    const ref = doc(db, 'settings', 'sessionConfig');
    await setDoc(ref, {
      ...config,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('Gagal menyimpan tetapan waktu ke Firestore:', err);
  }

  // 3. Rekod jejak audit
  try {
    const { createAuditLog } = await import('./auditService');
    await createAuditLog(
      actorUid,
      actorEmail,
      'UPDATE_SESSION_CONFIG',
      'SETTINGS',
      'sessionConfig',
      `Menetapkan ambang lewat sesi pagi: ${config.morningLate}, mula: ${config.morningStart}, tamat: ${config.morningEnd}`,
      null,
      config
    );
  } catch (auditErr) {
    console.warn('Gagal merekodkan jejak audit tetapan:', auditErr);
  }
}
