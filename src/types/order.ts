export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  unit: string;
  quantity: number;
}

export type DeliveryVehicle = '배송차1' | '배송차2' | '배송차3';

export interface Order {
  id: string;
  uid: string;
  registrationNumber: string;
  businessName: string;
  representative: string;
  address: string;
  phone: string;
  items: OrderItem[];
  totalItems: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'delivered';
  createdAt: string;
  deliveryVehicle?: DeliveryVehicle | null;
  deliverySequence?: number;
}
