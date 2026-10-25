export type UserRole = 'ADMIN' | 'TEACHER' | 'STAFF';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  active: boolean;
  createdAt: any;
  updatedAt: any;
}

export type SessionType = 'PAGI' | 'PULANG';
export type AttendanceStatus = 'HADIR' | 'LEWAT' | 'TIDAK_HADIR' | 'TIADA_STATUS';

export interface AttendanceRecord {
  id: string; // ${studentId}_${date}_${session}
  studentId: string;
  studentNameSnapshot: string;
  classIdSnapshot: string;
  classNameSnapshot: string;
  date: string; // YYYY-MM-DD (Waktu Malaysia)
  session: SessionType;
  status: AttendanceStatus;
  scannedAt: any;
  scannedBy: string;
  source: 'QR' | 'MANUAL';
  updatedAt?: any;
  correctedBy?: string;
  correctionReason?: string;
}

export interface Student {
  id: string;
  studentNumber?: string;
  fullName: string;
  classId: string;
  className?: string;
  active: boolean;
  qrTokenHash: string; // SHA-256 hash bagi token QR
  qrPlainToken?: string; // Digunakan semasa cetakan kad
  createdAt: any;
  updatedAt: any;
}

export interface ClassItem {
  id: string;
  name: string;
  yearLevel: number;
  active: boolean;
  studentCount?: number;
  createdAt: any;
  updatedAt: any;
}

export interface SchoolDay {
  date: string; // YYYY-MM-DD
  isSchoolDay: boolean;
  dayType: 'REGULAR' | 'HOLIDAY' | 'SPECIAL' | 'EXAM';
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface SessionInfo {
  id: string; // ${date}_${type}
  date: string;
  type: SessionType;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  lateAfter: string; // HH:mm
  status: 'OPEN' | 'CLOSED';
  openedBy?: string;
  closedBy?: string;
  openedAt?: any;
  closedAt?: any;
}

export interface AuditLog {
  id?: string;
  actorUid: string;
  actorEmail?: string;
  action: string;
  entityType: 'STUDENT' | 'ATTENDANCE' | 'SESSION' | 'USER' | 'QR' | 'CLASS' | 'SETTINGS';
  entityId: string;
  before?: any;
  after?: any;
  reason?: string;
  createdAt: any;
}

export interface ScanResult {
  success: boolean;
  duplicate?: boolean;
  code?: string;
  message: string;
  student?: {
    id?: string;
    fullName: string;
    studentNumber?: string;
    className: string;
  };
  status?: AttendanceStatus;
  date?: string;
  session?: SessionType;
  time?: string;
}
