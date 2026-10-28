import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import { AttendanceRecord, AttendanceStatus, SessionType, UserRole } from './types';

admin.initializeApp();
const db = admin.firestore();

// Helper: Hashing token secara kriptografik (SHA-256)
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

// Helper: Menghitung zon masa Asia/Kuala_Lumpur
export function getMalaysianDateTime(now: Date = new Date()): {
  dateStr: string; // YYYY-MM-DD
  timeStr: string; // HH:mm
  fullTimeStr: string; // HH:mm:ss
} {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(now);
  const partMap: Record<string, string> = {};
  parts.forEach(p => { partMap[p.type] = p.value; });

  const dateStr = `${partMap.year}-${partMap.month}-${partMap.day}`;
  const timeStr = `${partMap.hour}:${partMap.minute}`;
  const fullTimeStr = `${partMap.hour}:${partMap.minute}:${partMap.second}`;

  return { dateStr, timeStr, fullTimeStr };
}

export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return 0;
  return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
}

/**
 * 1. Bootstrap Admin Pertama
 * Hanya boleh dipanggil sekiranya belum ada akaun ADMIN yang aktif dalam sistem.
 */
export const bootstrapAdmin = functions.https.onCall(async (_data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Pengesahan pengguna diperlukan.');
  }

  const callerUid = context.auth.uid;
  const callerEmail = context.auth.token.email || '';

  // Semak jika sudah wujud admin aktif
  const existingAdmins = await db.collection('users')
    .where('role', '==', 'ADMIN')
    .where('active', '==', true)
    .limit(1)
    .get();

  if (!existingAdmins.empty) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Akaun Pentadbir (Admin) utama telah wujud. Permintaan ditolak.'
    );
  }

  const userRef = db.collection('users').doc(callerUid);
  const now = admin.firestore.FieldValue.serverTimestamp();

  await userRef.set({
    uid: callerUid,
    email: callerEmail,
    displayName: context.auth.token.name || callerEmail.split('@')[0] || 'Pentadbir Sistem',
    role: 'ADMIN',
    active: true,
    createdAt: now,
    updatedAt: now
  }, { merge: true });

  // Catat audit log
  await db.collection('auditLogs').add({
    actorUid: callerUid,
    actorEmail: callerEmail,
    action: 'BOOTSTRAP_FIRST_ADMIN',
    entityType: 'USER',
    entityId: callerUid,
    after: { role: 'ADMIN', email: callerEmail },
    reason: 'Inisialisasi Pentadbir Pertama Sistem Sekolah',
    createdAt: now
  });

  return { success: true, message: 'Akaun anda telah berjaya ditetapkan sebagai Pentadbir Utama (ADMIN).' };
});

/**
 * 2. Imbas & Rekod Kehadiran (Callable Function)
 * Menjalankan validasi server-side lengkap, pengiraan lewat, dan transaksi atomik.
 */
