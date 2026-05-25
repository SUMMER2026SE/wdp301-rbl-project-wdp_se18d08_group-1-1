import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * ProtectedRoute
 * @param {string[]} allowedRoles - mảng role được phép vào trang này, e.g. ['admin'] hoặc ['admin','manager']
 * @param {React.ReactNode} children
 *
 * Logic:
 *  - Chưa login          → redirect /login
 *  - Login nhưng sai role → redirect /unauthorized
 *  - Đúng role           → render children
 */
export default function ProtectedRoute({ allowedRoles = [], children }) {
  const raw = sessionStorage.getItem('valo_user');
  const user = raw ? JSON.parse(raw) : null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
