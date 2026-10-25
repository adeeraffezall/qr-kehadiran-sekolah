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
  runTransaction
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase';
import { AttendanceRecord, AttendanceStatus, ScanResult, SessionInfo, SessionType } from '../types';
import { createAuditLog } from './auditService';
import { hashTokenClient } from './qrService';
import { getMalaysianCurrentTime, getTodayMalaysianDate } from '../utils/dateUtils';

/**
 * Imbas dan rekod kehadiran murid
 * Mengutamakan Cloud Function; jika belum dideploy atau mod luar talian, menggunakan transaksi atomik Firestore
 */
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

  // 1. Cuba panggil Firebase Cloud Function jika boleh
  try {
    const recordFn = httpsCallable<{ token: string; sessionType?: SessionType }, ScanResult>(
      functions, 
      'recordAttendance'
    );
    const response = await recordFn({ token: cleanToken, sessionType: sessionTypePreference });
    if (response && response.data) {
      return response.data;
    }
  } catch (fnErr: any) {
    console.warn('Panggilan Cloud Function gagal, beralih kepada transaksi atomik Firestore:', fnErr.message || fnErr);
  }

  // 2. Transaksi Firestore Atomik Tempatan (Idempotent & Selamat)
  const tokenHash = await hashTokenClient(cleanToken);

  // Cari murid dengan hash token ini
  const studentsRef = collection(db, 'students');
  const studentQuery = query(studentsRef, where('qrTokenHash', '==', tokenHash));
  const studentSnap = await getDocs(studentQuery);

  if (studentSnap.empty) {
    return {
      success: false,
      code: 'TOKEN_NOT_FOUND',
      message: 'Kad QR tidak sepadan dengan mana-mana murid berdaftar atau telah dibatalkan.'
    };
  }

  const studentDoc = studentSnap.docs[0];
  const student = studentDoc.data();
  const studentId = studentDoc.id;

  if (!student.active) {
    return {
      success: false,
      code: 'STUDENT_INACTIVE',
      message: `Murid ${student.fullName} berstatus TIDAK AKTIF.`
    };
  }

  const dateStr = getTodayMalaysianDate();
  const currentTime = getMalaysianCurrentTime();
  
  // Tentukan sesi: Keutamaan parameter atau berdasarkan waktu pagi/petang
  const currentHour = parseInt(currentTime.split(':')[0], 10);
  const sessionType: SessionType = sessionTypePreference || (currentHour < 12 ? 'PAGI' : 'PULANG');

  // Semak status sesi
  const sessionId = `${dateStr}_${sessionType}`;
  const sessionRef = doc(db, 'sessions', sessionId);
  const sessionSnap = await getDoc(sessionRef);

  let lateThreshold = '07:30';

  if (sessionSnap.exists()) {
    const sessionData = sessionSnap.data() as SessionInfo;
    if (sessionData.status === 'CLOSED') {
      return {
        success: false,
        code: 'SESSION_CLOSED',
        message: `Sesi ${sessionType} bagi tarikh ${dateStr} telah DITUTUP oleh pihak sekolah.`
      };
    }
    if (sessionData.lateAfter) {
      lateThreshold = sessionData.lateAfter;
    }
  }

  // Snapshot nama kelas
  let classNameSnapshot = 'Kelas';
  if (student.classId) {
    const classDoc = await getDoc(doc(db, 'classes', student.classId));
    if (classDoc.exists()) {
      classNameSnapshot = classDoc.data()?.name || 'Kelas';
    }
  }

  // Kira status kehadiran
  let status: AttendanceStatus = 'HADIR';
  if (sessionType === 'PAGI' && currentTime > lateThreshold) {
    status = 'LEWAT';
  }

  // ID Deterministik: ${studentId}_${date}_${session}
  const recordId = `${studentId}_${dateStr}_${sessionType}`;
  const recordRef = doc(db, 'attendance', recordId);

  try {
    const result = await runTransaction(db, async (transaction) => {
      const existingDoc = await transaction.get(recordRef);

      if (existingDoc.exists()) {
        const existingData = existingDoc.data() as AttendanceRecord;
        return {
          duplicate: true,
          status: existingData.status
        };
      }

      const serverNow = serverTimestamp();
      const newRecord: AttendanceRecord = {
        id: recordId,
        studentId,
        studentNameSnapshot: student.fullName,
        classIdSnapshot: student.classId || '',
        classNameSnapshot,
        date: dateStr,
        session: sessionType,
        status,
        scannedAt: serverNow,
        scannedBy: actorUid,
        source: 'QR'
      };

      transaction.set(recordRef, newRecord);

      return {
        duplicate: false,
        status
      };
    });

    if (result.duplicate) {
      return {
        success: false,
        duplicate: true,
        code: 'ALREADY_RECORDED',
        message: `Kehadiran bagi ${student.fullName} (${classNameSnapshot}) telah direkodkan sebelum ini.`,
        student: {
          fullName: student.fullName,
          studentNumber: student.studentNumber || '',
          className: classNameSnapshot
        },
        status: result.status,
        date: dateStr,
        session: sessionType
      };
    }

    return {
      success: true,
      duplicate: false,
      message: status === 'LEWAT' ? 'Kehadiran LEWAT berjaya direkodkan.' : 'Kehadiran HADIR berjaya direkodkan.',
      student: {
        id: studentId,
        fullName: student.fullName,
        studentNumber: student.studentNumber || '',
        className: classNameSnapshot
      },
      status,
      date: dateStr,
      session: sessionType,
      time: currentTime
    };
  } catch (err: any) {
    console.error('Ralat transaksi kehadiran:', err);
    return {
      success: false,
      code: 'TRANSACTION_FAILED',
      message: 'Gagal merekod kehadiran murid. Sila semak sambungan internet.'
    };
  }
}

