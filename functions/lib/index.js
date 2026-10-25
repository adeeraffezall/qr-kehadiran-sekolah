"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.correctAttendance = exports.revokeAndRegenerateQR = exports.recordAttendance = exports.bootstrapAdmin = void 0;
exports.hashToken = hashToken;
exports.getMalaysianDateTime = getMalaysianDateTime;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const crypto = __importStar(require("crypto"));
admin.initializeApp();
const db = admin.firestore();
// Helper: Hashing token secara kriptografik (SHA-256)
function hashToken(token) {
    return crypto.createHash('sha256').update(token.trim()).digest('hex');
}
// Helper: Menghitung zon masa Asia/Kuala_Lumpur
function getMalaysianDateTime(now = new Date()) {
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
    const partMap = {};
    parts.forEach(p => { partMap[p.type] = p.value; });
    const dateStr = `${partMap.year}-${partMap.month}-${partMap.day}`;
    const timeStr = `${partMap.hour}:${partMap.minute}`;
    const fullTimeStr = `${partMap.hour}:${partMap.minute}:${partMap.second}`;
    return { dateStr, timeStr, fullTimeStr };
}
/**
 * 1. Bootstrap Admin Pertama
 * Hanya boleh dipanggil sekiranya belum ada akaun ADMIN yang aktif dalam sistem.
 */
exports.bootstrapAdmin = functions.https.onCall(async (_data, context) => {
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
        throw new functions.https.HttpsError('failed-precondition', 'Akaun Pentadbir (Admin) utama telah wujud. Permintaan ditolak.');
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
exports.recordAttendance = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Pengguna tidak disahkan.');
    }
    const actorUid = context.auth.uid;
    // Periksa akaun pemanggil
    const actorDoc = await db.collection('users').doc(actorUid).get();
    if (!actorDoc.exists || !actorDoc.data()?.active) {
        throw new functions.https.HttpsError('permission-denied', 'Akaun anda tidak aktif atau tiada kebenaran.');
    }
    const actorRole = actorDoc.data()?.role;
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
    const sessionType = data.sessionType || (parseInt(timeStr.split(':')[0], 10) < 12 ? 'PAGI' : 'PULANG');
    // Semak status sesi bagi tarikh & jenis sesi ini
    const sessionId = `${dateStr}_${sessionType}`;
    const sessionRef = db.collection('sessions').doc(sessionId);
    const sessionSnap = await sessionRef.get();
    let lateThreshold = '07:30';
    if (sessionSnap.exists) {
        const sessionData = sessionSnap.data();
        if (sessionData?.status === 'CLOSED') {
            return {
                success: false,
                code: 'SESSION_CLOSED',
                message: `Sesi ${sessionType} bagi tarikh ${dateStr} telah ditutup oleh pentadbir.`
            };
        }
        if (sessionData?.lateAfter) {
            lateThreshold = sessionData.lateAfter;
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
    let status = 'HADIR';
    if (sessionType === 'PAGI' && timeStr > lateThreshold) {
        status = 'LEWAT';
    }
    // ID Unik Rekod: ${studentId}_${date}_${session}
    const recordId = `${studentId}_${dateStr}_${sessionType}`;
    const recordRef = db.collection('attendance').doc(recordId);
    try {
        const result = await db.runTransaction(async (transaction) => {
            const existingRecord = await transaction.get(recordRef);
            if (existingRecord.exists) {
                const existingData = existingRecord.data();
                return {
                    duplicate: true,
                    status: existingData.status,
                    scannedAt: existingData.scannedAt
                };
            }
            const serverNow = admin.firestore.FieldValue.serverTimestamp();
            const newRecord = {
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
            return {
                success: false,
                duplicate: true,
                code: 'ALREADY_RECORDED',
                message: `Kehadiran bagi ${student.fullName} (${classNameSnapshot}) untuk sesi ${sessionType} telah direkodkan sebelum ini.`,
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
            message: status === 'LEWAT' ? `Kehadiran LEWAT berjaya direkodkan.` : `Kehadiran HADIR berjaya direkodkan.`,
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
    }
    catch (err) {
        console.error('Attendance transaction error:', err);
        throw new functions.https.HttpsError('internal', 'Ralat semasa memproses kehadiran.');
    }
});
/**
 * 3. Jana Semula Token QR Murid (Revoke & Regenerate)
 * Admin sahaja. Menyimpan rekod pembatalan dan token baharu dalam audit log.
 */
exports.revokeAndRegenerateQR = functions.https.onCall(async (data, context) => {
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
    const student = studentSnap.data();
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
exports.correctAttendance = functions.https.onCall(async (data, context) => {
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
    const beforeData = recordSnap.data();
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
//# sourceMappingURL=index.js.map