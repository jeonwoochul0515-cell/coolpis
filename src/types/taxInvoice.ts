export interface TaxInvoiceItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export type TaxInvoiceStatus = 'issued' | 'cancelled';

export interface TaxInvoice {
  id: string;
  serialNumber: string;
  issueDate: string;
  supplierName: string;
  supplierRegNumber: string;
  buyerName: string;
  buyerRegNumber: string;
  items: TaxInvoiceItem[];
  supplyAmount: number;
  taxAmount: number;
  totalAmount: number;
  status: TaxInvoiceStatus;
  createdAt: string;
}
