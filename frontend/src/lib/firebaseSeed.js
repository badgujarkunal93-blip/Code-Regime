import { db, doc, setDoc, writeBatch } from './firebase';
import rawSeedData from '../data/seedData.json';

// Normalize startup record for Firestore storage
function normalizeForFirestore(item) {
  const name = item.name || 'Unnamed Startup';
  const slug = item.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const foundersArr = Array.isArray(item.founders) 
    ? item.founders 
    : (typeof item.founders === 'string' ? item.founders.split(',').map(s => s.trim()) : []);
  const investorsArr = Array.isArray(item.investors) 
    ? item.investors 
    : (typeof item.investors === 'string' ? item.investors.split(',').map(s => s.trim()) : []);
  
  return {
    id: slug,
    slug,
    name,
    tagline: item.tagline || item.summary || '',
    summary: item.summary || 'No detailed summary available.',
    industry: item.industry || 'Technology',
    status: (item.status || 'failed').toLowerCase(),
    country: item.country || 'USA',
    fundingInr: Number(item.fundingInr) || 0,
    fundingFormatted: item.funding || '$0M',
    foundingYear: item.foundingYear || 2015,
    shutdownYear: item.shutdownYear || 2022,
    lifetimeMonths: item.lifetimeMonths || 36,
    topFailureReason: item.topFailureReason || 'No PMF',
    failureCategory: item.failureCategory || 'pmf',
    founders: foundersArr,
    investors: investorsArr,
    domain: item.domain || `${slug}.com`,
    postmortemText: item.postmortemText || item.summary || '',
    updatedAt: new Date().toISOString()
  };
}

/**
 * Seed all 413+ startup failure records into Firestore `companies` collection
 */
export async function seedFirestoreCompanies(onProgress) {
  const total = rawSeedData.length;
  let count = 0;
  const batchSize = 40; // Firestore batch limit is 500
  
  for (let i = 0; i < total; i += batchSize) {
    const chunk = rawSeedData.slice(i, i + batchSize);
    const batch = writeBatch(db);
    
    chunk.forEach(item => {
      const normalized = normalizeForFirestore(item);
      const docRef = doc(db, 'companies', normalized.slug);
      batch.set(docRef, normalized, { merge: true });
      count++;
    });
    
    await batch.commit();
    if (typeof onProgress === 'function') {
      onProgress(count, total);
    }
  }
  
  return { success: true, count };
}
