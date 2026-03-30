import { useState, useEffect } from 'react';
import { Navigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api';
import { CheckCircle, AlertCircle, Loader2, Users, ArrowRight } from 'lucide-react';
import DiscordIcon from '../components/DiscordIcon';
import Turnstile from '../components/Turnstile';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const TURNSTILE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

export default function Register() {
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  useDocumentTitle('Inscription - Xonaris');
  const [pseudo, setPseudo] = useState('');
  const [referral, setReferral] = useState('');
  const [referralLocked, setReferralLocked] = useState(false);
  const [referralStatus, setReferralStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [referralOwner, setReferralOwner] = useState<string | null>(null);
  const [acceptCGU, setAcceptCGU] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [pseudoStatus, setPseudoStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [pseudoError, setPseudoError] = useState('');

  useEffect(() => {
    const urlRef = searchParams.get('ref');
    const storageRef = sessionStorage.getItem('xonaris_ref');
    const ref = urlRef || storageRef;
    if (ref) {
      setReferral(ref);
      setReferralLocked(true);
      authApi.checkReferral(ref).then((r) => {
        setReferralStatus(r.valid ? 'ok' : 'error');
        setReferralOwner(r.pseudo);
      }).catch(() => setReferralStatus('error'));
    }
    const urlError = searchParams.get('error');
    if (urlError) {
      const safeMessages: Record<string, string> = {
        discord_already_linked: 'Ce compte Discord est déjà lié à un compte existant.',
        no_account: "Aucun compte trouvé. Veuillez d'abord vous inscrire.",
        pseudo_taken: 'Ce pseudo est déjà pris.',
        invalid_pseudo: 'Pseudo invalide.',
        oauth_failed: "Erreur lors de l'authentification Discord.",
        unknown: 'Une erreur est survenue. Veuillez réessayer.',
      };
      setError(safeMessages[urlError] || safeMessages.unknown);
      setSearchParams({}, { replace: true });
    }
  }, []);

  useEffect(() => {
    const trimmed = pseudo.trim();
    if (trimmed.length === 0) {
      setPseudoStatus('idle');
      setPseudoError('');
      return;
    }
    if (trimmed.length < 3) {
      setPseudoStatus('error');
      setPseudoError('3 caractères minimum');
      return;
    }
    if (trimmed.length > 20) {
      setPseudoStatus('error');
      setPseudoError('20 caractères maximum');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setPseudoStatus('error');
      setPseudoError('Lettres (sans accents), chiffres et _ uniquement');
      return;
    }
    const letterCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
    if (letterCount < 3) {
      setPseudoStatus('error');
      setPseudoError('Au moins 3 lettres alphabétiques requises');
      return;
    }
    setPseudoStatus('checking');
    const timeout = setTimeout(async () => {
      try {
        const res = await authApi.checkPseudo(trimmed);
        if (res.available) {
          setPseudoStatus('ok');
          setPseudoError('');
        } else {
          setPseudoStatus('error');
          setPseudoError(res.error || 'Pseudo indisponible');
        }
      } catch {
        setPseudoStatus('error');
        setPseudoError('Erreur de vérification');
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [pseudo]);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const referralInvalid = referral.trim() !== '' && referralStatus === 'error';
  const referralPending = referral.trim() !== '' && referralStatus === 'checking';
  const canSubmit = pseudo.trim().length >= 3 && pseudoStatus === 'ok' && acceptCGU && (!TURNSTILE_KEY || captchaToken) && !submitting && !referralInvalid && !referralPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!pseudo.trim()) { setError('Le pseudo est requis'); return; }
    if (pseudo.trim().length < 3) { setError('Le pseudo doit contenir au moins 3 caractères'); return; }
    if (pseudo.trim().length > 20) { setError('Le pseudo ne doit pas dépasser 20 caractères'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(pseudo.trim())) { setError('Le pseudo ne peut contenir que des lettres (sans accents), chiffres et _'); return; }
    if ((pseudo.trim().match(/[a-zA-Z]/g) || []).length < 3) { setError('Le pseudo doit contenir au moins 3 lettres alphabétiques'); return; }
    if (pseudoStatus !== 'ok') { setError('Le pseudo n\'est pas disponible'); return; }
    if (referralInvalid) { setError('Code parrain invalide. Laissez-le vide ou entrez un code valide.'); return; }
    if (!acceptCGU) { setError('Vous devez accepter les CGU'); return; }
    if (TURNSTILE_KEY && !captchaToken) { setError('Veuillez compléter le captcha'); return; }

    setSubmitting(true);
    try {
      await authApi.validateRegister(pseudo.trim(), captchaToken || 'dev-bypass', referral.trim() || undefined);
      const url = authApi.getDiscordRegisterUrl(pseudo.trim(), referral.trim() || undefined);
      window.location.href = url;
    } catch (err: any) {
      setError(err?.response?.data?.message || "Impossible de lancer l'inscription. Réessayez.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 md:pt-32 md:pb-24 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay pointer-events-none" />

      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 animate-fade-up flex justify-center">
        <div className="w-full max-w-lg">
        <div className="text-center mb-8 md:mb-10">
          <h1 className="text-3xl md:text-5xl font-display font-black text-white mb-2 md:mb-3 tracking-tight">
            Créer un compte
          </h1>
          <p className="text-base md:text-lg text-navy-300 font-medium">
            Rejoignez la nouvelle ère du streaming
          </p>
        </div>

        <div className="card p-6 md:p-10 bg-navy-900 shadow-2xl shadow-black/50 border-navy-800 relative overflow-hidden">
          
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            {/* Pseudo */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-navy-200 mb-1.5 sm:mb-2 uppercase tracking-wide">Nom d'utilisateur</label>
              <div className="relative group">
                <input
                  type="text"
                  value={pseudo}
                  onChange={(e) => setPseudo(e.target.value)}
                  placeholder="Ex: XonarisFan"
                  className={`input-field pr-12 text-lg py-4 transition-all duration-300 ${
                    pseudoStatus === 'ok' ? '!border-brand-500/50 shadow-md' :
                    pseudoStatus === 'error' ? '!border-red-500/50 shadow-md' : ''
                  }`}
                  maxLength={20}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {pseudoStatus === 'checking' && <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />}
                  {pseudoStatus === 'ok' && <CheckCircle className="w-5 h-5 text-brand-400" />}
                  {pseudoStatus === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
                </div>
              </div>
              {pseudoError && <p className="text-sm font-medium text-red-400 mt-2 flex items-center gap-1.5"><AlertCircle className="w-4 h-4"/>{pseudoError}</p>}
              {pseudoStatus === 'ok' && <p className="text-sm font-medium text-brand-400 mt-2 flex items-center gap-1.5"><CheckCircle className="w-4 h-4"/>Pseudo parfait</p>}
            </div>

            {/* Referral */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-navy-200 mb-1.5 sm:mb-2 uppercase tracking-wide">
                Code parrain {referralLocked
                  ? referralStatus === 'ok'
                    ? <span className="text-brand-400 font-normal normal-case ml-1 inline-flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> {referralOwner ? `de ${referralOwner}` : 'Appliqué'}</span>
                    : referralStatus === 'error'
                    ? <span className="text-red-400 font-normal normal-case ml-1 inline-flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Code invalide</span>
                    : <span className="text-navy-400 font-normal normal-case ml-1">(vérification...)</span>
                  : <span className="text-navy-400 font-normal normal-case ml-1">(Optionnel)</span>}
              </label>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400" />
                <input
                  type="text"
                  value={referral}
                  onChange={(e) => {
                    if (referralLocked) return;
                    const val = e.target.value.toUpperCase();
                    setReferral(val);
                    setReferralOwner(null);
                    if (val.length >= 4) {
                      setReferralStatus('checking');
                      authApi.checkReferral(val).then((r) => {
                        setReferralStatus(r.valid ? 'ok' : 'error');
                        setReferralOwner(r.pseudo);
                      }).catch(() => setReferralStatus('error'));
                    } else {
                      setReferralStatus('idle');
                    }
                  }}
                  readOnly={referralLocked}
                  placeholder="Code de parrainage"
                  className={`input-field !pl-12 py-4 uppercase ${referralLocked ? 'opacity-70 cursor-not-allowed select-none' : ''}`}
                />
                {!referralLocked && referralStatus === 'ok' && <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-400" />}
                {!referralLocked && referralStatus === 'error' && <AlertCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-red-400" />}
              </div>
              {!referralLocked && referralStatus === 'ok' && referralOwner && (
                <p className="text-sm font-medium text-brand-400 mt-2 flex items-center gap-1.5"><CheckCircle className="w-4 h-4" />Code validé — parrainé par <strong>{referralOwner}</strong></p>
              )}
              {!referralLocked && referralStatus === 'error' && (
                <p className="text-sm font-medium text-red-400 mt-2 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" />Code de parrainage introuvable</p>
              )}
            </div>

            {/* Captcha */}
            {TURNSTILE_KEY && (
              <div className="flex justify-center py-2">
                <Turnstile
                  siteKey={TURNSTILE_KEY}
                  onVerify={setCaptchaToken}
                  onExpire={() => setCaptchaToken('')}
                />
              </div>
            )}

            {/* CGU */}
            <label className="flex items-start gap-3 sm:gap-4 cursor-pointer group p-3 sm:p-4 rounded-xl bg-white/[0.02] border border-navy-800 hover:bg-white/[0.04] transition-colors">
              <div className="relative mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  checked={acceptCGU}
                  onChange={(e) => setAcceptCGU(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${
                  acceptCGU
                    ? 'bg-brand-500 border-brand-500 shadow-md'
                    : 'border-navy-600 group-hover:border-navy-400'
                }`}>
                  {acceptCGU && <CheckCircle className="w-4 h-4 text-[#050505]" />}
                </div>
              </div>
              <span className="text-[15px] text-navy-200 leading-snug">
                Je confirme avoir lu et j'accepte les{' '}
                <Link to="/cgu" className="text-brand-400 hover:text-brand-300 font-bold transition-colors">CGU</Link>
                {' '}et la{' '}
                <Link to="/privacy" className="text-brand-400 hover:text-brand-300 font-bold transition-colors">politique de confidentialité</Link>.
              </span>
            </label>

            {error && (
              <div className="px-5 py-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm font-medium text-red-400 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full flex items-center justify-center gap-3 py-4 text-lg font-bold group relative overflow-hidden rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white transition-all shadow-lg hover:shadow-[#5865F2]/25 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none disabled:hover:translate-y-0"
            >
              {!submitting && <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />}
              
              {submitting ? (
                <Loader2 className="w-6 h-6 animate-spin relative z-10" />
              ) : (
                <DiscordIcon className="w-6 h-6 relative z-10" />
              )}
              <span className="relative z-10">{submitting ? 'Connexion en cours...' : 'S\'inscrire avec Discord'}</span>
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-navy-800 text-center relative z-10">
            <p className="text-navy-300 font-medium">
              Déjà un compte ?{' '}
              <Link to="/login" className="text-brand-400 hover:text-brand-300 font-bold transition-colors inline-flex items-center gap-1 group">
                Se connecter
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
