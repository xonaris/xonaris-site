import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import { ProtectedRoute, AdminRoute, BannedGuard, MaintenanceGuard, GuestRoute, PremiumGuard } from './components/Guards';
import { useAuth } from './context/AuthContext';

/* ── Fallback ── */
const LazyLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-navy-950">
    <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
  </div>
);

/* ── Public pages ──────────────────────────── */
const Home = React.lazy(() => import('./pages/Home'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const NewsList = React.lazy(() => import('./pages/NewsList'));
const NewsDetail = React.lazy(() => import('./pages/NewsDetail'));
const CGU = React.lazy(() => import('./pages/CGU'));
const Privacy = React.lazy(() => import('./pages/Privacy'));
const Legal = React.lazy(() => import('./pages/Legal'));

/* ── User pages (protected) ────────────────── */
const Channels = React.lazy(() => import('./pages/Channels'));
const Watch = React.lazy(() => import('./pages/Watch'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Favorites = React.lazy(() => import('./pages/Favorites'));
const Reports = React.lazy(() => import('./pages/Reports'));
const Premium = React.lazy(() => import('./pages/Premium'));

/* ── System pages ──────────────────────────── */
const Maintenance = React.lazy(() => import('./pages/Maintenance'));
const Banned = React.lazy(() => import('./pages/Banned'));
const ErrorPage = React.lazy(() => import('./pages/ErrorPage'));

/* ── Admin pages ───────────────────────────── */
const AdminDashboard = React.lazy(() => import('./pages/admin/Dashboard'));
const AdminUsers = React.lazy(() => import('./pages/admin/Users'));
const AdminUserDetail = React.lazy(() => import('./pages/admin/UserDetail'));
const AdminChannels = React.lazy(() => import('./pages/admin/Channels'));
const AdminChannelCreate = React.lazy(() => import('./pages/admin/ChannelCreate'));
const AdminChannelEdit = React.lazy(() => import('./pages/admin/ChannelEdit'));
const AdminPremiumCodes = React.lazy(() => import('./pages/admin/PremiumCodes'));
const AdminReports = React.lazy(() => import('./pages/admin/Reports'));
const AdminNews = React.lazy(() => import('./pages/admin/News'));
const AdminNewsCreate = React.lazy(() => import('./pages/admin/NewsCreate'));
const AdminNewsEdit = React.lazy(() => import('./pages/admin/NewsEdit'));
const AdminMaintenance = React.lazy(() => import('./pages/admin/Maintenance'));
const AdminBans = React.lazy(() => import('./pages/admin/Bans'));
const AdminSettings = React.lazy(() => import('./pages/admin/Settings'));
const AdminAnnouncement = React.lazy(() => import('./pages/admin/Announcement'));
const AdminAds = React.lazy(() => import('./pages/admin/Ads'));

/**
 * Smart root: if authenticated → Channels, else → Landing (Home)
 */
function RootPage() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LazyLoading />;
  return isAuthenticated ? <Channels /> : <Home />;
}

export default function App() {
  return (
    <Suspense fallback={<LazyLoading />}>
      <Routes>
      {/* ── Public & user routes (with Navbar/Footer) ── */}
      <Route element={<Layout />}>
        {/* Smart root: channels if logged in, landing if not */}
        <Route path="/" element={<RootPage />} />
        
        {/* Landing page — redirects to / if authenticated */}
        <Route element={<GuestRoute />}>
          <Route path="/landing" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Public */}
        <Route path="/cgu" element={<CGU />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/legal" element={<Legal />} />

        {/* Protected – user must be logged in */}
        <Route element={<ProtectedRoute />}>
          {/* /channels rewrites to / */}
          <Route path="/channels" element={<Navigate to="/" replace />} />
          <Route path="/news" element={<NewsList />} />
          <Route path="/news/:id" element={<NewsDetail />} />
          <Route path="/watch/:id" element={<Watch />} />
          <Route path="/profil" element={<Profile />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/reports" element={<Reports />} />
          {/* Premium guard: redirects premium users to / */}
          <Route element={<PremiumGuard />}>
            <Route path="/premium" element={<Premium />} />
          </Route>
        </Route>
      </Route>

      {/* ── System pages (no navbar, guarded) ── */}
      <Route element={<MaintenanceGuard />}>
        <Route path="/maintenance" element={<Maintenance />} />
      </Route>
      <Route element={<BannedGuard />}>
        <Route path="/banned" element={<Banned />} />
      </Route>
      <Route path="/error" element={<ErrorPage />} />

      {/* ── Admin routes (sidebar layout) ── */}
      <Route element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/users/:id" element={<AdminUserDetail />} />
          <Route path="/admin/channels" element={<AdminChannels />} />
          <Route path="/admin/channels/create" element={<AdminChannelCreate />} />
          <Route path="/admin/channels/:id" element={<AdminChannelEdit />} />
          <Route path="/admin/premium-codes" element={<AdminPremiumCodes />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/news" element={<AdminNews />} />
          <Route path="/admin/news/create" element={<AdminNewsCreate />} />
          <Route path="/admin/news/:id" element={<AdminNewsEdit />} />
          <Route path="/admin/maintenance" element={<AdminMaintenance />} />
          <Route path="/admin/bans" element={<AdminBans />} />
          <Route path="/admin/announcement" element={<AdminAnnouncement />} />
          <Route path="/admin/ads" element={<AdminAds />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
        </Route>
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<ErrorPage />} />
    </Routes>
    </Suspense>
  );
}
