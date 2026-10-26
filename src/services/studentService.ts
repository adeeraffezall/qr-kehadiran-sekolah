import { 
  collection, 
  getDocs, 
  getDoc,
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';
import { Student } from '../types';
import { generateRandomToken, hashTokenClient } from './qrService';
import { createAuditLog } from './auditService';
import { mockStore } from './mockDataStore';
import * as XLSX from 'xlsx';

export async function getStudents(classIdFilter?: string, activeOnly: boolean = false): Promise<Student[]> {
  try {
    const studentsRef = collection(db, 'students');
    let q = query(studentsRef, orderBy('fullName', 'asc'));

    if (classIdFilter && classIdFilter !== 'ALL') {
      q = query(studentsRef, where('classId', '==', classIdFilter), orderBy('fullName', 'asc'));
    }

    const snap = await getDocs(q);
    if (!snap.empty) {
      let list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
      if (activeOnly) list = list.filter(s => s.active);
      return list;
    }
  } catch {
    // Fallback
  }
  return mockStore.getStudents(classIdFilter, activeOnly);
}

export async function getStudentById(studentId: string): Promise<Student | null> {
  try {
    const ref = doc(db, 'students', studentId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Student;
    }
  } catch {
    // Fallback
  }
  return mockStore.getStudentById(studentId) || null;
}

export async function addStudent(
  actorUid: string,
  actorEmail: string,
  data: {
    fullName: string;
    studentNumber?: string;
    classId: string;
  }
): Promise<{ studentId: string; plainToken: string }> {
  const newId = `STD_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const plainToken = generateRandomToken();
  const tokenHash = await hashTokenClient(plainToken);
  const now = new Date().toISOString();

  const studentData: Student & { plainToken: string } = {
    id: newId,
    fullName: data.fullName.trim().toUpperCase(),
    studentNumber: data.studentNumber ? data.studentNumber.trim() : '',
    classId: data.classId,
    active: true,
    plainToken,
    qrTokenHash: tokenHash,
    createdAt: now,
    updatedAt: now
  };

  try {
    const studentsRef = collection(db, 'students');
    const newDoc = doc(studentsRef, newId);
    await setDoc(newDoc, {
      ...studentData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch {
    // Fallback
  }

  mockStore.addStudent(studentData);

  await createAuditLog(
    actorUid,
    actorEmail,
    'ADD_STUDENT',
    'STUDENT',
    newId,
    'Pendaftaran murid baharu dan penjanaan QR',
    null,
    { fullName: data.fullName, classId: data.classId }
  );

  return { studentId: newId, plainToken };
}

export async function updateStudent(
  actorUid: string,
  actorEmail: string,
  studentId: string,
  data: Partial<Student>,
  reason?: string
): Promise<void> {
  try {
    const ref = doc(db, 'students', studentId);
    await updateDoc(ref, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch {
    // Fallback
  }

  mockStore.updateStudent(studentId, data);

  await createAuditLog(
    actorUid,
    actorEmail,
    'UPDATE_STUDENT',
    'STUDENT',
    studentId,
    reason || 'Kemaskini data profil murid',
    null,
    data
  );
}

export async function transferStudentClass(
  actorUid: string,
  actorEmail: string,
  studentId: string,
  newClassId: string,
  newClassName: string,
  reason: string
): Promise<void> {
  try {
    const ref = doc(db, 'students', studentId);
    await updateDoc(ref, {
      classId: newClassId,
      updatedAt: serverTimestamp()
    });
  } catch {
    // Fallback
  }

  mockStore.updateStudent(studentId, { classId: newClassId, className: newClassName });

  await createAuditLog(
    actorUid,
    actorEmail,
    'TRANSFER_STUDENT_CLASS',
    'STUDENT',
    studentId,
    reason || `Pertukaran ke kelas ${newClassName}`,
    null,
    { classId: newClassId, newClassName }
  );
}

export async function toggleStudentActive(
  actorUid: string,
  actorEmail: string,
  studentId: string,
  active: boolean,
  reason: string
): Promise<void> {
  try {
    const ref = doc(db, 'students', studentId);
    await updateDoc(ref, {
      active,
      updatedAt: serverTimestamp()
    });
  } catch {
    // Fallback
  }

  mockStore.updateStudent(studentId, { active });

  await createAuditLog(
    actorUid,
    actorEmail,
    active ? 'ACTIVATE_STUDENT' : 'DEACTIVATE_STUDENT',
    'STUDENT',
    studentId,
    reason,
    null,
    { active }
  );
}

export interface ImportRow {
  rowNumber: number;
  fullName: string;
  studentNumber: string;
  className: string;
  classId?: string;
  isValid: boolean;
  errors: string[];
}

export function parseAndValidateImport(
  rawRows: any[],
  availableClasses: { id: string; name: string }[],
  existingStudentNumbers: Set<string>
): ImportRow[] {
  const classNameMap = new Map<string, string>();
  availableClasses.forEach(c => classNameMap.set(c.name.trim().toUpperCase(), c.id));

  const seenInBatch = new Set<string>();

  return rawRows.map((row, idx) => {
    const rowNumber = idx + 2;
    const fullName = String(row['NAMA PENUH'] || row['NAMA'] || row['Nama'] || row['Full Name'] || '').trim();
    const studentNumber = String(row['NO. MURID'] || row['NO MURID'] || row['No Murid'] || row['Student ID'] || '').trim();
    const className = String(row['KELAS'] || row['Kelas'] || row['Class'] || '').trim();

    const errors: string[] = [];

    if (!fullName || fullName.length < 3) {
      errors.push('Nama murid wajib diisi (minimum 3 aksara).');
    }

    if (!className) {
      errors.push('Nama kelas wajib diisi.');
    } else {
      const matchedClassId = classNameMap.get(className.toUpperCase());
      if (!matchedClassId) {
        errors.push(`Kelas "${className}" tidak wujud dalam sistem. Sila cipta kelas terlebih dahulu.`);
      }
    }

    if (studentNumber) {
      if (existingStudentNumbers.has(studentNumber.toUpperCase())) {
        errors.push(`No. Murid "${studentNumber}" telah didaftarkan dalam sistem.`);
      }
      if (seenInBatch.has(studentNumber.toUpperCase())) {
        errors.push(`No. Murid "${studentNumber}" berulang dalam fail import ini.`);
      }
      seenInBatch.add(studentNumber.toUpperCase());
    }

    return {
      rowNumber,
      fullName: fullName.toUpperCase(),
      studentNumber,
      className,
      classId: classNameMap.get(className.toUpperCase()),
      isValid: errors.length === 0,
      errors
    };
  });
}

export function downloadStudentImportTemplate(): void {
  const sampleData = [
    {
      'NAMA PENUH': 'AHMAD BIN ABDULLAH',
      'NO. MURID': 'M1001',
      'KELAS': '1 ARIF'
    },
    {
      'NAMA PENUH': 'SITI NURHALIZA BINTI OTHMAN',
      'NO. MURID': 'M1002',
      'KELAS': '1 BESTARI'
    },
    {
      'NAMA PENUH': 'TAN WEI JIE',
      'NO. MURID': 'M1003',
      'KELAS': '2 CEMERLANG'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Templat Import Murid');
  XLSX.writeFile(wb, 'Templat_Import_Murid_SK.xlsx');
}

export async function deleteStudent(
  actorUid: string,
  actorEmail: string,
  studentId: string,
  studentName: string
): Promise<void> {
  try {
    const studentRef = doc(db, 'students', studentId);
    await deleteDoc(studentRef);
  } catch {
    // Fallback
  }

  mockStore.deleteStudent(studentId);

  await createAuditLog(
    actorUid,
    actorEmail,
    'DELETE_STUDENT',
    'STUDENT',
    studentId,
    `Padam murid: ${studentName}`,
    null,
    null
  );
}
