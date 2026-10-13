import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  sendSignInLinkToEmail, 
  isSignInWithEmailLink, 
  signInWithEmailLink 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

/**
 * Verified Firebase Project Configuration
 * Note: Provided authDomain "://firebaseapp.com" is automatically normalized to "${projectId}.firebaseapp.com"
 * to ensure Firebase Auth handler iframes and redirect receivers function correctly.
 */
const rawAuthDomain = "://firebaseapp.com";
const normalizedAuthDomain = rawAuthDomain.startsWith("://") 
  ? `healio-309b3${rawAuthDomain.replace('://', '.')}` 
  : rawAuthDomain;

export const firebaseConfig = {
  apiKey: "AIzaSyC-Sr3Nnz4_tMo-3ROqpwz-6ZxVnv2oiVs",
  authDomain: normalizedAuthDomain, // Resolves to: "healio-309b3.firebaseapp.com"
  projectId: "healio-309b3",
  storageBucket: "healio-309b3.firebasestorage.app",
  messagingSenderId: "425303107943",
  appId: "1:425303107943:web:31a940ed553f913d82a7c2",
  measurementId: "G-21N0J2K1Z9"
};

// 1. Initialize Firebase App (Singleton Pattern to prevent duplicate initialization)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// 2. Initialize Firestore Database (v10+ Modular SDK)
export const db = getFirestore(app);

// 3. Initialize Firebase Authentication Client
export const auth = getAuth(app);

// 4. Initialize Firebase Analytics safely wrapped in an environment support check
export let analytics = null;
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
 * DELIVERABLE 3: OTP Passwordless Authentication Link Handlers
 * ---------------------------------------------------------------------------
 */

/**
 * Dispatches an email sign-in link with embedded actionCodeSettings,
 * sets redirect target to /dashboard, and caches the user's email in localStorage.
 * 
 * @param {string} email - Destination email for passwordless verification
 * @returns {Promise<{ success: boolean, email: string }>}
 */
export async function sendOTPLink(email) {
  if (!email || !email.includes('@')) {
    throw new Error('A valid email address is required to dispatch the OTP link.');
  }

  const cleanEmail = email.trim().toLowerCase();

  const actionCodeSettings = {
    // URL to redirect back to. Must be whitelisted in Firebase Console -> Auth -> Settings -> Authorized Domains
    url: `${window.location.origin}/dashboard`,
    handleCodeInApp: true
  };

  try {
    await sendSignInLinkToEmail(auth, cleanEmail, actionCodeSettings);
    // Keep context alive across browser redirects
    window.localStorage.setItem('emailForSignIn', cleanEmail);
    return { success: true, email: cleanEmail };
  } catch (error) {
    console.error('[Firebase Auth] sendOTPLink failed:', error);
    throw error;
  }
}

/**
 * Evaluates whether the incoming page URL contains a valid sign-in link,
 * retrieves the cached email from localStorage (or prompts if opened in another browser/device),
 * and completes authentication into Firebase Auth.
 * 
 * @returns {Promise<{ success: boolean, user: import('firebase/auth').User } | null>}
 */
export async function completeOTPLogin() {
  if (typeof window === 'undefined') return null;

  const currentUrl = window.location.href;

  // 1. Evaluate if current URL is a valid Firebase email sign-in link
  if (!isSignInWithEmailLink(auth, currentUrl)) {
    return null;
  }

  // 2. Retrieve cached email from local storage
  let email = window.localStorage.getItem('emailForSignIn');

  // 3. Fallback: If opened on another device / browser tab where localStorage is absent
  if (!email) {
    email = window.prompt('Please enter the email address used to request the sign-in link for verification:');
  }

  if (!email) {
    throw new Error('Email verification required to complete passwordless sign-in.');
  }

  try {
    // 4. Authenticate the session
    const userCredential = await signInWithEmailLink(auth, email.trim().toLowerCase(), currentUrl);

    // 5. Clean up temporary localStorage marker
    window.localStorage.removeItem('emailForSignIn');

    // 6. Safely return authenticated user credentials profile
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
