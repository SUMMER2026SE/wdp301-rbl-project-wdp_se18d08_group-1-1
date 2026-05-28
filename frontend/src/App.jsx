import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

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

// Pages – Admin
import AdminDashboard from './pages/Admin/Dashboard';
import VehicleModels from './pages/Admin/VehicleModels';

// Pages – Manager
import ManagerDashboard from './pages/Manager/Dashboard';
import WalletPage from './pages/Wallet/WalletPage';

// Pages – Customer
import CustomerProfile from "./pages/Customer/CustomerProfile";
import MyVehicles from "./pages/Customer/MyVehicles";

// Misc
import UnauthorizedPage from "./pages/UnauthorizedPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Standalone Kiosk app ── */}
        <Route path="/kiosk/*" element={<KioskFlow />} />

        {/* ── Public: Navbar + Footer ── */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<GuestHome />} />
          <Route path="/parking-map" element={<ParkingMap />} />
          {/* /pricing, /about... thêm vào đây */}
        </Route>

        {/* ── Standalone auth page ── */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="/wallet" element={<WalletPage />} />

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
          <Route path="/admin/vehicle-models" element={<VehicleModels />} />
        </Route>

        {/* ══════════════════════════════════════════
            MANAGER section — DashboardLayout chung
            Chỉ role "manager" được vào
        ══════════════════════════════════════════ */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/manager/dashboard" element={<ManagerDashboard />} />
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
        </Route>

        {/* ── 403 ── */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
      </Routes>
    </BrowserRouter>
  );
}
