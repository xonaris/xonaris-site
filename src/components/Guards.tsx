import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Requires authentication. Redirects to /landing if not logged in.
 * Also redirects banned users to /banned and maintenance to /maintenance.
 */
export function ProtectedRoute() {
  const { isAuthenticated, loading, user, isBanned, isMaintenance, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;

  // Banned → /banned (user?.is_banned covers the case the backend returns the flag in profile)
  if (user?.is_banned || isBanned) return <Navigate to="/banned" replace />;

  // Maintenance → /maintenance (admins can pass through)
  if (isMaintenance && !isAdmin) return <Navigate to="/maintenance" replace />;

  // Not logged in → /landing
  if (!isAuthenticated) return <Navigate to="/landing" state={{ from: location }} replace />;

  return <Outlet />;
}

/**
 * Redirects premium users away from /premium → /
 */
export function PremiumGuard() {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;

  const premiumUntil = user?.premium_expires_at ? new Date(user.premium_expires_at) : null;
  const isPremium = user?.is_premium && premiumUntil && premiumUntil > new Date();

  if (isPremium) return <Navigate to="/" replace />;

  return <Outlet />;
}

/**
 * Requires admin role.
 */
export function AdminRoute() {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/landing" state={{ from: location }} replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <Outlet />;
}

/**
 * GuestOnly: redirects authenticated users to /
 */
export function GuestRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (isAuthenticated) return <Navigate to="/" replace />;

  return <Outlet />;
}

/**
 * Guard for /banned — only accessible when ban data exists.
 * Redirects away as soon as the ban is lifted, regardless of whether user is loaded.
 */
export function BannedGuard() {
  const { loading, isBanned, user } = useAuth();

  if (loading) return <PageLoader />;

  // Ban lifted → go to profile if authenticated, otherwise home
  if (!isBanned && !user?.is_banned) {
    return <Navigate to={user ? '/profil' : '/'} replace />;
  }

  return <Outlet />;
}

/**
 * Guard for /maintenance — only shown when maintenance is active.
 * Admins and non-maintenance states redirect to home.
 */
export function MaintenanceGuard() {
  const { loading, isMaintenance, isAdmin } = useAuth();

  if (loading) return <PageLoader />;

  // Admins bypass maintenance page
  if (isAdmin) return <Navigate to="/" replace />;

  // Maintenance active → show page
  if (isMaintenance) return <Outlet />;

  // No maintenance → home
  return <Navigate to="/" replace />;
}

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-navy-400">Chargement…</p>
      </div>
    </div>
  );
}
