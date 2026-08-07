import { db, doc, getDoc } from './firebase';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import rawSeedData from '../data/seedData.json';

/**
 * Fetch all startup failure records from Firestore `companies` collection,
 * falling back to seedData.json if Firestore is unpopulated or offline.
 */
export async function fetchFirestoreStartups() {
  try {
    const colRef = collection(db, 'companies');
    const q = query(colRef, limit(500));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const list = [];
      snapshot.forEach(docSnap => {
        list.push(docSnap.data());
      });
      if (list.length >= 50) {
        return list;
      }
    }
  } catch (e) {
    console.warn('Firestore fetch failed/offline, using seedData fallback:', e);
  }

  // Resilient fallback to local dataset
  return rawSeedData;
}

/**
 * Fetch a single startup postmortem record by slug from Firestore `companies` collection.
 */
export async function fetchFirestoreStartupBySlug(slug) {
  if (!slug) return null;
  
  try {
    const docRef = doc(db, 'companies', slug);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (e) {
    console.warn('Firestore single document fetch failed, using seedData fallback:', e);
  }

  // Fallback search in seedData
  return rawSeedData.find(s => s.slug === slug || s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === slug) || null;
}