export const recordAttendance = functions.https.onCall(async (data: {
  token: string;
  sessionType?: SessionType;
}, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Pengguna tidak disahkan.');
  }

  const actorUid = context.auth.uid;
  // Periksa akaun pemanggil
  const actorDoc = await db.collection('users').doc(actorUid).get();
  if (!actorDoc.exists || !actorDoc.data()?.active) {
    throw new functions.https.HttpsError('permission-denied', 'Akaun anda tidak aktif atau tiada kebenaran.');
  }

  const actorRole: UserRole = actorDoc.data()?.role;
  if (!['ADMIN', 'TEACHER', 'STAFF'].includes(actorRole)) {
    throw new functions.https.HttpsError('permission-denied', 'Peranan anda tidak dibenarkan mengimbas kehadiran.');
  }

  const rawToken = data.token ? data.token.trim() : '';
  if (!rawToken || rawToken.length < 10) {
    return {
      success: false,
      code: 'INVALID_TOKEN',
      message: 'Format kod QR tidak sah atau kosong.'
    };
  }

  const tokenHash = hashToken(rawToken);

  // Cari murid berdasarkan hash token
  const studentsQuery = await db.collection('students')
    .where('qrTokenHash', '==', tokenHash)
    .limit(1)
    .get();

  if (studentsQuery.empty) {
    return {
      success: false,
      code: 'TOKEN_NOT_FOUND',
      message: 'Kad QR tidak sepadan dengan mana-mana murid berdaftar atau telah dibatalkan.'
    };
  }

  const studentDoc = studentsQuery.docs[0];
  const student = studentDoc.data();
  const studentId = studentDoc.id;

  if (!student.active) {
    return {
      success: false,
      code: 'STUDENT_INACTIVE',
      message: `Murid ${student.fullName} berstatus TIDAK AKTIF dalam rekod sekolah.`
    };
  }

  // Tentukan tarikh dan masa mengikut waktu Malaysia
  const { dateStr, timeStr, fullTimeStr } = getMalaysianDateTime();
  const curMinutes = timeToMinutes(timeStr);

  // Ambil konfigurasi waktu rasmi sekolah daripada Firestore
  let morningStart = '06:30';
  let morningEnd = '08:00';
  let morningLate = '07:00';
  let dismissalStart = '12:30';
  let dismissalEnd = '14:30';

  try {
    const configDoc = await db.collection('settings').doc('sessionConfig').get();
    if (configDoc.exists) {
      const cfg = configDoc.data();
      if (cfg?.morningStart) morningStart = cfg.morningStart;
      if (cfg?.morningEnd) morningEnd = cfg.morningEnd;
      if (cfg?.morningLate) morningLate = cfg.morningLate;
      if (cfg?.dismissalStart) dismissalStart = cfg.dismissalStart;
      if (cfg?.dismissalEnd) dismissalEnd = cfg.dismissalEnd;
    }
  } catch (err) {
    console.warn('Gagal memuatkan sessionConfig di Cloud Function:', err);
  }

  const mStartMin = timeToMinutes(morningStart);
  const mEndMin = timeToMinutes(morningEnd);
  const dStartMin = timeToMinutes(dismissalStart);
  const dEndMin = timeToMinutes(dismissalEnd);

  // Semak status dokumen Firestore kedua-dua sesi secara bebas
  const pagiRef = db.collection('sessions').doc(`${dateStr}_PAGI`);
  const pulangRef = db.collection('sessions').doc(`${dateStr}_PULANG`);
  const [pagiSnap, pulangSnap] = await Promise.all([pagiRef.get(), pulangRef.get()]);

  const pagiData = pagiSnap.exists ? pagiSnap.data() : null;
  const pulangData = pulangSnap.exists ? pulangSnap.data() : null;

  // Semak sama ada sesi PAGI terbuka
  let isPagiOpen = false;
  if (pagiData?.manualOverride) {
    isPagiOpen = pagiData.manualAction === 'OPEN' || pagiData.manualAction === 'REOPEN';
  } else {
    isPagiOpen = curMinutes >= mStartMin && curMinutes < mEndMin && pagiData?.status !== 'CLOSED';
  }

  // Semak sama ada sesi PULANG terbuka
  let isPulangOpen = false;
  if (pulangData?.manualOverride) {
    isPulangOpen = pulangData.manualAction === 'OPEN' || pulangData.manualAction === 'REOPEN';
  } else {
    isPulangOpen = curMinutes >= dStartMin && curMinutes < dEndMin && pulangData?.status !== 'CLOSED';
  }

  // Tentukan jenis sesi (sessionType) dengan pengesahan server-side bebas
  let sessionType: SessionType;
  if (data.sessionType === 'PAGI') {
    if (!isPagiOpen) {
      return {
        success: false,
        code: 'SESSION_CLOSED',
        message: curMinutes >= mEndMin
          ? `Sesi PAGI bagi tarikh ${dateStr} telah ditutup pada jam ${morningEnd} AM.`
          : `Sesi PAGI bagi tarikh ${dateStr} belum dibuka atau telah ditutup.`
      };
    }
    sessionType = 'PAGI';
  } else if (data.sessionType === 'PULANG') {
    if (!isPulangOpen) {
      return {
        success: false,
        code: 'SESSION_CLOSED',
        message: curMinutes >= dEndMin
          ? `Sesi PULANG bagi tarikh ${dateStr} telah ditutup pada jam ${dismissalEnd}.`
          : `Sesi PULANG bagi tarikh ${dateStr} belum dibuka atau telah ditutup.`
      };
    }
    sessionType = 'PULANG';
  } else {
    // Klien tidak menghantar sessionType spesifik: tentukan secara dinamik
    if (isPagiOpen && !isPulangOpen) {
      sessionType = 'PAGI';
    } else if (isPulangOpen && !isPagiOpen) {
      sessionType = 'PULANG';
    } else if (isPagiOpen && isPulangOpen) {
      sessionType = curMinutes >= dStartMin ? 'PULANG' : 'PAGI';
    } else {
      return {
        success: false,
        code: 'SESSION_CLOSED',
        message: curMinutes < mStartMin
          ? `Sesi PAGI belum dibuka (bermula jam ${morningStart} AM).`
          : (curMinutes >= mEndMin && curMinutes < dStartMin
              ? `Sesi PAGI telah ditutup pada jam ${morningEnd} AM. Sesi PULANG bermula pada jam ${dismissalStart}.`
              : `Semua sesi persekolahan bagi tarikh ${dateStr} telah ditutup.`)
      };
    }
  }

  // Dapatkan nama kelas murid untuk snapshot
  let classNameSnapshot = 'Kelas';
  if (student.classId) {
    const classDoc = await db.collection('classes').doc(student.classId).get();
    if (classDoc.exists) {
      classNameSnapshot = classDoc.data()?.name || 'Kelas';
    }
  }

  // Pengiraan status kehadiran
  let status: AttendanceStatus;
  if (sessionType === 'PULANG') {
    status = 'PULANG';
  } else {
    const lateThreshold = pagiData?.lateAfter || morningLate;
    status = curMinutes > timeToMinutes(lateThreshold) ? 'LEWAT' : 'HADIR';
  }

  // ID Unik Rekod: ${studentId}_${date}_${session}
  const recordId = `${studentId}_${dateStr}_${sessionType}`;
  const recordRef = db.collection('attendance').doc(recordId);

  try {
    const result = await db.runTransaction(async (transaction) => {
      const existingRecord = await transaction.get(recordRef);

      if (existingRecord.exists) {
        const existingData = existingRecord.data() as AttendanceRecord;
        return {
          duplicate: true,
          status: existingData.status,
          scannedAt: existingData.scannedAt
        };
      }

      const serverNow = admin.firestore.FieldValue.serverTimestamp();
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
        status,
        scannedAt: fullTimeStr
      };
    });

    if (result.duplicate) {
      const isPulang = sessionType === 'PULANG';
      return {
        success: false,
        duplicate: true,
        code: 'ALREADY_RECORDED',
        message: isPulang
          ? `Rekod kepulangan bagi ${student.fullName} (${classNameSnapshot}) telah direkodkan sebelum ini.`
          : `Kehadiran bagi ${student.fullName} (${classNameSnapshot}) untuk sesi ${sessionType} telah direkodkan sebelum ini.`,
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

    const successMsg = sessionType === 'PULANG'
      ? 'Rekod PULANG berjaya direkodkan.'
      : (status === 'LEWAT' ? 'Kehadiran LEWAT berjaya direkodkan.' : 'Kehadiran HADIR berjaya direkodkan.');

    return {
      success: true,
      duplicate: false,
      message: successMsg,
      student: {
        id: studentId,
        fullName: student.fullName,
        studentNumber: student.studentNumber || '',
        className: classNameSnapshot
      },
      status,
      date: dateStr,
      session: sessionType,
      time: fullTimeStr
    };
  } catch (err: any) {
    console.error('Attendance transaction error:', err);
    throw new functions.https.HttpsError('internal', 'Ralat semasa memproses kehadiran.');
  }
});

