import {
  collection,
  getDocs,
  doc,
  updateDoc,
  writeBatch,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Order, DeliveryVehicle } from '../types/order';

const ORDERS_COLLECTION = 'orders';

/** 전체 주문 조회 (최신순) */
export async function getAllOrders(): Promise<Order[]> {
  const q = query(
    collection(db, ORDERS_COLLECTION),
    orderBy('createdAt', 'desc')
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
