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

export async function getClasses(): Promise<ClassItem[]> {
  const classesRef = collection(db, 'classes');
  const q = query(classesRef, orderBy('yearLevel', 'asc'), orderBy('name', 'asc'));
  const snap = await getDocs(q);

  return snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  } as ClassItem));
}

export async function addClass(
  actorUid: string,
  actorEmail: string,
  name: string, 
  yearLevel: number
): Promise<string> {
  const classesRef = collection(db, 'classes');
  const newDoc = doc(classesRef);
  const now = serverTimestamp();

  const classData: Omit<ClassItem, 'id'> = {
    name: name.trim(),
    yearLevel,
    active: true,
    createdAt: now,
    updatedAt: now
  };

  await setDoc(newDoc, classData);

  await createAuditLog(
    actorUid,
    actorEmail,
    'CREATE_CLASS',
    'CLASS',
    newDoc.id,
    'Tambah kelas baharu',
    null,
    classData
  );

  return newDoc.id;
}

export async function updateClass(
  actorUid: string,
  actorEmail: string,
  classId: string, 
  data: Partial<ClassItem>
): Promise<void> {
  const classRef = doc(db, 'classes', classId);
  const now = serverTimestamp();

  await updateDoc(classRef, {
    ...data,
    updatedAt: now
  });

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
