import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { firestore, firebaseStorage } from '@/lib/firebase/client';
import { mapFirebaseError } from '@/lib/firebase/errors';
import type { CompanyMember, CompanyProfile } from '@/types/interfaces';

type CreateCompanyInput = {
  workspaceId: string;
  userId: string;
  userEmail?: string;
  name: string;
  branding: {
    primary: string;
    secondary?: string;
    accent?: string;
  };
  coverFile?: File | null;
};

const memoryCompanies: CompanyProfile[] = [];
const memoryListeners = new Set<(value: CompanyProfile[]) => void>();
const memoryPreferences = new Map<string, { lastActiveWorkspaceId?: string; lastActiveCompanyId?: string }>();

function notifyMemoryCompanies() {
  const sorted = [...memoryCompanies].sort((a, b) => a.name.localeCompare(b.name));
  for (const listener of memoryListeners) listener(sorted);
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function createEmptyCompanyProfile(input: CreateCompanyInput): CompanyProfile {
  const now = new Date().toISOString();
  return {
    id: `company-${crypto.randomUUID().slice(0, 8)}`,
    workspaceId: input.workspaceId,
    name: input.name.trim(),
    slug: slugify(input.name),
    status: 'draft',
    completionScore: 0,
    coverAssetUrl: '',
    branding: {
      primary: input.branding.primary,
      secondary: input.branding.secondary || '',
      accent: input.branding.accent || '',
    },
    memberCount: 0,
    sections: {
      identity: { legalName: '', tagline: '', mission: '', mascot: '', primaryColors: [input.branding.primary] },
      voice: { tone: '', dos: [], donts: [], ctaStyle: '', examples: [] },
      visual: { styleKeywords: [], typography: '', layoutDirection: '', moodReferences: [] },
      audience: { primaryPersona: '', geographies: [], keyObjections: [], desiredPerception: '' },
      content: { pillars: [], formats: [], cadence: '', goals: [], prohibitedTopics: [] },
    },
    promptPacks: {
      identity: [],
      voice: [],
      visual: [],
      audience: [],
      content: [],
    },
    aiContextCompiled: '',
    assets: [],
    createdBy: input.userId,
    updatedBy: input.userId,
    createdAt: now,
    updatedAt: now,
  };
}

export async function uploadCompanyCover(workspaceId: string, companyId: string, file: File) {
  if (!firebaseStorage) return '';
  const path = `workspaces/${workspaceId}/companies/${companyId}/cover/${Date.now()}-${file.name}`;
  const coverRef = ref(firebaseStorage, path);
  try {
    await uploadBytes(coverRef, file);
    return getDownloadURL(coverRef);
  } catch (error) {
    throw new Error(mapFirebaseError(error, 'storage'));
  }
}

export async function createCompany(input: CreateCompanyInput): Promise<CompanyProfile> {
  const company = createEmptyCompanyProfile(input);
  if (input.coverFile) {
    company.coverAssetUrl = await uploadCompanyCover(input.workspaceId, company.id, input.coverFile);
  }

  if (!firestore) {
    memoryCompanies.push(company);
    notifyMemoryCompanies();
    return company;
  }

  try {
    const companiesRef = collection(firestore, 'workspaces', input.workspaceId, 'companies');
    await setDoc(doc(companiesRef, company.id), company);

    const now = new Date().toISOString();
    const member: CompanyMember = {
      id: input.userId,
      workspaceId: input.workspaceId,
      companyId: company.id,
      email: (input.userEmail || `${input.userId}@local.test`).trim().toLowerCase(),
      uid: input.userId,
      name: 'Workspace Owner',
      role: 'admin',
      status: 'active',
      invitedBy: input.userId,
      invitedAt: now,
      joinedAt: now,
    };

    // Critical for authorization + listing: company is only visible to users who have a uid member doc.
    await setDoc(doc(firestore, 'workspaces', input.workspaceId, 'companies', company.id, 'members', input.userId), member, {
      merge: true,
    });
    return company;
  } catch (error) {
    throw new Error(mapFirebaseError(error, 'firestore'));
  }
}

export async function bootstrapCompanyCreatorMemberships(input: {
  workspaceId: string;
  uid: string;
  email?: string;
}) {
  const fs = firestore;
  if (!fs) return;

  try {
    const companiesRef = collection(fs, 'workspaces', input.workspaceId, 'companies');
    const snap = await getDocs(query(companiesRef, where('createdBy', '==', input.uid)));
    if (!snap.docs.length) return;

    const now = new Date().toISOString();
    const email = (input.email || `${input.uid}@local.test`).trim().toLowerCase();

    for (const docSnap of snap.docs) {
      const company = docSnap.data() as CompanyProfile;
      const memberRef = doc(fs, 'workspaces', input.workspaceId, 'companies', company.id, 'members', input.uid);
      const memberSnap = await getDoc(memberRef);
      if (memberSnap.exists()) continue;

      const member: CompanyMember = {
        id: input.uid,
        workspaceId: input.workspaceId,
        companyId: company.id,
        email,
        uid: input.uid,
        name: 'Workspace Owner',
        role: 'admin',
        status: 'active',
        invitedBy: input.uid,
        invitedAt: now,
        joinedAt: now,
      };

      await setDoc(memberRef, member, { merge: true });
    }
  } catch {
    // Best-effort; subscription will still work for companies that already have memberships.
  }
}

export function subscribeCompanies(
  workspaceId: string,
  userId: string,
  callback: (companies: CompanyProfile[]) => void,
  onError?: (message: string) => void
): Unsubscribe {
  const fs = firestore;
  if (!fs) {
    memoryListeners.add(callback);
    callback([...memoryCompanies].sort((a, b) => a.name.localeCompare(b.name)));
    return () => {
      memoryListeners.delete(callback);
    };
  }

  if (!userId) {
    callback([]);
    return () => undefined;
  }

  const companiesById = new Map<string, CompanyProfile>();
  const unsubByCompanyId = new Map<string, Unsubscribe>();

  function emit() {
    callback([...companiesById.values()].sort((a, b) => a.name.localeCompare(b.name)));
  }

  // List companies through the user's membership docs, not by reading the entire companies collection
  // (which breaks as soon as there are companies the user is not allowed to read).
  const membershipQuery = query(
    collectionGroup(fs, 'members'),
    where('uid', '==', userId),
    where('workspaceId', '==', workspaceId),
    where('status', '==', 'active')
  );

  const unsubscribeMembership = onSnapshot(
    membershipQuery,
    (snapshot) => {
      const desired = new Set<string>();
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data() as Partial<CompanyMember>;
        if (!data.companyId) continue;
        desired.add(String(data.companyId));
      }

      for (const [companyId, unsubscribe] of unsubByCompanyId.entries()) {
        if (desired.has(companyId)) continue;
        unsubscribe();
        unsubByCompanyId.delete(companyId);
        companiesById.delete(companyId);
      }

      for (const companyId of desired) {
        if (unsubByCompanyId.has(companyId)) continue;
        const companyRef = doc(fs, 'workspaces', workspaceId, 'companies', companyId);
        const unsub = onSnapshot(
          companyRef,
          (companySnap) => {
            if (!companySnap.exists()) {
              companiesById.delete(companyId);
              emit();
              return;
            }
            companiesById.set(companyId, companySnap.data() as CompanyProfile);
            emit();
          },
          (error) => onError?.(mapFirebaseError(error, 'firestore'))
        );
        unsubByCompanyId.set(companyId, unsub);
      }

      emit();
    },
    (error) => {
      onError?.(mapFirebaseError(error, 'firestore'));
    }
  );

  return () => {
    unsubscribeMembership();
    for (const unsub of unsubByCompanyId.values()) unsub();
    unsubByCompanyId.clear();
    companiesById.clear();
  };
}

