import { Link } from 'react-router-dom';
import { Tv, Heart, Users, Shield } from 'lucide-react';
import DiscordIcon from './DiscordIcon';

export default function Footer() {
  return (
    <footer className="relative border-t border-navy-800/40 bg-navy-950">
      {/* Subtle top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* Brand */}
          <div className="lg:col-span-4">
            <div className="flex items-center gap-2.5 mb-4">
              <img loading="lazy" src="/branding/xonaris-icon-bg.png" alt="Xonaris Logo" className="w-8 h-8 rounded-lg shadow-lg" />
              <span className="font-display text-lg font-bold">
                <span className="text-white">Xonaris</span>
              </span>
            </div>
            <p className="text-sm text-navy-400 leading-relaxed mb-4">
              Votre plateforme de streaming TV en direct. Profitez de centaines de chaînes gratuitement, 24h/24.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href="https://dsc.gg/xonaris"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-[#5865F2]/10 hover:bg-[#5865F2]/20 flex items-center justify-center text-[#5865F2] hover:scale-105 transition-all"
                aria-label="Rejoindre sur Discord"
              >
                <DiscordIcon className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div className="lg:col-span-2">
            <h4 className="text-xs font-semibold text-navy-300 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Tv className="w-3 h-3" /> Navigation
            </h4>
            <ul className="space-y-2.5">
              <FooterLink to="/" label="Accueil" />
              <FooterLink to="/" label="Chaînes TV" />
              <FooterLink to="/news" label="Actualités" />
              <FooterLink to="/premium" label="Premium" />
            </ul>
          </div>

          {/* Legal */}
          <div className="lg:col-span-3">
            <h4 className="text-xs font-semibold text-navy-300 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Shield className="w-3 h-3" /> Légal
            </h4>
            <ul className="space-y-2.5">
              <FooterLink to="/cgu" label="Conditions d'utilisation" />
              <FooterLink to="/privacy" label="Politique de confidentialité" />
              <FooterLink to="/legal" label="Mentions légales" />
            </ul>
          </div>

          {/* Community */}
          <div className="lg:col-span-3">
            <h4 className="text-xs font-semibold text-navy-300 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Users className="w-3 h-3" /> Communauté
            </h4>
            <p className="text-sm text-navy-400 mb-3 leading-relaxed">Rejoignez notre communauté Discord pour rester informé des nouveautés.</p>
            <a
              href="https://dsc.gg/xonaris"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#5865F2]/10 text-[#5865F2] text-sm font-medium hover:bg-[#5865F2]/20 border border-[#5865F2]/20 hover:-translate-y-0.5 transition-all shadow-sm"
            >
              <DiscordIcon className="w-4 h-4" />
              Rejoindre Discord
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-navy-800/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-navy-600">© {new Date().getFullYear()} Xonaris. Tous droits réservés.</p>
          <p className="text-xs text-navy-600 flex items-center gap-1.5">
            Fait avec <Heart className="w-3 h-3 text-red-500 fill-red-500" /> par l'équipe Xonaris
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ to, label }: { to: string; label: string }) {
  return (
    <li>
      <Link
        to={to}
        className="text-sm text-navy-400 hover:text-navy-200 transition-colors duration-200"
      >
        {label}
      </Link>
    </li>
  );
}
