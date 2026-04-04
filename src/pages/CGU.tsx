import { Scale, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function CGU() {
  useDocumentTitle("Conditions Générales d'Utilisation");
  return (
    <div className="w-full min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-10 animate-fade-up">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-navy-400 hover:text-white transition-colors mb-8 group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Retour
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-brand-600/10 rounded-xl flex items-center justify-center border border-brand-500/20">
          <Scale className="w-5 h-5 text-brand-400" />
        </div>
        <h1 className="text-2xl font-display font-bold text-white">Conditions Générales d'Utilisation</h1>
      </div>

      <div className="space-y-4">
        <Section title="1. Objet">
          Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») régissent l'accès et
          l'utilisation de la plateforme Xonaris (ci-après « le Service »). En accédant au Service,
          vous acceptez sans réserve les présentes CGU.
        </Section>

        <Section title="2. Accès au Service">
          L'accès au Service nécessite la création d'un compte via l'authentification Discord.
          L'utilisateur s'engage à fournir des informations exactes et à maintenir la confidentialité
          de ses identifiants. Chaque utilisateur ne peut posséder qu'un seul compte.
        </Section>

        <Section title="3. Utilisation du Service">
          Le Service permet de regarder des chaînes TV en streaming. L'utilisateur s'engage à :
          <ul className="list-disc pl-5 mt-2 space-y-1 text-navy-300 text-sm">
            <li>Ne pas utiliser le Service à des fins illicites</li>
            <li>Ne pas tenter de contourner les mesures de sécurité</li>
            <li>Ne pas redistribuer les contenus diffusés</li>
            <li>Respecter les autres utilisateurs de la plateforme</li>
            <li>Ne pas utiliser de pseudo offensant ou usurpant une identité</li>
          </ul>
        </Section>

        <Section title="4. Compte Premium">
          Le Service propose une offre Premium activable par code, offrant des fonctionnalités
          supplémentaires. Les codes Premium sont à usage unique, nominatifs et non remboursables.
          La durée du Premium est définie par chaque code.
        </Section>

        <Section title="5. Modération">
          L'équipe Xonaris se réserve le droit de suspendre ou bannir tout compte en cas de
          non-respect des présentes CGU, sans préavis ni indemnité. Les motifs de bannissement
          incluent, sans s'y limiter : abus, spam, contenu illicite, partage de compte.
        </Section>

        <Section title="6. Propriété intellectuelle">
          L'ensemble des éléments composant le Service (design, logo, code) sont la propriété
          exclusive de Xonaris. Toute reproduction est strictement interdite sans autorisation
          préalable.
        </Section>

        <Section title="7. Limitation de responsabilité">
          Le Service est fourni « en l'état ». Xonaris ne garantit pas la disponibilité continue du
          Service ni l'absence d'erreurs. Xonaris ne saurait être tenu responsable des dommages
          directs ou indirects liés à l'utilisation du Service.
        </Section>

        <Section title="8. Modification des CGU">
          Xonaris se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs
          seront informés des modifications par le biais de la plateforme. L'utilisation continue du
          Service après modification vaut acceptation.
        </Section>

        <p className="text-xs text-navy-600 pt-4 border-t border-navy-800/50">
          Dernière mise à jour : mars 2026
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5 sm:p-6 hover:border-navy-700/60 transition-colors">
      <h2 className="text-base font-semibold text-white mb-2.5">{title}</h2>
      <div className="text-sm text-navy-300 leading-relaxed">{children}</div>
    </div>
  );
}