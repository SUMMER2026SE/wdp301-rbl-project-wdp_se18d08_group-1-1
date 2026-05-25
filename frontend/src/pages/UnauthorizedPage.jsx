import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldOff, ArrowLeft } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-charcoal flex flex-col items-center justify-center font-sans text-center px-6">
      <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
        <ShieldOff size={36} className="text-red-400" />
      </div>
      <h1 className="text-4xl font-extrabold text-white mb-3">403 — Access Denied</h1>
      <p className="text-gray-500 max-w-sm leading-relaxed mb-8">
        Bạn không có quyền truy cập trang này. Vui lòng đăng nhập bằng tài khoản đúng vai trò.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-6 py-3 bg-gold text-charcoal font-extrabold rounded-xl hover:bg-gold-dark transition-all hover:shadow-xl hover:shadow-gold/20"
      >
        <ArrowLeft size={16} /> Về trang chủ
      </Link>
    </div>
  );
}
