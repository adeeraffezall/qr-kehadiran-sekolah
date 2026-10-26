import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  query, 
  where, 
  onSnapshot,
  runTransaction 
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase';
import { AttendanceRecord, AttendanceStatus, ScanResult, SessionInfo, SessionType } from '../types';
import { createAuditLog } from './auditService';
import { hashTokenClient } from './qrService';
import { getMalaysianCurrentTime, getTodayMalaysianDate } from '../utils/dateUtils';
import { mockStore } from './mockDataStore';

export async function recordStudentAttendance(
  token: string, 
  actorUid: string, 
  sessionTypePreference?: SessionType
): Promise<ScanResult> {
  const cleanToken = token.trim();
  if (!cleanToken) {
    return {
      success: false,
      code: 'EMPTY_TOKEN',
      message: 'Kod imbasan tidak sah atau kosong.'
    };
  }

  // 1. Cuba Cloud Function jika disambung
  try {
    const recordFn = httpsCallable<{ token: string; sessionType?: SessionType }, ScanResult>(
      functions, 
      'recordAttendance'
    );
    const response = await recordFn({ token: cleanToken, sessionType: sessionTypePreference });
    if (response && response.data) {
      return response.data;
    }
  } catch {
    // Teruskan ke Firestore atau Mock Store
  }

  const dateStr = getTodayMalaysianDate();
  const currentTime = getMalaysianCurrentTime();
  const currentHour = parseInt(currentTime.split(':')[0], 10);
  const sessionType: SessionType = sessionTypePreference || (currentHour < 12 ? 'PAGI' : 'PULANG');

  // Cari murid sama ada di Firestore atau mockStore
  let student: any = null;
  const tokenHash = await hashTokenClient(cleanToken);

  try {
    const studentsRef = collection(db, 'students');
    const studentQuery = query(studentsRef, where('qrTokenHash', '==', tokenHash));
    const studentSnap = await getDocs(studentQuery);
    if (!studentSnap.empty) {
      student = { id: studentSnap.docs[0].id, ...studentSnap.docs[0].data() };
    }
  } catch {
    // Fallback
  }

  if (!student) {
    // Cari dalam mockStore
    const foundInMock = mockStore.findStudentByToken(cleanToken);
    if (foundInMock) {
      student = foundInMock;
    }
  }

  if (!student) {
    return {
      success: false,
      code: 'TOKEN_NOT_FOUND',
      message: 'Kad QR tidak sepadan dengan mana-mana murid berdaftar atau telah dibatalkan.'
    };
  }

  if (!student.active) {
    return {
      success: false,
      code: 'STUDENT_INACTIVE',
      message: `Murid ${student.fullName} berstatus TIDAK AKTIF.`
    };
  }

  // Semak status sesi
  const sessionInfo = await getSessionInfo(dateStr, sessionType);
  if (sessionInfo.status === 'CLOSED') {
    return {
      success: false,
      code: 'SESSION_CLOSED',
      message: `Sesi ${sessionType} bagi tarikh ${dateStr} telah DITUTUP oleh pihak sekolah.`
    };
  }

  const lateThreshold = sessionInfo.lateAfter || (sessionType === 'PAGI' ? '07:30' : '13:00');
  let status: AttendanceStatus = 'HADIR';
  if (sessionType === 'PAGI' && currentTime > lateThreshold) {
    status = 'LEWAT';
  }

  const recordId = `${student.id}_${dateStr}_${sessionType}`;
  const className = student.className || 'Kelas';

  // Semak jika rekod pendua wujud
  const existingRecords = await getAttendanceByDateAndSession(dateStr, sessionType);
  const duplicate = existingRecords.find(r => r.studentId === student.id || r.id === recordId);

  if (duplicate) {
    return {
      success: false,
      duplicate: true,
      code: 'ALREADY_RECORDED',
      message: `Kehadiran bagi ${student.fullName} (${className}) telah direkodkan sebelum ini.`,
      student: {
        fullName: student.fullName,
        studentNumber: student.studentNumber || '',
        className
      },
      status: duplicate.status,
      date: dateStr,
      session: sessionType
    };
  }

  const newRecord: AttendanceRecord = {
    id: recordId,
    studentId: student.id,
    studentNameSnapshot: student.fullName,
    classIdSnapshot: student.classId || '',
    classNameSnapshot: className,
    date: dateStr,
    session: sessionType,
    status,
    scannedAt: new Date().toISOString(),
    scannedBy: actorUid,
    source: 'QR'
  };

  try {
    const recordRef = doc(db, 'attendance', recordId);
    await setDoc(recordRef, {
      ...newRecord,
      scannedAt: serverTimestamp()
    });
  } catch {
    // Fallback simpan ke mockStore
  }

  mockStore.addAttendance(newRecord);

  return {
    success: true,
    duplicate: false,
    message: status === 'LEWAT' ? 'Kehadiran LEWAT berjaya direkodkan.' : 'Kehadiran HADIR berjaya direkodkan.',
    student: {
      id: student.id,
      fullName: student.fullName,
      studentNumber: student.studentNumber || '',
      className
    },
    status,
    date: dateStr,
    session: sessionType,
    time: currentTime
  };
}

