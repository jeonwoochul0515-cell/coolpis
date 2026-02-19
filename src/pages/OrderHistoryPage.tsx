import { useEffect, useState, useCallback, useRef } from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import RefreshIcon from '@mui/icons-material/Refresh';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';
import { getOrdersByUid, cancelOrder } from '../services/orderStore';
import type { Order } from '../types/order';

const STATUS_LABEL: Record<Order['status'], string> = {
  pending: '접수 대기',
  confirmed: '주문 확인',
  delivered: '배송 완료',
};

const STATUS_COLOR: Record<Order['status'], 'warning' | 'info' | 'success'> = {
  pending: 'warning',
  confirmed: 'info',
  delivered: 'success',
};

const STEP_LABELS = ['접수', '확인', '배송중', '완료'];

const AUTO_REFRESH_INTERVAL = 30_000; // 30 seconds

/** Determine the active step index (0-based) for the MUI Stepper. */
function getActiveStep(order: Order): number {
  if (order.status === 'delivered') return 4; // all steps complete
  if (order.status === 'confirmed' && order.deliveryVehicle) return 3; // 배송중 is active
  if (order.status === 'confirmed') return 2; // 확인 is active
  return 1; // 접수 is complete, pending on 확인
}

/** Friendly delivery message based on order state. */
function getDeliveryMessage(order: Order): string | null {
  if (order.status === 'delivered') return '배송이 완료되었습니다';
  if (order.status === 'confirmed' && order.deliveryVehicle) {
    return '배송차가 출발했습니다';
  }
  if (order.status === 'confirmed') return '배송 준비 중입니다';
  return null;
}

/** Chip color with vehicle-assignment awareness. */
function getChipProps(order: Order): { label: string; color: 'warning' | 'info' | 'success'; icon?: React.ReactElement } {
  const base = { label: STATUS_LABEL[order.status], color: STATUS_COLOR[order.status] };
  if (order.status === 'confirmed' && order.deliveryVehicle) {
    return { ...base, label: '배송중', icon: <LocalShippingIcon /> };
  }
  return base;
}

export default function OrderHistoryPage() {
  const { uid } = useProfile();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOrders = useCallback(
    async (silent = false) => {
      if (!uid) return;
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        const data = await getOrdersByUid(uid);
        setOrders(data);
      } catch (err) {
        console.error('주문 조회 실패:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [uid],
  );

  // Initial load
  useEffect(() => {
    fetchOrders(false);
  }, [fetchOrders]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefreshEnabled) {
      intervalRef.current = setInterval(() => fetchOrders(true), AUTO_REFRESH_INTERVAL);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefreshEnabled, fetchOrders]);

  const handleManualRefresh = () => fetchOrders(true);

  const handleCancel = async (orderId: string) => {
    if (!confirm('주문을 취소하시겠습니까?')) return;
    setCancellingId(orderId);
    try {
      await cancelOrder(orderId);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (err) {
      console.error('주문 취소 실패:', err);
      alert('주문 취소에 실패했습니다.');
    } finally {
      setCancellingId(null);
    }
  };

  // ---------- Loading state ----------
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  // ---------- Empty state ----------
  if (orders.length === 0) {
    return (
      <Container maxWidth="md" sx={{ py: 6, textAlign: 'center' }}>
        <ReceiptLongIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
        <Typography variant="h5" gutterBottom color="text.secondary">
          주문 내역이 없습니다
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          제품 목록에서 상품을 주문해보세요.
        </Typography>
        <Button variant="contained" onClick={() => navigate('/')}>
          제품 목록으로
        </Button>
      </Container>
    );
  }

  // ---------- Orders list ----------
  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      {/* Header row */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          주문 내역
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Auto-refresh indicator */}
          {autoRefreshEnabled && (
            <Chip
              icon={
                <AutorenewIcon
                  sx={{
                    animation: refreshing ? 'spin 1s linear infinite' : 'none',
                    '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
                  }}
                />
              }
              label="자동 새로고침 중"
              size="small"
              variant="outlined"
              onClick={() => setAutoRefreshEnabled(false)}
              sx={{ fontSize: '0.7rem' }}
            />
          )}
          {!autoRefreshEnabled && (
            <Chip
              label="자동 새로고침 꺼짐"
              size="small"
              variant="outlined"
              onClick={() => setAutoRefreshEnabled(true)}
              sx={{ fontSize: '0.7rem', opacity: 0.6 }}
            />
          )}

          {/* Manual refresh */}
          <Tooltip title="새로고침">
            <IconButton size="small" onClick={handleManualRefresh} disabled={refreshing}>
              <RefreshIcon
                sx={{
                  animation: refreshing ? 'spin 1s linear infinite' : 'none',
                  '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
                }}
              />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Order cards */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {orders.map((order) => {
          const activeStep = getActiveStep(order);
          const chipProps = getChipProps(order);
          const deliveryMsg = getDeliveryMessage(order);
          const hasVehicle = !!order.deliveryVehicle;

          return (
            <Card key={order.id} variant="outlined">
              <CardContent sx={{ pb: '16px !important' }}>
                {/* Date + status chip */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(order.createdAt).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Typography>
                  <Chip
                    label={chipProps.label}
                    color={chipProps.color}
                    size="small"
                    icon={chipProps.icon}
                  />
                </Box>

                {/* Progress stepper */}
                <Box sx={{ mb: 2 }}>
                  <Stepper
                    activeStep={activeStep}
                    alternativeLabel
                    sx={{
                      '& .MuiStepLabel-label': { fontSize: '0.7rem', mt: 0.5 },
                      '& .MuiStepIcon-root': { width: 22, height: 22 },
                      '& .MuiStepConnector-line': { minHeight: 0 },
                    }}
                  >
                    {STEP_LABELS.map((label) => (
                      <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                      </Step>
                    ))}
                  </Stepper>
                </Box>

                {/* Delivery info */}
                {(hasVehicle || deliveryMsg) && (
                  <Box
                    sx={{
                      mb: 1.5,
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor:
                        order.status === 'delivered'
                          ? 'success.50'
                          : hasVehicle
                            ? 'info.50'
                            : 'grey.50',
                      border: '1px solid',
                      borderColor:
                        order.status === 'delivered'
                          ? 'success.200'
                          : hasVehicle
                            ? 'info.200'
                            : 'grey.200',
                    }}
                  >
                    {hasVehicle && (
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: deliveryMsg ? 0.5 : 0 }}>
                        <Chip
                          icon={<LocalShippingIcon />}
                          label={order.deliveryVehicle}
                          size="small"
                          color="info"
                          variant="outlined"
                        />
                        {typeof order.deliverySequence === 'number' && order.deliverySequence > 0 && (
                          <Chip
                            label={`배송순서 #${order.deliverySequence}`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    )}
                    {deliveryMsg && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: hasVehicle ? 0.5 : 0 }}>
                        {deliveryMsg}
                      </Typography>
                    )}
                  </Box>
                )}

                {/* Item list */}
                <Box sx={{ mb: 1 }}>
                  {order.items.map((item, idx) => (
                    <Typography key={idx} variant="body2">
                      {item.productName} x {item.quantity}
                      {item.unit} ({(item.price * item.quantity).toLocaleString()}원)
                    </Typography>
                  ))}
                </Box>

                {/* Total + cancel */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    총 {order.totalItems}건 · {order.totalPrice.toLocaleString()}원
                  </Typography>
                  {order.status === 'pending' && (
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      disabled={cancellingId === order.id}
                      onClick={() => handleCancel(order.id)}
                    >
                      {cancellingId === order.id ? '취소 중...' : '주문 취소'}
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </Container>
  );
}
