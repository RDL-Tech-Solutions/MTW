import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { Toaster } from './components/ui/toaster';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Coupons from './pages/Coupons';
import Categories from './pages/Categories';
import Users from './pages/Users';
import Analytics from './pages/Analytics';
import Bots from './pages/Bots';
import AutoSync from './pages/AutoSync';
import CouponCapture from './pages/CouponCapture';
import Notifications from './pages/Notifications';
import TelegramChannels from './pages/TelegramChannels';
import Settings from './pages/Settings';

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="coupons" element={<Coupons />} />
          <Route path="categories" element={<Categories />} />
          <Route path="users" element={<Users />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="bots" element={<Bots />} />
          <Route path="telegram-channels" element={<TelegramChannels />} />
          <Route path="settings" element={<Settings />} />
          <Route path="auto-sync" element={<AutoSync />} />
          <Route path="coupon-capture" element={<CouponCapture />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App;
