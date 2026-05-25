import React from 'react';
import Logo from '../assets/images/logo.png';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
        <div className="col-span-1 md:col-span-2">
          <img src={Logo} alt="VALO Logo" className="h-8 object-contain mb-4 filter grayscale opacity-50" />
          <p className="text-gray-500 max-w-sm leading-relaxed">
            Smart parking management system. Optimize space, automate processes, delivering a Luxury experience for customers.
          </p>
        </div>
        <div>
          <h4 className="font-bold text-charcoal mb-4">Platform</h4>
          <ul className="space-y-3 text-gray-500 text-sm">
            <li><a href="#" className="hover:text-gold transition">Customer Portal</a></li>
            <li><a href="#" className="hover:text-gold transition">Kiosk Control</a></li>
            <li><a href="#" className="hover:text-gold transition">Admin Dashboard</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-charcoal mb-4">Legal</h4>
          <ul className="space-y-3 text-gray-500 text-sm">
            <li><a href="#" className="hover:text-gold transition">Terms of Use</a></li>
            <li><a href="#" className="hover:text-gold transition">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-gold transition">Refund Policy</a></li>
          </ul>
        </div>
      </div>
      <div className="text-center text-gray-400 text-sm border-t border-gray-100 pt-8 max-w-7xl mx-auto">
        © 2026 VALO Smart Parking. Developed by Vo Dai Vy.
      </div>
    </footer>
  );
}