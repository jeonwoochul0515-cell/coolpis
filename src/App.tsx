import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ProfileProvider, useProfile } from './context/ProfileContext';
import { AdminAuthProvider, useAdminAuth } from './admin/AdminAuthContext';
import { AppThemeProvider } from './context/ThemeContext';
import Header from './components/Header';
import OfflineBanner from './components/OfflineBanner';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy-loaded pages
const AdminLoginPage = React.lazy(() => import('./admin/AdminLoginPage'));
const AdminDashboard = React.lazy(() => import('./admin/AdminDashboard'));
const DriverPage = React.lazy(() => import('./pages/DriverPage'));
const ProductListPage = React.lazy(() => import('./pages/ProductListPage'));
const CartPage = React.lazy(() => import('./pages/CartPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const OrderCompletePage = React.lazy(() => import('./pages/OrderCompletePage'));
const OrderHistoryPage = React.lazy(() => import('./pages/OrderHistoryPage'));

const SuspenseFallback = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
    <CircularProgress />
  </Box>
);

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
    <Suspense fallback={<SuspenseFallback />}>
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
    </Suspense>
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

  return (
    <Suspense fallback={<SuspenseFallback />}>
      {isAdmin ? <AdminDashboard /> : <AdminLoginPage />}
    </Suspense>
  );
}

function RegularApp() {
  return (
    <AuthProvider>
      <AuthGate>
        <ProfileProvider>
          <CartProvider>
            <OfflineBanner />
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
  const isDriverRoute = window.location.pathname.startsWith('/driver');

  return (
    <AppThemeProvider>
      <ErrorBoundary>
        {isAdminRoute ? (
          <AdminAuthProvider>
            <AdminApp />
          </AdminAuthProvider>
        ) : isDriverRoute ? (
          <Suspense fallback={<SuspenseFallback />}>
            <DriverPage />
          </Suspense>
        ) : (
          <RegularApp />
        )}
      </ErrorBoundary>
    </AppThemeProvider>
  );
}

export default App;
