import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc, 
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';
import { ClassItem } from '../types';
import { createAuditLog } from './auditService';
import { mockStore } from './mockDataStore';

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
