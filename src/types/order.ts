export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  unit: string;
  quantity: number;
}

export type DeliveryVehicle = string;

export type OrderStatus = 'pending' | 'confirmed' | 'in_transit' | 'delivered' | 'failed';

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
  status: OrderStatus;
  createdAt: string;
  deliveryVehicle?: DeliveryVehicle | null;
  deliverySequence?: number;
  deliveryNote?: string;
  deliveryPhoto?: string;
}
