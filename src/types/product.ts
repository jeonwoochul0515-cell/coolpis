export interface Product {
  id: string;
  name: string;
  description: string;
  price: number; // 박스 단위 가격 (원)
  unit: string;
  image: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
