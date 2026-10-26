import { AttendanceRecord, AuditLog, ClassItem, SchoolDay, SessionInfo, Student, UserProfile } from '../types';
import { getTodayMalaysianDate, getMalaysianCurrentTime } from '../utils/dateUtils';

const STORAGE_KEY = 'SKB_APP_DATABASE_V1';

export interface LocalDatabaseSchema {
  users: UserProfile[];
  classes: ClassItem[];
  students: (Student & { plainToken: string })[];
  attendance: AttendanceRecord[];
  sessions: SessionInfo[];
  schoolDays: SchoolDay[];
  auditLogs: AuditLog[];
  currentUser: UserProfile | null;
}

// Data Permulaan Sekolah Rendah Malaysia (SK Batandok Beaufort)
function getInitialSeed(): LocalDatabaseSchema {
  const today = getTodayMalaysianDate();
  const now = new Date().toISOString();

  const users: UserProfile[] = [
    {
      uid: 'USR_ADMIN_01',
      email: 'admin@skbatandok.edu.my',
      displayName: 'Guru Besar (SK Batandok)',
      role: 'ADMIN',
      active: true,
      createdAt: now,
      updatedAt: now
    },
    {
      uid: 'USR_TEACHER_01',
      email: 'guru@skbatandok.edu.my',
      displayName: 'Guru Bertugas (SK Batandok)',
      role: 'TEACHER',
      active: true,
      createdAt: now,
      updatedAt: now
    },
    {
      uid: 'USR_STAFF_01',
      email: 'staf@skbatandok.edu.my',
      displayName: 'Staf Operasi (SK Batandok)',
      role: 'STAFF',
      active: true,
      createdAt: now,
      updatedAt: now
    }
  ];

  const classes: ClassItem[] = [
    { id: 'CLS_1A', name: '1 ARIF', yearLevel: 1, active: true, createdAt: now, updatedAt: now },
    { id: 'CLS_1B', name: '1 BESTARI', yearLevel: 1, active: true, createdAt: now, updatedAt: now },
    { id: 'CLS_2C', name: '2 CEMERLANG', yearLevel: 2, active: true, createdAt: now, updatedAt: now },
    { id: 'CLS_3D', name: '3 DINAMIK', yearLevel: 3, active: true, createdAt: now, updatedAt: now },
    { id: 'CLS_4E', name: '4 ELIT', yearLevel: 4, active: true, createdAt: now, updatedAt: now },
    { id: 'CLS_5G', name: '5 GEMILANG', yearLevel: 5, active: true, createdAt: now, updatedAt: now },
    { id: 'CLS_6H', name: '6 HARMONI', yearLevel: 6, active: true, createdAt: now, updatedAt: now }
  ];

  // Token & SHA-256 Hashes
  // SHA-256 dihitung secara deterministik untuk simulasi
  const students: (Student & { plainToken: string })[] = [
    {
      id: 'STD_001',
      studentNumber: 'M2026-001',
      fullName: 'AHMAD DANIEL BIN ISMAIL',
      classId: 'CLS_1A',
      className: '1 ARIF',
      active: true,
      plainToken: 'SKB_TOKEN_AHMAD_DANIEL_1A',
      qrTokenHash: '6d0e808d4b3a4e98f0c29f8a29a0082f4d6d84a7e44a30e8c459800045f29cfb',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'STD_002',
      studentNumber: 'M2026-002',
      fullName: 'NUR AMIRA BINTI MOHD YUSOF',
      classId: 'CLS_1A',
      className: '1 ARIF',
      active: true,
      plainToken: 'SKB_TOKEN_NUR_AMIRA_1A',
      qrTokenHash: '9a84b3913f044b7f4be4752c1bbd0c2e6f4770258288544c4fae0a290d2ec80d',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'STD_003',
      studentNumber: 'M2026-003',
      fullName: 'CHONG WEI HONG',
      classId: 'CLS_1B',
      className: '1 BESTARI',
      active: true,
      plainToken: 'SKB_TOKEN_CHONG_WEI_HONG_1B',
      qrTokenHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'STD_004',
      studentNumber: 'M2026-004',
      fullName: 'SITI NUR AISYAH BINTI KHALID',
      classId: 'CLS_1B',
      className: '1 BESTARI',
      active: true,
      plainToken: 'SKB_TOKEN_AISYAH_KHALID_1B',
      qrTokenHash: '8f434346648f6b96df89dda901c5176b10e6d059612d559c41438b6009ed53ae',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'STD_005',
      studentNumber: 'M2026-005',
      fullName: 'KAVINDRAN A/L SIVAN',
      classId: 'CLS_2C',
      className: '2 CEMERLANG',
      active: true,
      plainToken: 'SKB_TOKEN_KAVINDRAN_2C',
      qrTokenHash: 'b45cffe084dd3d20d928bee85e7b0f21',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'STD_006',
      studentNumber: 'M2026-006',
      fullName: 'MUHAMMAD AMMAR RAYYAN BIN ZULKIFLI',
      classId: 'CLS_2C',
      className: '2 CEMERLANG',
      active: true,
      plainToken: 'SKB_TOKEN_AMMAR_RAYYAN_2C',
      qrTokenHash: 'a12bc44398fcd89028',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'STD_007',
      studentNumber: 'M2026-007',
      fullName: 'NUR DAMIA BATRISYIA BINTI FARID',
      classId: 'CLS_3D',
      className: '3 DINAMIK',
      active: true,
      plainToken: 'SKB_TOKEN_DAMIA_BATRISYIA_3D',
      qrTokenHash: 'c772d590a233b281b3',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'STD_008',
      studentNumber: 'M2026-008',
      fullName: 'LIM JIA EN',
      classId: 'CLS_4E',
      className: '4 ELIT',
      active: true,
      plainToken: 'SKB_TOKEN_LIM_JIA_EN_4E',
      qrTokenHash: 'f420cb0938bfe490',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'STD_009',
      studentNumber: 'M2026-009',
      fullName: 'MUHAMMAD HAZIQ BIN NAZRI',
      classId: 'CLS_5G',
      className: '5 GEMILANG',
      active: true,
      plainToken: 'SKB_TOKEN_HAZIQ_NAZRI_5G',
      qrTokenHash: '89ddaa328bb01944',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'STD_010',
      studentNumber: 'M2026-010',
      fullName: 'SARAH ALYSSA BINTI BASRI',
      classId: 'CLS_6H',
      className: '6 HARMONI',
      active: true,
      plainToken: 'SKB_TOKEN_SARAH_ALYSSA_6H',
      qrTokenHash: '344cc9021dafe003',
      createdAt: now,
      updatedAt: now
    }
  ];

  const sessions: SessionInfo[] = [
    {
      id: `${today}_PAGI`,
      date: today,
      type: 'PAGI',
      startTime: '06:30',
      endTime: '08:00',
      lateAfter: '07:30',
      status: 'OPEN'
    },
    {
      id: `${today}_PULANG`,
      date: today,
      type: 'PULANG',
      startTime: '12:30',
      endTime: '14:30',
      lateAfter: '13:00',
      status: 'OPEN'
    }
  ];

  // Rekod Kehadiran Contoh Hari Ini
  const attendance: AttendanceRecord[] = [
    {
      id: `STD_001_${today}_PAGI`,
      studentId: 'STD_001',
      studentNameSnapshot: 'AHMAD DANIEL BIN ISMAIL',
      classIdSnapshot: 'CLS_1A',
      classNameSnapshot: '1 ARIF',
      date: today,
      session: 'PAGI',
      status: 'HADIR',
      scannedAt: new Date(Date.now() - 3600000).toISOString(),
      scannedBy: 'USR_TEACHER_01',
      source: 'QR'
    },
    {
      id: `STD_002_${today}_PAGI`,
      studentId: 'STD_002',
      studentNameSnapshot: 'NUR AMIRA BINTI MOHD YUSOF',
      classIdSnapshot: 'CLS_1A',
      classNameSnapshot: '1 ARIF',
      date: today,
      session: 'PAGI',
      status: 'HADIR',
      scannedAt: new Date(Date.now() - 3400000).toISOString(),
      scannedBy: 'USR_TEACHER_01',
      source: 'QR'
    },
    {
      id: `STD_003_${today}_PAGI`,
      studentId: 'STD_003',
      studentNameSnapshot: 'CHONG WEI HONG',
      classIdSnapshot: 'CLS_1B',
      classNameSnapshot: '1 BESTARI',
      date: today,
      session: 'PAGI',
      status: 'LEWAT',
      scannedAt: new Date(Date.now() - 2000000).toISOString(),
      scannedBy: 'USR_STAFF_01',
      source: 'QR',
      correctionReason: 'Tiba pada 07:38 pagi kerana kesesakan lalu lintas'
    },
    {
      id: `STD_005_${today}_PAGI`,
      studentId: 'STD_005',
      studentNameSnapshot: 'KAVINDRAN A/L SIVAN',
      classIdSnapshot: 'CLS_2C',
      classNameSnapshot: '2 CEMERLANG',
      date: today,
      session: 'PAGI',
      status: 'HADIR',
      scannedAt: new Date(Date.now() - 3000000).toISOString(),
      scannedBy: 'USR_TEACHER_01',
      source: 'QR'
    },
    {
      id: `STD_009_${today}_PAGI`,
      studentId: 'STD_009',
      studentNameSnapshot: 'MUHAMMAD HAZIQ BIN NAZRI',
      classIdSnapshot: 'CLS_5G',
      classNameSnapshot: '5 GEMILANG',
      date: today,
      session: 'PAGI',
      status: 'LEWAT',
      scannedAt: new Date(Date.now() - 1500000).toISOString(),
      scannedBy: 'USR_STAFF_01',
      source: 'QR'
    }
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'LOG_INIT_01',
      actorUid: 'USR_ADMIN_01',
      actorEmail: 'admin@skbatandok.edu.my',
      action: 'BOOTSTRAP_FIRST_ADMIN',
      entityType: 'USER',
      entityId: 'USR_ADMIN_01',
      reason: 'Inisialisasi Pentadbir Utama Sistem Sekolah',
      createdAt: now
    },
    {
      id: 'LOG_INIT_02',
      actorUid: 'USR_ADMIN_01',
      actorEmail: 'admin@skbatandok.edu.my',
      action: 'IMPORT_STUDENTS_BATCH',
      entityType: 'STUDENT',
      entityId: 'BATCH_2026',
      reason: 'Pendaftaran Murid Sesi Persekolahan 2026',
      createdAt: now
    }
  ];

  return {
    users,
    classes,
    students,
    attendance,
    sessions,
    schoolDays: [],
    auditLogs,
    currentUser: users[0] // Lalai log masuk sebagai Admin untuk kemudahan demo
  };
}

