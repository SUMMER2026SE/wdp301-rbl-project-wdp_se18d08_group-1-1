import { Navigate } from 'react-router-dom';

/**
 * ProtectedRoute
 * @param {string[]} allowedRoles - array of roles allowed to access this route, e.g. ['admin'] or ['admin','manager']
 * @param {React.ReactNode} children
 *
 * Logic:
 *  - Not logged in          → redirect /login
 *  - Logged in with the wrong role → redirect /unauthorized
 *  - Correct role           → render children
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
