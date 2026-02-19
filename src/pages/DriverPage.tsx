import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import DirectionsIcon from '@mui/icons-material/Directions';
import PhoneIcon from '@mui/icons-material/Phone';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MapIcon from '@mui/icons-material/Map';
import DoneIcon from '@mui/icons-material/Done';
import RefreshIcon from '@mui/icons-material/Refresh';
import { getOrdersByVehicle, getActiveVehicles, markOrderDelivered } from '../services/driverOrderStore';
import type { Order } from '../types/order';

function VehicleSelectScreen({
  vehicles,
  loading,
  onSelect,
}: {
  vehicles: string[];
  loading: boolean;
  onSelect: (v: string) => void;
}) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <LocalShippingIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
        <Typography variant="h5" fontWeight={700} gutterBottom>
          배송 차량 선택
        </Typography>
        <Typography variant="body2" color="text.secondary">
          배정된 차량을 선택하세요
        </Typography>
      </Box>

      {vehicles.length === 0 ? (
        <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mt: 4 }}>
          현재 배차된 차량이 없습니다.
        </Typography>
      ) : (
        <List sx={{ maxWidth: 480, mx: 'auto' }}>
          {vehicles.map((v) => (
            <ListItemButton
              key={v}
              onClick={() => onSelect(v)}
              sx={{
                mb: 1,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                py: 2,
              }}
            >
              <ListItemIcon>
                <LocalShippingIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary={v}
                primaryTypographyProps={{ fontWeight: 600, fontSize: '1.1rem' }}
              />
            </ListItemButton>
          ))}
        </List>
      )}
    </Box>
  );
}

function DeliveryCard({
  order,
  index,
  onDelivered,
}: {
  order: Order;
  index: number;
  onDelivered: (orderId: string) => void;
}) {
  const [completing, setCompleting] = useState(false);
  const isDelivered = order.status === 'delivered';
  const address = order.address || '';
  const kakaoUrl = `https://map.kakao.com/link/to/${encodeURIComponent(address)},0,0`;
  const naverUrl = `https://map.naver.com/v5/search/${encodeURIComponent(address)}`;

  return (
    <Card
      sx={{
        mb: 2,
        opacity: isDelivered ? 0.7 : 1,
        borderLeft: isDelivered ? '4px solid #4caf50' : '4px solid',
        borderLeftColor: isDelivered ? '#4caf50' : 'primary.main',
      }}
    >
      <CardContent sx={{ pb: '12px !important' }}>
        {/* Header row */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={`#${index + 1}`}
              size="small"
              color="primary"
              sx={{ fontWeight: 700 }}
            />
            <Typography variant="subtitle1" fontWeight={700}>
              {order.businessName}
            </Typography>
          </Box>
          {isDelivered && (
            <Chip
              icon={<CheckCircleIcon />}
              label="배송완료"
              size="small"
              color="success"
              variant="outlined"
            />
          )}
        </Box>

        {/* Address */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {address}
        </Typography>

        {/* Phone */}
        {order.phone && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
            <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography
              component="a"
              href={`tel:${order.phone}`}
              variant="body2"
              sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 500 }}
            >
              {order.phone}
            </Typography>
          </Box>
        )}

        {/* Items */}
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            품목
          </Typography>
          {order.items.map((item, i) => (
            <Typography key={i} variant="body2" sx={{ pl: 1 }}>
              {item.productName} x {item.quantity}{item.unit}
            </Typography>
          ))}
        </Box>

        <Divider sx={{ mb: 1.5 }} />

        {/* Navigation buttons */}
        <Stack direction="row" spacing={1} sx={{ mb: isDelivered ? 0 : 1.5 }}>
          <Button
            variant="contained"
            size="medium"
            startIcon={<DirectionsIcon />}
            href={kakaoUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ flex: 1, py: 1.2 }}
          >
            카카오맵
          </Button>
          <Button
            variant="outlined"
            size="medium"
            startIcon={<MapIcon />}
            href={naverUrl}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ flex: 1, py: 1.2 }}
          >
            네이버맵
          </Button>
        </Stack>

        {/* 배송완료 버튼 */}
        {!isDelivered && (
          <Button
            variant="contained"
            color="success"
            size="large"
            fullWidth
            startIcon={completing ? <CircularProgress size={18} color="inherit" /> : <DoneIcon />}
            disabled={completing}
            onClick={async () => {
              setCompleting(true);
              try {
                await markOrderDelivered(order.id);
                onDelivered(order.id);
              } finally {
                setCompleting(false);
              }
            }}
            sx={{ py: 1.5, fontWeight: 700, fontSize: '1rem' }}
          >
            {completing ? '처리 중...' : '배송완료'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function DriverPage() {
  const [vehicles, setVehicles] = useState<string[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    getActiveVehicles()
      .then(setVehicles)
      .finally(() => setLoadingVehicles(false));
  }, []);

  const handleSelectVehicle = useCallback(async (vehicle: string) => {
    setSelectedVehicle(vehicle);
    setLoadingOrders(true);
    try {
      const result = await getOrdersByVehicle(vehicle);
      setOrders(result);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  const handleBack = useCallback(() => {
    setSelectedVehicle(null);
    setOrders([]);
  }, []);

  const handleDelivered = useCallback((orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'delivered' as const } : o))
    );
  }, []);

  const handleRefresh = useCallback(async () => {
    if (!selectedVehicle) return;
    setLoadingOrders(true);
    try {
      const result = await getOrdersByVehicle(selectedVehicle);
      setOrders(result);
    } finally {
      setLoadingOrders(false);
    }
  }, [selectedVehicle]);

  const deliveredCount = orders.filter((o) => o.status === 'delivered').length;

  // Vehicle selection screen
  if (!selectedVehicle) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppBar position="static">
          <Toolbar>
            <LocalShippingIcon sx={{ mr: 1 }} />
            <Typography variant="h6" fontWeight={700}>
              배송 드라이버
            </Typography>
          </Toolbar>
        </AppBar>
        <VehicleSelectScreen
          vehicles={vehicles}
          loading={loadingVehicles}
          onSelect={handleSelectVehicle}
        />
      </Box>
    );
  }

  // Delivery list screen
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={handleBack} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <LocalShippingIcon sx={{ mr: 1 }} />
          <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1 }}>
            {selectedVehicle}
          </Typography>
          <IconButton color="inherit" onClick={handleRefresh} disabled={loadingOrders}>
            <RefreshIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {loadingOrders ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ p: 2, maxWidth: 600, mx: 'auto' }}>
          {/* Progress summary */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2,
              p: 2,
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}
          >
            <Typography variant="body1" fontWeight={600}>
              총 {orders.length}건
            </Typography>
            <Chip
              icon={<CheckCircleIcon />}
              label={`${deliveredCount}/${orders.length} 배송완료`}
              color={deliveredCount === orders.length && orders.length > 0 ? 'success' : 'default'}
              variant="outlined"
            />
          </Box>

          {orders.length === 0 ? (
            <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mt: 4 }}>
              배정된 배송이 없습니다.
            </Typography>
          ) : (
            orders.map((order, idx) => (
              <DeliveryCard key={order.id} order={order} index={idx} onDelivered={handleDelivered} />
            ))
          )}
        </Box>
      )}
    </Box>
  );
}
