import { Wrench, Tv } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import DiscordIcon from '../components/DiscordIcon';

export default function Maintenance() {
  const { maintenanceReason, bckgrndMaintenance } = useAuth();
  useDocumentTitle('Maintenance en cours');

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden bg-[#080d12]"
      style={bckgrndMaintenance && /^https?:\/\//.test(bckgrndMaintenance) ? { backgroundImage: `url(${bckgrndMaintenance})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
    >
      {/* Dark overlay when background image is set */}
      {bckgrndMaintenance && <div className="absolute inset-0 bg-black/60 z-0" />}
      {/* Background radial glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-amber-500/10 md:bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-[90%] sm:max-w-sm md:max-w-md animate-fade-up flex flex-col items-center">
        {/* Icon */}
        <div className="flex justify-center mb-6 md:mb-8">
          <div className="relative">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-xl shadow-amber-500/5">
              <Wrench className="w-10 h-10 md:w-12 md:h-12 text-amber-400" />
            </div>
            <div className="absolute inset-0 bg-amber-500/20 blur-2xl rounded-full -z-10" />
          </div>
        </div>

        {/* Text */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-display font-black text-white mb-3 tracking-tight">
            Retour bientôt
          </h1>
          <p className="text-navy-300 text-sm md:text-base leading-relaxed">
            La plateforme est temporairement indisponible le temps que nos équipes finalisent une mise à jour.
          </p>
        </div>

        {/* Reason card */}
        {maintenanceReason && (
          <div className="mb-6 md:mb-8 w-full p-4 md:p-5 rounded-2xl bg-amber-500/5 border border-amber-500/15 flex items-start gap-4 text-left">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
              <Wrench className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-400/80 uppercase tracking-wider mb-1">Motif de l'intervention</p>
              <p className="text-sm md:text-base text-white leading-relaxed font-medium">{maintenanceReason}</p>
            </div>
          </div>
        )}

        {/* Action CTAs */}
        <div className="w-full mt-2">
          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-amber-500/40 animate-pulse"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>

          <a
            href="https://dsc.gg/xonaris"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-discord flex items-center justify-center gap-2 w-full py-3 sm:py-3.5 text-sm font-bold shadow-none rounded-xl"
          >
            <DiscordIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0" />
            <span>Suivre sur Discord</span>
          </a>
        </div>
      </div>
    </div>
  );
}
