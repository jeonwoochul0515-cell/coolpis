import { useState } from 'react';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import type { Product } from '../types/product';

interface Props {
  product: Product;
  onAdd: (product: Product, quantity: number) => void;
}

export default function ProductCard({ product, onAdd }: Props) {
  const [quantity, setQuantity] = useState(1);

  const handleAdd = () => {
    if (quantity > 0) {
      onAdd(product, quantity);
      setQuantity(1);
    }
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardMedia
        component="img"
        height="160"
        image={product.image}
        alt={product.name}
        sx={{ objectFit: 'cover' }}
      />
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6" gutterBottom fontWeight={600}>
          {product.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {product.description}
        </Typography>
        <Typography variant="h6" color="primary" fontWeight={700}>
          {product.price.toLocaleString('ko-KR')}원 / {product.unit}
        </Typography>
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, width: '100%', alignItems: 'center' }}>
          <TextField
            type="number"
            size="small"
            label="수량"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            slotProps={{ htmlInput: { min: 1 } }}
            sx={{ width: 80 }}
          />
          <Button
            variant="contained"
            startIcon={<AddShoppingCartIcon />}
            onClick={handleAdd}
            fullWidth
          >
            담기
          </Button>
        </Box>
      </CardActions>
    </Card>
  );
}
