export type PaymentType = 'advance' | 'settlement' | 'refund';

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  advance: '선입금',
  settlement: '정산',
  refund: '환불',
};

export interface Payment {
  id: string;
  registrationNumber: string;
  businessName: string;
  amount: number;
  memo?: string;
  createdAt: string;
  paymentType?: PaymentType;       // 기본값 'settlement'
  linkedOrderIds?: string[];       // 관련 주문 ID
}