/**
 * 3. Jana Semula Token QR Murid (Revoke & Regenerate)
 * Admin sahaja. Menyimpan rekod pembatalan dan token baharu dalam audit log.
 */
export const revokeAndRegenerateQR = functions.https.onCall(async (data: {
  studentId: string;
  reason: string;
}, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Pengguna tidak disahkan.');
  }

  const actorUid = context.auth.uid;
  const actorDoc = await db.collection('users').doc(actorUid).get();
  if (actorDoc.data()?.role !== 'ADMIN') {
    throw new functions.https.HttpsError('permission-denied', 'Hanya Pentadbir (Admin) boleh menjana semula kad QR.');
  }

  if (!data.studentId || !data.reason || data.reason.trim().length < 3) {
    throw new functions.https.HttpsError('invalid-argument', 'Sila berikan ID murid dan sebab pembatalan yang sah.');
  }

  const studentRef = db.collection('students').doc(data.studentId);
  const studentSnap = await studentRef.get();

  if (!studentSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Murid tidak ditemui.');
  }

  const student = studentSnap.data()!;
  const oldHash = student.qrTokenHash || 'TIADA';

  // Hasilkan token kriptografi baharu berkepadatan tinggi (24 bytes = 32 aksara URL-safe base64)
  const rawToken = 'SKRM_' + crypto.randomBytes(24).toString('base64url');
  const newHash = hashToken(rawToken);
  const now = admin.firestore.FieldValue.serverTimestamp();

  await studentRef.update({
    qrTokenHash: newHash,
    updatedAt: now
  });

  // Catat audit log
  await db.collection('auditLogs').add({
    actorUid,
    actorEmail: actorDoc.data()?.email || '',
    action: 'REVOKE_AND_REGENERATE_QR',
    entityType: 'QR',
    entityId: data.studentId,
    before: { qrTokenHash: oldHash },
    after: { qrTokenHash: newHash },
    reason: data.reason.trim(),
    createdAt: now
  });

  return {
    success: true,
    token: rawToken,
    studentName: student.fullName,
    message: 'Kad QR baharu berjaya dijana dan kod lama telah dibatalkan.'
  };
});

