import { useState, useCallback, useRef, useEffect } from 'react';
import { adsApi } from '../api';
import { Loader2, ExternalLink, Crown, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AdPayload {
  url: string;
  nonce: string;
}

interface AdOverlayProps {
  channelId: string;
  channelName?: string;
  onAdValidated: (adToken: string) => void;
}

const AD_PREFETCH_TTL_MS = 60_000;
const adPrefetchCache = new Map<string, { data: AdPayload; expiresAt: number }>();
const adPrefetchPromises = new Map<string, Promise<AdPayload>>();

function getCachedAd(channelId: string): AdPayload | null {
  const cached = adPrefetchCache.get(channelId);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    adPrefetchCache.delete(channelId);
    return null;
  }
  return cached.data;
}

function cacheAd(channelId: string, data: AdPayload): AdPayload {
  adPrefetchCache.set(channelId, {
    data,
    expiresAt: Date.now() + AD_PREFETCH_TTL_MS,
  });
  return data;
}

function clearCachedAd(channelId: string): void {
  adPrefetchCache.delete(channelId);
  adPrefetchPromises.delete(channelId);
}

function toAdErrorMessage(err: any): string {
  if (err?.response?.status === 429) {
    return 'Trop de demandes de publicité en peu de temps. Attendez quelques secondes puis réessayez.';
  }
  return err?.response?.data?.message || err?.message || 'Erreur lors du chargement de la publicité.';
}

/**
 * Full-screen overlay blocking the video player for non-premium users.
 * Flow:
 *  1. On mount → pre-fetch the ad URL in the background.
 *  2. On click → open about:blank synchronously, then navigate that popup to the ad URL.
 *               This keeps the browser gesture chain intact and avoids false popup-blocked states.
 *  3. Once opened, show "Confirmer" button.
 *  4. On confirm → POST /ads/validate → receive ad_token → pass it up.
 */
