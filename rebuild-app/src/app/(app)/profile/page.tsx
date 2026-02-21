"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { PageHeader } from '@/components/ui/page-header';
import { useAuth } from '@/lib/firebase/auth-provider';
import { firebaseAuth, firebaseStorage, firestore } from '@/lib/firebase/client';
import { LogOut, User, Mail, Pencil, Check, X } from 'lucide-react';

type UserProfileDoc = {
  displayName: string;
  title: string;
  bio: string;
  photoURL: string;
  updatedAt: string;
};

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const initials = (user?.displayName ?? user?.email ?? '?')
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0].toUpperCase())
    .join('');

  const [editing, setEditing] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [nameVal, setNameVal] = useState(user?.displayName ?? '');
  const [titleVal, setTitleVal] = useState('');
  const [bioVal, setBioVal] = useState('');
  const [photoUrlVal, setPhotoUrlVal] = useState(user?.photoURL ?? '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setNameVal(user?.displayName ?? '');
    setPhotoUrlVal(user?.photoURL ?? '');
  }, [user?.displayName, user?.photoURL]);

  useEffect(() => {
    async function loadProfile() {
      if (!user?.uid || !firestore) return;
      setLoadingProfile(true);
      try {
        const profileRef = doc(firestore, 'users', user.uid, 'profile', 'public');
        const snap = await getDoc(profileRef);
        if (snap.exists()) {
          const data = snap.data() as Partial<UserProfileDoc>;
          setTitleVal(data.title || '');
          setBioVal(data.bio || '');
          if (data.displayName && !user.displayName) setNameVal(data.displayName);
          if (data.photoURL && !user.photoURL) setPhotoUrlVal(data.photoURL);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load profile.');
      } finally {
        setLoadingProfile(false);
      }
    }

    loadProfile().catch(() => undefined);
  }, [user?.uid, user?.displayName, user?.photoURL]);

  async function saveProfile() {
    if (!firebaseAuth?.currentUser) return;
    setSaving(true);
    setError(null);
    try {
      let nextPhotoUrl = photoUrlVal;

      if (avatarFile) {
        if (!firebaseStorage) {
          throw new Error('Firebase Storage is not configured.');
        }
        const ext = avatarFile.name.includes('.') ? avatarFile.name.split('.').pop() : 'jpg';
        const avatarRef = ref(firebaseStorage, `users/${firebaseAuth.currentUser.uid}/profile/avatar.${ext}`);
        await uploadBytes(avatarRef, avatarFile, { contentType: avatarFile.type });
        nextPhotoUrl = await getDownloadURL(avatarRef);
        setPhotoUrlVal(nextPhotoUrl);
      }

      await updateProfile(firebaseAuth.currentUser, {
        displayName: nameVal.trim(),
        photoURL: nextPhotoUrl || null,
      });

      if (firestore) {
        const profileRef = doc(firestore, 'users', firebaseAuth.currentUser.uid, 'profile', 'public');
        await setDoc(
          profileRef,
          {
            displayName: nameVal.trim(),
            title: titleVal.trim(),
            bio: bioVal.trim(),
            photoURL: nextPhotoUrl || '',
            updatedAt: new Date().toISOString(),
          } satisfies UserProfileDoc,
          { merge: true }
        );
      }

      setAvatarFile(null);
      setEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await logout();
    router.push('/');
  }

  return (
    <div className="page">
      <PageHeader title="My Profile" subtitle="Manage your account details and authentication." />

      <section className="panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'var(--accent)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              fontWeight: 700,
              flexShrink: 0,
              overflow: 'hidden',
            }}
          >
            {photoUrlVal ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrlVal} alt="Profile avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              initials
            )}
          </div>
          <div>
            <p style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>{nameVal || user?.displayName || 'No display name'}</p>
            <p style={{ color: 'var(--fg-muted)', margin: '2px 0 0', fontSize: '0.85rem' }}>{user?.email}</p>
            {titleVal ? <p style={{ color: 'var(--fg-muted)', margin: '2px 0 0', fontSize: '0.8rem' }}>{titleVal}</p> : null}
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">
            <User className="h-4 w-4" style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
            Account details
          </label>
          {editing ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>Display Name</span>
                <input className="input" value={nameVal} onChange={(e) => setNameVal(e.target.value)} autoFocus disabled={saving} />
              </label>
              <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>Title</span>
                <input
                  className="input"
                  value={titleVal}
                  onChange={(e) => setTitleVal(e.target.value)}
                  disabled={saving}
                  placeholder="Creative Director"
                />
              </label>
              <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>Bio</span>
                <textarea
                  className="input"
                  value={bioVal}
                  onChange={(e) => setBioVal(e.target.value)}
                  disabled={saving}
                  placeholder="Tell your team and clients about your role and expertise."
                  rows={4}
                  style={{ resize: 'vertical' }}
                />
              </label>
              <label style={{ display: 'grid', gap: 4 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>Profile image</span>
                <input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} disabled={saving} />
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-primary" onClick={saveProfile} disabled={saving} type="button">
                  <Check className="h-4 w-4" />
                  Save profile
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => {
                    setEditing(false);
                    setNameVal(user?.displayName ?? '');
                    setPhotoUrlVal(user?.photoURL ?? '');
                    setAvatarFile(null);
                  }}
                  type="button"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="input" style={{ flex: 1, color: nameVal ? 'inherit' : 'var(--fg-muted)' }}>
                {nameVal || 'Not set'}
              </span>
              <button className="btn-ghost" onClick={() => setEditing(true)} type="button">
                <Pencil className="h-4 w-4" />
                Edit
              </button>
            </div>
          )}
          {error ? <p style={{ color: 'var(--error, #e74c3c)', marginTop: 6, fontSize: '0.82rem' }}>{error}</p> : null}
          {loadingProfile ? <p style={{ color: 'var(--fg-muted)', marginTop: 6, fontSize: '0.82rem' }}>Loading profile...</p> : null}
          {success ? <p style={{ color: 'var(--success, #27ae60)', marginTop: 6, fontSize: '0.82rem' }}>Profile updated.</p> : null}
          {!editing && bioVal ? (
            <p style={{ color: 'var(--fg-muted)', marginTop: 10, fontSize: '0.84rem', whiteSpace: 'pre-wrap' }}>{bioVal}</p>
          ) : null}
        </div>

        <div className="form-field" style={{ marginTop: 16 }}>
          <label className="form-label">
            <Mail className="h-4 w-4" style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
            Email Address
          </label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="input" style={{ flex: 1, color: 'var(--fg-muted)', userSelect: 'all' }}>
              {user?.email ?? '-'}
            </span>
            <span className="badge">Read-only</span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--fg-muted)', marginTop: 4 }}>
            Email is set by your authentication provider and cannot be changed here.
          </p>
        </div>
      </section>

      <section className="panel">
        <h3>Authentication</h3>
        <p>You are signed in via <strong>{user?.providerData?.[0]?.providerId ?? 'email/password'}</strong>.</p>
        <div className="button-row" style={{ marginTop: 12 }}>
          <button className="btn-ghost" type="button" onClick={handleSignOut} style={{ color: 'var(--error, #e74c3c)' }}>
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </section>
    </div>
  );
}
