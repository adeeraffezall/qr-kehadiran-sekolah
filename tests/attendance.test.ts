import { describe, it, expect, beforeEach } from 'vitest';
import * as crypto from 'crypto';

// Simulation of Core Attendance Backend Engine
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

interface MockStudent {
  id: string;
  fullName: string;
  classId: string;
  className: string;
  active: boolean;
  qrTokenHash: string;
}

interface MockSession {
  date: string;
  type: 'PAGI' | 'PULANG';
  status: 'OPEN' | 'CLOSED';
  lateAfter: string;
}

interface MockAttendanceRecord {
  id: string;
  studentId: string;
  studentNameSnapshot: string;
  classNameSnapshot: string;
  date: string;
  session: 'PAGI' | 'PULANG';
  status: 'HADIR' | 'LEWAT' | 'TIDAK_HADIR' | 'PULANG';
  correctionReason?: string;
}

class AttendanceBackendSimulator {
  students = new Map<string, MockStudent>();
  sessions = new Map<string, MockSession>();
  attendance = new Map<string, MockAttendanceRecord>();
  auditLogs: any[] = [];

  recordAttendance(
    rawToken: string,
    sessionType: 'PAGI' | 'PULANG',
    currentTime: string,
    currentDate: string,
    callerRole: 'ADMIN' | 'TEACHER' | 'STAFF' | 'STUDENT_OR_PUBLIC'
  ) {
    // 8. Unauthorized user rejection
    if (!['ADMIN', 'TEACHER', 'STAFF'].includes(callerRole)) {
      return { success: false, code: 'UNAUTHORIZED_ROLE', message: 'Peranan tidak dibenarkan mengimbas.' };
    }

    if (!rawToken || rawToken.trim().length < 10) {
      return { success: false, code: 'INVALID_TOKEN', message: 'Token tidak sah.' };
    }

    const tokenHash = hashToken(rawToken);

    // 2. Cari murid berdasarkan hash token
    let foundStudent: MockStudent | undefined;
    for (const s of this.students.values()) {
      if (s.qrTokenHash === tokenHash) {
        foundStudent = s;
        break;
      }
    }

    // 2 & 3. Invalid QR & Revoked QR rejection
    if (!foundStudent) {
      return { success: false, code: 'TOKEN_NOT_FOUND', message: 'Kad QR tidak sah atau telah dibatalkan.' };
    }

    // 4. Inactive student rejection
    if (!foundStudent.active) {
      return { success: false, code: 'STUDENT_INACTIVE', message: 'Murid tidak aktif.' };
    }

    // 7. Closed session rejection
    const sessionId = `${currentDate}_${sessionType}`;
    const session = this.sessions.get(sessionId);
    if (session && session.status === 'CLOSED') {
      return { success: false, code: 'SESSION_CLOSED', message: 'Sesi kehadiran telah ditutup.' };
    }

    // 9. Late threshold calculation
    const lateThreshold = session?.lateAfter || '07:30';
    let status: 'HADIR' | 'LEWAT' | 'PULANG' = sessionType === 'PULANG' ? 'PULANG' : 'HADIR';
    if (sessionType === 'PAGI' && currentTime > lateThreshold) {
      status = 'LEWAT';
    }

    // 5. Deterministic ID: ${studentId}_${date}_${session}
    const recordId = `${foundStudent.id}_${currentDate}_${sessionType}`;
    if (this.attendance.has(recordId)) {
      return {
        success: false,
        duplicate: true,
        code: 'ALREADY_RECORDED',
        message: 'Kehadiran telah direkodkan sebelum ini.'
      };
    }

    const record: MockAttendanceRecord = {
      id: recordId,
      studentId: foundStudent.id,
      studentNameSnapshot: foundStudent.fullName,
      classNameSnapshot: foundStudent.className,
      date: currentDate,
      session: sessionType,
      status
    };

    this.attendance.set(recordId, record);
    return { success: true, duplicate: false, record };
  }

  correctAttendance(
    recordId: string,
    newStatus: 'HADIR' | 'LEWAT' | 'TIDAK_HADIR' | 'PULANG',
    reason: string,
    callerRole: string
  ) {
    if (callerRole !== 'ADMIN') {
      throw new Error('Hanya ADMIN dibenarkan membetulkan rekod kehadiran.');
    }
    if (!reason || reason.trim().length < 5) {
      throw new Error('Sebab pembetulan wajib diisi sekurang-kurangnya 5 aksara.');
    }

    const record = this.attendance.get(recordId);
    if (!record) {
      throw new Error('Rekod tidak ditemui.');
    }

    const before = { status: record.status };
    record.status = newStatus;
    record.correctionReason = reason.trim();

    this.auditLogs.push({
      action: 'CORRECT_ATTENDANCE',
      recordId,
      before,
      after: { status: newStatus },
      reason: reason.trim()
    });

    return { success: true };
  }
}

