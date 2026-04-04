import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { premiumApi } from '../api';
import { useAuth } from '../context/AuthContext';
import {
  Crown, Gift, Zap, Heart, Headphones,
  X, Tv, Lock, CreditCard, Ticket,
  ArrowRight, CheckCircle2, Monitor,
} from 'lucide-react';
import DiscordIcon from '../components/DiscordIcon';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import Confetti from 'react-confetti';

type ModalStep = 'none' | 'offer' | 'redeem';

export default function Premium() {
  const { user, refresh, premiumPrice } = useAuth();
  const navigate = useNavigate();
  useDocumentTitle('Premium - Xonaris');

  const [modalStep, setModalStep] = useState<ModalStep>('none');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Confetti dimensions
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  const isPremium = user?.is_premium;

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /** Navigate to a page after refreshing user data */
  const goAfterRefresh = useCallback(async (path: string) => {
    await refresh();
    navigate(path);
  }, [refresh, navigate]);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !user) return;

    setLoading(true);
    setError('');
    try {
      await premiumApi.redeem(code.trim());
      setSuccess(true);
      setCode('');
      // Ne pas appeler refresh() immédiatement, pour éviter le rechargement de states et préserver le DOM !
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Code invalide ou déjà utilisé.');
    } finally {
      setLoading(false);
    }
  };

  const benefits = [
    { icon: Tv, label: 'Catalogue TV Complet', desc: 'Débloquez toutes les chaînes et matchs en direct restreints.' },
    { icon: Zap, label: 'Zéro Publicité', desc: 'Profitez de vos programmes sans aucune interruption publicitaire.' },
    { icon: Monitor, label: 'Qualité 4K / 60FPS', desc: 'Une fluidité incroyable et une résolution maximale garantie.' },
    { icon: Heart, label: 'Favoris Illimités', desc: 'Sauvegardez autant de chaînes que vous le souhaitez dans votre profil.' },
    { icon: Crown, label: 'Badge Premium', desc: 'Obtenez un badge doré exclusif sur votre profil et le chat.' },
    { icon: Headphones, label: 'Support Prioritaire', desc: 'Vos tickets pris en charge en moins de 15 minutes.' },
  ];

  return (
    <div className="min-h-screen pt-20 sm:pt-24 pb-16 sm:pb-20 relative overflow-hidden bg-navy-950">
      
      {/* Background harmonisé avec le reste du site */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Hero Central */}
        <div className="mb-12 sm:mb-20 animate-fade-down pt-6 sm:pt-10">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-3xl flex items-center justify-center mb-8 shadow-lg shadow-amber-500/20 rotate-3">
            <Crown className="w-10 h-10 text-[#050505] drop-shadow-sm" />
          </div>
          
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white mb-6 drop-shadow-sm tracking-tight">
            Passez au niveau <span className="text-amber-400">supérieur</span>.
          </h1>
          <p className="text-lg md:text-xl text-navy-300 font-medium leading-relaxed mb-4">
            Profitez du catalogue intégral en direct, sans coupure, en 4K.  
            <br className="hidden md:block"/> Une expérience télévisuelle sans aucune limite.
          </p>
        </div>

        {/* Card Horizontale Principale */}
        <div className="w-full mb-12 sm:mb-20 animate-fade-up">
          <div className="glass rounded-3xl border border-white/5 overflow-hidden flex flex-col md:flex-row relative shadow-xl">
            
            {/* Liseré brillance */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
            
            <div className="p-6 sm:p-8 md:p-12 md:w-[60%] flex flex-col justify-start">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-widest mb-6 w-fit">
                Offre Unique
              </div>
              
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-4">Abonnement Premium</h2>
              <p className="text-navy-300 mb-8 font-medium">Tout le sport, les films et documentaires, où que vous soyez et sans aucune concession.</p>
              
              <div className="grid sm:grid-cols-2 gap-y-4 gap-x-6 mb-8">
                {[
                  'Accès catalogue intégral',
                  'Qualité Ultra HD 4K / 60FPS',
                  'Zéro publicité',
                  'Support technique h24'
                ].map((txt, i) => (
                  <div key={i} className="flex items-center gap-3 text-white font-medium">
                    <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" />
                    <span className="text-sm md:text-base">{txt}</span>
                  </div>
                ))}
              </div>

              {!user ? (
                <Link to="/login" className="btn-premium w-full sm:w-auto py-4 px-8 text-lg font-bold shadow-lg shadow-amber-500/20 inline-flex items-center justify-center gap-2">
                  <Lock className="w-5 h-5" />
                  Connectez-vous pour commencer
                </Link>
              ) : isPremium && !success ? (
                <div className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl font-bold">
                  <Crown className="w-5 h-5" />
                  Vous êtes déjà Membre Premium
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:gap-4">
                  <button onClick={() => setModalStep('offer')} className="btn-premium py-4 px-8 text-lg font-bold shadow-lg shadow-amber-500/20 flex-1 flex items-center justify-center gap-2">
                    <Crown className="w-5 h-5" />
                    Obtenir un code
                  </button>
                  <button onClick={() => setModalStep('redeem')} className="btn-secondary py-4 px-8 text-lg font-bold flex items-center justify-center gap-2">
                    <Ticket className="w-5 h-5" />
                    J'ai déjà un code
                  </button>
                </div>
              )}
            </div>

            {/* Block Prix (droite) */}
            <div className="bg-gradient-to-br from-navy-900 to-navy-950 p-8 md:p-12 md:w-[40%] flex flex-col justify-start items-center border-t md:border-t-0 md:border-l border-white/5 relative">
              <p className="text-navy-300 font-medium mb-2 uppercase tracking-wide text-sm">À partir de</p>
              <div className="text-5xl md:text-7xl font-black text-white mb-2 flex items-end justify-center">{premiumPrice ?? '3,99'}<span className="text-3xl text-amber-500 ml-1">€</span>
              </div>
              <p className="text-navy-400 font-medium mb-6">/ mois en abonnement</p>
              
              <p className="text-xs text-navy-400 max-w-[200px] leading-relaxed">
                Paiement unique ou récurrent sécurisé. Résiliable à tout moment depuis le serveur Discord.
              </p>
            </div>
            
          </div>
        </div>

        {/* Grille des Avantages Modernisée */}
        <div className="animate-fade-up" style={{ animationDelay: '0.2s' }}>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((b, i) => (
              <div key={i} className="group p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-amber-500/[0.02] hover:border-amber-500/20 transition-all duration-500">
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-amber-500/10 group-hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all duration-300">
                  <b.icon className="w-7 h-7 text-navy-300 group-hover:text-amber-400 transition-colors" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{b.label}</h3>
                <p className="text-navy-300 leading-relaxed font-medium">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── MODALS (OFFER & REDEEM) ── */}

      {/* Modal Achat (Offer) */}
      {modalStep === 'offer' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setModalStep('none')} />
          <div className="relative w-full max-w-xl card bg-navy-950 p-6 md:p-10 border-amber-500/40 shadow-2xl animate-fade-scale overflow-y-auto max-h-[90vh]">
            <button onClick={() => setModalStep('none')} className="absolute top-4 right-4 p-2.5 rounded-full text-navy-400 bg-white/5 hover:text-white hover:bg-white/10 transition-colors">
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-amber-500/20">
                <Crown className="w-8 h-8 text-amber-400" />
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-black text-white mb-2 sm:mb-3">Obtenir un Code</h2>
              <p className="text-navy-300 font-medium text-lg">La procédure d'achat se déroule exclusivement sur notre Discord officiel pour garantir la sécurité.</p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex gap-4 p-5 rounded-2xl bg-[#5865F2]/10 border border-[#5865F2]/20 items-center">
                <div className="w-12 h-12 shrink-0 bg-[#5865F2] rounded-xl flex items-center justify-center text-white">
                  <DiscordIcon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-white text-lg">1. Rejoindre Discord</h4>
                  <p className="text-xs sm:text-sm text-navy-200">Rendez-vous sur notre serveur exclusif.</p>
                </div>
                <a href="https://dsc.gg/xonaris" target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold transition-colors">
                  Rejoindre
                </a>
              </div>

              <div className="flex gap-4 p-5 rounded-2xl bg-white/[0.03] border border-white/5 items-center">
                <div className="w-12 h-12 shrink-0 bg-white/10 rounded-xl flex items-center justify-center text-white">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-white text-lg">2. Ouvrir un ticket</h4>
                  <p className="text-xs sm:text-sm text-navy-200">Effectuez le paiement via le bot dédié au shop.</p>
                </div>
              </div>
            </div>

            <button onClick={() => setModalStep('redeem')} className="btn-premium w-full py-4 text-lg flex items-center justify-center gap-2">
              <Ticket className="w-5 h-5" />
              J'ai reçu mon code, l'activer
            </button>
          </div>
        </div>
      )}

      {/* Modal RedéMption ou SUCCES */}
      {modalStep === 'redeem' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          
          {success ? (
            /* Animation Confetti légère */
            <Confetti width={windowSize.width} height={windowSize.height} gravity={0.3} numberOfPieces={200} recycle={false} />
          ) : null}
          
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !success && setModalStep('none')} />
          
          <div className={`relative w-full max-w-md card bg-navy-950 p-5 sm:p-6 md:p-10 shadow-2xl animate-fade-scale ${success ? 'border-amber-400' : 'border-amber-500/40'}`}>
            
            {!success && (
              <>
                <button onClick={() => setModalStep('offer')} className="absolute top-4 left-4 p-2.5 rounded-full text-navy-400 bg-white/5 hover:text-white hover:bg-white/10 transition-colors">
                  <ArrowRight className="w-5 h-5 rotate-180" />
                </button>
                <button onClick={() => setModalStep('none')} className="absolute top-4 right-4 p-2.5 rounded-full text-navy-400 bg-white/5 hover:text-white hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </>
            )}

            {success ? (
              /* ÉCRAN DE SUCCÈS - MAGNIFIQUE ET SANS REDIRECTION BRUTALE */
              <div className="text-center py-4">
                <div className="relative w-32 h-32 mx-auto mb-8">
                  <div className="absolute inset-0 bg-amber-500 rounded-full animate-ping opacity-20" style={{ animationDuration: '3s' }} />
                  <div className="relative w-32 h-32 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(245,158,11,0.6)]">
                    <Crown className="w-16 h-16 text-white drop-shadow-md" />
                  </div>
                </div>

                <h2 className="font-display text-3xl sm:text-4xl font-black text-white mb-2 sm:mb-4">
                  Bienvenue <span className="text-amber-400">Premium</span>
                </h2>
                
                <p className="text-navy-200 text-lg font-medium mb-10 pb-6 border-b border-white/5">
                  Votre abonnement a été activé avec succès !<br/> 
                  Tout le contenu est désormais débloqué.
                </p>

                <div className="flex flex-col gap-3 sm:gap-4">
                  <button onClick={() => goAfterRefresh('/')} className="btn-primary flex-1 py-4 text-lg flex items-center justify-center gap-2">
                    <Tv className="w-5 h-5" />
                    Regarder la TV
                  </button>
                  <button onClick={() => goAfterRefresh('/profil')} className="btn-secondary flex-1 py-4 text-lg flex items-center justify-center gap-2">
                    Mon Profil
                  </button>
                </div>
              </div>
            ) : (
              /* FORMULAIRE ACTIVATION */
              <div className="text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-amber-500/20 shadow-inner">
                  <Gift className="w-10 h-10 text-amber-400" />
                </div>
                
                <h2 className="font-display text-2xl sm:text-3xl font-black text-white mb-2 sm:mb-3">
                  Activer un code
                </h2>
                <p className="text-navy-300 mb-10 text-lg font-medium">
                  Saisissez la clé Premium reçue lors de votre achat.
                </p>

                <form onSubmit={handleRedeem} className="space-y-6">
                  <div className="relative">
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="XXXX-XXXX-XXXX-XXXX"
                      className="w-full bg-navy-900/50 hover:bg-navy-900 border border-white/10 focus:border-amber-500/50 rounded-2xl font-mono tracking-widest text-center text-xl sm:text-2xl py-5 text-white placeholder:text-navy-700 outline-none transition-all focus:bg-navy-900 focus:shadow-[0_0_30px_rgba(245,158,11,0.15)] uppercase"
                      maxLength={30}
                      autoFocus
                    />
                  </div>

                  {error && (
                    <div className="px-5 py-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm font-medium text-red-500 flex items-center justify-center gap-2 animate-fade-up">
                      <X className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !code.trim()}
                    className="btn-premium w-full py-5 text-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed group flex items-center justify-center gap-3"
                  >
                    {loading ? (
                      <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Crown className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        Activer instantanément
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
