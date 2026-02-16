import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useNavigate } from 'react-router-dom';

export default function OrderCompletePage() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
      <CheckCircleOutlineIcon sx={{ fontSize: 100, color: 'primary.main', mb: 2 }} />
      <Typography variant="h4" fontWeight={700} gutterBottom>
        주문이 완료되었습니다
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        주문이 성공적으로 접수되었습니다. 주문 내역에서 확인하실 수 있습니다.
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button variant="outlined" size="large" onClick={() => navigate('/')}>
          제품 목록으로
        </Button>
        <Button variant="contained" size="large" onClick={() => navigate('/orders')}>
          주문 내역
        </Button>
      </Box>
    </Container>
  );
}
