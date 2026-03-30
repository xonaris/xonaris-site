import { ShieldBan, Tv, RefreshCw, AlertOctagon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import DiscordIcon from '../components/DiscordIcon';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Banned() {
  const { banReason, refresh, bckgrndBanned } = useAuth();
  const [checking, setChecking] = useState(false);
  const navigate = useNavigate();
  useDocumentTitle('Compte banni');

  // Auto-check every 60s — navigate as soon as ban is lifted
  useEffect(() => {
    const interval = setInterval(async () => {
      const result = await refresh();
      if (!result.isBanned) {
        navigate('/profil', { replace: true });
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [refresh, navigate]);

  const handleCheck = async () => {
    setChecking(true);
    const result = await refresh();
    setChecking(false);
    if (!result.isBanned) {
      navigate('/profil', { replace: true });
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden bg-[#080d12]"
      style={bckgrndBanned ? { backgroundImage: `url(${bckgrndBanned})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
    >
      {/* Dark overlay when background image is set */}
      {bckgrndBanned && <div className="absolute inset-0 bg-black/60 z-0" />}
      {/* Background radial glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute font-display top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-red-500/10 md:bg-red-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-[90%] sm:max-w-sm md:max-w-md animate-fade-up flex flex-col items-center">
        {/* Icon */}
        <div className="flex justify-center mb-6 md:mb-8">
          <div className="relative">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shadow-xl shadow-red-500/5">
              <AlertOctagon className="w-10 h-10 md:w-12 md:h-12 text-red-400" />
            </div>
            <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full -z-10" />
          </div>
        </div>

        {/* Text */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-display font-black text-white mb-3 tracking-tight">
            Compte banni
          </h1>
          <p className="text-navy-300 text-sm md:text-base leading-relaxed">
            Votre accès à la plateforme a été suspendu pour non-respect de nos règles.
          </p>
        </div>

        {/* Reason card */}
        {banReason && (
          <div className="mb-6 md:mb-8 w-full p-4 md:p-5 rounded-2xl bg-red-500/5 border border-red-500/15 flex items-start gap-4 text-left">
            <div className="w-8 h-8 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldBan className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-red-400/80 uppercase tracking-wider mb-1">Motif de la sanction</p>
              <p className="text-sm md:text-base text-white leading-relaxed font-medium">{banReason}</p>
            </div>
          </div>
        )}

        {/* Actions CTAs */}
        <div className="w-full flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleCheck}
            disabled={checking}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-sm font-bold text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Vérification...' : 'Vérifier mon statut'}</span>
          </button>

          <a
            href="https://dsc.gg/xonaris"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 btn-discord flex items-center justify-center gap-2 px-4 py-3 sm:py-3.5 text-sm font-bold shadow-none rounded-xl"
          >
            <DiscordIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0" />
            <span>Contacter le support</span>
          </a>
        </div>
      </div>
    </div>
  );
}