/**
 * Dapatkan maklumat sesi bagi tarikh dan jenis sesi
 */
export async function getSessionInfo(dateStr: string, sessionType: SessionType): Promise<SessionInfo> {
  const sessionId = `${dateStr}_${sessionType}`;
  const sessionRef = doc(db, 'sessions', sessionId);
  const snap = await getDoc(sessionRef);

  if (snap.exists()) {
    return { id: snap.id, ...snap.data() } as SessionInfo;
  }

  // Nilai lalai jika belum dicipta
  return {
    id: sessionId,
    date: dateStr,
    type: sessionType,
    startTime: sessionType === 'PAGI' ? '06:30' : '12:30',
    endTime: sessionType === 'PAGI' ? '08:00' : '14:30',
    lateAfter: sessionType === 'PAGI' ? '07:30' : '13:00',
    status: 'OPEN'
  };
}

/**
 * Buka, tutup atau buka semula sesi kehadiran
 */
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
  const sessionRef = doc(db, 'sessions', sessionId);
  const snap = await getDoc(sessionRef);
  const now = serverTimestamp();

  const isClosing = action === 'CLOSE';
  const newStatus = isClosing ? 'CLOSED' : 'OPEN';

  const payload: Partial<SessionInfo> = {
    date: dateStr,
    type: sessionType,
    status: newStatus,
    lateAfter: lateAfter || '07:30',
    ...(isClosing ? { closedBy: actorUid, closedAt: now } : { openedBy: actorUid, openedAt: now })
  };

  await setDoc(sessionRef, payload, { merge: true });

  await createAuditLog(
    actorUid,
    actorEmail,
    `SESSION_${action}`,
    'SESSION',
    sessionId,
    reason || `Tindakan ${action} pada sesi ${sessionType}`,
    snap.exists() ? snap.data() : null,
    payload
  );
}

/**
 * Dapatkan semua rekod kehadiran bagi tarikh dan sesi tertentu
 */
export async function getAttendanceByDateAndSession(
  dateStr: string, 
  sessionType?: SessionType
): Promise<AttendanceRecord[]> {
  const attendanceRef = collection(db, 'attendance');
  let q = query(attendanceRef, where('date', '==', dateStr));

  if (sessionType) {
    q = query(attendanceRef, where('date', '==', dateStr), where('session', '==', sessionType));
  }

  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
}

/**
 * Dapatkan rekod kehadiran bulanan
 */
export async function getMonthlyAttendance(year: number, month: number): Promise<AttendanceRecord[]> {
  const monthStr = String(month).padStart(2, '0');
  const startDate = `${year}-${monthStr}-01`;
  const endDate = `${year}-${monthStr}-31`;

  const attendanceRef = collection(db, 'attendance');
  const q = query(attendanceRef, where('date', '>=', startDate), where('date', '<=', endDate));

  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord));
}

/**
 * Pembetulan kehadiran dengan sebab mandatori
 */
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

  // Cuba panggil callable Cloud Function terlebih dahulu
  try {
    const fn = httpsCallable(functions, 'correctAttendance');
    await fn({ recordId, newStatus, reason: reason.trim() });
    return;
  } catch (err: any) {
    console.warn('Fallback kemaskini Firestore terus untuk pembetulan kehadiran:', err.message);
  }

  const ref = doc(db, 'attendance', recordId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error('Rekod kehadiran tidak ditemui.');
  }

  const oldData = snap.data();
  const now = serverTimestamp();

  await updateDoc(ref, {
    status: newStatus,
    correctionReason: reason.trim(),
    correctedBy: actorUid,
    updatedAt: now
  });

  await createAuditLog(
    actorUid,
    actorEmail,
    'CORRECT_ATTENDANCE',
    'ATTENDANCE',
    recordId,
    reason.trim(),
    { status: oldData?.status, correctionReason: oldData?.correctionReason },
    { status: newStatus, correctionReason: reason.trim() }
  );
}
