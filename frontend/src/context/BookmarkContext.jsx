import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import { useAuth } from './AuthContext';
import { db, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from '../lib/firebase';

const BookmarkContext = createContext({ slugs: [], isBookmarked: () => false, toggleBookmark: () => {}, refresh: () => {} });

export const BookmarkProvider = ({ children }) => {
  const { user, isAuthed } = useAuth();
  const [slugs, setSlugs] = useState([]);

  const refresh = useCallback(async () => {
    if (!isAuthed) {
      setSlugs([]);
      return;
    }
    // Try Firestore first if user has UID
    if (user?.id) {
      try {
        const userDocRef = doc(db, 'users', user.id);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          if (Array.isArray(data.bookmarks)) {
            setSlugs(data.bookmarks);
            return;
          }
        }
      } catch (e) {
        // Fallback to API/local
      }
    }

    try {
      const { data } = await api.get('/bookmarks');
      setSlugs(data.slugs || []);
    } catch {
      // Local fallback
      const saved = localStorage.getItem(`pv_bookmarks_${user?.id || 'demo'}`);
      if (saved) {
        try { setSlugs(JSON.parse(saved)); } catch {}
      }
    }
  }, [isAuthed, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isBookmarked = useCallback((slug) => slugs.includes(slug), [slugs]);

  const toggleBookmark = useCallback(
    async (slug) => {
      const currentlyOn = slugs.includes(slug);
      const nextSlugs = currentlyOn ? slugs.filter((s) => s !== slug) : [...slugs, slug];
      
      // Optimistic state update
      setSlugs(nextSlugs);
      localStorage.setItem(`pv_bookmarks_${user?.id || 'demo'}`, JSON.stringify(nextSlugs));

      // Sync with Firestore
      if (user?.id) {
        try {
          const userDocRef = doc(db, 'users', user.id);
          await setDoc(userDocRef, {
            bookmarks: currentlyOn ? arrayRemove(slug) : arrayUnion(slug)
          }, { merge: true });
        } catch (e) {
          // Ignore Firestore sync errors in offline mode
        }
      }

      // Sync with API
      try {
        if (currentlyOn) {
          await api.delete(`/bookmarks/${slug}`);
        } else {
          await api.post('/bookmarks', { slug });
        }
      } catch {
        // Silently keep local optimistic state
      }
    },
    [slugs, user]
  );

  return (
    <BookmarkContext.Provider value={{ slugs, isBookmarked, toggleBookmark, refresh }}>
      {children}
    </BookmarkContext.Provider>
  );
};

export const useBookmarks = () => useContext(BookmarkContext);
