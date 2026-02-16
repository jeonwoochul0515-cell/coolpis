import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ProfileProvider, useProfile } from './context/ProfileContext';
import Header from './components/Header';
import ProductListPage from './pages/ProductListPage';
import CartPage from './pages/CartPage';
import ProfilePage from './pages/ProfilePage';

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

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
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
    </ThemeProvider>
  );
}

export default App;
