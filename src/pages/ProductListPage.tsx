import { useState } from 'react';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import ProductCard from '../components/ProductCard';
import { useCart } from '../context/CartContext';
import { products } from '../data/products';
import type { Product } from '../types/product';

export default function ProductListPage() {
  const { addToCart } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  const filteredProducts = searchQuery
    ? products.filter((p) => p.name.includes(searchQuery))
    : products;

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
      <TextField
        fullWidth
        size="small"
        placeholder="상품명으로 검색"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ mb: 3 }}
      />
      {filteredProducts.length > 0 ? (
        <Grid container spacing={3}>
          {filteredProducts.map((product) => (
            <Grid key={product.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <ProductCard product={product} onAdd={handleAdd} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Typography color="text.secondary" textAlign="center" sx={{ py: 5 }}>
          검색 결과가 없습니다
        </Typography>
      )}
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