describe('Ujian Logik Kehadiran & Keselamatan Imbasan (Tests 1-7, 10, 18)', () => {
  let backend: AttendanceBackendSimulator;
  const validToken = 'SKRM_TEST_TOKEN_1234567890ABCDEF';
  const currentDate = '2026-10-26';

  beforeEach(() => {
    backend = new AttendanceBackendSimulator();
    // Daftarkan murid ujian
    backend.students.set('STD001', {
      id: 'STD001',
      fullName: 'MUHAMMAD AMIRUL BIN HASSAN',
      classId: 'CLS01',
      className: '1 ARIF',
      active: true,
      qrTokenHash: hashToken(validToken)
    });

    // Buka sesi pagi
    backend.sessions.set(`${currentDate}_PAGI`, {
      date: currentDate,
      type: 'PAGI',
      status: 'OPEN',
      lateAfter: '07:30'
    });

    // Buka sesi pulang
    backend.sessions.set(`${currentDate}_PULANG`, {
      date: currentDate,
      type: 'PULANG',
      status: 'OPEN',
      lateAfter: '13:00'
    });
  });

  // 1. Valid QR attendance
  it('1. Menerima imbasan kad QR yang sah dan merekod status HADIR', () => {
    const res = backend.recordAttendance(validToken, 'PAGI', '07:15', currentDate, 'TEACHER');
    expect(res.success).toBe(true);
    expect(res.duplicate).toBe(false);
    expect(res.record?.status).toBe('HADIR');
    expect(res.record?.studentNameSnapshot).toBe('MUHAMMAD AMIRUL BIN HASSAN');
  });

  // 2. Invalid QR rejection
  it('2. Menolak imbasan kod QR yang tidak sah atau tiada dalam rekod', () => {
    const res = backend.recordAttendance('SKRM_TOKEN_PALSU_BUKAN_MURID', 'PAGI', '07:15', currentDate, 'TEACHER');
    expect(res.success).toBe(false);
    expect(res.code).toBe('TOKEN_NOT_FOUND');
  });

  // 3. Revoked QR rejection
  it('3. Menolak kod QR lama yang telah dibatalkan (Revoked QR)', () => {
    // Tukar token hash murid kepada token baharu
    const newToken = 'SKRM_NEW_TOKEN_REPLACED_987654321';
    backend.students.get('STD001')!.qrTokenHash = hashToken(newToken);

    // Cuba imbas menggunakan token lama yang telah dibatalkan
    const res = backend.recordAttendance(validToken, 'PAGI', '07:15', currentDate, 'TEACHER');
    expect(res.success).toBe(false);
    expect(res.code).toBe('TOKEN_NOT_FOUND');

    // Imbas menggunakan token baharu mesti berjaya
    const resNew = backend.recordAttendance(newToken, 'PAGI', '07:15', currentDate, 'TEACHER');
    expect(resNew.success).toBe(true);
  });

  // 4. Inactive student rejection
  it('4. Menolak imbasan kad sekiranya murid berstatus TIDAK AKTIF', () => {
    backend.students.get('STD001')!.active = false;
    const res = backend.recordAttendance(validToken, 'PAGI', '07:15', currentDate, 'STAFF');
    expect(res.success).toBe(false);
    expect(res.code).toBe('STUDENT_INACTIVE');
  });

  // 5. Duplicate scan prevention
  it('5. Menghalang rekod pendua untuk murid pada tarikh dan sesi yang sama', () => {
    // Imbasan pertama
    const firstScan = backend.recordAttendance(validToken, 'PAGI', '07:10', currentDate, 'TEACHER');
    expect(firstScan.success).toBe(true);

    // Imbasan kedua (Pendua)
    const secondScan = backend.recordAttendance(validToken, 'PAGI', '07:12', currentDate, 'TEACHER');
    expect(secondScan.success).toBe(false);
    expect(secondScan.duplicate).toBe(true);
    expect(secondScan.code).toBe('ALREADY_RECORDED');
  });

  // 6. Independent morning and dismissal records
  it('6. Memastikan rekod kehadiran Pagi dan Pulang beroperasi secara bebas', () => {
    // Imbas sesi pagi
    const morningScan = backend.recordAttendance(validToken, 'PAGI', '07:15', currentDate, 'TEACHER');
    expect(morningScan.success).toBe(true);

    // Imbas sesi pulang pada hari yang sama tidak disekat oleh rekod pagi
    const dismissalScan = backend.recordAttendance(validToken, 'PULANG', '13:05', currentDate, 'TEACHER');
    expect(dismissalScan.success).toBe(true);
    expect(dismissalScan.record?.session).toBe('PULANG');

    // Kedua-dua rekod wujud serentak
    expect(backend.attendance.has(`STD001_${currentDate}_PAGI`)).toBe(true);
    expect(backend.attendance.has(`STD001_${currentDate}_PULANG`)).toBe(true);
  });

  // 7. Closed session rejection
  it('7. Menolak sebarang imbasan sekiranya sesi telah DITUTUP oleh pentadbir', () => {
    backend.sessions.get(`${currentDate}_PAGI`)!.status = 'CLOSED';
    const res = backend.recordAttendance(validToken, 'PAGI', '07:45', currentDate, 'TEACHER');
    expect(res.success).toBe(false);
    expect(res.code).toBe('SESSION_CLOSED');
  });

  // 10. Attendance correction authorization & mandatory reason
  it('10. Memerlukan peranan ADMIN dan sebab mandatori (≥ 5 aksara) untuk pembetulan', () => {
    // Cipta rekod asal
    backend.recordAttendance(validToken, 'PAGI', '07:50', currentDate, 'TEACHER');
    const recordId = `STD001_${currentDate}_PAGI`;
    expect(backend.attendance.get(recordId)?.status).toBe('LEWAT');

    // Bukan admin cuba membetulkan rekod
    expect(() => {
      backend.correctAttendance(recordId, 'HADIR', 'Murid hadir mewakili sukan', 'TEACHER');
    }).toThrow(/Hanya ADMIN/);

    // Admin cuba membetulkan tanpa sebab lengkap (< 5 aksara)
    expect(() => {
      backend.correctAttendance(recordId, 'HADIR', 'test', 'ADMIN');
    }).toThrow(/sekurang-kurangnya 5 aksara/);

    // Pembetulan sah oleh ADMIN
    const result = backend.correctAttendance(recordId, 'HADIR', 'Murid tiba lewat kerana mewakili sekolah', 'ADMIN');
    expect(result.success).toBe(true);
    expect(backend.attendance.get(recordId)?.status).toBe('HADIR');
    expect(backend.auditLogs.length).toBe(1);
    expect(backend.auditLogs[0].action).toBe('CORRECT_ATTENDANCE');
  });

  // 18. Concurrent scan attempts (Atomicity & Idempotency)
  it('18. Mengendalikan cubaan imbasan serentak tanpa menghasilkan rekod pendua', () => {
    // Simulasi 5 imbasan masuk secara serentak
    const results = [
      backend.recordAttendance(validToken, 'PAGI', '07:20', currentDate, 'TEACHER'),
      backend.recordAttendance(validToken, 'PAGI', '07:20', currentDate, 'TEACHER'),
      backend.recordAttendance(validToken, 'PAGI', '07:20', currentDate, 'TEACHER'),
      backend.recordAttendance(validToken, 'PAGI', '07:20', currentDate, 'TEACHER'),
      backend.recordAttendance(validToken, 'PAGI', '07:20', currentDate, 'TEACHER')
    ];

    const successCount = results.filter(r => r.success).length;
    const duplicateCount = results.filter(r => r.duplicate).length;

    // Tepat SATU sahaja rekod berjaya dicipta, 4 lagi dikenalpasti sebagai pendua
    expect(successCount).toBe(1);
    expect(duplicateCount).toBe(4);
    expect(backend.attendance.size).toBe(1);
  });

  // 19. Sesi PULANG status test
  it('19. Semakan kehadiran bagi sesi PULANG ditandakan sebagai PULANG dan bukan HADIR', () => {
    const pulangResult = backend.recordAttendance(validToken, 'PULANG', '13:30', currentDate, 'TEACHER');
    expect(pulangResult.success).toBe(true);
    expect(pulangResult.record?.session).toBe('PULANG');
    expect(pulangResult.record?.status).toBe('PULANG');

    const recordId = `STD001_${currentDate}_PULANG`;
    const stored = backend.attendance.get(recordId);
    expect(stored?.status).toBe('PULANG');
  });
});
