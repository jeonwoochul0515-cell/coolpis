import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Order } from '../types/order';

const ORDERS_COLLECTION = 'orders';

/** 특정 차량에 배정된 주문 조회 (배송순서 오름차순) */
export async function getOrdersByVehicle(vehicle: string): Promise<Order[]> {
  const q = query(
    collection(db, ORDERS_COLLECTION),
    where('deliveryVehicle', '==', vehicle),
    orderBy('deliverySequence', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
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