export async function getSessionInfo(dateStr: string, sessionType: SessionType): Promise<SessionInfo> {
  try {
    const sessionId = `${dateStr}_${sessionType}`;
    const sessionRef = doc(db, 'sessions', sessionId);
    const snap = await getDoc(sessionRef);
    if (snap.exists()) {
      const data = { id: snap.id, ...snap.data() } as SessionInfo;
      mockStore.setSession(data);
      return data;
    }
  } catch {
    // Fallback
  }
  return mockStore.getSession(dateStr, sessionType);
}

export function subscribeSessionInfo(
  dateStr: string,
  sessionType: SessionType,
  callback: (session: SessionInfo) => void
): () => void {
  const sessionId = `${dateStr}_${sessionType}`;
  try {
    const sessionRef = doc(db, 'sessions', sessionId);
    const unsubscribe = onSnapshot(sessionRef, (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as SessionInfo;
        mockStore.setSession(data);
        callback(data);
      } else {
        callback(mockStore.getSession(dateStr, sessionType));
      }
    }, (err) => {
      console.warn('Subscription session error:', err.message);
      callback(mockStore.getSession(dateStr, sessionType));
    });
    return unsubscribe;
  } catch (err) {
    callback(mockStore.getSession(dateStr, sessionType));
    return () => {};
  }
}

export function subscribeAttendance(
  dateStr: string,
  sessionType: SessionType,
  callback: (records: AttendanceRecord[]) => void
): () => void {
  try {
    const attendanceRef = collection(db, 'attendance');
    const q = query(attendanceRef, where('date', '==', dateStr), where('session', '==', sessionType));
    const unsubscribe = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
        list.forEach(r => mockStore.addAttendance(r));
        callback(list);
      } else {
        callback(mockStore.getAttendance(dateStr, sessionType));
      }
    }, (err) => {
      console.warn('Subscription attendance error:', err.message);
      callback(mockStore.getAttendance(dateStr, sessionType));
    });
    return unsubscribe;
  } catch (err) {
    callback(mockStore.getAttendance(dateStr, sessionType));
    return () => {};
  }
}

export async function manageSession(
  actorUid: string,
  actorEmail: string,
  dateStr: string,
  sessionType: SessionType,
  action: 'OPEN' | 'CLOSE' | 'REOPEN',
  lateAfter: string,
  reason?: string
): Promise<void> {
  const sessionId = `${dateStr}_${sessionType}`;
  const isClosing = action === 'CLOSE';
  const newStatus = isClosing ? 'CLOSED' : 'OPEN';

  const payload: SessionInfo = {
    id: sessionId,
    date: dateStr,
    type: sessionType,
    status: newStatus,
    startTime: sessionType === 'PAGI' ? '06:30' : '12:30',
    endTime: sessionType === 'PAGI' ? '08:00' : '14:30',
    lateAfter: lateAfter || '07:30'
  };

  try {
    const sessionRef = doc(db, 'sessions', sessionId);
    await setDoc(sessionRef, {
      ...payload,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch {
    // Fallback
  }

  mockStore.setSession(payload);

  await createAuditLog(
    actorUid,
    actorEmail,
    `SESSION_${action}`,
    'SESSION',
    sessionId,
    reason || `Tindakan ${action} pada sesi ${sessionType}`,
    null,
    payload
  );
}

export async function getAttendanceByDateAndSession(
  dateStr: string, 
  sessionType?: SessionType
): Promise<AttendanceRecord[]> {
  try {
    const attendanceRef = collection(db, 'attendance');
    let q = query(attendanceRef, where('date', '==', dateStr));
    if (sessionType) {
      q = query(attendanceRef, where('date', '==', dateStr), where('session', '==', sessionType));
    }
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
    }
  } catch {
    // Fallback
  }
  return mockStore.getAttendance(dateStr, sessionType);
}

export async function getMonthlyAttendance(year: number, month: number): Promise<AttendanceRecord[]> {
  try {
    const monthStr = String(month).padStart(2, '0');
    const startDate = `${year}-${monthStr}-01`;
    const endDate = `${year}-${monthStr}-31`;

    const attendanceRef = collection(db, 'attendance');
    const q = query(attendanceRef, where('date', '>=', startDate), where('date', '<=', endDate));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
    }
  } catch {
    // Fallback
  }
  return mockStore.getMonthlyAttendance(year, month);
}

export async function correctAttendanceRecord(
  actorUid: string,
  actorEmail: string,
  recordId: string,
  newStatus: AttendanceStatus,
  reason: string
): Promise<void> {
  if (!reason || reason.trim().length < 5) {
    throw new Error('Sebab pembetulan wajib diisi sekurang-kurangnya 5 aksara.');
  }

  try {
    const fn = httpsCallable(functions, 'correctAttendance');
    await fn({ recordId, newStatus, reason: reason.trim() });
  } catch {
    // Fallback
  }

  mockStore.updateAttendance(recordId, {
    status: newStatus,
    correctionReason: reason.trim(),
    correctedBy: actorUid,
    updatedAt: new Date().toISOString()
  });

  await createAuditLog(
    actorUid,
    actorEmail,
    'CORRECT_ATTENDANCE',
    'ATTENDANCE',
    recordId,
    reason.trim(),
    null,
    { status: newStatus, correctionReason: reason.trim() }
  );
}
