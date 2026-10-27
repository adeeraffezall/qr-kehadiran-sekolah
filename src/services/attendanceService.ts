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
import { getLocalSessionConfig } from './settingsService';

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

  // Semak status sesi (penutupan automatik & pilihan manual pentadbir)
  const sessionInfo = await getSessionInfo(dateStr, sessionType);
  if (sessionInfo.status === 'CLOSED') {
    let closedMsg = `Sesi ${sessionType} bagi tarikh ${dateStr} telah DITUTUP oleh pihak sekolah.`;
    if (sessionInfo.isAutoClosed) {
      if (sessionInfo.autoCloseReason === 'BEFORE_START_TIME') {
        closedMsg = `Sesi ${sessionType} belum dibuka (Waktu imbasan rasmi bermula pada jam ${sessionInfo.startTime} AM).`;
      } else {
        closedMsg = `Sesi ${sessionType} telah DITUTUP SECARA AUTOMATIK kerana telah melepasi waktu tamat imbasan (${sessionInfo.endTime} AM). Pentadbir masih boleh membuka semula sesi secara manual jika perlu.`;
      }
    } else if (sessionInfo.manualReason) {
      closedMsg = `Sesi ${sessionType} telah DITUTUP secara manual oleh pentadbir (${sessionInfo.manualReason}).`;
    }

    return {
      success: false,
      code: 'SESSION_CLOSED',
      message: closedMsg
    };
  }

  const config = getLocalSessionConfig();
  const lateThreshold = sessionInfo.lateAfter || (sessionType === 'PAGI' ? config.morningLate : '13:00');
  let status: AttendanceStatus = sessionType === 'PULANG' ? 'PULANG' : 'HADIR';
  if (sessionType === 'PAGI' && currentTime > lateThreshold) {
    status = 'LEWAT';
  }

  const recordId = `${student.id}_${dateStr}_${sessionType}`;
  const className = student.className || 'Kelas';

  // Semak jika rekod pendua wujud
  const existingRecords = await getAttendanceByDateAndSession(dateStr, sessionType);
  const duplicate = existingRecords.find(r => r.studentId === student.id || r.id === recordId);

  if (duplicate) {
    const isPulang = sessionType === 'PULANG';
    return {
      success: false,
      duplicate: true,
      code: 'ALREADY_RECORDED',
      message: isPulang
        ? `Rekod kepulangan bagi ${student.fullName} (${className}) telah direkodkan sebelum ini.`
        : `Kehadiran bagi ${student.fullName} (${className}) telah direkodkan sebelum ini.`,
      student: {
        fullName: student.fullName,
        studentNumber: student.studentNumber || '',
        className
      },
      status: isPulang ? 'PULANG' : duplicate.status,
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

  const successMsg = sessionType === 'PULANG'
    ? 'Rekod PULANG berjaya direkodkan.'
    : (status === 'LEWAT' ? 'Kehadiran LEWAT berjaya direkodkan.' : 'Kehadiran HADIR berjaya direkodkan.');

  return {
    success: true,
    duplicate: false,
    message: successMsg,
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

/**
 * Menilai status sesi secara dinamik mengikut masa semasa & pilihan manual pentadbir.
 * - Sesi ditutup secara automatik apabila waktu semasa melepasi endTime (contoh: 08:00 AM bagi Sesi Pagi).
 * - Pentadbir mengekalkan kuasa manual untuk Buka / Tutup / Buka Semula sesi pada bila-bila masa (manualOverride = true).
 */
export function evaluateSessionStatus(
  session: SessionInfo,
  currentTimeStr?: string,
  todayDateStr?: string
): SessionInfo {
  const today = todayDateStr || getTodayMalaysianDate();
  const currentTime = currentTimeStr || getMalaysianCurrentTime();

  const evaluated: SessionInfo = { ...session };

  // 1. Tarikh lampau (sebelum hari ini): Sentiasa DITUTUP melainkan jika dibuka secara khas
  if (evaluated.date < today) {
    if (!evaluated.manualOverride || evaluated.manualAction !== 'REOPEN') {
      evaluated.status = 'CLOSED';
      evaluated.isAutoClosed = true;
      evaluated.autoCloseReason = 'PAST_DATE';
      return evaluated;
    }
  }

  // 2. Tarikh akan datang (selepas hari ini): Belum tiba
  if (evaluated.date > today) {
    evaluated.status = 'CLOSED';
    evaluated.autoCloseReason = 'FUTURE_DATE';
    return evaluated;
  }

  // 3. Tarikh hari ini (evaluated.date === today):
  // Sekiranya ada campur tangan manual oleh Pentadbir
  if (evaluated.manualOverride) {
    if (evaluated.manualAction === 'CLOSE') {
      evaluated.status = 'CLOSED';
      evaluated.isAutoClosed = false;
      return evaluated;
    }
    if (evaluated.manualAction === 'OPEN' || evaluated.manualAction === 'REOPEN') {
      evaluated.status = 'OPEN';
      evaluated.isAutoClosed = false;
      return evaluated;
    }
  }

  // 4. Mod Automatik Mengikut Jendela Waktu Rasmi Sesi
  const startTime = evaluated.startTime || (evaluated.type === 'PAGI' ? '06:30' : '12:30');
  const endTime = evaluated.endTime || (evaluated.type === 'PAGI' ? '08:00' : '14:30');

  if (currentTime >= endTime) {
    // Melepasi waktu tamat imbasan (cth: 08:00 pagi ke atas bagi sesi pagi) -> DITUTUP SECARA AUTOMATIK
    evaluated.status = 'CLOSED';
    evaluated.isAutoClosed = true;
    evaluated.autoCloseReason = 'TIME_ELAPSED';
  } else if (currentTime < startTime) {
    // Sebelum waktu mula sesi imbasan (cth: sebelum 06:30 pagi)
    evaluated.status = 'CLOSED';
    evaluated.isAutoClosed = true;
    evaluated.autoCloseReason = 'BEFORE_START_TIME';
  } else {
    // Dalam jendela masa aktif (06:30 hingga 07:59 pagi) -> SESI DIBUKA
    evaluated.status = 'OPEN';
    evaluated.isAutoClosed = false;
    evaluated.autoCloseReason = undefined;
  }

  return evaluated;
}

export async function getSessionInfo(dateStr: string, sessionType: SessionType): Promise<SessionInfo> {
  try {
    const sessionId = `${dateStr}_${sessionType}`;
    const sessionRef = doc(db, 'sessions', sessionId);
    const snap = await getDoc(sessionRef);
    if (snap.exists()) {
      const data = { id: snap.id, ...snap.data() } as SessionInfo;
      mockStore.setSession(data);
      return evaluateSessionStatus(data);
    }
  } catch {
    // Fallback
  }
  return evaluateSessionStatus(mockStore.getSession(dateStr, sessionType));
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
      let data: SessionInfo;
      if (snap.exists()) {
        data = { id: snap.id, ...snap.data() } as SessionInfo;
        mockStore.setSession(data);
      } else {
        data = mockStore.getSession(dateStr, sessionType);
      }
      callback(evaluateSessionStatus(data));
    }, (err) => {
      console.warn('Subscription session error:', err.message);
      callback(evaluateSessionStatus(mockStore.getSession(dateStr, sessionType)));
    });
    return unsubscribe;
  } catch (err) {
    callback(evaluateSessionStatus(mockStore.getSession(dateStr, sessionType)));
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
  action: 'OPEN' | 'CLOSE' | 'REOPEN' | 'AUTO',
  lateAfter?: string,
  reason?: string
): Promise<void> {
  const sessionId = `${dateStr}_${sessionType}`;
  const cfg = getLocalSessionConfig();

  const isAuto = action === 'AUTO';
  const isClosing = action === 'CLOSE';
  const newStatus = isClosing ? 'CLOSED' : 'OPEN';

  const payload: SessionInfo = {
    id: sessionId,
    date: dateStr,
    type: sessionType,
    status: newStatus,
    startTime: sessionType === 'PAGI' ? (cfg.morningStart || '06:30') : (cfg.dismissalStart || '12:30'),
    endTime: sessionType === 'PAGI' ? (cfg.morningEnd || '08:00') : (cfg.dismissalEnd || '14:30'),
    lateAfter: lateAfter || (sessionType === 'PAGI' ? cfg.morningLate : '13:00'),
    manualOverride: !isAuto,
    manualAction: isAuto ? null : action,
    manualReason: reason,
    updatedAt: new Date().toISOString()
  };

  if (isClosing) {
    payload.closedBy = actorEmail;
    payload.closedAt = new Date().toISOString();
  } else if (!isAuto) {
    payload.openedBy = actorEmail;
    payload.openedAt = new Date().toISOString();
  }

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

export async function getAttendanceByDateRange(startDate: string, endDate: string): Promise<AttendanceRecord[]> {
  try {
    const attendanceRef = collection(db, 'attendance');
    const q = query(attendanceRef, where('date', '>=', startDate), where('date', '<=', endDate));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
    }
  } catch (err) {
    console.warn('Firestore attendance range query error:', err);
  }
  return mockStore.getAttendanceByDateRange(startDate, endDate);
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
