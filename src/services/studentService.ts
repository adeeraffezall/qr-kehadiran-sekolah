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
  orderBy,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { Student } from '../types';
import { generateRandomToken, hashTokenClient } from './qrService';
import { createAuditLog } from './auditService';
import { mockStore } from './mockDataStore';
import * as XLSX from 'xlsx';

let isSyncingStudents = false;

/**
 * Pastikan 95 murid rasmi SK Batandok Beaufort disegerakkan ke Cloud Firestore
 */
export async function ensureBaselineStudentsInFirestore(): Promise<void> {
  if (isSyncingStudents) return;
  try {
    const studentsRef = collection(db, 'students');
    const snap = await getDocs(query(studentsRef));
    if (snap.empty) {
      isSyncingStudents = true;
      const initialStudents = mockStore.getStudents(undefined, false);
      if (initialStudents.length > 0) {
        const batch = writeBatch(db);
        initialStudents.forEach(s => {
          const docRef = doc(db, 'students', s.id);
          batch.set(docRef, {
            ...s,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        });
        await batch.commit();
        console.log(`[Firestore] Berjaya menyegerak ${initialStudents.length} murid rasmi ke Cloud Firestore.`);
      }
    }
  } catch (err) {
    console.warn('Gagal menyegerak murid ke Firestore:', err);
  } finally {
    isSyncingStudents = false;
  }
}

/**
 * Langgan senarai murid secara masa nyata (Realtime Listener - onSnapshot)
 * Membolehkan semua peranti guru (laptop, telefon) melihat kemas kini serta-merta tanpa perlu refresh!
 */
export function subscribeStudents(
  classIdFilter: string | undefined,
  activeOnly: boolean,
  callback: (students: Student[]) => void
): () => void {
  try {
    const studentsRef = collection(db, 'students');
    let q = query(studentsRef, orderBy('fullName', 'asc'));

    if (classIdFilter && classIdFilter !== 'ALL') {
      q = query(studentsRef, where('classId', '==', classIdFilter), orderBy('fullName', 'asc'));
    }

    const unsubscribe = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        let list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Student));
        if (activeOnly) list = list.filter(s => s.active);
        // Segerakkan ke storan setempat peranti
        list.forEach(s => mockStore.updateStudent(s.id, s));
        callback(list);
      } else {
        callback(mockStore.getStudents(classIdFilter, activeOnly));
      }
    }, (err) => {
      console.warn('Subscription students error:', err.message);
      callback(mockStore.getStudents(classIdFilter, activeOnly));
    });
    return unsubscribe;
  } catch (err) {
    callback(mockStore.getStudents(classIdFilter, activeOnly));
    return () => {};
  }
}

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
    gender?: string;
    role?: string;
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
    gender: data.gender || 'Lelaki',
    role: data.role || 'Murid',
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

/**
 * Kemaskini jawatan murid secara terus
 */
export async function updateStudentRole(
  actorUid: string,
  actorEmail: string,
  studentId: string,
  newRole: string,
  reason: string
): Promise<void> {
  await updateStudent(
    actorUid,
    actorEmail,
    studentId,
    { role: newRole },
    reason || `Kemaskini jawatan kepada ${newRole}`
  );
}

/**
 * Pindahkan jawatan dari satu murid kepada murid lain (Pindah Terus atau Tukar Saling)
 */
