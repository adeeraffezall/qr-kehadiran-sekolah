import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  query, 
  orderBy,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { ClassItem } from '../types';
import { createAuditLog } from './auditService';
import { mockStore } from './mockDataStore';

let isSyncingClasses = false;

/**
 * Pastikan 7 kelas rasmi SK Batandok Beaufort disegerakkan ke Cloud Firestore
 */
export async function ensureBaselineClassesInFirestore(): Promise<void> {
  if (isSyncingClasses) return;
  try {
    const classesRef = collection(db, 'classes');
    const snap = await getDocs(query(classesRef));
    if (snap.empty) {
      isSyncingClasses = true;
      const initialClasses = mockStore.getClasses();
      if (initialClasses.length > 0) {
        const batch = writeBatch(db);
        initialClasses.forEach(c => {
          const docRef = doc(db, 'classes', c.id);
          batch.set(docRef, {
            ...c,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        });
        await batch.commit();
        console.log(`[Firestore] Berjaya menyegerak ${initialClasses.length} kelas rasmi ke Cloud Firestore.`);
      }
    }
  } catch (err) {
    console.warn('Gagal menyegerak kelas ke Firestore:', err);
  } finally {
    isSyncingClasses = false;
  }
}

/**
 * Langgan senarai kelas secara masa nyata (Realtime Listener - onSnapshot)
 */
export function subscribeClasses(callback: (classes: ClassItem[]) => void): () => void {
  try {
    const classesRef = collection(db, 'classes');
    const q = query(classesRef, orderBy('yearLevel', 'asc'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ClassItem));
        list.forEach(c => mockStore.addClass(c));
        callback(list);
      } else {
        callback(mockStore.getClasses());
      }
    }, (err) => {
      console.warn('Subscription classes error:', err.message);
      callback(mockStore.getClasses());
    });
    return unsubscribe;
  } catch (err) {
    callback(mockStore.getClasses());
    return () => {};
  }
}

export async function getClasses(): Promise<ClassItem[]> {
  try {
    const classesRef = collection(db, 'classes');
    const q = query(classesRef, orderBy('yearLevel', 'asc'), orderBy('name', 'asc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as ClassItem));
    }
  } catch {
    // Sambungan Firestore tidak tersedia
  }
  return mockStore.getClasses();
}

export async function addClass(
  actorUid: string,
  actorEmail: string,
  name: string, 
  yearLevel: number
): Promise<string> {
  const newId = `CLS_${Date.now()}`;
  const now = new Date().toISOString();

  const classData: ClassItem = {
    id: newId,
    name: name.trim().toUpperCase(),
    yearLevel,
    active: true,
    createdAt: now,
    updatedAt: now
  };

  try {
    const classesRef = collection(db, 'classes');
    const newDoc = doc(classesRef, newId);
    await setDoc(newDoc, { ...classData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  } catch {
    // Fallback
  }

  mockStore.addClass(classData);

  await createAuditLog(
    actorUid,
    actorEmail,
    'CREATE_CLASS',
    'CLASS',
    newId,
    'Tambah kelas baharu',
    null,
    classData
  );

  return newId;
}

export async function updateClass(
  actorUid: string,
  actorEmail: string,
  classId: string, 
  data: Partial<ClassItem>
): Promise<void> {
  try {
    const classRef = doc(db, 'classes', classId);
    await updateDoc(classRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch {
    // Fallback
  }

  mockStore.updateClass(classId, data);

  await createAuditLog(
    actorUid,
    actorEmail,
    'UPDATE_CLASS',
    'CLASS',
    classId,
    'Kemaskini maklumat kelas',
    null,
    data
  );
}

export async function deleteClass(
  actorUid: string,
  actorEmail: string,
  classId: string,
  className: string
): Promise<void> {
  try {
    const classRef = doc(db, 'classes', classId);
    await deleteDoc(classRef);
  } catch {
    // Fallback
  }

  mockStore.deleteClass(classId);

  await createAuditLog(
    actorUid,
    actorEmail,
    'DELETE_CLASS',
    'CLASS',
    classId,
    `Padam kelas: ${className}`,
    null,
    null
  );
}

export async function clearAllSchoolData(
  actorUid: string,
  actorEmail: string
): Promise<void> {
  mockStore.clearAllSampleData();

  await createAuditLog(
    actorUid,
    actorEmail,
    'CLEAR_SAMPLE_DATA',
    'SETTINGS',
    'ALL',
    'Kosongkan semua data sampel untuk permulaan data sebenar SK Batandok',
    null,
    null
  );
}