export default function AdOverlay({ channelId, channelName, onAdValidated }: AdOverlayProps) {
  const [step, setStep] = useState<'initial' | 'loading' | 'opened' | 'validating'>('initial');
  const [error, setError] = useState('');
  const [preloadedUrl, setPreloadedUrl] = useState<string | null>(null);
  const adWindowRef = useRef<Window | null>(null);
  const adNonceRef = useRef<string | null>(null);

  const openAdPopup = useCallback((): Window | null => {
    const popup = window.open('about:blank', '_blank');
    if (!popup) return null;

    // Cut the opener link before navigating to an arbitrary external ad URL.
    try {
      popup.opener = null;
    } catch {
      // Some browsers expose opener as read-only here; keep the popup usable anyway.
    }

    return popup;
  }, []);

  const loadAd = useCallback(async (): Promise<AdPayload> => {
    const cached = getCachedAd(channelId);
    if (cached) return cached;

    const pending = adPrefetchPromises.get(channelId);
    if (pending) return pending;

    const promise = adsApi.getAd(channelId)
      .then((data) => cacheAd(channelId, data))
      .finally(() => {
        adPrefetchPromises.delete(channelId);
      });

    adPrefetchPromises.set(channelId, promise);
    return promise;
  }, [channelId]);

  // Pre-fetch the ad URL as soon as the overlay appears so we can call
  // window.open(...) once on click and reuse the already-loaded ad data when possible.
  useEffect(() => {
    let cancelled = false;
    loadAd()
      .then(({ url, nonce }) => {
        if (cancelled) return;
        setPreloadedUrl(url);
        adNonceRef.current = nonce;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [channelId, loadAd]);

  // Poll every 500ms: if the ad popup has been closed, auto-validate.
  useEffect(() => {
    if (step !== 'opened') return;
    const interval = setInterval(() => {
      const win = adWindowRef.current;
      let isClosed = false;
      try {
        isClosed = !!win?.closed;
      } catch {
        isClosed = false;
      }

      if (win && isClosed) {
        clearInterval(interval);
        adWindowRef.current = null;
        setStep('validating');
        setError('');
        const nonce = adNonceRef.current;
        if (!nonce) {
          setError('Nonce manquant. Rechargez la page.');
          setStep('initial');
          return;
        }
        adsApi.validateAd(channelId, nonce)
          .then(({ ad_token }) => {
            clearCachedAd(channelId);
            onAdValidated(ad_token);
          })
          .catch((err: any) => {
            const msg = err?.response?.status === 429
              ? 'Validation trop sollicitée. Attendez quelques secondes puis réessayez.'
              : err?.response?.data?.message || 'Erreur lors de la validation.';
            if (typeof msg === 'string' && msg.toLowerCase().includes('nonce')) {
              clearCachedAd(channelId);
              adNonceRef.current = null;
              setPreloadedUrl(null);
            }
            setError(msg);
            setStep('opened');
          });
      }
    }, 500);
    return () => clearInterval(interval);
  }, [step, channelId, onAdValidated]);

  const handleWatchAd = useCallback(async () => {
    setError('');
    const win = openAdPopup();

    if (!win) {
      setError('Les popups sont bloqués par votre navigateur. Autorisez-les pour ce site et réessayez.');
      return;
    }

    adWindowRef.current = win;

    try {
      let url = preloadedUrl;
      if (!url || !adNonceRef.current) {
        setStep('loading');
        const adResult = await loadAd();
        url = adResult.url;
        adNonceRef.current = adResult.nonce;
        setPreloadedUrl(adResult.url);
      }
      if (!url.startsWith('https://') && !url.startsWith('http://')) {
        throw new Error('URL de publicité invalide.');
      }
      win.location.href = url;
      setStep('opened');
    } catch (err: any) {
      win.close();
      adWindowRef.current = null;
      const msg = toAdErrorMessage(err);
      setError(msg);
      setStep('initial');
    }
  }, [channelId, preloadedUrl, openAdPopup, loadAd]);

  const handleConfirm = useCallback(async () => {
    setStep('validating');
    setError('');
    try {
      const nonce = adNonceRef.current;
      if (!nonce) throw new Error('Nonce manquant');
      const { ad_token } = await adsApi.validateAd(channelId, nonce);
      clearCachedAd(channelId);
      onAdValidated(ad_token);
    } catch (err: any) {
      const msg = err?.response?.status === 429
        ? 'Validation trop sollicitée. Attendez quelques secondes puis réessayez.'
        : err?.response?.data?.message || 'Erreur lors de la validation.';
      if (typeof msg === 'string' && msg.toLowerCase().includes('nonce')) {
        clearCachedAd(channelId);
        adNonceRef.current = null;
        setPreloadedUrl(null);
      }
      setError(msg);
      setStep('opened');
    }
  }, [channelId, onAdValidated]);

  return (
    <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-navy-950/97 backdrop-blur-sm rounded-none sm:rounded-xl overflow-y-auto py-6 px-4">

      {/* Title */}
      <h2 className="text-lg sm:text-2xl font-display font-black text-white mb-2 text-center">
        Publicité requise
      </h2>
      <p className="text-xs sm:text-sm text-navy-300 text-center max-w-xs sm:max-w-md mb-3 sm:mb-6">
        {channelName
          ? `Pour accéder à ${channelName}, regardez une courte publicité.`
          : 'Pour accéder à cette chaîne, regardez une courte publicité.'}
      </p>

      {/* Error */}
      {error && (
        <div className="mb-3 sm:mb-5 px-3 sm:px-4 py-2 sm:py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] sm:text-sm text-red-400 max-w-xs sm:max-w-sm text-center flex items-start gap-2 animate-fade-up">
          <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Step: initial — show "Watch ad" button */}
      {(step === 'initial') && (
        <button
          onClick={handleWatchAd}
          className="px-5 sm:px-8 py-2.5 sm:py-4 bg-brand-500 hover:bg-brand-400 text-[#050505] font-bold rounded-xl transition-all duration-300 inline-flex items-center gap-2 sm:gap-3 shadow-lg shadow-brand-500/20 active:scale-95 text-xs sm:text-base"
        >
          <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
          Regarder la publicité
        </button>
      )}

      {/* Step: loading — spinner */}
      {step === 'loading' && (
        <div className="flex items-center gap-3 text-navy-300">
          <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
          <span className="text-sm font-medium">Chargement…</span>
        </div>
      )}

      {/* Step: opened — ad opened, auto-validates on tab return, manual button as fallback */}
      {step === 'opened' && (
        <div className="flex flex-col items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 text-navy-300">
            <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
            <span className="text-xs sm:text-sm font-medium text-center">Regardez la publicité puis revenez ici…</span>
          </div>
          <p className="text-[10px] sm:text-xs text-navy-500 text-center max-w-xs">
            La validation se lance automatiquement dès votre retour.
          </p>
          <button
            onClick={handleConfirm}
            className="px-5 sm:px-8 py-2 sm:py-3 bg-navy-800 hover:bg-navy-700 text-navy-200 font-semibold rounded-xl transition-all duration-300 inline-flex items-center gap-2 border border-white/10 active:scale-95 text-xs sm:text-sm"
          >
            Valider manuellement
          </button>
        </div>
      )}

      {/* Step: validating — spinner */}
      {step === 'validating' && (
        <div className="flex items-center gap-2 sm:gap-3 text-navy-300">
          <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-brand-400" />
          <span className="text-xs sm:text-sm font-medium">Validation en cours…</span>
        </div>
      )}

      {/* CTA Premium */}
      <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-navy-800/50">
        <Link
          to="/premium"
          className="inline-flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-sm text-amber-400 hover:text-amber-300 transition-colors font-semibold"
        >
          <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Devenir Premium — sans publicité
        </Link>
      </div>
    </div>
  );
}
