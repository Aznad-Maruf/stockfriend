import {
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';

// ─── User Profile ───────────────────────────────────────────

export async function saveUserProfile(uid, user) {
  await setDoc(doc(db, 'users', uid, 'data', 'profile'), {
    displayName: user.displayName || '',
    email: user.email || '',
    photoURL: user.photoURL || '',
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

// ─── Answers (Assessment Choices) ───────────────────────────

export async function saveUserAnswers(uid, answers) {
  await setDoc(doc(db, 'users', uid, 'data', 'answers'), {
    ...answers,
    updatedAt: serverTimestamp(),
  });
}

export async function loadUserAnswers(uid) {
  const snap = await getDoc(doc(db, 'users', uid, 'data', 'answers'));
  if (snap.exists()) {
    const data = snap.data();
    // Strip Firestore metadata fields
    const { updatedAt, ...answers } = data;
    return answers;
  }
  return null;
}

export async function clearUserAnswers(uid) {
  await setDoc(doc(db, 'users', uid, 'data', 'answers'), {
    experience: null,
    risk: null,
    horizon: null,
    budget: null,
    goal: null,
    sectors: [],
    updatedAt: serverTimestamp(),
  });
}

// ─── Portfolios ─────────────────────────────────────────────

export async function savePortfolio(uid, portfolio) {
  const ref = collection(db, 'users', uid, 'portfolios');
  const docRef = await addDoc(ref, {
    ...portfolio,
    savedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function createPortfolio(uid, name) {
  const ref = collection(db, 'users', uid, 'portfolios');
  const docRef = await addDoc(ref, {
    name,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updatePortfolioName(uid, portfolioId, name) {
  await setDoc(doc(db, 'users', uid, 'portfolios', portfolioId), {
    name,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function loadPortfolios(uid) {
  const ref = collection(db, 'users', uid, 'portfolios');
  const snap = await getDocs(ref);
  const portfolios = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  // Sort client-side (newest first) — avoids needing a Firestore index
  portfolios.sort((a, b) => {
    const ta = a.createdAt?.seconds || 0;
    const tb = b.createdAt?.seconds || 0;
    return tb - ta;
  });
  return portfolios;
}

export async function deletePortfolio(uid, portfolioId) {
  // Delete all holdings first
  const holdingsRef = collection(db, 'users', uid, 'portfolios', portfolioId, 'holdings');
  const holdingsSnap = await getDocs(holdingsRef);
  const deletePromises = holdingsSnap.docs.map(d => deleteDoc(d.ref));
  await Promise.all(deletePromises);
  // Then delete the portfolio
  await deleteDoc(doc(db, 'users', uid, 'portfolios', portfolioId));
}

// ─── Holdings ───────────────────────────────────────────────

export async function addHolding(uid, portfolioId, holding) {
  const ref = collection(db, 'users', uid, 'portfolios', portfolioId, 'holdings');
  const docRef = await addDoc(ref, {
    ticker: holding.ticker,
    name: holding.name,
    quantity: holding.quantity,
    buyPrice: holding.buyPrice,
    buyDate: holding.buyDate || null,
    addedAt: serverTimestamp(),
  });
  // Touch parent updatedAt
  await setDoc(doc(db, 'users', uid, 'portfolios', portfolioId), {
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return docRef.id;
}

export async function removeHolding(uid, portfolioId, holdingId) {
  await deleteDoc(doc(db, 'users', uid, 'portfolios', portfolioId, 'holdings', holdingId));
  await setDoc(doc(db, 'users', uid, 'portfolios', portfolioId), {
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function loadHoldings(uid, portfolioId) {
  const ref = collection(db, 'users', uid, 'portfolios', portfolioId, 'holdings');
  const snap = await getDocs(ref);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
