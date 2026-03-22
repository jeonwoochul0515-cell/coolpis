import { useState, useEffect, useMemo } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Divider from '@mui/material/Divider';
import type { Order } from '../types/order';
import type { TaxInvoice, TaxInvoiceItem } from '../types/taxInvoice';
import {
  createTaxInvoice,
  getAllTaxInvoices,
  cancelTaxInvoice,
} from '../services/taxInvoiceStore';

const SUPPLIER_NAME = '쿨피스';
const SUPPLIER_REG_NUMBER = '000-00-00000';

interface Props {
  orders: Order[];
}

export default function TaxInvoiceView({ orders }: Props) {
  const [invoices, setInvoices] = useState<TaxInvoice[]>([]);
  const [selectedBuyer, setSelectedBuyer] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    getAllTaxInvoices().then(setInvoices);
  }, []);

  // 거래처 목록 추출
  const buyers = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of orders) {
      if (!map.has(o.registrationNumber)) {
        map.set(o.registrationNumber, o.businessName);
      }
    }
    return Array.from(map.entries()).map(([regNumber, name]) => ({
      regNumber,
      name,
    }));
  }, [orders]);

  // 선택된 거래처 + 기간에 해당하는 주문
  const matchedOrders = useMemo(() => {
    if (!selectedBuyer || !startDate || !endDate) return [];
    return orders.filter((o) => {
      if (o.registrationNumber !== selectedBuyer) return false;
      const d = o.createdAt.slice(0, 10);
      return d >= startDate && d <= endDate;
    });
  }, [orders, selectedBuyer, startDate, endDate]);

  // 집계
  const summary = useMemo(() => {
    const totalAmount = matchedOrders.reduce((s, o) => s + o.totalPrice, 0);
    const supplyAmount = Math.round(totalAmount / 1.1);
    const taxAmount = totalAmount - supplyAmount;

    const itemMap = new Map<string, TaxInvoiceItem>();
    for (const o of matchedOrders) {
      for (const item of o.items) {
        const existing = itemMap.get(item.productName);
        if (existing) {
          existing.quantity += item.quantity;
          existing.amount += item.price * item.quantity;
        } else {
          itemMap.set(item.productName, {
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.price,
            amount: item.price * item.quantity,
          });
        }
      }
    }

    return { totalAmount, supplyAmount, taxAmount, items: Array.from(itemMap.values()) };
  }, [matchedOrders]);

  const generateSerialNumber = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return `TI-${y}${m}${d}-${rand}`;
  };

  const handleIssue = async () => {
    if (matchedOrders.length === 0) return;

    const buyerName = buyers.find((b) => b.regNumber === selectedBuyer)?.name ?? '';
    const invoice: Omit<TaxInvoice, 'id'> = {
      serialNumber: generateSerialNumber(),
      issueDate: new Date().toISOString().slice(0, 10),
      supplierName: SUPPLIER_NAME,
      supplierRegNumber: SUPPLIER_REG_NUMBER,
      buyerName,
      buyerRegNumber: selectedBuyer,
      items: summary.items,
      supplyAmount: summary.supplyAmount,
      taxAmount: summary.taxAmount,
      totalAmount: summary.totalAmount,
      status: 'issued',
      createdAt: new Date().toISOString(),
    };

    try {
      const id = await createTaxInvoice(invoice);
      setInvoices((prev) => [{ id, ...invoice }, ...prev]);
      setSnackbar({ open: true, message: '세금계산서가 발급되었습니다.', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: '세금계산서 발급에 실패했습니다.', severity: 'error' });
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelTaxInvoice(id);
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === id ? { ...inv, status: 'cancelled' as const } : inv))
      );
      setSnackbar({ open: true, message: '세금계산서가 취소되었습니다.', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: '취소에 실패했습니다.', severity: 'error' });
    }
  };

  const formatCurrency = (n: number) => n.toLocaleString('ko-KR') + '원';

  return (
    <Stack spacing={3}>
      <Typography variant="h6" fontWeight="bold">
        세금계산서 발급
      </Typography>

      {/* 발급 폼 */}
      <Paper sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>거래처 선택</InputLabel>
              <Select
                value={selectedBuyer}
                label="거래처 선택"
                onChange={(e) => setSelectedBuyer(e.target.value)}
              >
                {buyers.map((b) => (
                  <MenuItem key={b.regNumber} value={b.regNumber}>
                    {b.name} ({b.regNumber})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              type="date"
              label="시작일"
              size="small"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              type="date"
              label="종료일"
              size="small"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Box>

          {matchedOrders.length > 0 && (
            <>
              <Typography variant="body2" color="text.secondary">
                해당 기간 주문: {matchedOrders.length}건
              </Typography>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>품목명</TableCell>
                      <TableCell align="right">수량</TableCell>
                      <TableCell align="right">단가</TableCell>
                      <TableCell align="right">금액</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {summary.items.map((item) => (
                      <TableRow key={item.productName}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell align="right">{formatCurrency(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Divider />
              <Box sx={{ display: 'flex', gap: 3, justifyContent: 'flex-end', alignItems: 'center' }}>
                <Typography variant="body2">공급가액: {formatCurrency(summary.supplyAmount)}</Typography>
                <Typography variant="body2">세액: {formatCurrency(summary.taxAmount)}</Typography>
                <Typography variant="subtitle1" fontWeight="bold">
                  합계: {formatCurrency(summary.totalAmount)}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="contained" onClick={handleIssue}>
                  세금계산서 발급
                </Button>
              </Box>
            </>
          )}

          {selectedBuyer && startDate && endDate && matchedOrders.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              해당 기간에 주문이 없습니다.
            </Typography>
          )}
        </Stack>
      </Paper>

      {/* 발급 목록 */}
      <Typography variant="h6" fontWeight="bold">
        발급된 세금계산서
      </Typography>

      {invoices.length === 0 ? (
        <Typography color="text.secondary" textAlign="center" py={4}>
          발급된 세금계산서가 없습니다.
        </Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>일련번호</TableCell>
                <TableCell>발급일</TableCell>
                <TableCell>거래처</TableCell>
                <TableCell>사업자번호</TableCell>
                <TableCell align="right">공급가액</TableCell>
                <TableCell align="right">세액</TableCell>
                <TableCell align="right">합계</TableCell>
                <TableCell align="center">상태</TableCell>
                <TableCell align="center">관리</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>{inv.serialNumber}</TableCell>
                  <TableCell>{inv.issueDate}</TableCell>
                  <TableCell>{inv.buyerName}</TableCell>
                  <TableCell>{inv.buyerRegNumber}</TableCell>
                  <TableCell align="right">{formatCurrency(inv.supplyAmount)}</TableCell>
                  <TableCell align="right">{formatCurrency(inv.taxAmount)}</TableCell>
                  <TableCell align="right">{formatCurrency(inv.totalAmount)}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={inv.status === 'issued' ? '발급' : '취소'}
                      color={inv.status === 'issued' ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    {inv.status === 'issued' && (
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleCancel(inv.id)}
                      >
                        취소
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
