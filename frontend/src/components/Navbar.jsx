import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, User, Wallet, ChevronDown, ShieldCheck } from "lucide-react";
import Logo from "../assets/images/logo.png";

export default function Navbar() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Đọc session mỗi khi component mount hoặc tab được focus lại
  const syncUser = () => {
    const raw = sessionStorage.getItem("valo_user");
    setUser(raw ? JSON.parse(raw) : null);
  };

  useEffect(() => {
    syncUser();
    window.addEventListener("focus", syncUser);
    // Custom event để LoginPage trigger ngay lập tức (không cần reload)
    window.addEventListener("valo_auth_change", syncUser);
    return () => {
      window.removeEventListener("focus", syncUser);
      window.removeEventListener("valo_auth_change", syncUser);
    };
  }, []);

  // Đóng dropdown khi click ngoài
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("valo_user");
    setUser(null);
    setDropdownOpen(false);
    navigate("/");
  };

  // Tạo chữ cái đầu từ tên user
  const getInitials = (name = "") =>
    name
      .split(" ")
      .map((w) => w[0])
      .slice(-2)
      .join("")
      .toUpperCase();

  // Màu badge theo role
  const roleBadge = {
    admin: { label: "Admin", cls: "bg-red-100 text-red-700" },
    staff: { label: "Staff", cls: "bg-blue-100 text-blue-700" },
    customer: { label: "Customer", cls: "bg-green-100 text-green-700" },
  };

  return (
    <nav
      className="fixed w-full top-0 z-50 border-b border-gray-100 transition-all duration-300"
      style={{
        background: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(16px)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
        {/* LOGO */}
        <Link to="/" className="flex items-center gap-3">
          <img src={Logo} alt="VALO Logo" className="h-10 object-contain" />
          <span className="text-xs font-bold tracking-widest text-gray-400 uppercase mt-1 hidden sm:block">
            Valo Parking
          </span>
        </Link>

        {/* MENU */}
        <div className="hidden md:flex space-x-8">
          <Link
            to="/"
            className="text-black font-semibold border-b-2 border-black pb-1"
          >
            Home
          </Link>
          <a
            href="#ecosystem"
            className="text-gray-500 hover:text-black transition font-medium"
          >
            Ecosystem
          </a>
          <a
            href="#pricing"
            className="text-gray-500 hover:text-black transition font-medium"
          >
            Pricing
          </a>
        </div>

        {/* AUTH ZONE */}
        <div className="flex items-center gap-4">
          {user ? (
            /* ── ĐÃ ĐĂNG NHẬP: Avatar + Dropdown ── */
            <div className="relative" ref={dropdownRef}>
              <button
                id="nav-profile-btn"
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full border border-gray-200 hover:border-gray-400 hover:shadow-md transition-all duration-200 group"
              >
                {/* Avatar circle */}
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-black font-extrabold text-sm shadow-inner select-none">
                  {getInitials(user.name)}
                </div>
                <span className="text-sm font-bold text-gray-800 hidden sm:block max-w-[120px] truncate">
                  {user.name.split(" ").pop()}
                </span>
                <ChevronDown
                  size={14}
                  className={`text-gray-500 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* Dropdown panel */}
              {dropdownOpen && (
                <div className="absolute right-0 top-[calc(100%+10px)] w-64 bg-white border border-gray-100 rounded-2xl shadow-2xl shadow-black/10 overflow-hidden animate-[fadeInDown_0.15s_ease]">
                  {/* Header */}
                  <div className="px-4 pt-4 pb-3 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-black font-extrabold text-base shadow select-none">
                        {getInitials(user.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate">
                          {user.name}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {user.email}
                        </p>
                        {roleBadge[user.role] && (
                          <span
                            className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${roleBadge[user.role].cls}`}
                          >
                            {roleBadge[user.role].label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Wallet balance */}
                  {user.wallet !== undefined && (
                    <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-50 bg-yellow-50/60">
                      <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                        <Wallet size={15} className="text-yellow-700" />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                          VALO Wallet
                        </p>
                        <p className="text-sm font-extrabold text-gray-800">
                          {user.wallet.toLocaleString("vi-VN")}₫
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Menu items */}
                  <div className="py-2">
                    <button
                      id="nav-dropdown-profile"
                      onClick={() => {
                        navigate("/profile");
                        setDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <User size={15} className="text-gray-400" />
                      My Profile
                    </button>
                    {user.role === "admin" && (
                      <button
                        id="nav-dropdown-admin"
                        onClick={() => navigate("/admin/dashboard")}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <ShieldCheck size={15} className="text-gray-400" />
                        Admin Dashboard
                      </button>
                    )}
                  </div>

                  {/* Logout */}
                  <div className="border-t border-gray-100 py-2">
                    <button
                      id="nav-btn-logout"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors font-semibold"
                    >
                      <LogOut size={15} />
                      Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── CHƯA ĐĂNG NHẬP: Log In / Sign Up ── */
            <>
              <Link
                to="/login"
                id="nav-btn-login"
                className="px-5 py-2.5 text-sm font-bold text-black border border-gray-300 rounded-lg hover:border-black transition inline-flex items-center"
              >
                Log In
              </Link>
              <Link
                to="/login"
                id="nav-btn-signup"
                className="px-5 py-2.5 text-sm font-bold text-white bg-charcoal rounded-lg hover:bg-black transition shadow-lg shadow-black/20 inline-flex items-center"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
