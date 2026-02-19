import {
  collection,
  getDocs,
  doc,
  updateDoc,
  writeBatch,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Order } from '../types/order';

const ORDERS_COLLECTION = 'orders';

/** 특정 차량에 배정된 주문 조회 (배송순서 오름차순) */
export async function getOrdersByVehicle(vehicle: string): Promise<Order[]> {
  const q = query(
    collection(db, ORDERS_COLLECTION),
    where('deliveryVehicle', '==', vehicle)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Order))
    .sort((a, b) => (a.deliverySequence ?? 0) - (b.deliverySequence ?? 0));
}

/** 주문 배송완료 처리 */
export async function markOrderDelivered(orderId: string): Promise<void> {
  await updateDoc(doc(db, ORDERS_COLLECTION, orderId), {
    status: 'delivered',
  });
}

/** 배송 순서 스왑 */
export async function swapDeliverySequence(
  orderId1: string,
  seq1: number,
  orderId2: string,
  seq2: number
): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, ORDERS_COLLECTION, orderId1), { deliverySequence: seq2 });
  batch.update(doc(db, ORDERS_COLLECTION, orderId2), { deliverySequence: seq1 });
  await batch.commit();
}

/** 배차된 차량 목록 조회 (중복 제거, 정렬) */
export async function getActiveVehicles(): Promise<string[]> {
  const q = query(collection(db, ORDERS_COLLECTION));
  const snap = await getDocs(q);
  const vehicles = new Set<string>();
  snap.docs.forEach((d) => {
    const data = d.data();
    if (data.deliveryVehicle) {
      vehicles.add(data.deliveryVehicle as string);
    }
  });
  return Array.from(vehicles).sort();
}
