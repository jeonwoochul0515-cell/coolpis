export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  unit: string;
  quantity: number;
}

export type DeliveryVehicle = string;

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
