import { useState, useEffect, useMemo, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import {
  collection,
  addDoc,
  getDocs,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Order } from '../types/order';
import type { Payment } from '../types/payment';
import type { Settlement } from '../types/settlement';

const SETTLEMENTS_COLLECTION = 'settlements';

interface SettlementViewProps {
  orders: Order[];
  payments: Payment[];
}

interface BusinessSummary {
  registrationNumber: string;
  businessName: string;
  orderTotal: number;
  paymentTotal: number;
  balance: number;
  orderCount: number;
  paymentCount: number;
}

function getDefaultPeriod() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

export default function SettlementView({ orders, payments }: SettlementViewProps) {
  const defaultPeriod = useMemo(() => getDefaultPeriod(), []);
  const [periodStart, setPeriodStart] = useState(defaultPeriod.start);
  const [periodEnd, setPeriodEnd] = useState(defaultPeriod.end);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loadingSettlements, setLoadingSettlements] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 이전 정산 내역 불러오기
  const loadSettlements = useCallback(async () => {
    try {
      setLoadingSettlements(true);
      const q = query(
        collection(db, SETTLEMENTS_COLLECTION),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Settlement));
      setSettlements(data);
    } catch (err) {
      console.error('정산 내역 로드 실패:', err);
    } finally {
      setLoadingSettlements(false);
    }
  }, []);

  useEffect(() => {
    loadSettlements();
  }, [loadSettlements]);

  // 기간 내 주문/입금 필터링 및 거래처별 집계
  const businessSummaries: BusinessSummary[] = useMemo(() => {
    const filteredOrders = orders.filter((o) => {
      const d = o.createdAt.slice(0, 10);
      return d >= periodStart && d <= periodEnd;
    });

    const filteredPayments = payments.filter((p) => {
      const d = p.createdAt.slice(0, 10);
      return d >= periodStart && d <= periodEnd;
    });

    const grouped = new Map<string, BusinessSummary>();

    for (const order of filteredOrders) {
      const key = order.registrationNumber;
      const existing = grouped.get(key);
      if (existing) {
        existing.orderTotal += order.totalPrice;
        existing.orderCount += 1;
      } else {
        grouped.set(key, {
          registrationNumber: key,
          businessName: order.businessName,
          orderTotal: order.totalPrice,
          paymentTotal: 0,
          balance: 0,
          orderCount: 1,
          paymentCount: 0,
        });
      }
    }

    for (const payment of filteredPayments) {
      const key = payment.registrationNumber;
      const existing = grouped.get(key);
      if (existing) {
        existing.paymentTotal += payment.amount;
        existing.paymentCount += 1;
      } else {
        grouped.set(key, {
          registrationNumber: key,
          businessName: payment.businessName,
          orderTotal: 0,
          paymentTotal: payment.amount,
          balance: 0,
          orderCount: 0,
          paymentCount: 1,
        });
      }
    }

    // 미수금 계산
    for (const summary of grouped.values()) {
      summary.balance = summary.orderTotal - summary.paymentTotal;
    }

    return Array.from(grouped.values()).sort((a, b) =>
      a.businessName.localeCompare(b.businessName)
    );
  }, [orders, payments, periodStart, periodEnd]);

  const totalOrderAmount = useMemo(
    () => businessSummaries.reduce((sum, s) => sum + s.orderTotal, 0),
    [businessSummaries]
  );
  const totalPaymentAmount = useMemo(
    () => businessSummaries.reduce((sum, s) => sum + s.paymentTotal, 0),
    [businessSummaries]
  );
  const totalBalance = useMemo(
    () => businessSummaries.reduce((sum, s) => sum + s.balance, 0),
    [businessSummaries]
  );

  // 정산 확정: 모든 거래처 정산 레코드를 Firestore에 저장
  const handleConfirmSettlement = async () => {
    if (businessSummaries.length === 0) {
      setError('정산할 데이터가 없습니다.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const now = new Date().toISOString();

      const promises = businessSummaries.map((summary) =>
        addDoc(collection(db, SETTLEMENTS_COLLECTION), {
          registrationNumber: summary.registrationNumber,
          businessName: summary.businessName,
          period: { start: periodStart, end: periodEnd },
          orderTotal: summary.orderTotal,
          paymentTotal: summary.paymentTotal,
          balance: summary.balance,
          status: 'confirmed',
          createdAt: now,
          confirmedAt: now,
        })
      );

      await Promise.all(promises);
      setSuccessMsg(
        `${businessSummaries.length}건의 정산이 확정되었습니다.`
      );
      await loadSettlements();
    } catch (err) {
      console.error('정산 확정 실패:', err);
      setError('정산 확정 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <Stack spacing={3}>
      {/* 기간 선택 */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            정산 기간 설정
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              type="date"
              label="시작일"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              type="date"
              label="종료일"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* 에러/성공 메시지 */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {successMsg && (
        <Alert severity="success" onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}

      {/* 집계 요약 */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            거래처별 정산 집계
          </Typography>
          <Box sx={{ display: 'flex', gap: 3, mb: 2, flexWrap: 'wrap' }}>
            <Typography variant="body1">
              총 주문: <strong>{totalOrderAmount.toLocaleString()}원</strong>
            </Typography>
            <Typography variant="body1" color="success.main">
              총 입금: <strong>{totalPaymentAmount.toLocaleString()}원</strong>
            </Typography>
            <Typography
              variant="body1"
              color={totalBalance > 0 ? 'error.main' : 'success.main'}
              fontWeight="bold"
            >
              총 미수금: {totalBalance.toLocaleString()}원
            </Typography>
          </Box>

          {businessSummaries.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" py={4}>
              해당 기간 데이터가 없습니다.
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell><strong>거래처명</strong></TableCell>
                    <TableCell><strong>사업자번호</strong></TableCell>
                    <TableCell align="right"><strong>주문 합계</strong></TableCell>
                    <TableCell align="right"><strong>입금 합계</strong></TableCell>
                    <TableCell align="right"><strong>미수금</strong></TableCell>
                    <TableCell align="center"><strong>주문/입금 건수</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {businessSummaries.map((summary) => (
                    <TableRow key={summary.registrationNumber}>
                      <TableCell>{summary.businessName}</TableCell>
                      <TableCell>{summary.registrationNumber}</TableCell>
                      <TableCell align="right">
                        {summary.orderTotal.toLocaleString()}원
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'success.main' }}>
                        {summary.paymentTotal.toLocaleString()}원
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          color: summary.balance > 0 ? 'error.main' : 'success.main',
                          fontWeight: 'bold',
                        }}
                      >
                        {summary.balance.toLocaleString()}원
                      </TableCell>
                      <TableCell align="center">
                        {summary.orderCount}건 / {summary.paymentCount}건
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleConfirmSettlement}
              disabled={saving || businessSummaries.length === 0}
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : undefined}
            >
              {saving ? '정산 확정 중...' : '정산 확정'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 이전 정산 내역 */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            이전 정산 내역
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {loadingSettlements ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : settlements.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" py={4}>
              정산 내역이 없습니다.
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell><strong>거래처명</strong></TableCell>
                    <TableCell><strong>정산 기간</strong></TableCell>
                    <TableCell align="right"><strong>주문 합계</strong></TableCell>
                    <TableCell align="right"><strong>입금 합계</strong></TableCell>
                    <TableCell align="right"><strong>미수금</strong></TableCell>
                    <TableCell align="center"><strong>상태</strong></TableCell>
                    <TableCell><strong>생성일</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {settlements.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.businessName}</TableCell>
                      <TableCell>
                        {s.period.start} ~ {s.period.end}
                      </TableCell>
                      <TableCell align="right">
                        {s.orderTotal.toLocaleString()}원
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'success.main' }}>
                        {s.paymentTotal.toLocaleString()}원
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          color: s.balance > 0 ? 'error.main' : 'success.main',
                          fontWeight: 'bold',
                        }}
                      >
                        {s.balance.toLocaleString()}원
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={s.status === 'confirmed' ? '확정' : '임시'}
                          color={s.status === 'confirmed' ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{formatDate(s.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
