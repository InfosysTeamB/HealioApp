import { FirebaseApp, initializeApp, getApps, getApp } from 'firebase/app';
import { 
  Auth,
  getAuth, 
  sendSignInLinkToEmail, 
  isSignInWithEmailLink, 
  signInWithEmailLink,
  User
} from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { Analytics, getAnalytics, isSupported } from 'firebase/analytics';

/**
 * Verified Firebase Project Credentials
 * Provided authDomain "://firebaseapp.com" is automatically normalized to "healio-309b3.firebaseapp.com"
 */
const rawAuthDomain = "://firebaseapp.com";
const normalizedAuthDomain = rawAuthDomain.startsWith("://") 
  ? `healio-309b3${rawAuthDomain.replace('://', '.')}` 
  : rawAuthDomain;

export const firebaseConfig = {
  apiKey: "AIzaSyC-Sr3Nnz4_tMo-3ROqpwz-6ZxVnv2oiVs",
  authDomain: normalizedAuthDomain,
  projectId: "healio-309b3",
  storageBucket: "healio-309b3.firebasestorage.app",
  messagingSenderId: "425303107943",
  appId: "1:425303107943:web:31a940ed553f913d82a7c2",
  measurementId: "G-21N0J2K1Z9"
};

// 1. Initialize Firebase App (Singleton Pattern)
export const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// 2. Initialize Firestore Database (v10+ Modular SDK)
export const db: Firestore = getFirestore(app);

// 3. Initialize Firebase Authentication Client
export const auth: Auth = getAuth(app);

// 4. Initialize Firebase Analytics safely wrapped in an environment support check
export let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    })
    .catch((error) => {
      console.warn('[Firebase Analytics] Initialization bypassed: Environment not supported.', error);
    });
}

/**
 * ---------------------------------------------------------------------------
 * OTP Passwordless Authentication Link Handlers
 * ---------------------------------------------------------------------------
 */

/**
 * Dispatches an email sign-in link with embedded actionCodeSettings,
 * sets redirect target to /dashboard, and caches the user's email in localStorage.
 */
export async function sendOTPLink(email: string): Promise<{ success: boolean; email: string }> {
  if (!email || !email.includes('@')) {
    throw new Error('A valid email address is required to dispatch the OTP link.');
  }

  const cleanEmail = email.trim().toLowerCase();

  const actionCodeSettings = {
    url: `${window.location.origin}/dashboard`,
    handleCodeInApp: true
  };

  try {
    await sendSignInLinkToEmail(auth, cleanEmail, actionCodeSettings);
    window.localStorage.setItem('emailForSignIn', cleanEmail);
    return { success: true, email: cleanEmail };
  } catch (error) {
    console.error('[Firebase Auth] sendOTPLink failed:', error);
    throw error;
  }
}

/**
 * Evaluates whether the incoming page URL contains a valid sign-in link,
 * retrieves the cached email from localStorage, and completes authentication into Firebase Auth.
 */
export async function completeOTPLogin(): Promise<{ success: boolean; user: User } | null> {
  if (typeof window === 'undefined') return null;

  const currentUrl = window.location.href;

  if (!isSignInWithEmailLink(auth, currentUrl)) {
    return null;
  }

  let email = window.localStorage.getItem('emailForSignIn');

  if (!email) {
    email = window.prompt('Please enter the email address used to request the sign-in link for verification:');
  }

  if (!email) {
    throw new Error('Email verification required to complete passwordless sign-in.');
  }

  try {
    const userCredential = await signInWithEmailLink(auth, email.trim().toLowerCase(), currentUrl);
    window.localStorage.removeItem('emailForSignIn');

    return {
      success: true,
      user: userCredential.user
    };
  } catch (error) {
    console.error('[Firebase Auth] completeOTPLogin failed:', error);
    throw error;
  }
}

export default app;
