import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp,
  where
} from 'firebase/firestore';
import { db } from './firebase';
import { AuditLog } from '../types';

export async function createAuditLog(
  actorUid: string,
  actorEmail: string | undefined,
  action: string,
  entityType: AuditLog['entityType'],
  entityId: string,
  reason?: string,
  before?: any,
  after?: any
): Promise<void> {
  try {
    const logsRef = collection(db, 'auditLogs');
    await addDoc(logsRef, {
      actorUid,
      actorEmail: actorEmail || 'N/A',
      action,
      entityType,
      entityId,
      reason: reason || null,
      before: before || null,
      after: after || null,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Ralat semasa merekod Log Audit:', error);
  }
}

export async function getAuditLogs(maxLogs: number = 100, entityTypeFilter?: string): Promise<AuditLog[]> {
  const logsRef = collection(db, 'auditLogs');
  let q = query(logsRef, orderBy('createdAt', 'desc'), limit(maxLogs));

  if (entityTypeFilter && entityTypeFilter !== 'ALL') {
    q = query(logsRef, where('entityType', '==', entityTypeFilter), orderBy('createdAt', 'desc'), limit(maxLogs));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as AuditLog));
}
