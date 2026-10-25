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
import { mockStore } from './mockDataStore';

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
  const logEntry: AuditLog = {
    actorUid,
    actorEmail: actorEmail || 'N/A',
    action,
    entityType,
    entityId,
    reason: reason || undefined,
    before: before || undefined,
    after: after || undefined,
    createdAt: new Date().toISOString()
  };

  try {
    const logsRef = collection(db, 'auditLogs');
    await addDoc(logsRef, {
      ...logEntry,
      createdAt: serverTimestamp()
    });
  } catch {
    // Fallback
  }

  mockStore.addAuditLog(logEntry);
}

export async function getAuditLogs(maxLogs: number = 100, entityTypeFilter?: string): Promise<AuditLog[]> {
  try {
    const logsRef = collection(db, 'auditLogs');
    let q = query(logsRef, orderBy('createdAt', 'desc'), limit(maxLogs));

    if (entityTypeFilter && entityTypeFilter !== 'ALL') {
      q = query(logsRef, where('entityType', '==', entityTypeFilter), orderBy('createdAt', 'desc'), limit(maxLogs));
    }

    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
    }
  } catch {
    // Fallback
  }

  let logs = mockStore.getAuditLogs();
  if (entityTypeFilter && entityTypeFilter !== 'ALL') {
    logs = logs.filter(l => l.entityType === entityTypeFilter);
  }
  return logs.slice(0, maxLogs);
}
