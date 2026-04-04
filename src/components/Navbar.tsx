import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  User,
  LogOut,
  Shield,
  Crown,
  TvMinimal,
  Newspaper,
  Heart,
  Flag,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on location change
  useEffect(() => {
    setIsOpen(false);
    setIsDropdownOpen(false);
  }, [location]);

  const premiumUntil = user?.premium_expires_at ? new Date(user.premium_expires_at) : null;
  const isPremium = user?.is_premium && premiumUntil && premiumUntil > new Date();

  const navLinks = [
    { name: 'Chaînes', path: '/', icon: TvMinimal },
    { name: 'Nouveautés', path: '/news', icon: Newspaper },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'glass py-3'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to={isAuthenticated ? '/' : '/landing'} className="flex items-center gap-2 sm:gap-3 group">
              <img loading="lazy" src="/branding/xonaris-icon-bg.png" alt="Xonaris" className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl shadow-md group-hover:scale-105 transition-transform duration-300" />
              <span className="font-display font-bold text-lg sm:text-xl tracking-tight block">
                XONARIS
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = link.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(link.path);
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    className={`flex items-center gap-2 text-sm font-medium transition-colors hover:text-white ${
                      isActive ? 'text-white' : 'text-navy-300'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-brand-400' : ''}`} />
                    {link.name}
                  </Link>
                );
              })}
            </div>

            {/* Auth section */}
            <div className="hidden md:flex items-center gap-4">
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-3 p-1.5 pr-4 rounded-full border border-navy-800 hover:bg-white/5 transition-all"
                  >
                    {user?.avatar_discord ? (
                      <img loading="lazy" src={user.avatar_discord} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                    <span className="text-sm font-medium flex items-center gap-1.5">
                      {user?.pseudo}
                      {isPremium && <Crown className="w-4 h-4 text-amber-400" />}
                    </span>
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-3 w-56 card py-2 shadow-2xl animate-fade-scale origin-top-right">

                      <Link
                        to="/profil"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-navy-200 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <User className="w-4 h-4" />
                        Mon compte
                      </Link>

                      <Link
                        to="/favorites"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-navy-200 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <Heart className="w-4 h-4" />
                        Favoris
                      </Link>

                      <Link
                        to="/reports"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-navy-200 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <Flag className="w-4 h-4" />
                        Signalements
                      </Link>

                      {!isPremium && (
                        <Link
                          to="/premium"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-amber-400 hover:bg-amber-400/10 transition-colors"
                        >
                          <Crown className="w-4 h-4" />
                          Devenir Premium
                        </Link>
                      )}

                      {isAdmin && (
                        <Link
                          to="/admin"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-amber-400 hover:bg-amber-400/10 transition-colors"
                        >
                          <Shield className="w-4 h-4" />
                          Administration
                        </Link>
                      )}

                      <button
                        onClick={logout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left mt-1 border-t border-navy-800 pt-3"
                      >
                        <LogOut className="w-4 h-4" />
                        Déconnexion
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    to="/login"
                    className="text-sm font-medium text-navy-200 hover:text-white transition-colors"
                  >
                    Connexion
                  </Link>
                  <Link to="/register" className="btn-primary py-2 px-5 text-sm">
                    S'inscrire
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 text-navy-300 hover:text-white transition-colors"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Navbar Drawer */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-80 glass flex flex-col h-[100dvh] shadow-2xl animate-fade-scale overflow-y-auto pt-24 pb-6 px-4 md:hidden border-l border-white/5">
          <div className="flex-1 flex flex-col gap-1.5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = link.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(link.path);
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`flex items-center gap-4 p-4 rounded-xl ${
                    isActive
                      ? 'bg-brand-500/10 text-brand-400'
                      : 'text-navy-200 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-semibold">{link.name}</span>
                </Link>
              );
            })}
          </div>

          <div className="mt-8 pt-6 border-t border-white/10">
            {isAuthenticated ? (
              <div className="space-y-2">
                <div className="p-4 rounded-xl bg-white/5 mb-4 flex items-center gap-3">
                  {user?.avatar_discord ? (
                    <img loading="lazy" src={user.avatar_discord} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center">
                      <User className="w-5 h-5" />
                    </div>
                  )}
                  <p className="font-bold text-white flex items-center gap-1.5">
                    {user?.pseudo}
                    {isPremium && <Crown className="w-4 h-4 text-amber-400" />}
                  </p>
                </div>

                <Link
                  to="/profil"
                  className="flex items-center gap-4 p-4 rounded-xl text-navy-200 hover:bg-white/5 hover:text-white"
                >
                  <User className="w-5 h-5" />
                  <span className="font-semibold">Mon compte</span>
                </Link>

                <Link
                  to="/favorites"
                  className="flex items-center gap-4 p-4 rounded-xl text-navy-200 hover:bg-white/5 hover:text-white"
                >
                  <Heart className="w-5 h-5" />
                  <span className="font-semibold">Favoris</span>
                </Link>

                <Link
                  to="/reports"
                  className="flex items-center gap-4 p-4 rounded-xl text-navy-200 hover:bg-white/5 hover:text-white"
                >
                  <Flag className="w-5 h-5" />
                  <span className="font-semibold">Signalements</span>
                </Link>

                {!isPremium && (
                  <Link
                    to="/premium"
                    className="flex items-center gap-4 p-4 rounded-xl text-amber-400 hover:bg-amber-400/10 transition-colors"
                  >
                    <Crown className="w-5 h-5" />
                    <span className="font-semibold">Devenir Premium</span>
                  </Link>
                )}

                {isAdmin && (
                  <Link
                    to="/admin"
                    className="flex flex-row items-center gap-3 p-4 rounded-xl text-amber-400 hover:bg-amber-400/10 transition-colors"
                  >
                     <Shield className="w-5 h-5" />
                     Administration
                  </Link>
                )}

                <button
                  onClick={logout}
                  className="w-full flex items-center gap-4 p-4 rounded-xl text-red-400 hover:bg-red-500/10"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-semibold">Déconnexion</span>
                </button>
              </div>
            ) : (
               <div className="flex flex-col gap-3">
                 <Link to="/login" className="btn-secondary w-full">
                   Connexion
                 </Link>
                 <Link to="/register" className="btn-primary w-full">
                   S'inscrire
                 </Link>
               </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
