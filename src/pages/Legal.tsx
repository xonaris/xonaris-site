import { FileText, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function Legal() {
  useDocumentTitle('Mentions Légales');
  return (
    <div className="w-full min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-10 animate-fade-up">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-navy-400 hover:text-white transition-colors mb-8 group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Retour
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-brand-600/10 rounded-xl flex items-center justify-center border border-brand-500/20">
          <FileText className="w-5 h-5 text-brand-400" />
        </div>
        <h1 className="text-2xl font-display font-bold text-white">Mentions Légales</h1>
      </div>

      <div className="space-y-4">
        <Section title="Éditeur du site">
          <p>
            <strong className="text-white">Xonaris</strong><br />
            Plateforme de streaming TV en direct<br />
            Contact : <a href="https://dsc.gg/xonaris" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 transition-colors">Discord</a>
          </p>
        </Section>

        <Section title="Hébergement">
          <p>
            Le Service est hébergé sur des serveurs situés en Union Européenne.
            Les données sont traitées conformément au Règlement Général sur la Protection des
            Données (RGPD).
          </p>
        </Section>

        <Section title="Propriété intellectuelle">
          <p>
            L'ensemble du contenu de la plateforme Xonaris (textes, graphismes, logos, icônes,
            images, code source) est protégé par le droit d'auteur et le droit de la propriété
            intellectuelle. Toute reproduction, même partielle, est interdite sans autorisation
            préalable.
          </p>
        </Section>

        <Section title="Responsabilité">
          <p>
            Xonaris s'efforce d'assurer l'exactitude des informations diffusées sur la plateforme
            mais ne peut garantir leur exhaustivité ni leur mise à jour en temps réel. Le Service
            ne saurait être tenu responsable des contenus diffusés par les chaînes tierces.
          </p>
        </Section>

        <Section title="Loi applicable">
          <p>
            Les présentes mentions légales sont régies par le droit français. En cas de litige,
            les tribunaux français seront seuls compétents.
          </p>
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