import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import type { Order } from '../types/order';

type BusinessGrade = 'VIP' | 'Regular' | 'New';

interface BusinessAnalysis {
  businessName: string;
  grade: BusinessGrade;
  totalAmount: number;
  orderCount: number;
  avgAmount: number;
}

interface StatsViewProps {
  orders: Order[];
}

function getToday(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getThisWeekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMon);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { start: fmt(monday), end: fmt(sunday) };
}

function getThisMonthRange(): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const start = `${y}-${String(m + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const end = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

function filterByRange(orders: Order[], start: string, end: string): Order[] {
  return orders.filter((o) => {
    const d = o.createdAt.slice(0, 10);
    return d >= start && d <= end;
  });
}

export default function StatsView({ orders }: StatsViewProps) {
  const today = getToday();
  const weekRange = getThisWeekRange();
  const monthRange = getThisMonthRange();

  const todaySales = useMemo(() => {
    return filterByRange(orders, today, today).reduce((sum, o) => sum + o.totalPrice, 0);
  }, [orders, today]);

  const weekSales = useMemo(() => {
    return filterByRange(orders, weekRange.start, weekRange.end).reduce((sum, o) => sum + o.totalPrice, 0);
  }, [orders, weekRange.start, weekRange.end]);

  const monthSales = useMemo(() => {
    return filterByRange(orders, monthRange.start, monthRange.end).reduce((sum, o) => sum + o.totalPrice, 0);
  }, [orders, monthRange.start, monthRange.end]);

  // 상품별 판매 순위
  const productRanking = useMemo(() => {
    const map = new Map<string, { quantity: number; revenue: number }>();
    for (const order of orders) {
      for (const item of order.items) {
        const prev = map.get(item.productName) ?? { quantity: 0, revenue: 0 };
        map.set(item.productName, {
          quantity: prev.quantity + item.quantity,
          revenue: prev.revenue + item.price * item.quantity,
        });
      }
    }
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [orders]);

  // 거래처별 주문 횟수 TOP 5
  const businessTop5 = useMemo(() => {
    const map = new Map<string, { businessName: string; count: number; totalAmount: number }>();
    for (const order of orders) {
      const key = order.registrationNumber;
      const prev = map.get(key) ?? { businessName: order.businessName, count: 0, totalAmount: 0 };
      map.set(key, {
        businessName: order.businessName,
        count: prev.count + 1,
        totalAmount: prev.totalAmount + order.totalPrice,
      });
    }
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [orders]);

  // 거래처 분석 (등급 분류 포함)
  const businessAnalysis = useMemo(() => {
    const map = new Map<string, { businessName: string; totalAmount: number; orderCount: number }>();
    for (const order of orders) {
      const key = order.registrationNumber;
      const prev = map.get(key) ?? { businessName: order.businessName, totalAmount: 0, orderCount: 0 };
      map.set(key, {
        businessName: order.businessName,
        totalAmount: prev.totalAmount + order.totalPrice,
        orderCount: prev.orderCount + 1,
      });
    }

    const entries = Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
    const total = entries.length;

    // 상위 20% 경계 인덱스
    const vipCutoff = Math.max(1, Math.ceil(total * 0.2));

    const result: BusinessAnalysis[] = entries.map((entry, idx) => {
      let grade: BusinessGrade;
      if (entry.orderCount === 1) {
        grade = 'New';
      } else if (idx < vipCutoff) {
        grade = 'VIP';
      } else {
        grade = 'Regular';
      }
      return {
        ...entry,
        grade,
        avgAmount: entry.orderCount > 0 ? Math.round(entry.totalAmount / entry.orderCount) : 0,
      };
    });

    return result;
  }, [orders]);

  const gradeCounts = useMemo(() => {
    const counts = { VIP: 0, Regular: 0, New: 0 };
    for (const biz of businessAnalysis) {
      counts[biz.grade]++;
    }
    return counts;
  }, [businessAnalysis]);

  return (
    <Stack spacing={3}>
      {/* 매출 요약 카드 */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Card sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              오늘 매출
            </Typography>
            <Typography variant="h5" fontWeight="bold" color="primary.main">
              {todaySales.toLocaleString()}원
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {today}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              이번주 매출
            </Typography>
            <Typography variant="h5" fontWeight="bold" color="secondary.main">
              {weekSales.toLocaleString()}원
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {weekRange.start} ~ {weekRange.end}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              이번달 매출
            </Typography>
            <Typography variant="h5" fontWeight="bold" color="success.main">
              {monthSales.toLocaleString()}원
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {monthRange.start} ~ {monthRange.end}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* 상품별 판매 순위 */}
      <Paper variant="outlined">
        <Box sx={{ p: 2, pb: 0 }}>
          <Typography variant="h6" fontWeight="bold">
            상품별 판매 순위
          </Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>순위</TableCell>
                <TableCell>상품명</TableCell>
                <TableCell align="right">판매수량</TableCell>
                <TableCell align="right">매출액</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {productRanking.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">데이터가 없습니다.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                productRanking.map((item, idx) => (
                  <TableRow key={item.name}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell align="right">{item.quantity.toLocaleString()}</TableCell>
                    <TableCell align="right">{item.revenue.toLocaleString()}원</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 거래처별 주문 횟수 TOP 5 */}
      <Paper variant="outlined">
        <Box sx={{ p: 2, pb: 0 }}>
          <Typography variant="h6" fontWeight="bold">
            거래처별 주문 횟수 TOP 5
          </Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>순위</TableCell>
                <TableCell>거래처명</TableCell>
                <TableCell align="right">주문 횟수</TableCell>
                <TableCell align="right">총 주문액</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {businessTop5.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">데이터가 없습니다.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                businessTop5.map((biz, idx) => (
                  <TableRow key={biz.businessName + idx}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>{biz.businessName}</TableCell>
                    <TableCell align="right">{biz.count}건</TableCell>
                    <TableCell align="right">{biz.totalAmount.toLocaleString()}원</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      {/* 거래처 등급 분류 카드 */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Card sx={{ flex: '1 1 200px', minWidth: 200, borderTop: '4px solid #FFD700' }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              VIP 거래처
            </Typography>
            <Typography variant="h5" fontWeight="bold" sx={{ color: '#B8860B' }}>
              {gradeCounts.VIP}곳
            </Typography>
            <Typography variant="caption" color="text.secondary">
              누적 주문액 상위 20%
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: '1 1 200px', minWidth: 200, borderTop: '4px solid #1976d2' }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Regular 거래처
            </Typography>
            <Typography variant="h5" fontWeight="bold" sx={{ color: '#1976d2' }}>
              {gradeCounts.Regular}곳
            </Typography>
            <Typography variant="caption" color="text.secondary">
              누적 주문액 20~80%
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: '1 1 200px', minWidth: 200, borderTop: '4px solid #2e7d32' }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              New 거래처
            </Typography>
            <Typography variant="h5" fontWeight="bold" sx={{ color: '#2e7d32' }}>
              {gradeCounts.New}곳
            </Typography>
            <Typography variant="caption" color="text.secondary">
              주문 1건인 거래처
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* 거래처별 주문 분석 테이블 */}
      <Paper variant="outlined">
        <Box sx={{ p: 2, pb: 0 }}>
          <Typography variant="h6" fontWeight="bold">
            거래처별 주문 분석
          </Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>거래처명</TableCell>
                <TableCell>등급</TableCell>
                <TableCell align="right">총 주문액</TableCell>
                <TableCell align="right">주문 횟수</TableCell>
                <TableCell align="right">평균 주문액</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {businessAnalysis.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">데이터가 없습니다.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                businessAnalysis.map((biz, idx) => (
                  <TableRow key={biz.businessName + idx}>
                    <TableCell>{biz.businessName}</TableCell>
                    <TableCell>
                      <Chip
                        label={biz.grade}
                        size="small"
                        sx={{
                          fontWeight: 'bold',
                          color: '#fff',
                          backgroundColor:
                            biz.grade === 'VIP'
                              ? '#FFD700'
                              : biz.grade === 'Regular'
                                ? '#1976d2'
                                : '#2e7d32',
                          ...(biz.grade === 'VIP' && { color: '#000' }),
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">{biz.totalAmount.toLocaleString()}원</TableCell>
                    <TableCell align="right">{biz.orderCount}건</TableCell>
                    <TableCell align="right">{biz.avgAmount.toLocaleString()}원</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Stack>
  );
}