export async function updateCompany(
  workspaceId: string,
  companyId: string,
  patch: Partial<CompanyProfile>
): Promise<void> {
  if (!firestore) {
    const index = memoryCompanies.findIndex((company) => company.id === companyId);
    if (index >= 0) {
      memoryCompanies[index] = {
        ...memoryCompanies[index],
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      notifyMemoryCompanies();
    }
    return;
  }

  try {
    const companyRef = doc(firestore, 'workspaces', workspaceId, 'companies', companyId);
    await updateDoc(companyRef, {
      ...patch,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    throw new Error(mapFirebaseError(error, 'firestore'));
  }
}

export async function getCompanyById(
  workspaceId: string,
  companyId: string
): Promise<CompanyProfile | null> {
  if (!firestore) {
    return memoryCompanies.find((company) => company.id === companyId) || null;
  }

  try {
    const companyRef = doc(firestore, 'workspaces', workspaceId, 'companies', companyId);
    const snapshot = await getDoc(companyRef);
    if (!snapshot.exists()) return null;
    return snapshot.data() as CompanyProfile;
  } catch {
    return null;
  }
}

export async function setUserCompanyPreference(
  userId: string,
  workspaceId: string,
  companyId: string | null
) {
  if (!firestore) {
    memoryPreferences.set(userId, {
      lastActiveWorkspaceId: workspaceId,
      lastActiveCompanyId: companyId || undefined,
    });
    return;
  }

  try {
    const prefRef = doc(firestore, 'users', userId, 'preferences', 'app');
    await setDoc(
      prefRef,
      {
        lastActiveWorkspaceId: workspaceId,
        lastActiveCompanyId: companyId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch {
    return;
  }
}

export async function getUserCompanyPreference(userId: string) {
  if (!firestore) {
    return (
      memoryPreferences.get(userId) || {
        lastActiveWorkspaceId: '',
        lastActiveCompanyId: '',
      }
    );
  }

  try {
    const prefRef = doc(firestore, 'users', userId, 'preferences', 'app');
    const snapshot = await getDoc(prefRef);
    if (!snapshot.exists()) {
      return {
        lastActiveWorkspaceId: '',
        lastActiveCompanyId: '',
      };
    }
    return snapshot.data() as { lastActiveWorkspaceId?: string; lastActiveCompanyId?: string };
  } catch {
    return {
      lastActiveWorkspaceId: '',
      lastActiveCompanyId: '',
    };
  }
}

export async function incrementCompanyMemberCount(workspaceId: string, companyId: string, delta: number) {
  const company = await getCompanyById(workspaceId, companyId);
  if (!company) return;
  const next = Math.max(0, (company.memberCount || 0) + delta);
  await updateCompany(workspaceId, companyId, { memberCount: next });
}
