import { useState } from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import CartItemComponent from '../components/CartItem';
import CartSummary from '../components/CartSummary';
import { useCart } from '../context/CartContext';
import { useProfile } from '../context/ProfileContext';
import { useNavigate } from 'react-router-dom';
import { saveOrder } from '../services/orderStore';

export default function CartPage() {
  const { items, updateQuantity, removeFromCart, clearCart, totalItems, totalPrice } = useCart();
  const { uid, profile } = useProfile();
  const navigate = useNavigate();
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitOrder = async () => {
    if (!uid || !profile) return;
    setSubmitting(true);
    try {
      await saveOrder(uid, profile, items, totalItems, totalPrice);
      clearCart();
      navigate('/order-complete');
    } catch (err) {
      console.error('주문 실패:', err);
      setSnackbar({ open: true, message: '주문에 실패했습니다. 다시 시도해주세요.', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <Container maxWidth="md" sx={{ py: 6, textAlign: 'center' }}>
        <ShoppingCartIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h5" gutterBottom color="text.secondary">
          장바구니가 비어있습니다
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          제품 목록에서 상품을 담아주세요.
        </Typography>
        <Button variant="contained" onClick={() => navigate('/')}>
          제품 목록으로
        </Button>
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity={snackbar.severity} variant="filled">
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Typography variant="h5" gutterBottom fontWeight={700}>
        장바구니
      </Typography>
      <Box>
        {items.map((item) => (
          <CartItemComponent
            key={item.product.id}
            item={item}
            onUpdateQuantity={updateQuantity}
            onRemove={removeFromCart}
          />
        ))}
      </Box>
      <CartSummary
        totalItems={totalItems}
        totalPrice={totalPrice}
        onSubmitOrder={handleSubmitOrder}
        disabled={submitting}
      />
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
