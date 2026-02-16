export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  unit: string;
  quantity: number;
}

export interface Order {
  id: string;
  uid: string;
  registrationNumber: string;
  businessName: string;
  items: OrderItem[];
  totalItems: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'delivered';
  createdAt: string;
}
