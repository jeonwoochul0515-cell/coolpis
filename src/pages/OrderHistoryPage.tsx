import { useEffect, useState } from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
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

export default function OrderHistoryPage() {
  const { uid } = useProfile();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    getOrdersByUid(uid)
      .then(setOrders)
      .finally(() => setLoading(false));
  }, [uid]);

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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (orders.length === 0) {
    return (
      <Container maxWidth="md" sx={{ py: 6, textAlign: 'center' }}>
        <ReceiptLongIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
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

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Typography variant="h5" gutterBottom fontWeight={700}>
        주문 내역
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {orders.map((order) => (
          <Card key={order.id} variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
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
                  label={STATUS_LABEL[order.status]}
                  color={STATUS_COLOR[order.status]}
                  size="small"
                />
              </Box>
              <Box sx={{ mb: 1 }}>
                {order.items.map((item, idx) => (
                  <Typography key={idx} variant="body2">
                    {item.productName} × {item.quantity}{item.unit} ({(item.price * item.quantity).toLocaleString()}원)
                  </Typography>
                ))}
              </Box>
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
        ))}
      </Box>
    </Container>
  );
}
