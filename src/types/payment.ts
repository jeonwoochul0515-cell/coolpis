export interface Payment {
  id: string;
  registrationNumber: string;
  businessName: string;
  amount: number;
  memo?: string;
  createdAt: string;
}
