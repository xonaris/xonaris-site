import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useParams, Link } from 'react-router-dom';
import { channelApi, streamApi, favoriteApi, reportApi } from '../api';
import type { Channel, ChannelSource } from '../types';
const VideoPlayer = React.lazy(() => import('../components/VideoPlayer'));
import AdOverlay from '../components/AdOverlay';
import { ArrowLeft, Heart, Flag, Crown, Tv, Send, CheckCircle, Antenna, Play, ChevronLeft, AlertCircle, Loader2, ArrowRight, Share2, Lock, Globe, Film, Clapperboard, Dribbble, Newspaper, Compass, Baby, Music, Map as MapIcon, Laugh } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { safeLogoUrl } from '../common/utils/safeLogoUrl';

const getCategoryIcon = (name: string, className = 'w-3.5 h-3.5'): React.ReactNode => {
  const n = name.toLowerCase();
  if (n.includes('g\u00e9n\u00e9raliste') || n.includes('generaliste')) return <Tv className={className} />;
  if (n.includes('cin\u00e9ma') || n.includes('cinema')) return <Film className={className} />;
  if (n.includes('s\u00e9rie') || n.includes('serie')) return <Clapperboard className={className} />;
  if (n.includes('sport')) return <Dribbble className={className} />;
  if (n.includes('info')) return <Newspaper className={className} />;
  if (n.includes('docu')) return <Compass className={className} />;
  if (n.includes('jeunesse') || n.includes('enfant')) return <Baby className={className} />;
  if (n.includes('musique')) return <Music className={className} />;
  if (n.includes('r\u00e9gion') || n.includes('region')) return <MapIcon className={className} />;
  if (n.includes('inter') || n.includes('monde')) return <Globe className={className} />;
  if (n.includes('divertissement')) return <Laugh className={className} />;
  return <Tv className={className} />;
};

