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
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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
import type { Order, DeliveryVehicle } from '../types/order';

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
  formatDate,
}: {
  orders: Order[];
  formatDate: (iso: string) => string;
}) {
  const now = new Date();
  const thisMonthOrders = orders.filter((o) => {
    const d = new Date(o.createdAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  const grouped = new Map<string, Order[]>();
  for (const order of thisMonthOrders) {
    const key = order.registrationNumber;
    const list = grouped.get(key);
    if (list) {
      list.push(order);
    } else {
      grouped.set(key, [order]);
    }
  }

  if (grouped.size === 0) {
    return (
      <Typography color="text.secondary" textAlign="center" py={8}>
        이번달 주문이 없습니다.
      </Typography>
    );
  }

  return (
    <Stack spacing={1}>
      {Array.from(grouped.entries()).map(([regNum, groupOrders]) => {
        const first = groupOrders[0];
        const totalAmount = groupOrders.reduce((sum, o) => sum + o.totalPrice, 0);
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
              </Stack>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Stack>
  );
}

export default function AdminDashboard() {
  const { logout } = useAdminAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TabFilter>('all');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllOrders();
      setOrders(data);
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

  const isVehicleTab = (f: TabFilter): f is DeliveryVehicle =>
    f === '배송차1' || f === '배송차2' || f === '배송차3';

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

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : filter === 'byBusiness' ? (
          <BusinessGroupView orders={orders} formatDate={formatDate} />
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
    </Box>
  );
}
