import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import AnnouncementBanner from './AnnouncementBanner';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const location = useLocation();
  const { isAuthenticated, refresh } = useAuth();

  // Re-check ban/maintenance status on every page navigation
  useEffect(() => {
    refresh();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLandingPage = (location.pathname === '/' || location.pathname === '/landing') && !isAuthenticated;

  return (
    <div className={`relative min-h-[100dvh] flex flex-col bg-navy-950 overflow-x-hidden selection:bg-brand-500/30 selection:text-white antialiased ${isLandingPage ? 'h-screen overflow-hidden' : ''}`}>
      {!isLandingPage && <Navbar />}
      {!isLandingPage && <div className="pt-[72px]"><AnnouncementBanner /></div>}
      <main className="flex-1 w-full flex flex-col relative z-10">
        <Outlet />
      </main>
      {!isLandingPage && <Footer />}
    </div>
  );
}
