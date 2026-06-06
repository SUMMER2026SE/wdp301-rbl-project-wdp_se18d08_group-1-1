import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Layouts
import MainLayout from "./layouts/MainLayout";
import DashboardLayout from "./layouts/DashboardLayout";

// Guard
import ProtectedRoute from "./components/ProtectedRoute";

// Pages – Guest
import GuestHome from "./pages/Guest/GuestHome";
import LoginPage from "./pages/Guest/LoginPage";
import ParkingMap from "./pages/Guest/ParkingMap";
import OAuthCallback from "./pages/OAuthCallback";

// Pages - Kiosk
import KioskFlow from "./pages/Kiosk/KioskFlow";
import KioskOutFlow from "./pages/KioskOut/KioskOutFlow";

// Pages – Admin
import AdminDashboard from './pages/Admin/Dashboard';
import VehicleManagement from './pages/Admin/VehicleManagement';
import AdminProfile from './pages/Admin/AdminProfile';
import ParkingLots from './pages/Admin/ParkingLots';
import NotificationManagement from './pages/Admin/NotificationManagement';


// Pages – Staff
import StaffDashboard from "./pages/Staff/Dashboard";


// Pages – Customer
import CustomerProfile from "./pages/Customer/CustomerProfile";
import MyVehicles from "./pages/Customer/MyVehicles";
import WalletPage from "./pages/Wallet/WalletPage";
import ParkingHistory from "./pages/Customer/ParkingHistory";
import CustomerNotifications from "./pages/Customer/CustomerNotifications";

// Misc
import UnauthorizedPage from "./pages/UnauthorizedPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Standalone Kiosk app ── */}
        <Route path="/kiosk/*" element={<KioskFlow />} />
        <Route path="/kiosk-out/*" element={<KioskOutFlow />} />
        {/* Typo Catchers */}
        <Route path="/kiost-out/*" element={<Navigate to="/kiosk-out" replace />} />
        <Route path="/kiost/*" element={<Navigate to="/kiosk" replace />} />

        {/* ── Public: Navbar + Footer ── */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<GuestHome />} />
          <Route path="/parking-map" element={<ParkingMap />} />
          {/* /pricing, /about... thêm vào đây */}
        </Route>

        {/* ── Standalone auth page ── */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />

        {/* ══════════════════════════════════════════
            ADMIN section — DashboardLayout chung
            Chỉ role "admin" được vào
        ══════════════════════════════════════════ */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/vehicle-models" element={<VehicleManagement />} />
          <Route path="/admin/parking-lots" element={<ParkingLots />} />
          <Route path="/admin/profile" element={<AdminProfile />} />
        </Route>

        {/* ══════════════════════════════════════════
            STAFF section — DashboardLayout chung
            Chỉ role "staff" được vào
        ══════════════════════════════════════════ */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["staff"]}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >

          <Route path="/staff/dashboard" element={<StaffDashboard />} />
          <Route path="/staff/notifications" element={<NotificationManagement />} />

        </Route>

        {/* ── Customer section ── */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/profile" element={<CustomerProfile />} />
          <Route path="/customer/vehicles" element={<MyVehicles />} />
          <Route path="/customer/wallet" element={<WalletPage />} />
          <Route path="/customer/history" element={<ParkingHistory />} />
          <Route path="/customer/notifications" element={<CustomerNotifications />} />
        </Route>

        {/* ── 403 ── */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
      </Routes>
    </BrowserRouter>
  );
}
