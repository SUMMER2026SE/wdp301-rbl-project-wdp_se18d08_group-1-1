import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../assets/images/logo.png';

export default function Navbar() {
  return (
    <nav className="glass-nav fixed w-full top-0 z-50 border-b border-gray-100 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
        
        {/* LOGO */}
        <div className="flex items-center gap-3">
          <img src={Logo} alt="VALO Logo" className="h-10 object-contain" />
          <span className="text-xs font-bold tracking-widest text-gray-400 uppercase mt-1 hidden sm:block">Valo Parking</span>
        </div>

        {/* MENU */}
        <div className="hidden md:flex space-x-8">
          <Link to="/" className="text-black font-semibold border-b-2 border-black pb-1">Home</Link>
          <a href="#ecosystem" className="text-gray-500 hover:text-black transition font-medium">Ecosystem</a>
          <a href="#pricing" className="text-gray-500 hover:text-black transition font-medium">Pricing</a>
        </div>

        {/* BUTTONS */}
        <div className="flex gap-4">
          <button className="px-5 py-2.5 text-sm font-bold text-black border border-gray-300 rounded-lg hover:border-black transition">Log In</button>
          <button className="px-5 py-2.5 text-sm font-bold text-white bg-charcoal rounded-lg hover:bg-black transition shadow-lg shadow-black/20">Sign Up</button>
        </div>
      </div>
    </nav>
  );
}