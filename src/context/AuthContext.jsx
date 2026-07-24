import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { saveUserProfile } from '../services/userService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      // Save/update profile on login
      if (firebaseUser) {
        try {
          await saveUserProfile(firebaseUser.uid, firebaseUser);
        } catch (e) {
          console.warn('Failed to save user profile:', e);
        }
      }
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      // User closed popup or other error
      if (error.code !== 'auth/popup-closed-by-user') {
        console.error('Sign-in error:', error);
      }
      return null;
    }
  }, []);

  const signOut = useCallback(async () => {
    await fbSignOut(auth);
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    isLoggedIn: !!user,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
