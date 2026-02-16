import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';

interface Props {
  totalItems: number;
  totalPrice: number;
  onSubmitOrder: () => void;
  disabled?: boolean;
}

export default function CartSummary({ totalItems, totalPrice, onSubmitOrder, disabled }: Props) {
  return (
    <Paper sx={{ p: 3, mt: 2 }}>
      <Typography variant="h6" gutterBottom fontWeight={600}>
        주문 요약
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography>총 수량</Typography>
        <Typography fontWeight={600}>{totalItems}박스</Typography>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography>총 금액</Typography>
        <Typography variant="h6" fontWeight={700} color="primary">
          {totalPrice.toLocaleString('ko-KR')}원
        </Typography>
      </Box>
      <Button
        variant="contained"
        size="large"
        fullWidth
        onClick={onSubmitOrder}
        disabled={totalItems === 0 || disabled}
      >
        주문 제출
      </Button>
    </Paper>
  );
}
