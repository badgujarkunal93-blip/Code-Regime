import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api, { getToken, setToken } from '../lib/api';
import { 
  auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  updateProfile
} from '../lib/firebase';

const AuthContext = createContext(null);

const DEMO_USER = { 
  id: 'demo-user-id', 
  name: 'Demo Founder', 
  email: 'demo@pivotvault.com', 
  createdAt: new Date().toISOString() 
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      // Ignore firebase signout error
    }
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    // Check local demo token first
    const token = getToken();
    if (token === 'mock-demo-token-12345') {
      setUser(DEMO_USER);
      setLoading(false);
      return;
    }

    // Subscribe to Firebase Auth state
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const formattedUser = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Founder'),
          email: firebaseUser.email,
          createdAt: firebaseUser.metadata?.creationTime || new Date().toISOString(),
        };
        setUser(formattedUser);
        setToken(firebaseUser.accessToken || 'firebase-token');
        setLoading(false);
      } else {
        // Fallback check for API user if no firebase user
        const checkApiUser = async () => {
          if (!getToken()) {
            setUser(null);
            setLoading(false);
            return;
          }
          try {
            const { data } = await api.get('/auth/me');
            setUser(data.user);
          } catch {
            setToken(null);
            setUser(null);
          } finally {
            setLoading(false);
          }
        };
        checkApiUser();
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handler = () => logout();
    window.addEventListener('pv-unauthorized', handler);
    return () => window.removeEventListener('pv-unauthorized', handler);
  }, [logout]);

  const login = async (email, password) => {
    const cleanEmail = email.toLowerCase().trim();
    // Instant demo credentials check
    if (cleanEmail === 'demo@pivotvault.com' && password === 'password123') {
      setToken('mock-demo-token-12345');
      setUser(DEMO_USER);
      return DEMO_USER;
    }

    try {
      // Try Firebase Auth first
      const res = await signInWithEmailAndPassword(auth, email, password);
      const formattedUser = {
        id: res.user.uid,
        name: res.user.displayName || (res.user.email ? res.user.email.split('@')[0] : 'Founder'),
        email: res.user.email,
        createdAt: res.user.metadata?.creationTime || new Date().toISOString(),
      };
      setToken(res.user.accessToken || 'firebase-token');
      setUser(formattedUser);
      return formattedUser;
    } catch (firebaseErr) {
      // Fallback to Express backend auth
      try {
        const { data } = await api.post('/auth/login', { email, password });
        setToken(data.token);
        setUser(data.user);
        return data.user;
      } catch (apiErr) {
        throw firebaseErr || apiErr;
      }
    }
  };

  const register = async (name, email, password) => {
    const cleanEmail = email.toLowerCase().trim();
    if (cleanEmail === 'demo@pivotvault.com' && password === 'password123') {
      setToken('mock-demo-token-12345');
      setUser(DEMO_USER);
      return DEMO_USER;
    }

    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      if (name && res.user) {
        try {
          await updateProfile(res.user, { displayName: name });
        } catch (pErr) {
          console.warn('Could not update Firebase profile name:', pErr);
        }
      }
      const formattedUser = {
        id: res.user.uid,
        name: name || (res.user.email ? res.user.email.split('@')[0] : 'Founder'),
        email: res.user.email,
        createdAt: res.user.metadata?.creationTime || new Date().toISOString(),
      };
      setToken(res.user.accessToken || 'firebase-token');
      setUser(formattedUser);
      return formattedUser;
    } catch (firebaseErr) {
      try {
        const { data } = await api.post('/auth/register', { name, email, password });
        setToken(data.token);
        setUser(data.user);
        return data.user;
      } catch (apiErr) {
        throw firebaseErr || apiErr;
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAuthed: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
