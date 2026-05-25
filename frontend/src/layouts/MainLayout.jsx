import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-charcoal font-sans overflow-x-hidden">
      <Navbar />
      
      {/* Nội dung của các trang con sẽ được render tại đây */}
      <main>
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}