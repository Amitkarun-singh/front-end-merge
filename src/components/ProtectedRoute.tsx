import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

/** Roles that are permitted to access this portal. */
const ALLOWED_ROLES = ['teacher', 'student'];

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  // If a first-time password reset is pending, block ALL other protected routes
  const tempToken = sessionStorage.getItem('tempToken');
  if (tempToken) {
    return <Navigate to="/reset-password" replace />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Second-layer role guard — catches any role that slipped through AuthContext
  // (e.g. restored from localStorage before the guard existed)
  const role = (typeof user?.role === 'string' ? user.role : '').toLowerCase().trim();
  if (role && !ALLOWED_ROLES.includes(role)) {
    return <Navigate to="/access-denied" replace />;
  }

  return <>{children}</>;
}