export async function transferStudentRole(
  actorUid: string,
  actorEmail: string,
  fromStudentId: string,
  toStudentId: string,
  mode: 'DIRECT' | 'SWAP',
  reason: string
): Promise<void> {
  const students = await getStudents();
  const fromStudent = students.find(s => s.id === fromStudentId);
  const toStudent = students.find(s => s.id === toStudentId);

  if (!fromStudent || !toStudent) {
    throw new Error('Murid terlibat tidak ditemui dalam rekod.');
  }

  const roleFrom = fromStudent.role || 'Murid';
  const roleTo = toStudent.role || 'Murid';

  let newFromRole = 'Murid';
  let newToRole = roleFrom;

  if (mode === 'SWAP') {
    newFromRole = roleTo;
    newToRole = roleFrom;
  }

  // 1. Kemaskini murid asal
  await updateStudent(
    actorUid,
    actorEmail,
    fromStudentId,
    { role: newFromRole },
    reason || `Pindahan jawatan ${roleFrom} kepada ${toStudent.fullName}`
  );

  // 2. Kemaskini murid sasaran
  await updateStudent(
    actorUid,
    actorEmail,
    toStudentId,
    { role: newToRole },
    reason || `Penerimaan jawatan ${newToRole} daripada ${fromStudent.fullName}`
  );

  await createAuditLog(
    actorUid,
    actorEmail,
    'TRANSFER_STUDENT_ROLE',
    'STUDENT',
    fromStudentId,
    reason || `Pindahan jawatan dari ${fromStudent.fullName} (${roleFrom}) kepada ${toStudent.fullName} (${newToRole})`,
    { fromStudent: { id: fromStudentId, role: roleFrom }, toStudent: { id: toStudentId, role: roleTo } },
    { fromStudent: { id: fromStudentId, role: newFromRole }, toStudent: { id: toStudentId, role: newToRole } }
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

export interface RolloverClassMapping {
  sourceClassId: string;
  sourceClassName: string;
  targetClassId: string; // ID kelas sasaran, atau 'GRADUATE', atau 'RETAIN'
  targetClassName?: string;
}

export interface RolloverOptions {
  targetSessionYear: string; // Contoh: '2027' atau '2027/2028'
  mappings: RolloverClassMapping[];
  resetClassRoles: boolean; // Set semula Ketua & Penolong Kelas kepada 'Murid'
  resetAllRoles: boolean;   // Set semula semua jawatan kepada 'Murid'
  auditReason?: string;
}

export interface RolloverResult {
  totalProcessed: number;
  promotedCount: number;
  graduatedCount: number;
  retainedCount: number;
  details: {
    studentId: string;
    studentName: string;
    action: 'PROMOTED' | 'GRADUATED' | 'RETAINED';
    fromClassName: string;
    toClassName: string;
    previousRole?: string;
    newRole?: string;
  }[];
}

/**
 * Janakan pemetaan kelas automatik berdasarkan yearLevel
 * Contoh: Pra (0) -> Tahun 1, Tahun 1 -> Tahun 2, ..., Tahun 5 -> Tahun 6, Tahun 6 -> Tamat/Alumni
 */
export function getDefaultRolloverMappings(classes: { id: string; name: string; yearLevel: number; active: boolean }[]): RolloverClassMapping[] {
  const activeClasses = classes.filter(c => c.active);
  const sortedClasses = [...activeClasses].sort((a, b) => a.yearLevel - b.yearLevel);

  return sortedClasses.map(c => {
    // Tahun 6: Tamat Persekolahan secara lalai
    if (c.yearLevel === 6) {
      return {
        sourceClassId: c.id,
        sourceClassName: c.name,
        targetClassId: 'GRADUATE',
        targetClassName: 'Tamat Persekolahan (Alumni)'
      };
    }

    // Naik 1 darjah
    const nextYearLevel = c.yearLevel + 1;
    const targetClass = sortedClasses.find(tc => tc.yearLevel === nextYearLevel);

    if (targetClass) {
      return {
        sourceClassId: c.id,
        sourceClassName: c.name,
        targetClassId: targetClass.id,
        targetClassName: targetClass.name
      };
    }

    // Jika tiada kelas seterusnya, tetapkan kepada RETAIN
    return {
      sourceClassId: c.id,
      sourceClassName: c.name,
      targetClassId: 'RETAIN',
      targetClassName: `Kekal (${c.name})`
    };
  });
}

/**
 * Laksanakan proses peralihan sesi persekolahan / naik kelas kelompok
 */
export async function executeAnnualRollover(
  actorUid: string,
  actorEmail: string,
  options: RolloverOptions
): Promise<RolloverResult> {
  const { targetSessionYear, mappings, resetClassRoles, resetAllRoles, auditReason } = options;

  const [allStudents, allClasses] = await Promise.all([
    getStudents(undefined, false),
    mockStore.getClasses()
  ]);

  const classMap = new Map<string, { id: string; name: string }>();
  allClasses.forEach(c => classMap.set(c.id, c));

  const mappingMap = new Map<string, RolloverClassMapping>();
  mappings.forEach(m => mappingMap.set(m.sourceClassId, m));

  const resultDetails: RolloverResult['details'] = [];
  let promotedCount = 0;
  let graduatedCount = 0;
  let retainedCount = 0;

  // Hanya proses murid yang aktif pada masa ini
  const activeStudents = allStudents.filter(s => s.active);

  const updatesToApply: {
    studentId: string;
    studentName: string;
    data: Partial<Student>;
  }[] = [];

  for (const student of activeStudents) {
    const mapping = mappingMap.get(student.classId);
    if (!mapping) {
      retainedCount++;
      resultDetails.push({
        studentId: student.id,
        studentName: student.fullName,
        action: 'RETAINED',
        fromClassName: student.className || 'Kelas',
        toClassName: student.className || 'Kelas'
      });
      continue;
    }

    const currentRole = student.role || 'Murid';
    let newRole = currentRole;

    if (resetAllRoles) {
      newRole = 'Murid';
    } else if (resetClassRoles && (currentRole === 'Ketua Kelas' || currentRole === 'Penolong Kelas')) {
      newRole = 'Murid';
    }

    if (mapping.targetClassId === 'GRADUATE') {
      graduatedCount++;
      const updateData: Partial<Student> = {
        active: false,
        role: newRole
      };
      updatesToApply.push({
        studentId: student.id,
        studentName: student.fullName,
        data: updateData
      });
      resultDetails.push({
        studentId: student.id,
        studentName: student.fullName,
        action: 'GRADUATED',
        fromClassName: student.className || mapping.sourceClassName,
        toClassName: 'Tamat Persekolahan (Alumni)',
        previousRole: currentRole,
        newRole
      });
    } else if (mapping.targetClassId === 'RETAIN' || mapping.targetClassId === student.classId) {
      retainedCount++;
      if (newRole !== currentRole) {
        updatesToApply.push({
          studentId: student.id,
          studentName: student.fullName,
          data: { role: newRole }
        });
      }
      resultDetails.push({
        studentId: student.id,
        studentName: student.fullName,
        action: 'RETAINED',
        fromClassName: student.className || mapping.sourceClassName,
        toClassName: student.className || mapping.sourceClassName,
        previousRole: currentRole,
        newRole
      });
    } else {
      const targetClass = classMap.get(mapping.targetClassId);
      const targetClassName = targetClass?.name || mapping.targetClassName || 'Kelas Baharu';

      promotedCount++;
      const updateData: Partial<Student> = {
        classId: mapping.targetClassId,
        className: targetClassName,
        role: newRole
      };
      updatesToApply.push({
        studentId: student.id,
        studentName: student.fullName,
        data: updateData
      });
      resultDetails.push({
        studentId: student.id,
        studentName: student.fullName,
        action: 'PROMOTED',
        fromClassName: student.className || mapping.sourceClassName,
        toClassName: targetClassName,
        previousRole: currentRole,
        newRole
      });
    }
  }

  // 1. Simpan ke Cloud Firestore secara berkumpulan (writeBatch)
  try {
    const BATCH_SIZE = 400;
    for (let i = 0; i < updatesToApply.length; i += BATCH_SIZE) {
      const slice = updatesToApply.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      slice.forEach(item => {
        const studentRef = doc(db, 'students', item.studentId);
        batch.update(studentRef, {
          ...item.data,
          updatedAt: serverTimestamp()
        });
      });
      await batch.commit();
    }
  } catch (err) {
    console.warn('Ralat simpanan batch Firestore (menggunakan fallback setempat):', err);
  }

  // 2. Simpan ke mockStore setempat
  updatesToApply.forEach(item => {
    mockStore.updateStudent(item.studentId, item.data);
  });

  // 3. Log Audit Rasmi
  const summaryMsg = auditReason || 
    `Peralihan Sesi Persekolahan ke ${targetSessionYear}: ${promotedCount} murid dinaikkan kelas, ${graduatedCount} murid Tahun 6 tamat sekolah, ${retainedCount} murid kekal.`;

  await createAuditLog(
    actorUid,
    actorEmail,
    'ANNUAL_ROLLOVER',
    'STUDENT',
    'SK_BATANDOK',
    summaryMsg,
    { targetSessionYear, activeStudentsCount: activeStudents.length },
    {
      promotedCount,
      graduatedCount,
      retainedCount,
      totalProcessed: updatesToApply.length
    }
  );

  return {
    totalProcessed: updatesToApply.length,
    promotedCount,
    graduatedCount,
    retainedCount,
    details: resultDetails
  };
}