/**
 * 4. Pembetulan Kehadiran dengan Sebab Mandatori
 * Admin sahaja.
 */
export const correctAttendance = functions.https.onCall(async (data: {
  recordId: string;
  newStatus: AttendanceStatus;
  reason: string;
}, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Pengguna tidak disahkan.');
  }

  const actorUid = context.auth.uid;
  const actorDoc = await db.collection('users').doc(actorUid).get();
  if (actorDoc.data()?.role !== 'ADMIN') {
    throw new functions.https.HttpsError('permission-denied', 'Hanya Pentadbir (Admin) dibenarkan membuat pembetulan kehadiran.');
  }

  if (!data.reason || data.reason.trim().length < 5) {
    throw new functions.https.HttpsError('invalid-argument', 'Sebab pembetulan wajib diisi sekurang-kurangnya 5 aksara.');
  }

  const recordRef = db.collection('attendance').doc(data.recordId);
  const recordSnap = await recordRef.get();

  if (!recordSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Rekod kehadiran tidak ditemui.');
  }

  const beforeData = recordSnap.data()!;
  const now = admin.firestore.FieldValue.serverTimestamp();

  await recordRef.update({
    status: data.newStatus,
    correctionReason: data.reason.trim(),
    correctedBy: actorUid,
    updatedAt: now
  });

  // Catat audit log
  await db.collection('auditLogs').add({
    actorUid,
    actorEmail: actorDoc.data()?.email || '',
    action: 'CORRECT_ATTENDANCE',
    entityType: 'ATTENDANCE',
    entityId: data.recordId,
    before: { status: beforeData.status, reason: beforeData.correctionReason || null },
    after: { status: data.newStatus, reason: data.reason.trim() },
    reason: data.reason.trim(),
    createdAt: now
  });

  return { success: true, message: 'Rekod kehadiran berjaya dikemaskini.' };
});
