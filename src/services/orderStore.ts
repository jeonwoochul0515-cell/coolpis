import {
  addDoc,
  doc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { BusinessProfile } from '../types/profile';
import type { CartItem } from '../types/product';
import type { Order, OrderItem } from '../types/order';

const ORDERS_COLLECTION = 'orders';

/** 주문 저장 */
export async function saveOrder(
  uid: string,
  profile: BusinessProfile,
  items: CartItem[],
  totalItems: number,
  totalPrice: number
): Promise<string> {
  const orderItems: OrderItem[] = items.map((item) => ({
    productId: item.product.id,
    productName: item.product.name,
    price: item.product.price,
    unit: item.product.unit,
    quantity: item.quantity,
  }));

  const docRef = await addDoc(collection(db, ORDERS_COLLECTION), {
    uid,
    registrationNumber: profile.registrationNumber,
    businessName: profile.businessName,
    representative: profile.representative,
    address: profile.address,
    phone: profile.phone,
    items: orderItems,
    totalItems,
    totalPrice,
    status: 'pending',
    createdAt: new Date().toISOString(),
    deliveryVehicle: null,
    deliverySequence: 0,
  });

  console.log('[주문 저장] id:', docRef.id);
  return docRef.id;
}

/** 주문 취소 (삭제) */
export async function cancelOrder(orderId: string): Promise<void> {
  await deleteDoc(doc(db, ORDERS_COLLECTION, orderId));
  console.log('[주문 취소] id:', orderId);
}

/** uid 기준 주문 목록 조회 (최신순) */
export async function getOrdersByUid(uid: string): Promise<Order[]> {
  const q = query(
    collection(db, ORDERS_COLLECTION),
    where('uid', '==', uid)
  );
  const snap = await getDocs(q);
  const orders = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Order));
  orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return orders;
}
