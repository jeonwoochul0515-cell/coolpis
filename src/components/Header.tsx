import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PersonIcon from '@mui/icons-material/Person';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useProfile } from '../context/ProfileContext';

export default function Header() {
  const { totalItems } = useCart();
  const { isRegistered, profile } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <AppBar position="sticky">
      <Toolbar>
        <StorefrontIcon sx={{ mr: 1 }} />
        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
          쿨피스 도매주문
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {isRegistered && (
            <>
              <Button
                color="inherit"
                onClick={() => navigate('/')}
                variant={location.pathname === '/' ? 'outlined' : 'text'}
                sx={{ borderColor: 'rgba(255,255,255,0.5)' }}
              >
                제품목록
              </Button>
              <IconButton color="inherit" onClick={() => navigate('/cart')}>
                <Badge badgeContent={totalItems} color="error">
                  <ShoppingCartIcon />
                </Badge>
              </IconButton>
              <IconButton color="inherit" onClick={() => navigate('/orders')} title="주문내역">
                <ReceiptLongIcon />
              </IconButton>
            </>
          )}
          <IconButton
            color="inherit"
            onClick={() => navigate('/profile')}
            title={profile?.businessName || '프로필'}
          >
            <PersonIcon />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
