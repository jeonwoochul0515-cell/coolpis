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
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import { useAdminAuth } from './AdminAuthContext';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import {
  getAllOrders,
  updateOrderStatus,
  assignToVehicle,
  batchUpdateSequences,
  batchUpdateStatus,
  batchResetDispatch,
  deleteOrder,
} from '../services/adminOrderStore';
import { getAllPayments, addPayment, deletePayment } from '../services/paymentStore';
import type { Order, DeliveryVehicle } from '../types/order';
import type { Payment } from '../types/payment';

type TabFilter = string; // 'all' | 'unassigned' | '배송차N' | 'byBusiness'

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

function getActiveVehicles(orders: Order[]): DeliveryVehicle[] {
  const vehicles = new Set<string>();
  for (const o of orders) {
    if (o.deliveryVehicle) vehicles.add(o.deliveryVehicle);
  }
  return Array.from(vehicles).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.replace(/\D/g, '')) || 0;
    return numA - numB;
  });
}

function generateVehicleNames(count: number): DeliveryVehicle[] {
  return Array.from({ length: count }, (_, i) => `배송차${i + 1}`);
}

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
  const [loadingListVehicle, setLoadingListVehicle] = useState<DeliveryVehicle | null>(null);
  const [vehicleCountDialogOpen, setVehicleCountDialogOpen] = useState(false);
  const [vehicleCount, setVehicleCount] = useState<string>('2');
  const [hideDelivered, setHideDelivered] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

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

  const handleConfirmAll = async () => {
    const pendingOrders = orders.filter((o) => o.status === 'pending');
    if (pendingOrders.length === 0) return;

    try {
      await batchUpdateStatus(
        pendingOrders.map((o) => o.id),
        'confirmed'
      );
      setOrders((prev) =>
        prev.map((o) =>
          o.status === 'pending' ? { ...o, status: 'confirmed' as const } : o
        )
      );
      setAiSuccess(`${pendingOrders.length}건 전체 주문확인 완료`);
    } catch (err) {
      console.error('전체 주문확인 실패:', err);
      setAiError('전체 주문확인에 실패했습니다.');
    }
  };

  const handleResetAllDispatch = () => {
    const assignedOrders = orders.filter((o) => o.deliveryVehicle);
    if (assignedOrders.length === 0) return;
    setConfirmDialog({
      open: true,
      title: '배차 전체 초기화',
      message: `${assignedOrders.length}건의 배차를 모두 초기화하시겠습니까?\n모든 차량 배정과 순서가 해제됩니다.`,
      onConfirm: async () => {
        try {
          await batchResetDispatch(assignedOrders.map((o) => o.id));
          setOrders((prev) =>
            prev.map((o) =>
              o.deliveryVehicle
                ? { ...o, deliveryVehicle: null, deliverySequence: 0 }
                : o
            )
          );
          setAiSuccess(`${assignedOrders.length}건 배차 초기화 완료`);
        } catch (err) {
          console.error('배차 초기화 실패:', err);
          setAiError('배차 초기화에 실패했습니다.');
        }
      },
    });
  };

  const handleVehicleDeliverAll = (vehicle: DeliveryVehicle) => {
    const vehicleOrders = orders.filter(
      (o) => o.deliveryVehicle === vehicle && o.status !== 'delivered'
    );
    if (vehicleOrders.length === 0) return;
    setConfirmDialog({
      open: true,
      title: `${vehicle} 전체 배송완료`,
      message: `${vehicle}에 배정된 ${vehicleOrders.length}건을 모두 배송완료 처리하시겠습니까?`,
      onConfirm: async () => {
        try {
          await batchUpdateStatus(
            vehicleOrders.map((o) => o.id),
            'delivered'
          );
          setOrders((prev) =>
            prev.map((o) =>
              o.deliveryVehicle === vehicle && o.status !== 'delivered'
                ? { ...o, status: 'delivered' as const }
                : o
            )
          );
          setAiSuccess(`${vehicle} ${vehicleOrders.length}건 배송완료 처리`);
        } catch (err) {
          console.error('전체 배송완료 실패:', err);
          setAiError('전체 배송완료 처리에 실패했습니다.');
        }
      },
    });
  };

  const handleDeleteOrder = (orderId: string, businessName: string) => {
    setConfirmDialog({
      open: true,
      title: '주문 삭제',
      message: `"${businessName}" 주문을 삭제하시겠습니까?\n삭제된 주문은 복구할 수 없습니다.`,
      onConfirm: async () => {
        try {
          await deleteOrder(orderId);
          setOrders((prev) => prev.filter((o) => o.id !== orderId));
          setAiSuccess('주문이 삭제되었습니다.');
        } catch (err) {
          console.error('주문 삭제 실패:', err);
          setAiError('주문 삭제에 실패했습니다.');
        }
      },
    });
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

  const handleAIDispatchClick = () => {
    const unassigned = orders.filter((o) => !o.deliveryVehicle);
    if (unassigned.length === 0) return;
    setVehicleCount('2');
    setVehicleCountDialogOpen(true);
  };

  const handleAIDispatch = async (numVehicles: number) => {
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

      const vehicleNames = generateVehicleNames(numVehicles);
      const vehicleList = vehicleNames.join(', ');

      const res = await fetch('/api/anthropic/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: `당신은 부산광역시에서 10년간 배송코스를 전담해온 유통 전문가입니다.
부산 전 지역의 도로 사정, 교통 흐름, 지역 특성을 완벽하게 파악하고 있습니다.

## 작업
아래 주문들을 배송차 ${numVehicles}대(${vehicleList})에 배정하고, 각 차량의 배송 순서를 최적 경로로 설정하세요.

## 출발지/복귀지
부산광역시 사상구 하신번영로 440 (모든 차량 동일)

## 배차 규칙 (10년 경력 기반)
1. **지역 클러스터링**: 같은 구/인접 구를 같은 차량에 묶되, 부산 지형 특성을 반영
   - 해안 라인: 해운대구↔수영구↔남구↔영도구 (해안도로 연결)
   - 내륙 라인: 사상구↔북구↔강서구↔사하구 (낙동강 서쪽)
   - 도심 라인: 중구↔동구↔부산진구↔연제구 (도심 연결)
   - 동부 라인: 해운대구↔기장군↔금정구 (반송~기장 연결)
   - 서부 라인: 사하구↔강서구↔북구 (을숙도~덕천 연결)
   - 금정/동래 라인: 금정구↔동래구↔연제구 (온천장~거제 연결)
2. **차량별 물량 균형**: 주문 수를 최대한 균등 배분 (차이 1건 이내)
3. **배송 순서 최적화**: 출발지(사상구 하신번영로)에서 출발하여 교통 흐름과 실제 도로 연결을 고려한 최적 경로
   - 사상구에서 가까운 곳: 북구, 강서구, 사하구 (10~15분)
   - 사상구에서 중간 거리: 부산진구, 동구, 중구, 연제구, 동래구 (20~30분)
   - 사상구에서 먼 곳: 해운대구, 수영구, 남구, 기장군, 금정구, 영도구 (30~50분)
   - sequence 1 = 출발지에서 가장 먼저 방문하는 곳
   - 마지막 sequence = 출발지로 돌아오기 직전 마지막 방문지
4. **실전 노하우**:
   - 같은 건물/같은 상가 내 여러 주문은 반드시 같은 차량, 연속 순서로 배정
   - 주소가 같은 구인데 떨어진 동이면 다른 차량도 가능

## 주문 목록
${JSON.stringify(orderSummary, null, 2)}

## 응답 형식
반드시 JSON 배열만 반환하세요. 다른 텍스트, 설명, 마크다운 없이 순수 JSON만:
[{"orderId":"...","vehicle":"배송차1","sequence":1}]
vehicle 값은 반드시 ${vehicleList} 중 하나여야 합니다.`,
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

      setAiSuccess(`${numVehicles}대 차량, ${assignments.length}건 AI 배차 완료`);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI 배차 중 오류가 발생했습니다.');
    } finally {
      setAiDispatching(false);
    }
  };

  const activeVehicles = getActiveVehicles(orders);

  const tabFilters: { label: string; value: TabFilter }[] = [
    { label: '전체', value: 'all' },
    { label: '미배정', value: 'unassigned' },
    ...activeVehicles.map((v) => ({ label: v, value: v })),
    { label: '사업자별', value: 'byBusiness' },
  ];

  const getFilteredOrders = () => {
    let result: Order[];
    switch (filter) {
      case 'all':
        result = orders;
        break;
      case 'unassigned':
        result = orders.filter((o) => !o.deliveryVehicle);
        break;
      default:
        result = orders
          .filter((o) => o.deliveryVehicle === filter)
          .sort((a, b) => (a.deliverySequence ?? 0) - (b.deliverySequence ?? 0));
        break;
    }
    if (hideDelivered) {
      result = result.filter((o) => o.status !== 'delivered');
    }
    return result;
  };

  const filteredOrders = getFilteredOrders();
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const deliveredCount = orders.filter((o) => o.status === 'delivered').length;

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
          value={Math.max(0, tabFilters.findIndex((t) => t.value === filter))}
          onChange={(_, idx) => setFilter(tabFilters[idx]?.value ?? 'all')}
          sx={{ mb: 2 }}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabFilters.map((t) => {
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

        <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          {pendingCount > 0 && (
            <Button
              variant="contained"
              color="info"
              startIcon={<CheckCircleOutlineIcon />}
              onClick={handleConfirmAll}
            >
              전체 주문확인 ({pendingCount}건)
            </Button>
          )}
          {orders.filter((o) => !o.deliveryVehicle).length > 0 && (
            <Button
              variant="contained"
              color="secondary"
              startIcon={aiDispatching ? <CircularProgress size={18} color="inherit" /> : <SmartToyIcon />}
              onClick={handleAIDispatchClick}
              disabled={aiDispatching}
            >
              {aiDispatching ? 'AI 배차 중...' : `AI 배차 (미배정 ${orders.filter((o) => !o.deliveryVehicle).length}건)`}
            </Button>
          )}
          {activeVehicles.length > 0 && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<RestartAltIcon />}
              onClick={handleResetAllDispatch}
            >
              배차 초기화
            </Button>
          )}
          {activeVehicles.map((v) => {
            const vNotDelivered = orders.filter(
              (o) => o.deliveryVehicle === v && o.status !== 'delivered'
            ).length;
            return (
              <Box key={v} sx={{ display: 'inline-flex', gap: 0.5 }}>
                <Button
                  variant="outlined"
                  startIcon={<LocalShippingIcon />}
                  onClick={() => setLoadingListVehicle(v)}
                >
                  {v} 상차리스트
                </Button>
                {vNotDelivered > 0 && (
                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    startIcon={<DoneAllIcon />}
                    onClick={() => handleVehicleDeliverAll(v)}
                  >
                    전체 배송완료
                  </Button>
                )}
              </Box>
            );
          })}
          {deliveredCount > 0 && (
            <Button
              variant="text"
              size="small"
              startIcon={hideDelivered ? <VisibilityOffIcon /> : <VisibilityIcon />}
              onClick={() => setHideDelivered((prev) => !prev)}
              sx={{ ml: 'auto' }}
            >
              {hideDelivered ? `배송완료 숨김 (${deliveredCount}건)` : '배송완료 표시 중'}
            </Button>
          )}
        </Box>

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
                        {(activeVehicles.length > 0 ? activeVehicles : generateVehicleNames(3)).map((v) => (
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
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteOrder(order.id, order.businessName)}
                      sx={{ ml: 'auto' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Container>

      {/* 확인 다이얼로그 */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {confirmDialog.title}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
            {confirmDialog.message}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}>
            취소
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              setConfirmDialog((prev) => ({ ...prev, open: false }));
              confirmDialog.onConfirm();
            }}
          >
            확인
          </Button>
        </DialogActions>
      </Dialog>

      {/* 차량 대수 선택 다이얼로그 */}
      <Dialog
        open={vehicleCountDialogOpen}
        onClose={() => setVehicleCountDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          AI 배차 - 차량 대수 선택
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            미배정 {orders.filter((o) => !o.deliveryVehicle).length}건을 몇 대의 차량에 배정할까요?
          </Typography>
          <TextField
            type="number"
            label="차량 대수"
            value={vehicleCount}
            onChange={(e) => setVehicleCount(e.target.value)}
            fullWidth
            inputProps={{ min: 1, max: 10 }}
            helperText="1~10대 사이로 입력하세요"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVehicleCountDialogOpen(false)}>취소</Button>
          <Button
            variant="contained"
            disabled={!vehicleCount || Number(vehicleCount) < 1 || Number(vehicleCount) > 10}
            onClick={() => {
              setVehicleCountDialogOpen(false);
              handleAIDispatch(Number(vehicleCount));
            }}
          >
            배차 시작
          </Button>
        </DialogActions>
      </Dialog>

      {/* 상차리스트 다이얼로그 */}
      <Dialog
        open={!!loadingListVehicle}
        onClose={() => setLoadingListVehicle(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {loadingListVehicle} 상차리스트
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            마지막 배송지부터 역순으로 상차하세요 (맨 위 = 가장 먼저 싣기)
          </Typography>
          <Stack spacing={1}>
            {loadingListVehicle &&
              orders
                .filter((o) => o.deliveryVehicle === loadingListVehicle)
                .sort((a, b) => (b.deliverySequence ?? 0) - (a.deliverySequence ?? 0))
                .map((order, idx) => (
                  <Paper key={order.id} variant="outlined" sx={{ p: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={`상차 ${idx + 1}`}
                        size="small"
                        color="warning"
                        sx={{ minWidth: 60 }}
                      />
                      <Chip
                        label={`배송 #${order.deliverySequence}`}
                        size="small"
                        variant="outlined"
                        sx={{ minWidth: 60 }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight="bold">
                          {order.businessName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {order.address}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {order.items.map((i) => `${i.productName} x${i.quantity}`).join(', ')}
                    </Typography>
                  </Paper>
                ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoadingListVehicle(null)}>닫기</Button>
        </DialogActions>
      </Dialog>

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
