import { useEffect, useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import { useAdminAuth } from './AdminAuthContext';
import { getAllOrders, updateOrderStatus } from '../services/adminOrderStore';
import type { Order } from '../types/order';

type StatusFilter = 'all' | 'pending' | 'confirmed' | 'delivered';

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

const TAB_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: '전체', value: 'all' },
  { label: '접수대기', value: 'pending' },
  { label: '주문확인', value: 'confirmed' },
  { label: '배송완료', value: 'delivered' },
];

export default function AdminDashboard() {
  const { logout } = useAdminAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');

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

  const filteredOrders = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

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
        >
          {TAB_FILTERS.map((t) => (
            <Tab key={t.value} label={t.label} />
          ))}
        </Tabs>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : filteredOrders.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" py={8}>
            주문이 없습니다.
          </Typography>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>주문일시</TableCell>
                  <TableCell>사업자명</TableCell>
                  <TableCell>상품</TableCell>
                  <TableCell align="right">총액</TableCell>
                  <TableCell align="center">상태</TableCell>
                  <TableCell align="center">작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {formatDate(order.createdAt)}
                    </TableCell>
                    <TableCell>{order.businessName}</TableCell>
                    <TableCell>
                      {order.items.map((item) => `${item.productName} x${item.quantity}`).join(', ')}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {order.totalPrice.toLocaleString()}원
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={STATUS_LABELS[order.status]}
                        color={STATUS_COLORS[order.status]}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Container>
    </Box>
  );
}
