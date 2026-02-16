import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteIcon from '@mui/icons-material/Delete';
import type { CartItem as CartItemType } from '../types/product';

interface Props {
  item: CartItemType;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}

export default function CartItem({ item, onUpdateQuantity, onRemove }: Props) {
  const subtotal = item.product.price * item.quantity;

  return (
    <Paper sx={{ p: 2, mb: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flexGrow: 1, minWidth: 120 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {item.product.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {item.product.price.toLocaleString('ko-KR')}원 / {item.product.unit}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
          >
            <RemoveIcon fontSize="small" />
          </IconButton>
          <Typography sx={{ minWidth: 32, textAlign: 'center', fontWeight: 600 }}>
            {item.quantity}
          </Typography>
          <IconButton
            size="small"
            onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Box>
        <Typography variant="subtitle1" fontWeight={700} sx={{ minWidth: 90, textAlign: 'right' }}>
          {subtotal.toLocaleString('ko-KR')}원
        </Typography>
        <IconButton color="error" onClick={() => onRemove(item.product.id)}>
          <DeleteIcon />
        </IconButton>
      </Box>
    </Paper>
  );
}
