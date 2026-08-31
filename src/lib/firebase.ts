import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  query,
  where,
} from 'firebase/firestore';
import { UserAccount, InBodyRecord } from '../types';
import { DEFAULT_ACCOUNTS, INITIAL_INBODY_RECORDS, INITIAL_LEE_RECORDS } from '../data/initialData';
import firebaseConfig from '../../firebase-applet-config.json';

// 1. Initialize Firebase App
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// 2. Initialize Firestore with custom databaseId if configured
export const db: Firestore = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Collection References
export const ACCOUNTS_COLLECTION = 'accounts';
export const RECORDS_COLLECTION = 'records';

/**
 * Initialize and seed initial data to cloud if collections are empty.
 */
export async function seedInitialCloudDataIfNeeded(): Promise<void> {
  try {
    const accountsRef = collection(db, ACCOUNTS_COLLECTION);
    const snap = await getDocs(accountsRef);
    if (snap.empty) {
      console.log('🌱 Firestore accounts collection is empty. Seeding initial accounts & records...');
      const batch = writeBatch(db);

      // Seed Default Accounts
      for (const account of DEFAULT_ACCOUNTS) {
        const accDoc = doc(db, ACCOUNTS_COLLECTION, account.id);
        batch.set(accDoc, account);
      }

      // Seed Demo records
      for (const rec of INITIAL_INBODY_RECORDS) {
        const recDoc = doc(db, RECORDS_COLLECTION, rec.id);
        batch.set(recDoc, { ...rec, userId: 'user_demo' });
      }

      // Seed Lee records
      for (const rec of INITIAL_LEE_RECORDS) {
        const recDoc = doc(db, RECORDS_COLLECTION, rec.id);
        batch.set(recDoc, { ...rec, userId: 'user_lee' });
      }

      await batch.commit();
      console.log('✅ Initial cloud data seeded successfully!');
    }
  } catch (error) {
    console.warn('Could not seed initial cloud data (may be offline or restricted):', error);
  }
}

/**
 * Subscribe to real-time accounts list from Firestore
 */
export function subscribeToAccounts(
  onAccountsUpdate: (accounts: UserAccount[]) => void,
  onError?: (error: Error) => void
): () => void {
  const accountsRef = collection(db, ACCOUNTS_COLLECTION);
  return onSnapshot(
    accountsRef,
    (snapshot) => {
      if (snapshot.empty) {
        // Trigger seeding if empty
        seedInitialCloudDataIfNeeded().then(() => {
          onAccountsUpdate(DEFAULT_ACCOUNTS);
        });
        return;
      }
      const loaded: UserAccount[] = [];
      snapshot.forEach((docSnap) => {
        loaded.push(docSnap.data() as UserAccount);
      });
      // Ensure admin account exists
      if (!loaded.some((a) => a.username === 'admin')) {
        const adminAcc = DEFAULT_ACCOUNTS.find((a) => a.username === 'admin');
        if (adminAcc) loaded.unshift(adminAcc);
      }
      onAccountsUpdate(loaded);
    },
    (err) => {
      console.warn('Firestore accounts subscription error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribe to all records for all users or a specific user in real-time
 */
export function subscribeToAllRecords(
  onRecordsUpdate: (recordsMap: Record<string, InBodyRecord[]>) => void,
  onError?: (error: Error) => void
): () => void {
  const recordsRef = collection(db, RECORDS_COLLECTION);
  return onSnapshot(
    recordsRef,
    (snapshot) => {
      const recordsMap: Record<string, InBodyRecord[]> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as InBodyRecord & { userId?: string };
        const userId = data.userId || 'user_demo';
        if (!recordsMap[userId]) {
          recordsMap[userId] = [];
        }
        recordsMap[userId].push(data);
      });

      // Sort each user's records by date descending
      Object.keys(recordsMap).forEach((uid) => {
        recordsMap[uid].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      });

      onRecordsUpdate(recordsMap);
    },
    (err) => {
      console.warn('Firestore records subscription error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Save / Update an InBody record to Firestore Cloud
 */
export async function saveRecordToCloud(record: InBodyRecord, userId: string): Promise<void> {
  try {
    // Avoid saving large Base64 images directly in documents if too large (>50KB)
    const sanitizedRecord: InBodyRecord & { userId: string } = {
      ...record,
      userId,
      imageUrl: record.imageUrl && record.imageUrl.length > 50000 ? '' : record.imageUrl,
    };
    const recDoc = doc(db, RECORDS_COLLECTION, record.id);
    await setDoc(recDoc, sanitizedRecord, { merge: true });
  } catch (error) {
    console.error('Failed to save record to Firestore:', error);
    throw error;
  }
}

/**
 * Delete an InBody record from Firestore Cloud
 */
export async function deleteRecordFromCloud(recordId: string): Promise<void> {
  try {
    const recDoc = doc(db, RECORDS_COLLECTION, recordId);
    await deleteDoc(recDoc);
  } catch (error) {
    console.error('Failed to delete record from Firestore:', error);
    throw error;
  }
}

/**
 * Save / Update a User Account in Firestore Cloud
 */
export async function saveAccountToCloud(account: UserAccount): Promise<void> {
  try {
    const accDoc = doc(db, ACCOUNTS_COLLECTION, account.id);
    await setDoc(accDoc, account, { merge: true });
  } catch (error) {
    console.error('Failed to save account to Firestore:', error);
    throw error;
  }
}

/**
 * Delete a User Account and all of their InBody records from Firestore Cloud
 */
export async function deleteAccountFromCloud(accountId: string): Promise<void> {
  try {
    // 1. Delete account document
    const accDoc = doc(db, ACCOUNTS_COLLECTION, accountId);
    await deleteDoc(accDoc);

    // 2. Query and delete all records for this user
    const recordsRef = collection(db, RECORDS_COLLECTION);
    const q = query(recordsRef, where('userId', '==', accountId));
    const querySnap = await getDocs(q);
    
    if (!querySnap.empty) {
      const batch = writeBatch(db);
      querySnap.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (error) {
    console.error('Failed to delete account from Firestore:', error);
    throw error;
  }
}

/**
 * Batch Restore entire database to Cloud (accounts + records)
 */
export async function restoreEntireDatabaseToCloud(
  accounts: UserAccount[],
  recordsByUser: Record<string, InBodyRecord[]>
): Promise<void> {
  try {
    const batch = writeBatch(db);

    // Write accounts
    for (const acc of accounts) {
      const accDoc = doc(db, ACCOUNTS_COLLECTION, acc.id);
      batch.set(accDoc, acc, { merge: true });
    }

    // Write records
    for (const [userId, recs] of Object.entries(recordsByUser)) {
      if (Array.isArray(recs)) {
        for (const r of recs) {
          const recDoc = doc(db, RECORDS_COLLECTION, r.id);
          batch.set(
            recDoc,
            {
              ...r,
              userId,
              imageUrl: r.imageUrl && r.imageUrl.length > 50000 ? '' : r.imageUrl,
            },
            { merge: true }
          );
        }
      }
    }

    await batch.commit();
  } catch (error) {
    console.error('Failed to restore entire database to Firestore:', error);
    throw error;
  }
}
