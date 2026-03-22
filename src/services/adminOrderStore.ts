import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  orderBy,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Order, DeliveryVehicle } from '../types/order';

const ORDERS_COLLECTION = 'orders';

/**
 * 주문 조회 (날짜 범위 기반, 최신순)
 *
 * @param startDate - 조회 시작일 (ISO 문자열, 예: '2026-03-22'). 미지정 시 오늘 날짜.
 * @param endDate   - 조회 종료일 (ISO 문자열, 예: '2026-03-22'). 미지정 시 오늘 날짜.
 * @param maxResults - 최대 조회 건수 (기본 200)
 *
 * NOTE: Firestore 복합 인덱스 필요 — orders 컬렉션에 대해
 *   createdAt ASC (또는 DESC) 인덱스가 where + orderBy 조합에 필요합니다.
 *   Firebase 콘솔 또는 firestore.indexes.json에서 생성하세요.
 */
export async function getAllOrders(
  startDate?: string,
  endDate?: string,
  maxResults: number = 200
): Promise<Order[]> {
  const today = new Date().toISOString().slice(0, 10);
  const start = startDate ?? today;
  const end = endDate ?? today;

  // createdAt은 ISO 문자열(예: '2026-03-22T09:30:00.000Z')이므로
  // 시작일의 00:00:00 ~ 종료일의 23:59:59 범위로 필터링
  const q = query(
    collection(db, ORDERS_COLLECTION),
    where('createdAt', '>=', `${start}T00:00:00.000Z`),
    where('createdAt', '<=', `${end}T23:59:59.999Z`),
    orderBy('createdAt', 'desc'),
    limit(maxResults)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
}

/** 주문 상태 업데이트 */
export async function updateOrderStatus(
  orderId: string,
  status: Order['status']
): Promise<void> {
  await updateDoc(doc(db, ORDERS_COLLECTION, orderId), { status });
}

/** 차량 배정 + 순서 */
export async function assignToVehicle(
  orderId: string,
  vehicle: DeliveryVehicle | null,
  sequence: number
): Promise<void> {
  await updateDoc(doc(db, ORDERS_COLLECTION, orderId), {
    deliveryVehicle: vehicle,
    deliverySequence: sequence,
  });
}

/** 주문 상태 일괄 업데이트 */
export async function batchUpdateStatus(
  orderIds: string[],
  status: string
): Promise<void> {
  const batch = writeBatch(db);
  for (const orderId of orderIds) {
    batch.update(doc(db, ORDERS_COLLECTION, orderId), { status });
  }
  await batch.commit();
}

/** 배차 일괄 초기화 */
export async function batchResetDispatch(orderIds: string[]): Promise<void> {
  const batch = writeBatch(db);
  for (const orderId of orderIds) {
    batch.update(doc(db, ORDERS_COLLECTION, orderId), {
      deliveryVehicle: null,
      deliverySequence: 0,
    });
  }
  await batch.commit();
}

/** 주문 삭제 */
export async function deleteOrder(orderId: string): Promise<void> {
  await deleteDoc(doc(db, ORDERS_COLLECTION, orderId));
}

/** 순서 일괄 업데이트 */
export async function batchUpdateSequences(
  updates: { orderId: string; sequence: number }[]
): Promise<void> {
  const batch = writeBatch(db);
  for (const { orderId, sequence } of updates) {
    batch.update(doc(db, ORDERS_COLLECTION, orderId), {
      deliverySequence: sequence,
    });
  }
  await batch.commit();
}
