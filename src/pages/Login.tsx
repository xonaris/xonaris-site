import { useAuth } from '../context/AuthContext';
import { Navigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import DiscordIcon from '../components/DiscordIcon';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useEffect, useState } from 'react';

/** Maps backend error codes to safe user-facing messages */
const SAFE_ERRORS: Record<string, string> = {
  discord_already_linked: 'Ce compte Discord est déjà lié à un compte existant.',
  no_account: "Aucun compte trouvé. Veuillez d'abord vous inscrire.",
  discord_not_linked: "Ce compte Discord n'est lié à aucun compte Xonaris.",
  pseudo_taken: 'Ce pseudo est déjà pris.',
  invalid_pseudo: 'Pseudo invalide.',
  oauth_failed: "Erreur lors de l'authentification Discord.",
  unknown: 'Une erreur est survenue. Veuillez réessayer.',
};

export default function Login() {
  const { isAuthenticated, login } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [authError, setAuthError] = useState('');
  useDocumentTitle('Connexion - Xonaris');

  useEffect(() => {
    const errorCode = searchParams.get('error');
    if (errorCode) {
      setAuthError(SAFE_ERRORS[errorCode] || SAFE_ERRORS.unknown);
      setSearchParams({}, { replace: true });
      setTimeout(() => setAuthError(''), 10000);
    }
  }, []);

  if (isAuthenticated) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen pt-24 pb-16 md:pt-32 md:pb-24 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay pointer-events-none" />

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 animate-fade-up flex justify-center">
        <div className="w-full max-w-md">
        <div className="text-center mb-8 md:mb-10">
          <h1 className="text-3xl md:text-5xl font-display font-black text-white mb-2 md:mb-3 tracking-tight">
            Bon retour
          </h1>
          <p className="text-base md:text-lg text-navy-300 font-medium">
            Connectez-vous pour reprendre le stream
          </p>
        </div>

        <div className="card p-6 md:p-10 bg-navy-900 shadow-2xl shadow-black/50 border-navy-800 relative overflow-hidden">
          
          {authError && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <button
            onClick={login}
            className="btn-discord w-full flex items-center justify-center gap-3 py-4 text-lg font-bold group relative overflow-hidden rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white transition-all shadow-lg hover:shadow-[#5865F2]/25 hover:-translate-y-0.5"
          >
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <DiscordIcon className="w-6 h-6 relative z-10" />
            <span className="relative z-10">Se connecter avec Discord</span>
            <ArrowRight className="w-5 h-5 opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300 relative z-10" />
          </button>

          <div className="mt-8 pt-6 border-t border-navy-800 text-center">
            <p className="text-navy-300 font-medium">
              Nouveau sur Xonaris ?{' '}
              <Link to="/register" className="text-brand-400 hover:text-brand-300 font-bold transition-colors inline-flex items-center gap-1 group">
                Créer un compte
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
