import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function Privacy() {
  useDocumentTitle('Politique de Confidentialité');
  return (
    <div className="w-full min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-10 animate-fade-up">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-navy-400 hover:text-white transition-colors mb-8 group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Retour
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-brand-600/10 rounded-xl flex items-center justify-center border border-brand-500/20">
          <ShieldCheck className="w-5 h-5 text-brand-400" />
        </div>
        <h1 className="text-2xl font-display font-bold text-white">Politique de Confidentialité</h1>
      </div>

      <div className="space-y-4">
        <Section title="1. Données collectées">
          Lors de votre inscription et utilisation du Service, nous collectons :
          <ul className="list-disc pl-5 mt-2 space-y-1 text-navy-300 text-sm">
            <li>Identifiant et pseudo Discord (via OAuth2)</li>
            <li>Avatar Discord</li>
            <li>Adresse IP (chiffrée et stockée de manière sécurisée)</li>
            <li>Agent utilisateur du navigateur</li>
            <li>Date et heure de connexion</li>
            <li>Historique de visionnage (chaînes regardées)</li>
          </ul>
        </Section>

        <Section title="2. Finalité du traitement">
          Les données collectées sont utilisées pour :
          <ul className="list-disc pl-5 mt-2 space-y-1 text-navy-300 text-sm">
            <li>Fournir et personnaliser le Service</li>
            <li>Gérer votre compte et vos préférences</li>
            <li>Assurer la sécurité et prévenir les abus</li>
            <li>Améliorer l'expérience utilisateur</li>
            <li>Répondre à vos demandes de support</li>
          </ul>
        </Section>

        <Section title="3. Durée de conservation">
          Les données de votre compte sont conservées tant que votre compte est actif. En cas de
          suppression de compte, vos données personnelles sont supprimées dans un délai de 30 jours.
          Les journaux de connexion sont conservés 12 mois maximum.
        </Section>

        <Section title="4. Sécurité des données">
          Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles pour
          protéger vos données : chiffrement AES-256 des adresses IP, chiffrement des communications
          (HTTPS/TLS), authentification par tokens JWT sécurisés, contrôle d'accès strict.
        </Section>

        <Section title="5. Partage des données">
          Vos données personnelles ne sont jamais vendues ni partagées avec des tiers à des fins
          commerciales. Elles peuvent être communiquées uniquement sur réquisition judiciaire.
        </Section>

        <Section title="6. Vos droits">
          Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, de suppression
          et de portabilité de vos données. Pour exercer ces droits, contactez-nous via Discord.
        </Section>

        <Section title="7. Cookies">
          Le Service utilise un cookie technique unique (`xonaris_token`) nécessaire à
          l'authentification. Ce cookie est de type httpOnly et sécurisé. Aucun cookie publicitaire
          ou de traçage n'est utilisé.
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