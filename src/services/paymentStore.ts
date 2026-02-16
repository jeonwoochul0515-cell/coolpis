import {
  addDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Payment } from '../types/payment';

const PAYMENTS_COLLECTION = 'payments';

/** 입금 기록 추가 */
export async function addPayment(
  registrationNumber: string,
  businessName: string,
  amount: number,
  memo?: string
): Promise<string> {
  const docRef = await addDoc(collection(db, PAYMENTS_COLLECTION), {
    registrationNumber,
    businessName,
    amount,
    memo: memo ?? '',
    createdAt: new Date().toISOString(),
  });
  return docRef.id;
}

/** 사업자별 입금 조회 */
export async function getPaymentsByRegNumber(
  registrationNumber: string
): Promise<Payment[]> {
  const q = query(
    collection(db, PAYMENTS_COLLECTION),
    where('registrationNumber', '==', registrationNumber)
  );
  const snap = await getDocs(q);
  const payments = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Payment));
  payments.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return payments;
}

/** 전체 입금 조회 */
export async function getAllPayments(): Promise<Payment[]> {
  const q = query(
    collection(db, PAYMENTS_COLLECTION),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Payment));
}

/** 입금 기록 삭제 */
export async function deletePayment(paymentId: string): Promise<void> {
  await deleteDoc(doc(db, PAYMENTS_COLLECTION, paymentId));
}