export default function Watch() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [suggestions, setSuggestions] = useState<Channel[]>([]);
  const [streamUrl, setStreamUrl] = useState('');
  const [isFav, setIsFav] = useState(false);
  const [favId, setFavId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSent, setReportSent] = useState(false);
  const [hasPendingReport, setHasPendingReport] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [favError, setFavError] = useState('');
  const [reportError, setReportError] = useState('');
  const [shared, setShared] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState<string | undefined>(undefined);
  const [sources, setSources] = useState<ChannelSource[]>([]);
  const [adToken, setAdToken] = useState<string | null>(null);
  const [needsAd, setNeedsAd] = useState(false);
  const [discoverChannels, setDiscoverChannels] = useState<Channel[]>([]);
  
  useDocumentTitle(channel?.name ? `${channel.name} | En direct` : 'Lecture');

  const isPremium = user?.premium_expires_at && new Date(user.premium_expires_at) > new Date();

  /** Load the stream URL — called either immediately (premium) or after ad validation. */
  const loadStream = useCallback(async (channelId: string, sourceId?: string, token?: string | null) => {
    try {
      const streamData = await streamApi.getStreamUrl(channelId, sourceId, token || undefined);
      if (streamData?.url) setStreamUrl(streamData.url);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      if (err?.response?.status === 403 && msg?.toLowerCase().includes('publicité')) {
        // Backend says ads are required → show overlay
        setNeedsAd(true);
      } else if (err?.response?.status === 403 && msg?.toLowerCase().includes('premium')) {
        setError('premium');
      } else {
        setError(msg || 'Impossible de charger cette source.');
      }
    }
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setReportOpen(false);
    setReportSent(false);
    setNeedsAd(false);
    setAdToken(null);
    setStreamUrl('');
    setError('');

    Promise.all([
      channelApi.getById(id).catch((e) => { throw e; }),
    ])
      .then(async ([ch]) => {
        setChannel(ch);
        const channelSources = ch.sources ?? [];
        setSources(channelSources);
        const defaultSource = isPremium
          ? (channelSources.find((s: ChannelSource) => s.is_premium) ?? channelSources.find((s: ChannelSource) => !s.is_premium) ?? channelSources[0])
          : (channelSources.find((s: ChannelSource) => !s.is_premium) ?? channelSources[0]);
        const srcId = defaultSource?.id;
        setSelectedSourceId(srcId);
        // Try to get stream URL — for non-premium this may fail with "ad required"
        await loadStream(id, srcId, null);
      })
      .catch((err: any) => {
        const msg = err?.response?.data?.message;
        setError(msg || 'Impossible de charger la chaîne.');
      })
      .finally(() => setLoading(false));

    // Load favorites
    favoriteApi.getAll().then((favs) => {
      const fav = favs.find((f) => f.channel_id === id);
      setIsFav(!!fav);
      setFavId(fav ? fav.id : null);
    }).catch(() => {});

    // Check for pending reports (disable re-reporting)
    reportApi.getMine().then((reports) => {
      const pending = reports.some((r) => r.status === 'PENDING');
      setHasPendingReport(pending);
    }).catch(() => {});
  }, [id]);

  // Load lightweight suggestions separately (non-blocking)
  useEffect(() => {
    if (!id || !channel) return;
    channelApi.getSuggestions(id, channel.category, 12).then(setSuggestions).catch(() => {});
    channelApi.getSuggestions(id, undefined, 12).then(setDiscoverChannels).catch(() => {});
  }, [id, channel?.category]);

  const toggleFav = async () => {
    if (!id || favLoading) return;
    setFavLoading(true);
    setFavError('');
    try {
      if (isFav && favId) {
        await favoriteApi.remove(favId);
        setIsFav(false);
        setFavId(null);
      } else {
        const newFav = await favoriteApi.add(id);
        setIsFav(true);
        setFavId(newFav.id);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || '';
      if (msg.toLowerCase().includes('limit') || err?.response?.status === 403) {
        setFavError('limit');
      } else {
        setFavError('Impossible d\'ajouter aux favoris. Erreur réseau.');
      }
      setTimeout(() => setFavError(''), 5000);
    } finally {
      setFavLoading(false);
    }
  };

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !reportReason.trim()) return;
    setReportError('');
    try {
      await reportApi.create(id, reportReason.trim());
      setReportSent(true);
      setHasPendingReport(true);
      setReportOpen(false);
      setReportReason('');
    } catch (err: any) {
      const msg = err?.response?.data?.message || '';
      if (msg.toLowerCase().includes('déjà') || err?.response?.status === 409) {
        setHasPendingReport(true);
        setReportError('Vous avez déjà un signalement en attente de traitement.');
      } else {
        setReportError(msg || "Erreur lors de l'envoi du signalement. Réessayez.");
      }
    }
  };

  const shareChannel = async () => {
    const url = window.location.href;
    const title = channel?.name ?? 'Regarder en direct';
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url).catch(() => {});
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  const changeSource = async (sourceId: string) => {
    if (!id || sourceId === selectedSourceId) return;
    setSelectedSourceId(sourceId);
    setStreamUrl('');
    setError('');
    try {
      const streamData = await streamApi.getStreamUrl(id, sourceId, adToken || undefined);
      setStreamUrl(streamData.url);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      if (err?.response?.status === 403 && msg?.toLowerCase().includes('publicité')) {
        setNeedsAd(true);
      } else if (err?.response?.status === 403 && msg?.toLowerCase().includes('premium')) {
        setError('premium');
      } else {
        setError(msg || 'Impossible de charger cette source.');
      }
    }
  };

  /** Called when the user finishes the ad flow — store the token and load the stream */
  const onAdValidated = useCallback(async (token: string) => {
    if (!id) return;
    setAdToken(token);
    setNeedsAd(false);
    setError('');
    await loadStream(id, selectedSourceId, token);
  }, [id, selectedSourceId, loadStream]);

  // Below-player suggestions (split from the lightweight suggestions API)
  const youMightLike = suggestions.slice(0, 6);
  const premiumChannels = suggestions.filter((c) => c.is_premium).slice(0, 6);

  if (loading) {
    return (
      <div className="w-full min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="h-5 bg-white/5 rounded w-32 mb-6 animate-pulse" />
        <div className="space-y-6">
          <div className="aspect-video bg-white/5 rounded-xl animate-pulse" />
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/5 rounded-xl animate-pulse" />
            <div className="flex-1 space-y-3">
              <div className="h-6 bg-white/5 rounded-lg w-1/3 animate-pulse" />
              <div className="h-4 bg-white/5 rounded-lg w-1/4 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="w-full min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 animate-fade-up">
        <div className="w-24 h-24 bg-red-500/10 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-md border border-red-500/20">
          <Tv className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-3xl font-display font-black text-white mb-3">Chaîne indisponible</h2>
        <p className="text-navy-300 mb-8 text-lg leading-relaxed">
          {error && error !== 'premium' ? error : "La chaîne que vous recherchez n'existe pas ou a été déplacée."}
        </p>
        <Link to="/" className="btn-primary">
          <ChevronLeft className="w-5 h-5 -ml-1 group-hover:-translate-x-1 transition-transform" />
          Retour aux chaînes
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 sm:pt-28 pb-10 sm:pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Report Modal — rendered at root level so fixed positioning works outside any transform context */}
        {reportOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setReportOpen(false); setReportError(''); }}></div>
            <div className="relative w-full max-w-md card p-8 shadow-2xl border-amber-500/20">
              <button onClick={() => { setReportOpen(false); setReportError(''); }} className="absolute top-4 right-4 p-2 rounded-xl text-navy-400 hover:text-white hover:bg-white/5 transition-colors">
                <ArrowLeft className="w-5 h-5 rotate-180" />
              </button>
              <form onSubmit={submitReport}>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-amber-500/10">
                    <Flag className="w-5 h-5 text-amber-400" />
                  </span>
                  Signaler un problème
                </h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {["Pas d'image (écran noir)", "Pas de son", "Coupure/Buffering", "Décalage son/image", "Mauvaise chaîne"].map(reason => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => setReportReason(reason)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        reportReason === reason 
                          ? 'bg-amber-500/20 text-amber-500 border-amber-500/50' 
                          : 'bg-white/5 text-navy-300 border-white/10 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="input-field resize-none min-h-[100px]"
                  placeholder="Préciser le problème (facultatif)..."
                  required
                />
                {reportError && (
                  <div className="flex items-center gap-2 mt-3 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 animate-fade-up">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {reportError}
                  </div>
                )}
                <div className="flex justify-end gap-4 mt-4">
                  <button type="button" onClick={() => { setReportOpen(false); setReportError(''); }} className="btn-secondary">
                    Annuler
                  </button>
                  <button type="submit" className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-[#050505] font-bold rounded-xl transition-all duration-300 inline-flex items-center gap-2 shadow-md">
                    <Send className="w-4 h-4" /> Envoyer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Back Link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-navy-300 hover:text-white transition-colors mb-6 group"
        >
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          </div>
          Retour au catalogue
        </Link>

        <div className="space-y-6 animate-fade-up">
            <Suspense fallback={<div className="w-full aspect-video bg-navy-900 rounded-2xl flex items-center justify-center border border-navy-800 shadow-2xl animate-pulse"><Loader2 className="w-8 h-8 text-brand-500 animate-spin" /></div>}>
              <VideoPlayer
                src={needsAd ? '' : streamUrl}
                premiumLocked={error === 'premium'}
                streamError={!needsAd && error && error !== 'premium' ? error : undefined}
                sources={sources}
                selectedSourceId={selectedSourceId}
                onChangeSource={changeSource}
                onError={(msg) => setError(msg)}
                channelName={channel?.name}
                channelLogo={safeLogoUrl(channel?.logo_url) ?? undefined}
                adOverlay={needsAd && id ? (
                  <AdOverlay
                    channelId={id}
                    channelName={channel?.name}
                    onAdValidated={onAdValidated}
                  />
                ) : undefined}
              />
            </Suspense>
            
            <div className="card p-4 sm:p-6 lg:p-8 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
              
              {/* Channel Meta */}
              <div className="flex items-center gap-4 sm:gap-5">
                {channel.logo_url ? (
                  <div className="relative w-16 h-16 shrink-0 bg-white/5 rounded-xl p-2 border border-white/10 shadow-lg">
                    <img loading="lazy" src={safeLogoUrl(channel.logo_url)!} alt={channel.name} className="w-full h-full object-contain drop-shadow-lg" />
                  </div>
                ) : (
                  <div className="w-16 h-16 shrink-0 bg-gradient-to-br from-brand-500/20 to-mint-500/10 rounded-xl flex items-center justify-center border border-brand-500/20 shadow-lg">
                    <Tv className="w-8 h-8 text-brand-400" />
                  </div>
                )}
                
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 sm:gap-3 mb-1.5 line-clamp-2">
                    {channel.name}
                    {channel.is_premium && (
                      <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-[#050505] p-1 rounded-lg">
                         <Crown className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </h1>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-white/5 border border-navy-800 text-xs font-semibold text-navy-200">
                      {getCategoryIcon(channel.category || 'TV', 'w-3 h-3 opacity-60')}
                      {channel.category || 'TV'}
                    </span>
                    <div className="w-1 h-1 rounded-full bg-navy-700" />
                    <span className="flex items-center gap-1.5 text-xs text-brand-400 font-bold uppercase tracking-wider">
                      <Antenna className="w-3.5 h-3.5 animate-pulse" /> En direct
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0 pt-2 sm:pt-0 w-full md:w-auto">
                <button
                  onClick={toggleFav}
                  disabled={favLoading}
                  className={`h-11 sm:h-12 flex-1 md:flex-none justify-center px-3 sm:px-5 rounded-xl font-bold flex items-center gap-2 sm:gap-2.5 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isFav
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20 shadow-md'
                      : 'bg-navy-900 text-navy-200 border border-white/10 hover:bg-white/5 hover:text-white hover:border-white/20'
                  }`}
                >
                  {favLoading ? (
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  ) : (
                    <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${isFav ? 'fill-current' : ''}`} /> 
                  )}
                  <span className="text-sm sm:text-base whitespace-nowrap">{isFav ? 'Favori' : 'Ajouter'}</span>
                </button>

                <button
                  onClick={shareChannel}
                  title="Partager cette chaîne"
                  className={`h-11 sm:h-12 flex-1 md:flex-none justify-center px-3 sm:px-5 rounded-xl font-bold flex items-center gap-2 sm:gap-2.5 transition-all duration-300 active:scale-95 ${
                    shared
                      ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                      : 'bg-navy-900 text-navy-200 border border-white/10 hover:bg-white/5 hover:text-white hover:border-white/20'
                  }`}
                >
                  {shared ? <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" /> : <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />}
                  <span className="text-sm sm:text-base whitespace-nowrap">{shared ? 'Copié !' : 'Partager'}</span>
                </button>
                
                <button
                  onClick={() => !hasPendingReport && !reportSent && setReportOpen(true)}
                  disabled={hasPendingReport || reportSent}
                  title={hasPendingReport ? 'Signalement en cours de traitement' : reportSent ? 'Signalement envoyé' : 'Signaler un problème'}
                  className={`h-11 w-11 sm:h-12 sm:w-12 shrink-0 rounded-xl flex items-center justify-center transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                    reportOpen || reportSent || hasPendingReport
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-navy-900 text-navy-300 border border-white/10 hover:bg-white/5 hover:text-white hover:border-white/20'
                  }`}
                >
                   <Flag className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Source Selector */}
            {sources.length > 1 && (
              <div className="card p-4 sm:p-6">
                <p className="text-xs font-bold text-navy-400 uppercase tracking-wider mb-3">Source de diffusion</p>
                <div className="flex flex-wrap gap-2">
                  {sources.map((s) => {
                    const isSelected = s.id === selectedSourceId;
                    const isLocked = s.is_premium && !isPremium;
                    return (
                      <button
                        key={s.id}
                        onClick={() => !isLocked && changeSource(s.id)}
                        disabled={isLocked}
                        title={isLocked ? 'Réservé aux abonnés Premium' : s.label}
                        className={`h-10 px-4 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all duration-200 active:scale-95 ${
                          isLocked
                            ? 'bg-navy-900/50 text-navy-600 border border-navy-800/50 cursor-not-allowed'
                            : isSelected
                            ? 'bg-brand-500 text-[#050505] border border-brand-600 shadow-md shadow-brand-500/20'
                            : 'bg-navy-900 text-navy-200 border border-white/10 hover:bg-white/5 hover:text-white hover:border-white/20'
                        }`}
                      >
                        {s.is_premium ? (
                          isLocked ? <Lock className="w-3.5 h-3.5" /> : <Crown className="w-3.5 h-3.5 text-amber-400" />
                        ) : null}
                        {s.label}
                        {s.is_premium && isLocked && <span className="text-[10px] text-navy-500 ml-1">Premium</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Premium CTA for non-premium users */}
            {!isPremium && (
              <Link
                to="/premium"
                className="card p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/[0.03] transition-all group"
              >
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shrink-0 shadow-md">
                    <Crown className="w-5 h-5 text-[#050505]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white text-sm">Devenir Premium</p>
                    <p className="text-[11px] sm:text-xs text-navy-300">Accédez à toutes les chaînes et fonctionnalités exclusives.</p>
                  </div>
                </div>
                <div className="flex items-center justify-center sm:justify-end gap-1.5 text-amber-400 text-sm font-bold shrink-0 group-hover:gap-2.5 transition-all w-full sm:w-auto pt-2 sm:pt-0 border-t border-white/5 sm:border-t-0">
                  <Crown className="w-4 h-4" />
                  <span>Découvrir</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            )}

          </div>

        {/* Below Player Sections */}
        <div className="mt-12 space-y-12">
          <ChannelSection title="Vous pourriez aimer" channels={youMightLike} />
          <ChannelSection title="À découvrir" channels={discoverChannels} />
          <ChannelSection title="Chaînes Premium" channels={premiumChannels} amber />
        </div>
      </div>
    </div>
  );
}

function ChannelSection({ title, channels, amber }: { title: string; channels: any[]; amber?: boolean }) {
  if (channels.length === 0) return null;
  return (
    <div className="animate-fade-up">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {channels.map((ch) => (
          <Link key={ch.id} to={`/watch/${ch.id}`} className="card-hover p-3 flex flex-col items-center gap-3 group">
            <div className="w-16 h-16 bg-navy-950 rounded-2xl flex items-center justify-center border border-navy-800 group-hover:border-brand-500/30 transition-colors p-2 shrink-0 relative overflow-hidden shadow-lg">
              {ch.logo_url ? <img loading="lazy" src={safeLogoUrl(ch.logo_url)!} alt="" className="w-full h-full object-contain" /> : <Tv className="w-8 h-8 text-brand-500/50 group-hover:text-brand-400" />}
            </div>
            <div className="w-full">
              <p className="text-sm font-bold text-white truncate group-hover:text-brand-400 transition-colors">{ch.name}</p>
              <p className="text-xs text-navy-400 truncate mt-0.5">{ch.category || 'TV'}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
