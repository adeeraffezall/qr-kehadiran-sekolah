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
  date: string; // YYYY-MM-DD
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
  active: boolean;
  qrTokenHash: string;
  createdAt: any;
  updatedAt: any;
}

export interface ClassItem {
  id: string;
  name: string;
  yearLevel: number;
  active: boolean;
  createdAt: any;
  updatedAt: any;
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
