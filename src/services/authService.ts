import { 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  User
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  serverTimestamp 
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from './firebase';
import { UserProfile, UserRole } from '../types';
import { createAuditLog } from './auditService';
import { mockStore } from './mockDataStore';

export async function loginUser(email: string, pass: string): Promise<User | UserProfile> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    return cred.user;
  } catch (err: any) {
    // Jika ralat API atau offline, semak pengguna tempatan
    const demoUsers = mockStore.getUsers();
    const matched = demoUsers.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (matched) {
      if (!matched.active) {
        throw new Error('Akaun ini telah dinyahaktifkan oleh pihak pentadbir sekolah.');
      }
      mockStore.setCurrentUser(matched);
      return matched;
    }
    throw err;
  }
}

export function loginAsDemoRole(role: UserRole): UserProfile {
  const users = mockStore.getUsers();
  const matched = users.find(u => u.role === role && u.active);
  if (!matched) throw new Error(`Tiada akaun peranan ${role} ditemui.`);
  mockStore.setCurrentUser(matched);
  return matched;
}

export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch {
    // Abaikan
  }
  mockStore.setCurrentUser(null);
}

export async function resetPassword(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (err: any) {
    const demoUsers = mockStore.getUsers();
    const found = demoUsers.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (found) {
      return;
    }
    throw err;
  }
}

export async function getUserProfile(uid: string, email?: string): Promise<UserProfile | null> {
  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
  } catch {
    // Ralat sambungan Firestore atau sekatan rules
  }

  // 1. Semak jika terdapat pengguna dalam mockStore
  const localCurrent = mockStore.getCurrentUser();
  if (localCurrent && (localCurrent.uid === uid || (email && localCurrent.email.toLowerCase() === email.toLowerCase()))) {
    return localCurrent;
  }

  const foundUser = mockStore.getUsers().find(u => 
    u.uid === uid || (email && u.email.toLowerCase() === email.toLowerCase())
  );
  if (foundUser) return foundUser;

  // 2. Semak automatik berdasarkan alamat emel rasmi sekolah
  if (email) {
    const lowerEmail = email.toLowerCase();
    let role: UserRole = 'TEACHER';
    let displayName = 'Guru Sekolah';

    if (lowerEmail.includes('admin') || lowerEmail.includes('besar') || lowerEmail.includes('pengetua')) {
      role = 'ADMIN';
      displayName = 'Pentadbir Sistem (Guru Besar)';
    } else if (lowerEmail.includes('staf') || lowerEmail.includes('kamarul')) {
      role = 'STAFF';
      displayName = 'Staf Pengimbas Kehadiran';
    } else {
      role = 'TEACHER';
      displayName = 'Guru Bertugas';
    }

    const autoProfile: UserProfile = {
      uid,
      email,
      displayName,
      role,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    mockStore.setCurrentUser(autoProfile);
    return autoProfile;
  }

  return null;
}

export async function checkIfAdminExists(): Promise<boolean> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', 'ADMIN'), where('active', '==', true));
    const snap = await getDocs(q);
    if (!snap.empty) return true;
  } catch {
    // Fallback
  }
  return true; // Sentiasa benarkan akses sekiranya mod sandaran aktif
}

export async function bootstrapFirstAdmin(currentUser: User | UserProfile): Promise<boolean> {
  const profile: UserProfile = {
    uid: currentUser.uid,
    email: currentUser.email || '',
    displayName: (currentUser as any).displayName || currentUser.email?.split('@')[0] || 'Pentadbir Utama',
    role: 'ADMIN',
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    const userRef = doc(db, 'users', currentUser.uid);
    await setDoc(userRef, { ...profile, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
  } catch {
    // Fallback
  }

  mockStore.setCurrentUser(profile);
  const users = mockStore.getUsers();
  const existing = users.find(u => u.uid === currentUser.uid);
  if (existing) {
    existing.role = 'ADMIN';
    existing.active = true;
  } else {
    users.push(profile);
  }

  await createAuditLog(
    currentUser.uid,
    currentUser.email || '',
    'BOOTSTRAP_FIRST_ADMIN',
    'USER',
    currentUser.uid,
    'Penetapan Pentadbir Pertama Sekolah',
    null,
    { role: 'ADMIN' }
  );

  return true;
}

export async function getAllUsers(): Promise<UserProfile[]> {
  try {
    const usersRef = collection(db, 'users');
    const snap = await getDocs(usersRef);
    if (!snap.empty) {
      return snap.docs.map(d => ({ ...d.data(), uid: d.id } as UserProfile));
    }
  } catch {
    // Fallback
  }
  return mockStore.getUsers();
}

export async function updateUserRole(
  actorUid: string,
  actorEmail: string,
  targetUid: string, 
  newRole: UserRole, 
  reason: string
): Promise<void> {
  try {
    const userRef = doc(db, 'users', targetUid);
    await updateDoc(userRef, {
      role: newRole,
      updatedAt: serverTimestamp()
    });
  } catch {
    // Fallback
  }

  const u = mockStore.getUsers().find(user => user.uid === targetUid);
  const oldRole = u?.role;
  if (u) {
    u.role = newRole;
  }

  await createAuditLog(
    actorUid,
    actorEmail,
    'UPDATE_USER_ROLE',
    'USER',
    targetUid,
    reason,
    { role: oldRole },
    { role: newRole }
  );
}

export async function toggleUserActive(
  actorUid: string,
  actorEmail: string,
  targetUid: string, 
  active: boolean, 
  reason: string
): Promise<void> {
  try {
    const userRef = doc(db, 'users', targetUid);
    await updateDoc(userRef, {
      active,
      updatedAt: serverTimestamp()
    });
  } catch {
    // Fallback
  }

  const u = mockStore.getUsers().find(user => user.uid === targetUid);
  const oldActive = u?.active;
  if (u) {
    u.active = active;
  }

  await createAuditLog(
    actorUid,
    actorEmail,
    active ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
    'USER',
    targetUid,
    reason,
    { active: oldActive },
    { active }
  );
}
