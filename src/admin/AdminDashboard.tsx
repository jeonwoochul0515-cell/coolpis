import { useEffect, useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import { useAdminAuth } from './AdminAuthContext';
import {
  getAllOrders,
  updateOrderStatus,
  assignToVehicle,
  batchUpdateSequences,
} from '../services/adminOrderStore';
import { getAllPayments, addPayment, deletePayment } from '../services/paymentStore';
import type { Order, DeliveryVehicle } from '../types/order';
import type { Payment } from '../types/payment';

type TabFilter = 'all' | 'unassigned' | '배송차1' | '배송차2' | '배송차3' | 'byBusiness';

const STATUS_LABELS: Record<Order['status'], string> = {
  pending: '접수대기',
  confirmed: '주문확인',
  delivered: '배송완료',
};

const STATUS_COLORS: Record<Order['status'], 'warning' | 'info' | 'success'> = {
  pending: 'warning',
  confirmed: 'info',
  delivered: 'success',
};

const TAB_FILTERS: { label: string; value: TabFilter }[] = [
  { label: '전체', value: 'all' },
  { label: '미배정', value: 'unassigned' },
  { label: '배송차1', value: '배송차1' },
  { label: '배송차2', value: '배송차2' },
  { label: '배송차3', value: '배송차3' },
  { label: '사업자별', value: 'byBusiness' },
];

const VEHICLES: DeliveryVehicle[] = ['배송차1', '배송차2', '배송차3'];

function BusinessGroupView({
  orders,
  payments,
  dateRange,
  onDateRangeChange,
  onAddPayment,
  onDeletePayment,
  formatDate,
}: {
  orders: Order[];
  payments: Payment[];
  dateRange: { start: string; end: string };
  onDateRangeChange: (start: string, end: string) => void;
  onAddPayment: (regNum: string, businessName: string, amount: number, memo: string) => Promise<void>;
  onDeletePayment: (paymentId: string) => Promise<void>;
  formatDate: (iso: string) => string;
}) {
  const [paymentForms, setPaymentForms] = useState<Record<string, { amount: string; memo: string }>>({});

  const filteredOrders = orders.filter((o) => {
    const d = o.createdAt.slice(0, 10);
    return d >= dateRange.start && d <= dateRange.end;
  });

  const grouped = new Map<string, Order[]>();
  for (const order of filteredOrders) {
    const key = order.registrationNumber;
    const list = grouped.get(key);
    if (list) {
      list.push(order);
    } else {
      grouped.set(key, [order]);
    }
  }

  const paymentsByReg = new Map<string, Payment[]>();
  for (const p of payments) {
    const list = paymentsByReg.get(p.registrationNumber);
    if (list) {
      list.push(p);
    } else {
      paymentsByReg.set(p.registrationNumber, [p]);
    }
  }

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          type="date"
          label="시작일"
          value={dateRange.start}
          onChange={(e) => onDateRangeChange(e.target.value, dateRange.end)}
          size="small"
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          type="date"
          label="종료일"
          value={dateRange.end}
          onChange={(e) => onDateRangeChange(dateRange.start, e.target.value)}
          size="small"
          InputLabelProps={{ shrink: true }}
        />
      </Box>

      {grouped.size === 0 ? (
        <Typography color="text.secondary" textAlign="center" py={8}>
          해당 기간 주문이 없습니다.
        </Typography>
      ) : (
        Array.from(grouped.entries()).map(([regNum, groupOrders]) => {
          const first = groupOrders[0];
          const totalAmount = groupOrders.reduce((sum, o) => sum + o.totalPrice, 0);
          const regPayments = paymentsByReg.get(regNum) ?? [];
          const paidTotal = regPayments.reduce((sum, p) => sum + p.amount, 0);
          const unpaid = totalAmount - paidTotal;
          const form = paymentForms[regNum] ?? { amount: '', memo: '' };

          return (
            <Accordion key={regNum} disableGutters>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ width: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {first.businessName}
                    </Typography>
                    <Chip label={`${groupOrders.length}건`} size="small" color="primary" />
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                      총 {totalAmount.toLocaleString()}원
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
                    <Typography variant="body2" color="success.main">
                      입금: {paidTotal.toLocaleString()}원
                    </Typography>
                    <Typography variant="body2" color={unpaid > 0 ? 'error.main' : 'success.main'} fontWeight="bold">
                      미수금: {unpaid.toLocaleString()}원
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    사업자번호: {regNum} | 대표자: {first.representative ?? '정보 없음'} | 연락처: {first.phone ?? '정보 없음'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    주소: {first.address ?? '정보 없음'}
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <Stack spacing={1}>
                  {groupOrders.map((order) => (
                    <Paper key={order.id} variant="outlined" sx={{ p: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(order.createdAt)}
                        </Typography>
                        <Chip
                          label={STATUS_LABELS[order.status]}
                          color={STATUS_COLORS[order.status]}
                          size="small"
                        />
                      </Box>
                      <Typography variant="body2">
                        {order.items.map((item) => `${item.productName} x${item.quantity}`).join(', ')}
                        {' — '}
                        <strong>{order.totalPrice.toLocaleString()}원</strong>
                      </Typography>
                    </Paper>
                  ))}

                  {/* 입금 내역 */}
                  {regPayments.length > 0 && (
                    <>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="subtitle2" fontWeight="bold">입금 내역</Typography>
                      {regPayments.map((p) => (
                        <Paper key={p.id} variant="outlined" sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ flex: 1 }}>
                            {formatDate(p.createdAt)} — <strong>{p.amount.toLocaleString()}원</strong>
                            {p.memo ? ` (${p.memo})` : ''}
                          </Typography>
                          <IconButton size="small" color="error" onClick={() => onDeletePayment(p.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Paper>
                      ))}
                    </>
                  )}

                  {/* 입금 등록 폼 */}
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <TextField
                      size="small"
                      type="number"
                      label="입금액"
                      value={form.amount}
                      onChange={(e) =>
                        setPaymentForms((prev) => ({ ...prev, [regNum]: { ...form, amount: e.target.value } }))
                      }
                      sx={{ width: 140 }}
                    />
                    <TextField
                      size="small"
                      label="메모"
                      value={form.memo}
                      onChange={(e) =>
                        setPaymentForms((prev) => ({ ...prev, [regNum]: { ...form, memo: e.target.value } }))
                      }
                      sx={{ width: 160 }}
                    />
                    <Button
                      size="small"
                      variant="contained"
                      disabled={!form.amount || Number(form.amount) <= 0}
                      onClick={async () => {
                        await onAddPayment(regNum, first.businessName, Number(form.amount), form.memo);
                        setPaymentForms((prev) => ({ ...prev, [regNum]: { amount: '', memo: '' } }));
                      }}
                    >
                      입금 등록
                    </Button>
                  </Box>
                </Stack>
              </AccordionDetails>
            </Accordion>
          );
        })
      )}
    </Stack>
  );
}

function getDefaultDateRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const end = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

export default function AdminDashboard() {
  const { logout } = useAdminAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TabFilter>('all');
  const [dateRange, setDateRange] = useState(getDefaultDateRange);
  const [aiDispatching, setAiDispatching] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccess, setAiSuccess] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const [orderData, paymentData] = await Promise.all([
        getAllOrders(),
        getAllPayments(),
      ]);
      setOrders(orderData);
      setPayments(paymentData);
    } catch (err) {
      console.error('주문 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch (err) {
      console.error('상태 변경 실패:', err);
    }
  };

  const handleAssign = async (orderId: string, vehicle: DeliveryVehicle) => {
    try {
      const vehicleOrders = orders.filter((o) => o.deliveryVehicle === vehicle);
      const nextSeq = vehicleOrders.length + 1;
      await assignToVehicle(orderId, vehicle, nextSeq);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, deliveryVehicle: vehicle, deliverySequence: nextSeq }
            : o
        )
      );
    } catch (err) {
      console.error('차량 배정 실패:', err);
    }
  };

  const handleUnassign = async (orderId: string) => {
    try {
      const order = orders.find((o) => o.id === orderId);
      if (!order?.deliveryVehicle) return;

      const vehicle = order.deliveryVehicle;
      const removedSeq = order.deliverySequence ?? 0;

      await assignToVehicle(orderId, null, 0);

      // Resequence remaining orders in the same vehicle
      const remaining = orders
        .filter((o) => o.deliveryVehicle === vehicle && o.id !== orderId)
        .sort((a, b) => (a.deliverySequence ?? 0) - (b.deliverySequence ?? 0));

      const updates = remaining
        .filter((o) => (o.deliverySequence ?? 0) > removedSeq)
        .map((o, idx) => ({
          orderId: o.id,
          sequence: removedSeq + idx,
        }));

      if (updates.length > 0) {
        await batchUpdateSequences(updates);
      }

      setOrders((prev) => {
        const updated = prev.map((o) => {
          if (o.id === orderId) {
            return { ...o, deliveryVehicle: null, deliverySequence: 0 };
          }
          if (
            o.deliveryVehicle === vehicle &&
            (o.deliverySequence ?? 0) > removedSeq
          ) {
            return { ...o, deliverySequence: (o.deliverySequence ?? 0) - 1 };
          }
          return o;
        });
        return updated;
      });
    } catch (err) {
      console.error('배정 해제 실패:', err);
    }
  };

  const handleMoveUp = async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order?.deliveryVehicle || (order.deliverySequence ?? 0) <= 1) return;

    const seq = order.deliverySequence ?? 0;
    const vehicle = order.deliveryVehicle;
    const swapOrder = orders.find(
      (o) => o.deliveryVehicle === vehicle && o.deliverySequence === seq - 1
    );
    if (!swapOrder) return;

    try {
      await batchUpdateSequences([
        { orderId: order.id, sequence: seq - 1 },
        { orderId: swapOrder.id, sequence: seq },
      ]);
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id === order.id) return { ...o, deliverySequence: seq - 1 };
          if (o.id === swapOrder.id) return { ...o, deliverySequence: seq };
          return o;
        })
      );
    } catch (err) {
      console.error('순서 변경 실패:', err);
    }
  };

  const handleMoveDown = async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order?.deliveryVehicle) return;

    const seq = order.deliverySequence ?? 0;
    const vehicle = order.deliveryVehicle;
    const vehicleOrders = orders.filter((o) => o.deliveryVehicle === vehicle);
    const maxSeq = Math.max(...vehicleOrders.map((o) => o.deliverySequence ?? 0));
    if (seq >= maxSeq) return;

    const swapOrder = orders.find(
      (o) => o.deliveryVehicle === vehicle && o.deliverySequence === seq + 1
    );
    if (!swapOrder) return;

    try {
      await batchUpdateSequences([
        { orderId: order.id, sequence: seq + 1 },
        { orderId: swapOrder.id, sequence: seq },
      ]);
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id === order.id) return { ...o, deliverySequence: seq + 1 };
          if (o.id === swapOrder.id) return { ...o, deliverySequence: seq };
          return o;
        })
      );
    } catch (err) {
      console.error('순서 변경 실패:', err);
    }
  };

  const handleAIDispatch = async () => {
    const unassigned = orders.filter((o) => !o.deliveryVehicle);
    if (unassigned.length === 0) return;

    setAiDispatching(true);
    setAiError(null);

    try {
      const orderSummary = unassigned.map((o) => ({
        orderId: o.id,
        businessName: o.businessName,
        address: o.address,
        items: o.items.map((i) => `${i.productName} x${i.quantity}`).join(', '),
        totalPrice: o.totalPrice,
        createdAt: o.createdAt,
      }));

      const res = await fetch('/api/anthropic/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2048,
          messages: [
            {
              role: 'user',
              content: `당신은 배송 최적화 전문가입니다. 아래 주문 목록을 배송차 3대(배송차1, 배송차2, 배송차3)에 배정하고, 각 차량 내 배송 순서를 최적화해주세요.

배송 시작/종료 지점: 부산광역시 사상구 하신번영로 440

최적화 기준:
- 주소 기반 지역 근접성 (같은 구/동 묶기)
- 차량별 물량 균형
- 출발지에서 가까운 순서로 배송 순서 설정

주문 목록:
${JSON.stringify(orderSummary, null, 2)}

반드시 아래 JSON 형식만 반환하세요 (다른 텍스트 없이):
[{ "orderId": "...", "vehicle": "배송차1", "sequence": 1 }]`,
            },
          ],
        }),
      });

      if (!res.ok) {
        throw new Error('AI 배차 요청에 실패했습니다.');
      }

      const data = await res.json();
      const text: string = data.content?.[0]?.text ?? '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('AI 응답을 파싱할 수 없습니다.');
      }

      const assignments: { orderId: string; vehicle: DeliveryVehicle; sequence: number }[] =
        JSON.parse(jsonMatch[0]);

      // 배정 적용
      for (const a of assignments) {
        await assignToVehicle(a.orderId, a.vehicle, a.sequence);
      }

      // 로컬 상태 업데이트
      setOrders((prev) =>
        prev.map((o) => {
          const match = assignments.find((a) => a.orderId === o.id);
          if (match) {
            return { ...o, deliveryVehicle: match.vehicle, deliverySequence: match.sequence };
          }
          return o;
        })
      );

      setAiSuccess(`${assignments.length}건 AI 배차 완료`);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI 배차 중 오류가 발생했습니다.');
    } finally {
      setAiDispatching(false);
    }
  };

  const getFilteredOrders = () => {
    switch (filter) {
      case 'all':
        return orders;
      case 'unassigned':
        return orders.filter((o) => !o.deliveryVehicle);
      default:
        return orders
          .filter((o) => o.deliveryVehicle === filter)
          .sort((a, b) => (a.deliverySequence ?? 0) - (b.deliverySequence ?? 0));
    }
  };

  const filteredOrders = getFilteredOrders();

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            주문 관리
          </Typography>
          <Button color="inherit" onClick={logout}>
            로그아웃
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 3 }}>
        <Tabs
          value={TAB_FILTERS.findIndex((t) => t.value === filter)}
          onChange={(_, idx) => setFilter(TAB_FILTERS[idx].value)}
          sx={{ mb: 2 }}
          variant="scrollable"
          scrollButtons="auto"
        >
          {TAB_FILTERS.map((t) => {
            let count: number;
            if (t.value === 'all') {
              count = orders.length;
            } else if (t.value === 'unassigned') {
              count = orders.filter((o) => !o.deliveryVehicle).length;
            } else if (t.value === 'byBusiness') {
              const now = new Date();
              count = orders.filter((o) => {
                const d = new Date(o.createdAt);
                return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
              }).length;
            } else {
              count = orders.filter((o) => o.deliveryVehicle === t.value).length;
            }
            return <Tab key={t.value} label={`${t.label} (${count})`} />;
          })}
        </Tabs>

        {orders.filter((o) => !o.deliveryVehicle).length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              color="secondary"
              startIcon={aiDispatching ? <CircularProgress size={18} color="inherit" /> : <SmartToyIcon />}
              onClick={handleAIDispatch}
              disabled={aiDispatching}
            >
              {aiDispatching ? 'AI 배차 중...' : `AI 배차 (미배정 ${orders.filter((o) => !o.deliveryVehicle).length}건)`}
            </Button>
          </Box>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : filter === 'byBusiness' ? (
          <BusinessGroupView
            orders={orders}
            payments={payments}
            dateRange={dateRange}
            onDateRangeChange={(start, end) => setDateRange({ start, end })}
            onAddPayment={async (regNum, businessName, amount, memo) => {
              const id = await addPayment(regNum, businessName, amount, memo || undefined);
              setPayments((prev) => [{
                id,
                registrationNumber: regNum,
                businessName,
                amount,
                memo: memo || '',
                createdAt: new Date().toISOString(),
              }, ...prev]);
            }}
            onDeletePayment={async (paymentId) => {
              await deletePayment(paymentId);
              setPayments((prev) => prev.filter((p) => p.id !== paymentId));
            }}
            formatDate={formatDate}
          />
        ) : filteredOrders.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" py={8}>
            주문이 없습니다.
          </Typography>
        ) : (
          <Stack spacing={2}>
            {filteredOrders.map((order) => (
              <Card key={order.id} variant="outlined">
                <CardContent sx={{ pb: '12px !important' }}>
                  {/* Header: sequence + business name + status */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    {order.deliveryVehicle && (
                      <Chip
                        label={`#${order.deliverySequence ?? 0}`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    )}
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ flexGrow: 1 }}>
                      {order.businessName}
                    </Typography>
                    <Chip
                      label={STATUS_LABELS[order.status]}
                      color={STATUS_COLORS[order.status]}
                      size="small"
                    />
                    {order.deliveryVehicle && (
                      <Chip label={order.deliveryVehicle} size="small" color="primary" />
                    )}
                  </Box>

                  {/* Delivery info */}
                  <Box sx={{ mb: 1, color: 'text.secondary', fontSize: '0.875rem' }}>
                    <Typography variant="body2">
                      대표자: {order.representative ?? '정보 없음'} | 연락처: {order.phone ?? '정보 없음'}
                    </Typography>
                    <Typography variant="body2">
                      주소: {order.address ?? '정보 없음'}
                    </Typography>
                  </Box>

                  {/* Items */}
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {order.items.map((item) => `${item.productName} x${item.quantity}`).join(', ')}
                    {' — '}
                    <strong>{order.totalPrice.toLocaleString()}원</strong>
                  </Typography>

                  {/* Date */}
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(order.createdAt)}
                  </Typography>

                  {/* Actions */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                    {/* Status change buttons */}
                    {order.status === 'pending' && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleStatusChange(order.id, 'confirmed')}
                      >
                        주문확인
                      </Button>
                    )}
                    {order.status === 'confirmed' && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        onClick={() => handleStatusChange(order.id, 'delivered')}
                      >
                        배송완료
                      </Button>
                    )}

                    {/* Assign buttons (for unassigned orders) */}
                    {!order.deliveryVehicle && (
                      <>
                        {VEHICLES.map((v) => (
                          <Button
                            key={v}
                            size="small"
                            variant="contained"
                            color="primary"
                            onClick={() => handleAssign(order.id, v)}
                          >
                            {v}
                          </Button>
                        ))}
                      </>
                    )}

                    {/* Sequence + unassign buttons (for assigned orders) */}
                    {order.deliveryVehicle && (
                      <>
                        <IconButton
                          size="small"
                          onClick={() => handleMoveUp(order.id)}
                          disabled={(order.deliverySequence ?? 0) <= 1}
                        >
                          <ArrowUpwardIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleMoveDown(order.id)}
                          disabled={
                            (order.deliverySequence ?? 0) >=
                            Math.max(
                              ...orders
                                .filter((o) => o.deliveryVehicle === order.deliveryVehicle)
                                .map((o) => o.deliverySequence ?? 0)
                            )
                          }
                        >
                          <ArrowDownwardIcon fontSize="small" />
                        </IconButton>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => handleUnassign(order.id)}
                        >
                          배정해제
                        </Button>
                      </>
                    )}
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Container>

      <Snackbar open={!!aiSuccess} autoHideDuration={3000} onClose={() => setAiSuccess(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setAiSuccess(null)}>{aiSuccess}</Alert>
      </Snackbar>
      <Snackbar open={!!aiError} autoHideDuration={5000} onClose={() => setAiError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="error" variant="filled" onClose={() => setAiError(null)}>{aiError}</Alert>
      </Snackbar>
    </Box>
  );
}
