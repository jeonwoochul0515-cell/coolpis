import { useState, useEffect, useCallback, useRef } from 'react';
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
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DoneIcon from '@mui/icons-material/Done';
import RefreshIcon from '@mui/icons-material/Refresh';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from '../firebase';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import NoteIcon from '@mui/icons-material/Note';
import Paper from '@mui/material/Paper';
import { getOrdersByVehicle, getActiveVehicles, markOrderDelivered, markOrderInTransit, markOrderFailed, swapDeliverySequence } from '../services/driverOrderStore';
import type { Order } from '../types/order';
import { estimateEta } from '../utils/deliveryEta';

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
  totalCount,
  onDelivered,
  onInTransit,
  onFailed,
  onMoveUp,
  onMoveDown,
  onPhotoUploaded,
}: {
  order: Order;
  index: number;
  totalCount: number;
  onDelivered: (orderId: string, deliveryPhoto?: string) => void;
  onInTransit: (orderId: string) => void;
  onFailed: (orderId: string) => void;
  onMoveUp: (orderId: string) => void;
  onMoveDown: (orderId: string) => void;
  onPhotoUploaded: (orderId: string, photoUrl: string) => void;
}) {
  const [completing, setCompleting] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [failing, setFailing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(order.deliveryPhoto);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `orders/${order.id}/delivery.jpg`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setPhotoUrl(url);
      onPhotoUploaded(order.id, url);
    } catch (err) {
      console.error('사진 업로드 실패:', err);
    } finally {
      setUploading(false);
      // reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  const isDelivered = order.status === 'delivered';
  const isFailed = order.status === 'failed';
  const isInTransit = order.status === 'in_transit';
  const isTerminal = isDelivered || isFailed;
  const address = order.address || '';
  const kakaoUrl = `https://map.kakao.com/link/to/${encodeURIComponent(address)},0,0`;
  const naverUrl = `https://map.naver.com/v5/search/${encodeURIComponent(address)}`;

  return (
    <Card
      sx={{
        mb: 2,
        opacity: isTerminal ? 0.7 : 1,
        borderLeft: '4px solid',
        borderLeftColor: isDelivered
          ? '#4caf50'
          : isFailed
            ? '#f44336'
            : isInTransit
              ? '#ff9800'
              : 'primary.main',
      }}
    >
      <CardContent sx={{ pb: '12px !important' }}>
        {/* Header row */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {!isTerminal && (
              <Box sx={{ display: 'flex', flexDirection: 'column', mr: 0.5 }}>
                <IconButton
                  size="small"
                  disabled={index === 0}
                  onClick={() => onMoveUp(order.id)}
                  sx={{ p: 0.3 }}
                >
                  <ArrowUpwardIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  disabled={index >= totalCount - 1}
                  onClick={() => onMoveDown(order.id)}
                  sx={{ p: 0.3 }}
                >
                  <ArrowDownwardIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
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
          {isFailed && (
            <Chip
              icon={<ErrorOutlineIcon />}
              label="배송실패"
              size="small"
              color="error"
              variant="outlined"
            />
          )}
          {isInTransit && (
            <Chip
              icon={<LocalShippingIcon />}
              label="배송중"
              size="small"
              color="warning"
              variant="outlined"
            />
          )}
        </Box>

        {/* Address */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {address}
        </Typography>

        {/* ETA - 배송 전인 주문에만 표시 */}
        {!isTerminal && typeof order.deliverySequence === 'number' && order.deliverySequence > 0 && (
          <Typography variant="body2" sx={{ mb: 1, color: 'info.main', fontWeight: 600 }}>
            예상 도착: {estimateEta(order.deliverySequence, totalCount)}
          </Typography>
        )}

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

        {/* Delivery Note */}
        {order.deliveryNote && (
          <Paper
            sx={{
              p: 1.5,
              mb: 1.5,
              bgcolor: '#fff8e1',
              border: '1px solid #ffe082',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1,
            }}
          >
            <NoteIcon sx={{ fontSize: 18, color: '#f9a825', mt: 0.2 }} />
            <Typography variant="body2" sx={{ fontWeight: 500, color: '#6d4c00' }}>
              {order.deliveryNote}
            </Typography>
          </Paper>
        )}

        <Divider sx={{ mb: 1.5 }} />

        {/* Navigation buttons */}
        <Stack direction="row" spacing={1} sx={{ mb: isTerminal ? 0 : 1.5 }}>
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

        {/* 배송중 버튼 (confirmed 상태에서만 표시) */}
        {!isTerminal && !isInTransit && (
          <Button
            variant="contained"
            color="warning"
            size="large"
            fullWidth
            startIcon={transitioning ? <CircularProgress size={18} color="inherit" /> : <LocalShippingIcon />}
            disabled={transitioning}
            onClick={async () => {
              setTransitioning(true);
              try {
                await markOrderInTransit(order.id);
                onInTransit(order.id);
              } finally {
                setTransitioning(false);
              }
            }}
            sx={{ py: 1.5, fontWeight: 700, fontSize: '1rem', mb: 1 }}
          >
            {transitioning ? '처리 중...' : '배송중'}
          </Button>
        )}

        {/* 배송완료 / 배송실패 버튼 (배송중 상태에서 표시) */}
        {isInTransit && (
          <>
            {/* 사진 촬영 영역 */}
            <Box sx={{ mb: 1.5 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handlePhotoCapture}
              />
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  variant="outlined"
                  size="medium"
                  startIcon={uploading ? <CircularProgress size={18} /> : <CameraAltIcon />}
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{ fontWeight: 600 }}
                >
                  {uploading ? '업로드 중...' : photoUrl ? '사진 변경' : '배송 사진 촬영'}
                </Button>
                {photoUrl && (
                  <Box
                    component="img"
                    src={photoUrl}
                    alt="배송 사진"
                    sx={{
                      width: 48,
                      height: 48,
                      objectFit: 'cover',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      cursor: 'pointer',
                    }}
                    onClick={() => window.open(photoUrl, '_blank')}
                  />
                )}
              </Stack>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                color="success"
                size="large"
                fullWidth
                startIcon={completing ? <CircularProgress size={18} color="inherit" /> : <DoneIcon />}
                disabled={completing || failing}
                onClick={async () => {
                  setCompleting(true);
                  try {
                    await markOrderDelivered(order.id, photoUrl);
                    onDelivered(order.id, photoUrl);
                  } finally {
                    setCompleting(false);
                  }
                }}
                sx={{ py: 1.5, fontWeight: 700, fontSize: '1rem' }}
              >
                {completing ? '처리 중...' : '배송완료'}
              </Button>
              <Button
                variant="contained"
                color="error"
                size="large"
                fullWidth
                startIcon={failing ? <CircularProgress size={18} color="inherit" /> : <ErrorOutlineIcon />}
                disabled={completing || failing}
                onClick={async () => {
                  setFailing(true);
                  try {
                    await markOrderFailed(order.id);
                    onFailed(order.id);
                  } finally {
                    setFailing(false);
                  }
                }}
                sx={{ py: 1.5, fontWeight: 700, fontSize: '1rem' }}
              >
                {failing ? '처리 중...' : '배송실패'}
              </Button>
            </Stack>
          </>
        )}

        {/* 배송완료 후 사진 썸네일 표시 */}
        {isDelivered && order.deliveryPhoto && (
          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <CameraAltIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Box
              component="img"
              src={order.deliveryPhoto}
              alt="배송 사진"
              sx={{
                width: 48,
                height: 48,
                objectFit: 'cover',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                cursor: 'pointer',
              }}
              onClick={() => window.open(order.deliveryPhoto, '_blank')}
            />
            <Typography variant="caption" color="text.secondary">
              배송 사진
            </Typography>
          </Box>
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
  const [authReady, setAuthReady] = useState(false);

  // 익명 로그인 자동 처리
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthReady(true);
      } else {
        signInAnonymously(auth).catch((err) =>
          console.error('익명 로그인 실패:', err)
        );
      }
    });
    return () => unsubscribe();
  }, []);

  // 인증 완료 후 차량 목록 조회
  useEffect(() => {
    if (!authReady) return;
    getActiveVehicles()
      .then(setVehicles)
      .finally(() => setLoadingVehicles(false));
  }, [authReady]);

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

  const handleDelivered = useCallback((orderId: string, deliveryPhoto?: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'delivered' as const, deliveryPhoto: deliveryPhoto ?? o.deliveryPhoto } : o))
    );
  }, []);

  const handlePhotoUploaded = useCallback((orderId: string, photoUrl: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, deliveryPhoto: photoUrl } : o))
    );
  }, []);

  const handleInTransit = useCallback((orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'in_transit' as const } : o))
    );
  }, []);

  const handleFailed = useCallback((orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'failed' as const } : o))
    );
  }, []);

  const handleMoveUp = useCallback(async (orderId: string) => {
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx <= 0) return;
    const current = orders[idx];
    const above = orders[idx - 1];
    try {
      await swapDeliverySequence(
        current.id, current.deliverySequence ?? 0,
        above.id, above.deliverySequence ?? 0
      );
      setOrders((prev) => {
        const next = [...prev];
        const curSeq = next[idx].deliverySequence ?? 0;
        const abvSeq = next[idx - 1].deliverySequence ?? 0;
        next[idx] = { ...next[idx], deliverySequence: abvSeq };
        next[idx - 1] = { ...next[idx - 1], deliverySequence: curSeq };
        return next.sort((a, b) => (a.deliverySequence ?? 0) - (b.deliverySequence ?? 0));
      });
    } catch (err) {
      console.error('순서 변경 실패:', err);
    }
  }, [orders]);

  const handleMoveDown = useCallback(async (orderId: string) => {
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx < 0 || idx >= orders.length - 1) return;
    const current = orders[idx];
    const below = orders[idx + 1];
    try {
      await swapDeliverySequence(
        current.id, current.deliverySequence ?? 0,
        below.id, below.deliverySequence ?? 0
      );
      setOrders((prev) => {
        const next = [...prev];
        const curSeq = next[idx].deliverySequence ?? 0;
        const blwSeq = next[idx + 1].deliverySequence ?? 0;
        next[idx] = { ...next[idx], deliverySequence: blwSeq };
        next[idx + 1] = { ...next[idx + 1], deliverySequence: curSeq };
        return next.sort((a, b) => (a.deliverySequence ?? 0) - (b.deliverySequence ?? 0));
      });
    } catch (err) {
      console.error('순서 변경 실패:', err);
    }
  }, [orders]);

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
  const failedCount = orders.filter((o) => o.status === 'failed').length;

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
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip
                icon={<CheckCircleIcon />}
                label={`${deliveredCount}/${orders.length} 배송완료`}
                color={deliveredCount === orders.length && orders.length > 0 ? 'success' : 'default'}
                variant="outlined"
              />
              {failedCount > 0 && (
                <Chip
                  icon={<ErrorOutlineIcon />}
                  label={`${failedCount}건 실패`}
                  color="error"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>

          {orders.length === 0 ? (
            <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mt: 4 }}>
              배정된 배송이 없습니다.
            </Typography>
          ) : (
            orders.map((order, idx) => (
              <DeliveryCard
                key={order.id}
                order={order}
                index={idx}
                totalCount={orders.length}
                onDelivered={handleDelivered}
                onInTransit={handleInTransit}
                onFailed={handleFailed}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onPhotoUploaded={handlePhotoUploaded}
              />
            ))
          )}
        </Box>
      )}
    </Box>
  );
}
