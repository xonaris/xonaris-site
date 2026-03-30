import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../api';
import { fmtDate, fmtDateTimeLong, fmtDateLong } from '../common/utils/date';
import { Link, useSearchParams } from 'react-router-dom';
import {
  User, Crown, Copy, Check, Shield, Link as LinkIcon,
  Heart, AlertTriangle, Users, Calendar, Settings, CheckCircle,
} from 'lucide-react';
import DiscordIcon from '../components/DiscordIcon';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function Profile() {
  const { user } = useAuth();
  useDocumentTitle('Mon profil');
  const [searchParams, setSearchParams] = useSearchParams();
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [syncToast, setSyncToast] = useState('');

  useEffect(() => {
    if (searchParams.get('synced') === 'true') {
      setSyncToast('Discord synchronisé avec succès !');
      setSearchParams({}, { replace: true });
      setTimeout(() => setSyncToast(''), 5000);
    } else if (searchParams.get('sync_error') === 'true') {
      const errorCode = searchParams.get('error');
      const safeMessages: Record<string, string> = {
        discord_already_linked: 'Ce compte Discord est déjà lié à un autre compte.',
        discord_not_linked: "Ce compte Discord n'est lié à aucun compte Xonaris.",
        oauth_failed: 'Erreur lors de la synchronisation Discord.',
        unknown: 'Erreur lors de la synchronisation Discord.',
      };
      setSyncToast(safeMessages[errorCode ?? 'unknown'] || safeMessages.unknown);
      setSearchParams({}, { replace: true });
      setTimeout(() => setSyncToast(''), 8000);
    }
  }, []);

  useEffect(() => {
    if (user) {
      setReferralCode(user.referral_code || '');
    }
  }, [user]);

  const referralLink = referralCode ? `${window.location.origin}/register?ref=${referralCode}` : '';
  
  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSyncDiscord = () => {
    window.location.href = userApi.getDiscordSyncUrl();
  };

  if (!user) return null;

  const premiumUntil = user.premium_expires_at ? new Date(user.premium_expires_at) : null;
  const isPremium = premiumUntil && premiumUntil > new Date();

  return (
    <div className="w-full min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-12 animate-fade-up">
      {/* Sync toast */}
      {syncToast && !syncToast.startsWith('Erreur') && (
        <div className="fixed top-4 right-4 z-50 card p-3 border border-brand-500/30 bg-brand-500/10 flex items-center gap-2 text-sm text-brand-300 animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="w-4 h-4" /> {syncToast}
        </div>
      )}
      {syncToast && syncToast.startsWith('Erreur') && (
        <div className="fixed top-4 right-4 z-50 card p-3 border border-red-500/30 bg-red-500/10 flex items-center gap-2 text-sm text-red-400 animate-in fade-in slide-in-from-top-2 max-w-md">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {syncToast}
        </div>
      )}

      {/* Header Profile Section */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-5 sm:gap-6 mb-4">
            <div className="relative shrink-0">
              {isPremium && (
                <div className="absolute -inset-1.5 rounded-full bg-amber-500/20 blur-md"></div>
              )}
              {user.avatar_discord ? (
                <img loading="lazy"
                  src={user.avatar_discord}
                  alt="Avatar"
                  className={`relative w-20 h-20 sm:w-24 sm:h-24 object-cover shadow-lg ${isPremium ? 'rounded-full border-2 border-amber-400' : 'rounded-[1.5rem] border border-white/10'}`}
                />
              ) : (
                <div className={`relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center shadow-lg ${isPremium ? 'rounded-full bg-amber-500/10 border-2 border-amber-400' : 'bg-brand-500/10 rounded-[1.5rem] border border-brand-500/20'}`}>
                  <User className={`w-10 h-10 ${isPremium ? 'text-amber-400' : 'text-brand-400'}`} />
                </div>
              )}
              {isPremium && (
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center border-2 border-[#0b1219] text-white shadow-xl">
                  <Crown className="w-4 h-4" />
                </div>
              )}
            </div>
            
            <div className="text-center sm:text-left">
              <h1 className="font-display text-3xl sm:text-4xl font-black text-white tracking-tight flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3">
                {user.pseudo}
                {user.role === 'ADMIN' && (
                  <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-brand-400 inline-block" />
                )}
              </h1>
              <p className="text-navy-300 font-medium text-lg mt-1 mb-3">
                Vue d'ensemble de votre compte
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                {user.role === 'ADMIN' && (
                  <span className="px-2.5 py-1 bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-bold uppercase tracking-wider rounded-lg">
                    Admin
                  </span>
                )}
                {isPremium ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider rounded-lg">
                    <Crown className="w-3.5 h-3.5" /> Premium
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-white/5 border border-white/10 text-navy-200 text-xs font-bold uppercase tracking-wider rounded-lg">
                    Membre
                  </span>
                )}
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 border border-white/5 text-navy-300 text-xs font-medium rounded-lg">
                  <Calendar className="w-3.5 h-3.5" />
                  Inscrit le {fmtDate(user.created_at)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 w-full md:w-auto">
          <button
            onClick={handleSyncDiscord}
            className="w-full md:w-auto card py-3.5 px-5 border-[#5865F2]/30 bg-[#5865F2]/10 hover:bg-[#5865F2]/20 text-[#5865F2] font-bold flex items-center justify-center gap-2.5 transition-colors shadow-none"
          >
            <DiscordIcon className="w-5 h-5" />
            <span>{user.avatar_discord ? 'Resynchroniser Discord' : 'Lier mon Discord'}</span>
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <a
          href="https://dsc.gg/xonaris"
          target="_blank"
          rel="noopener noreferrer"
          className="card p-5 border-[#5865F2]/30 bg-[#5865F2]/5 hover:bg-[#5865F2]/10 transition-colors flex items-center gap-4 group cursor-pointer"
        >
          <div className="p-3.5 rounded-xl bg-[#5865F2]/20 border border-[#5865F2]/30 shrink-0 text-[#5865F2] flex items-center justify-center group-hover:scale-105 transition-transform">
            <DiscordIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-white font-bold group-hover:text-[#5865F2] transition-colors leading-tight">Rejoindre Discord</p>
            <p className="text-[#5865F2] font-bold text-xs uppercase tracking-wider mt-0.5">Communauté</p>
          </div>
        </a>
        {[
          { label: 'Mes favoris', value: user.favorites_count, colorClass: 'text-red-400', icon: Heart, bgClass: 'bg-red-500/10 border-red-500/20' },
          { label: 'Signalements', value: user.reports_count, colorClass: 'text-amber-400', icon: AlertTriangle, bgClass: 'bg-amber-500/10 border-amber-500/20' },
          { label: 'Filleuls', value: user.referral_count, colorClass: 'text-brand-400', icon: Users, bgClass: 'bg-brand-500/10 border-brand-500/20' },
        ].map((stat, i) => (
          <div key={i} className="card p-5 border-navy-800 bg-white/[0.02] flex items-center gap-4">
            <div className={`p-3.5 rounded-xl border shrink-0 flex items-center justify-center ${stat.bgClass}`}>
              <stat.icon className={`w-5 h-5 ${stat.colorClass}`} />
            </div>
            <div>
              <p className={`text-2xl font-black leading-none ${stat.colorClass}`}>{stat.value}</p>
              <p className="text-xs text-navy-400 font-bold uppercase tracking-wider mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Panes */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 border border-navy-800 bg-white/[0.02] rounded-2xl p-4 sm:p-8 self-start card">
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Settings className="w-5 h-5 text-navy-400" /> Informations privées
          </h2>
          <div className="space-y-5">
            <div>
              <p className="text-xs font-bold text-navy-400 uppercase tracking-widest mb-2">ID Compte</p>
              <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-3.5 rounded-xl bg-black/40 border border-white/5 text-navy-200 font-mono text-xs sm:text-sm">
                <User className="w-4 h-4 text-navy-500 shrink-0" />
                <span className="truncate">{user.id}</span>
              </div>
            </div>
            {user.last_login_at && (
              <div className="pt-4 mt-4 border-t border-white/5">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-navy-400 uppercase tracking-widest">Dernière connexion</span>
                  <span className="text-sm font-medium text-navy-100 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-400"></div>
                    {fmtDateTimeLong(user.last_login_at)}
                  </span>
                </div>
              </div>
            )}
            <div className="pt-4 mt-4 border-t border-white/5">
              <div className="flex flex-col gap-1.5">
                 <span className="text-xs font-bold text-navy-400 uppercase tracking-widest">Statut Discord</span>
                 {user.avatar_discord ? (
                   <span className="text-sm font-medium text-[#5865F2] flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Compte lié
                   </span>
                 ) : (
                   <span className="text-sm font-medium text-navy-300 flex items-center gap-2">
                      Non lié
                   </span>
                 )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-2 space-y-6">
          <div className="border border-navy-800 bg-white/[0.02] rounded-2xl p-4 sm:p-8 card relative overflow-hidden">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2 relative z-10">
              <Crown className="w-5 h-5 text-amber-400" /> Abonnement Xonaris
            </h2>
            {isPremium ? (
              <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 p-6 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <Crown className="w-7 h-7 text-amber-400" />
                </div>
                <div className="flex-1 text-center sm:text-left mt-4 sm:mt-0">
                  <h3 className="text-xl font-bold text-white mb-1 flex items-center justify-center sm:justify-start gap-2">
                    Premium Actif
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                    </span>
                  </h3>
                  <p className="text-navy-300 text-sm sm:text-base">
                    Merci pour votre soutien. Vous profitez d'une expérience sans limites.
                  </p>
                  <p className="text-sm font-bold text-amber-400 mt-2">
                    Fin de l'abonnement : {fmtDateLong(premiumUntil!)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6 p-6 rounded-xl bg-black/20 border border-white/5">
                <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                  <Crown className="w-7 h-7 text-navy-400" />
                </div>
                <div className="flex-1 text-center sm:text-left mt-4 sm:mt-0">
                  <h3 className="text-xl font-bold text-white mb-1">Plan Gratuit</h3>
                  <p className="text-navy-300 text-sm sm:text-base">
                    Passez Premium pour débloquer la qualité maximale et retirer les publicités.
                  </p>
                </div>
                <Link to="/premium" className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold transition-colors flex justify-center items-center gap-2 shrink-0">
                  Découvrir Premium <Crown className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>

          <div className="border border-navy-800 bg-white/[0.02] rounded-2xl p-4 sm:p-8 card">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-brand-400" /> Mon Parrainage
            </h2>
            <p className="text-navy-300 mb-6 text-sm sm:text-base leading-relaxed">
              Partagez votre lien exclusif avec vos amis. 
              Des récompenses exclusives arriveront très bientôt pour les parrains !
            </p>
            {referralLink ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 sm:py-3.5 rounded-xl bg-black/40 border border-white/5 focus-within:border-brand-500/50 transition-colors overflow-hidden">
                  <LinkIcon className="w-5 h-5 text-brand-500 shrink-0" />
                  <input
                    readOnly
                    value={referralLink}
                    className="bg-transparent text-sm text-navy-100 outline-none w-full font-mono font-medium truncate"
                  />
                </div>
                <button
                  onClick={copyLink}
                  className={`w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 border ${
                    copied
                      ? 'bg-brand-500/20 text-brand-400 border-brand-500/30'
                      : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                  }`}
                >
                  {copied ? (
                    <><Check className="w-5 h-5" /> Lien copié</>
                  ) : (
                    <><Copy className="w-5 h-5" /> Copier le lien</>
                  )}
                </button>
              </div>
            ) : (
              <div className="p-5 rounded-xl border border-dashed border-white/10 bg-white/5 text-center sm:text-left">
                <p className="text-navy-400 font-medium">Programme non disponible pour l'instant.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
