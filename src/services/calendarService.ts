import { 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  setDoc, 
  serverTimestamp,
  query,
  where
} from 'firebase/firestore';
import { db } from './firebase';
import { SchoolDay } from '../types';
import { createAuditLog } from './auditService';
import { isWeekend } from '../utils/dateUtils';

export async function getSchoolDay(dateStr: string): Promise<SchoolDay> {
  const ref = doc(db, 'schoolDays', dateStr);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return snap.data() as SchoolDay;
  }

  // Jika tiada dalam pangkalan data, gunakan takwim lalai (Isnin-Jumaat adalah hari sekolah)
  const weekend = isWeekend(dateStr);
  return {
    date: dateStr,
    isSchoolDay: !weekend,
    dayType: weekend ? 'HOLIDAY' : 'REGULAR',
    notes: weekend ? 'Hujung Minggu' : 'Hari Persekolahan Biasa'
  };
}

export async function getSchoolDaysForMonth(year: number, month: number): Promise<Map<string, SchoolDay>> {
  const monthStr = String(month).padStart(2, '0');
  const startDate = `${year}-${monthStr}-01`;
  const endDate = `${year}-${monthStr}-31`;

  const colRef = collection(db, 'schoolDays');
  const q = query(colRef, where('date', '>=', startDate), where('date', '<=', endDate));
  const snap = await getDocs(q);

  const map = new Map<string, SchoolDay>();
  snap.docs.forEach(d => {
    map.set(d.id, d.data() as SchoolDay);
  });

  return map;
}

export async function setSchoolDay(
  actorUid: string,
  actorEmail: string,
  dateStr: string,
  isSchoolDay: boolean,
  dayType: SchoolDay['dayType'],
  notes: string
): Promise<void> {
  const ref = doc(db, 'schoolDays', dateStr);
  const now = serverTimestamp();

  const payload: SchoolDay = {
    date: dateStr,
    isSchoolDay,
    dayType,
    notes: notes.trim(),
    updatedAt: now
  };

  await setDoc(ref, payload, { merge: true });

  await createAuditLog(
    actorUid,
    actorEmail,
    'UPDATE_SCHOOL_CALENDAR',
    'SETTINGS',
    dateStr,
    `Tetapan takwim bagi tarikh ${dateStr} (${dayType})`,
    null,
    payload
  );
}

/**
 * Kira jumlah hari persekolahan yang layak bagi bulan tertentu
 */
export function countEligibleSchoolDays(
  year: number, 
  month: number, 
  customDaysMap: Map<string, SchoolDay>,
  upToDateStr?: string
): number {
  const daysInMonth = new Date(year, month, 0).getDate();
  let count = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${dayStr}`;

    if (upToDateStr && dateStr > upToDateStr) {
      continue; // Jangan kira hari hadapan yang belum tiba
    }

    const custom = customDaysMap.get(dateStr);
    if (custom) {
      if (custom.isSchoolDay) count++;
    } else {
      // Default: bukan hujung minggu = hari sekolah
      if (!isWeekend(dateStr)) count++;
    }
  }

  return count;
}
