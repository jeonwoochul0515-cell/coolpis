import type { Order } from '../types/order';
import type { Payment } from '../types/payment';
import { PAYMENT_TYPE_LABELS } from '../types/payment';

const STATUS_LABELS: Record<Order['status'], string> = {
  pending: '접수대기',
  confirmed: '주문확인',
  in_transit: '배송중',
  delivered: '배송완료',
  failed: '배송실패',
};

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadCsv(filename: string, csvContent: string): void {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportOrdersCsv(orders: Order[]): void {
  const header = ['주문일', '상호명', '대표자', '주소', '전화번호', '상품목록', '총수량', '총금액', '상태', '배송차량'];
  const rows = orders.map((o) => [
    o.createdAt.slice(0, 10),
    o.businessName,
    o.representative ?? '',
    o.address ?? '',
    o.phone ?? '',
    o.items.map((item) => `${item.productName} x${item.quantity}`).join(' / '),
    String(o.totalItems),
    String(o.totalPrice),
    STATUS_LABELS[o.status] ?? o.status,
    o.deliveryVehicle ?? '',
  ]);

  const csv = [header, ...rows].map((row) => row.map(escapeCsvField).join(',')).join('\n');
  const today = new Date().toISOString().slice(0, 10);
  downloadCsv(`주문목록_${today}.csv`, csv);
}

export function exportPaymentsCsv(payments: Payment[]): void {
  const header = ['입금일', '상호명', '사업자번호', '금액', '유형', '메모'];
  const rows = payments.map((p) => [
    p.createdAt.slice(0, 10),
    p.businessName,
    p.registrationNumber,
    String(p.amount),
    PAYMENT_TYPE_LABELS[p.paymentType ?? 'settlement'] ?? '',
    p.memo ?? '',
  ]);

  const csv = [header, ...rows].map((row) => row.map(escapeCsvField).join(',')).join('\n');
  const today = new Date().toISOString().slice(0, 10);
  downloadCsv(`입금목록_${today}.csv`, csv);
}
