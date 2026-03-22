import {
  addDoc,
  doc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { TaxInvoice } from '../types/taxInvoice';

const COLLECTION = 'taxInvoices';

/** 세금계산서 생성 */
export async function createTaxInvoice(
  invoice: Omit<TaxInvoice, 'id'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), invoice);
  return docRef.id;
}

/** 사업자등록번호 기준 세금계산서 조회 */
export async function getTaxInvoicesByBusiness(
  registrationNumber: string
): Promise<TaxInvoice[]> {
  const q = query(
    collection(db, COLLECTION),
    where('buyerRegNumber', '==', registrationNumber)
  );
  const snap = await getDocs(q);
  const invoices = snap.docs.map(
    (d) => ({ id: d.id, ...d.data() } as TaxInvoice)
  );
  invoices.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return invoices;
}

/** 전체 세금계산서 조회 */
export async function getAllTaxInvoices(): Promise<TaxInvoice[]> {
  const snap = await getDocs(collection(db, COLLECTION));
  const invoices = snap.docs.map(
    (d) => ({ id: d.id, ...d.data() } as TaxInvoice)
  );
  invoices.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return invoices;
}

/** 세금계산서 취소 */
export async function cancelTaxInvoice(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { status: 'cancelled' });
}
