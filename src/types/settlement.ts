export type SettlementStatus = 'draft' | 'confirmed';

export interface Settlement {
  id: string;
  registrationNumber: string;
  businessName: string;
  period: {
    start: string;
    end: string;
  };
  orderTotal: number;
  paymentTotal: number;
  balance: number; // 미수금 (orderTotal - paymentTotal)
  status: SettlementStatus;
  createdAt: string;
  confirmedAt?: string;
}