export class MockDataStore {
  private data: LocalDatabaseSchema;

  constructor() {
    let raw: string | null = null;
    if (typeof localStorage !== 'undefined') {
      try {
        raw = localStorage.getItem(STORAGE_KEY);
      } catch {
        raw = null;
      }
    }

    if (raw) {
      try {
        this.data = JSON.parse(raw);
      } catch {
        this.data = getInitialSeed();
        this.save();
      }
    } else {
      this.data = getInitialSeed();
      this.save();
    }
  }

  private save() {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      } catch (e) {
        console.warn('LocalStorage save failed:', e);
      }
    }
  }

  getCurrentUser(): UserProfile | null {
    return this.data.currentUser;
  }

  setCurrentUser(u: UserProfile | null) {
    this.data.currentUser = u;
    this.save();
  }

  getUsers(): UserProfile[] {
    return this.data.users;
  }

  getClasses(): ClassItem[] {
    return this.data.classes;
  }

  addClass(item: ClassItem) {
    this.data.classes.push(item);
    this.save();
  }

  updateClass(id: string, updates: Partial<ClassItem>) {
    const c = this.data.classes.find(item => item.id === id);
    if (c) {
      Object.assign(c, updates);
      this.save();
    }
  }

  getStudents(classId?: string, activeOnly: boolean = false): Student[] {
    let list = this.data.students;
    if (classId && classId !== 'ALL') {
      list = list.filter(s => s.classId === classId);
    }
    if (activeOnly) {
      list = list.filter(s => s.active);
    }
    const classMap = new Map<string, string>();
    this.data.classes.forEach(c => classMap.set(c.id, c.name));
    return list.map(s => ({
      ...s,
      className: classMap.get(s.classId) || s.className || 'Kelas'
    }));
  }

  getStudentById(id: string): Student | undefined {
    return this.data.students.find(s => s.id === id);
  }

  findStudentByToken(token: string): (Student & { plainToken: string }) | undefined {
    const cleanToken = token.trim();
    return this.data.students.find(s => 
      s.plainToken === cleanToken || 
      cleanToken.includes(s.id) ||
      cleanToken.toUpperCase() === s.fullName.toUpperCase()
    );
  }

  addStudent(student: Student & { plainToken: string }) {
    this.data.students.push(student);
    this.save();
  }

  updateStudent(id: string, updates: Partial<Student & { plainToken?: string }>) {
    const s = this.data.students.find(item => item.id === id);
    if (s) {
      Object.assign(s, updates);
      this.save();
    }
  }

  getSessions(): SessionInfo[] {
    return this.data.sessions;
  }

  getSession(date: string, type: 'PAGI' | 'PULANG'): SessionInfo {
    const id = `${date}_${type}`;
    let s = this.data.sessions.find(item => item.id === id);
    if (!s) {
      s = {
        id,
        date,
        type,
        startTime: type === 'PAGI' ? '06:30' : '12:30',
        endTime: type === 'PAGI' ? '08:00' : '14:30',
        lateAfter: type === 'PAGI' ? '07:30' : '13:00',
        status: 'OPEN'
      };
      this.data.sessions.push(s);
      this.save();
    }
    return s;
  }

  setSession(info: SessionInfo) {
    const idx = this.data.sessions.findIndex(s => s.id === info.id);
    if (idx >= 0) {
      this.data.sessions[idx] = info;
    } else {
      this.data.sessions.push(info);
    }
    this.save();
  }

  getAttendance(date: string, session?: 'PAGI' | 'PULANG'): AttendanceRecord[] {
    let list = this.data.attendance.filter(r => r.date === date);
    if (session) {
      list = list.filter(r => r.session === session);
    }
    return list;
  }

  getMonthlyAttendance(year: number, month: number): AttendanceRecord[] {
    const monthStr = String(month).padStart(2, '0');
    const prefix = `${year}-${monthStr}`;
    return this.data.attendance.filter(r => r.date.startsWith(prefix));
  }

  addAttendance(record: AttendanceRecord) {
    const existing = this.data.attendance.find(r => r.id === record.id);
    if (!existing) {
      this.data.attendance.unshift(record);
      this.save();
    }
  }

  updateAttendance(id: string, updates: Partial<AttendanceRecord>) {
    const r = this.data.attendance.find(item => item.id === id);
    if (r) {
      Object.assign(r, updates);
      this.save();
    }
  }

  getAuditLogs(): AuditLog[] {
    return this.data.auditLogs;
  }

  addAuditLog(log: AuditLog) {
    this.data.auditLogs.unshift({
      ...log,
      id: `LOG_${Date.now()}`
    });
    this.save();
  }

  resetToSeed() {
    this.data = getInitialSeed();
    this.save();
  }
}

export const mockStore = new MockDataStore();
