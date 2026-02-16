import { useState } from 'react';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import ProductCard from '../components/ProductCard';
import { useCart } from '../context/CartContext';
import { products } from '../data/products';
import type { Product } from '../types/product';

export default function ProductListPage() {
  const { addToCart } = useCart();
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  const handleAdd = (product: Product, quantity: number) => {
    addToCart(product, quantity);
    setSnackbar({
      open: true,
      message: `${product.name} ${quantity}박스를 장바구니에 담았습니다.`,
    });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" gutterBottom fontWeight={700}>
        제품 목록
      </Typography>
      <Grid container spacing={3}>
        {products.map((product) => (
          <Grid key={product.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <ProductCard product={product} onAdd={handleAdd} />
          </Grid>
        ))}
      </Grid>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2000}
        onClose={() => setSnackbar({ open: false, message: '' })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setSnackbar({ open: false, message: '' })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
