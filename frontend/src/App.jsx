import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Layouts
import MainLayout      from './layouts/MainLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Guard
import ProtectedRoute from './components/ProtectedRoute';

// Pages – Guest
import GuestHome from './pages/Guest/GuestHome';
import LoginPage from './pages/Guest/LoginPage';

// Pages – Admin
import AdminDashboard from './pages/Admin/Dashboard';

// Pages – Manager
import ManagerDashboard from './pages/Manager/Dashboard';

// Misc
import UnauthorizedPage from './pages/UnauthorizedPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Public: Navbar + Footer ── */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<GuestHome />} />
          {/* /pricing, /about... thêm vào đây */}
        </Route>

        {/* ── Standalone auth page ── */}
        <Route path="/login" element={<LoginPage />} />

        {/* ══════════════════════════════════════════
            ADMIN section — DashboardLayout chung
            Chỉ role "admin" được vào
        ══════════════════════════════════════════ */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          {/* Thêm các trang admin khác vào đây:
          <Route path="/admin/managers"     element={<ManagerAccounts />} />
          <Route path="/admin/users"        element={<UserManagement />} />
          <Route path="/admin/parking-lots" element={<ParkingLots />} />
          <Route path="/admin/tickets"      element={<TicketPackages />} />
          <Route path="/admin/services"     element={<Services />} />
          <Route path="/admin/revenue"      element={<RevenueAnalytics />} />
          <Route path="/admin/financial"    element={<FinancialExport />} /> */}
        </Route>

        {/* ══════════════════════════════════════════
            MANAGER section — DashboardLayout chung
            Chỉ role "manager" được vào
        ══════════════════════════════════════════ */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['manager']}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/manager/dashboard" element={<ManagerDashboard />} />
          {/* Thêm các trang manager khác vào đây:
          <Route path="/manager/live-grid"  element={<LiveGrid />} />
          <Route path="/manager/gate"       element={<GateControl />} />
          <Route path="/manager/reports"    element={<OccupancyReports />} />
          <Route path="/manager/bookings"   element={<BookingManagement />} />
          <Route path="/manager/violations" element={<Violations />} />
          <Route path="/manager/tasks"      element={<TaskStatus />} />
          <Route path="/manager/rates"      element={<OvertimeRates />} /> */}
        </Route>

        {/* ── 403 ── */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

      </Routes>
    </BrowserRouter>
  );
}
