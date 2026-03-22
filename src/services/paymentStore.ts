import {
  addDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Payment, PaymentType } from '../types/payment';

const PAYMENTS_COLLECTION = 'payments';

/** 입금 기록 추가 */
export async function addPayment(
  registrationNumber: string,
  businessName: string,
  amount: number,
  memo?: string,
  paymentType: PaymentType = 'settlement',
  linkedOrderIds?: string[]
): Promise<string> {
  const docRef = await addDoc(collection(db, PAYMENTS_COLLECTION), {
    registrationNumber,
    businessName,
    amount,
    memo: memo ?? '',
    createdAt: new Date().toISOString(),
    paymentType,
    ...(linkedOrderIds && linkedOrderIds.length > 0 ? { linkedOrderIds } : {}),
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

/**
 * 전체 입금 조회 (날짜 범위 기반, 최신순)
 *
 * @param startDate - 조회 시작일 (ISO 문자열, 예: '2026-03-22'). 미지정 시 전체 조회.
 * @param endDate   - 조회 종료일 (ISO 문자열, 예: '2026-03-22'). 미지정 시 전체 조회.
 * @param maxResults - 최대 조회 건수 (기본 200)
 */
export async function getAllPayments(
  startDate?: string,
  endDate?: string,
  maxResults: number = 200
): Promise<Payment[]> {
  // Firestore 복합 인덱스 필요: createdAt(DESC)
  // where + orderBy 조합 시 콘솔에서 인덱스 생성 필요할 수 있음
  let q;
  if (startDate && endDate) {
    q = query(
      collection(db, PAYMENTS_COLLECTION),
      where('createdAt', '>=', `${startDate}T00:00:00.000Z`),
      where('createdAt', '<=', `${endDate}T23:59:59.999Z`),
      orderBy('createdAt', 'desc'),
      limit(maxResults)
    );
  } else if (startDate) {
    q = query(
      collection(db, PAYMENTS_COLLECTION),
      where('createdAt', '>=', `${startDate}T00:00:00.000Z`),
      orderBy('createdAt', 'desc'),
      limit(maxResults)
    );
  } else if (endDate) {
    q = query(
      collection(db, PAYMENTS_COLLECTION),
      where('createdAt', '<=', `${endDate}T23:59:59.999Z`),
      orderBy('createdAt', 'desc'),
      limit(maxResults)
    );
  } else {
    q = query(
      collection(db, PAYMENTS_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(maxResults)
    );
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Payment));
}

/** 입금 기록 삭제 */
export async function deletePayment(paymentId: string): Promise<void> {
  await deleteDoc(doc(db, PAYMENTS_COLLECTION, paymentId));
}
