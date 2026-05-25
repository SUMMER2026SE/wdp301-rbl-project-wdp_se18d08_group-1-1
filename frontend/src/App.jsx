import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Import các Layouts
import MainLayout from './layouts/MainLayout';

// Import các Pages
import GuestHome from './pages/Guest/GuestHome';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        
        {/* Nhóm các trang dành cho Khách (Guest/Customer) dùng chung MainLayout có Navbar & Footer */}
        <Route element={<MainLayout />}>
          {/* Đường dẫn mặc định "/" sẽ gọi trang GuestHome */}
          <Route path="/" element={<GuestHome />} />
          
          {/* Sau này bạn tạo trang Login, Pricing... thì cứ thêm vào đây */}
          {/* <Route path="/login" element={<LoginPage />} /> */}
        </Route>

        {/* --- DỰ KIẾN SAU NÀY --- */}
        {/* Nhóm Admin (Có Sidebar) */}
        {/* <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<Dashboard />} />
            </Route> */}

        {/* Nhóm Kiosk (Full màn hình) */}
        {/* <Route element={<KioskLayout />}>
              <Route path="/kiosk" element={<KioskScreen />} />
            </Route> */}
            
      </Routes>
    </BrowserRouter>
  );
}