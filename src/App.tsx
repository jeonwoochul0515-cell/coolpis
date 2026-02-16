import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ProfileProvider, useProfile } from './context/ProfileContext';
import { AdminAuthProvider, useAdminAuth } from './admin/AdminAuthContext';
import AdminLoginPage from './admin/AdminLoginPage';
import AdminDashboard from './admin/AdminDashboard';
import Header from './components/Header';
import ProductListPage from './pages/ProductListPage';
import CartPage from './pages/CartPage';
import ProfilePage from './pages/ProfilePage';
import OrderCompletePage from './pages/OrderCompletePage';
import OrderHistoryPage from './pages/OrderHistoryPage';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#f50057' },
  },
  typography: {
    fontFamily: '"Noto Sans KR", "Roboto", sans-serif',
  },
});

function AppRoutes() {
  const { isRegistered, loading } = useProfile();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Routes>
      <Route path="/profile" element={<ProfilePage />} />
      <Route
        path="/"
        element={isRegistered ? <ProductListPage /> : <Navigate to="/profile" replace />}
      />
      <Route
        path="/cart"
        element={isRegistered ? <CartPage /> : <Navigate to="/profile" replace />}
      />
      <Route
        path="/order-complete"
        element={isRegistered ? <OrderCompletePage /> : <Navigate to="/profile" replace />}
      />
      <Route
        path="/orders"
        element={isRegistered ? <OrderHistoryPage /> : <Navigate to="/profile" replace />}
      />
    </Routes>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return <>{children}</>;
}

function AdminApp() {
  const { isAdmin, loading } = useAdminAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return isAdmin ? <AdminDashboard /> : <AdminLoginPage />;
}

function RegularApp() {
  return (
    <AuthProvider>
      <AuthGate>
        <ProfileProvider>
          <CartProvider>
            <Header />
            <AppRoutes />
          </CartProvider>
        </ProfileProvider>
      </AuthGate>
    </AuthProvider>
  );
}

function App() {
  const isAdminRoute = window.location.pathname.startsWith('/admin');

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {isAdminRoute ? (
        <AdminAuthProvider>
          <AdminApp />
        </AdminAuthProvider>
      ) : (
        <RegularApp />
      )}
    </ThemeProvider>
  );
}

export default App;
