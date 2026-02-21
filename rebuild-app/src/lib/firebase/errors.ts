import { FirebaseError } from 'firebase/app';

type FirebaseArea = 'auth' | 'firestore' | 'storage';

function normalizeMessage(area: FirebaseArea, code: string) {
  if (area === 'auth') {
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Invalid email or password.';
      case 'auth/email-already-in-use':
        return 'That email is already registered. Sign in instead.';
      case 'auth/invalid-email':
        return 'Enter a valid email address.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.';
      case 'auth/operation-not-allowed':
        return 'Enable this sign-in provider in Firebase Auth -> Sign-in method.';
      case 'auth/account-exists-with-different-credential':
        return 'An account already exists with a different sign-in provider for this email.';
      case 'auth/popup-blocked':
        return 'Popup was blocked by the browser. Allow popups and try again.';
      case 'auth/popup-closed-by-user':
        return 'Sign-in popup was closed before finishing.';
      case 'auth/unauthorized-domain':
        return 'This domain is not authorized in Firebase Auth settings.';
      case 'auth/invalid-provider-id':
        return 'This auth provider is not configured correctly in Firebase.';
      case 'auth/network-request-failed':
        return 'Network error contacting Firebase Auth.';
      default:
        return 'Authentication failed. Check Firebase Auth provider setup.';
    }
  }

  if (area === 'firestore') {
    switch (code) {
      case 'permission-denied':
        return 'Firestore permission denied. Ensure signed-in users can read/write workspace docs in Firestore rules.';
      case 'unavailable':
        return 'Firestore is temporarily unavailable.';
      case 'failed-precondition':
        return 'Firestore operation failed precondition. Verify indexes/rules are deployed.';
      default:
        return 'Firestore request failed.';
    }
  }

  switch (code) {
    case 'storage/unauthorized':
      return 'Storage permission denied. Update Firebase Storage rules for authenticated users.';
    case 'storage/object-not-found':
      return 'The requested storage object was not found.';
    default:
      return 'Firebase Storage request failed.';
  }
}

export function mapFirebaseError(error: unknown, area: FirebaseArea) {
  if (error instanceof FirebaseError) {
    return normalizeMessage(area, error.code);
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Unexpected Firebase error.';
}
