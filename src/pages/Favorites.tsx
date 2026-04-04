import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { favoriteApi } from '../api';
import { useAuth } from '../context/AuthContext';
import type { Favorite } from '../types';
import { safeLogoUrl } from '../common/utils/safeLogoUrl';
import { Heart, Tv, Play, Trash2, Crown, ArrowRight, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const MAX_FAVORITES_FREE = 5;

export default function Favorites() {
  const { user } = useAuth();
  useDocumentTitle('Mes favoris - Xonaris');
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState('');

  const isPremium = user?.premium_expires_at && new Date(user.premium_expires_at) > new Date();

  const load = () => {
    setError(false);
    setLoading(true);
    favoriteApi.getAll()
      .then(setFavorites)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const remove = async (favId: string) => {
    if (removingId) return;
    setRemovingId(favId);
    setRemoveError('');
    const prev = [...favorites];
    setFavorites((f) => f.filter((c) => c.id !== favId));
    try {
      await favoriteApi.remove(favId);
    } catch (err: any) {
      setFavorites(prev);
      setRemoveError(err?.response?.data?.message || 'Impossible de retirer ce favori.');
      setTimeout(() => setRemoveError(''), 4000);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="w-full min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 pb-8 sm:pb-12 animate-fade-up">
      {/* Header */}
      <div className="mb-6 sm:mb-10 flex flex-col sm:flex-row md:items-end justify-between gap-4 sm:gap-6">
        <div>
          <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-brand-500/10 rounded-xl sm:rounded-[1.5rem] flex items-center justify-center border border-brand-500/20 shadow-md shrink-0">
              <Heart className="w-6 h-6 sm:w-8 sm:h-8 text-brand-400 fill-brand-400" />
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-4xl font-black text-white tracking-tight">
                Mes <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-emerald-600">Favoris</span>
              </h1>
              <p className="text-navy-300 sm:mt-1 font-medium text-sm sm:text-lg">
                {favorites.length} chaîne{favorites.length !== 1 ? 's' : ''} sauvegardée{favorites.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Limit indicator */}
        <div className="card p-3 sm:p-4 bg-white/[0.02] border-navy-800 flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
          {isPremium ? (
            <div className="flex items-center gap-3 w-full">
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0">
                <Crown className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-amber-400 font-bold flex items-center gap-1.5 text-sm sm:text-base">
                  Favoris illimités <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </p>
                <p className="text-xs sm:text-sm text-navy-300">Avantage Premium actif</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 w-full">
              <div className="w-full sm:w-auto">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs sm:text-sm font-bold text-navy-200">Capacité</span>
                  <span className={`text-xs sm:text-sm font-black ${favorites.length >= MAX_FAVORITES_FREE ? 'text-red-400' : 'text-brand-400'}`}>
                    {favorites.length} / {MAX_FAVORITES_FREE}
                  </span>
                </div>
                <div className="w-full sm:w-40 h-1.5 sm:h-2 bg-navy-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      favorites.length >= MAX_FAVORITES_FREE ? 'bg-red-500 shadow-md' : 'bg-brand-500 shadow-md'
                    }`}
                    style={{ width: `${Math.min((favorites.length / MAX_FAVORITES_FREE) * 100, 100)}%` }}
                  />
                </div>
              </div>
              {favorites.length >= MAX_FAVORITES_FREE && (
                <Link to="/premium" className="px-4 py-2 sm:py-2 bg-amber-500/10 text-amber-400 rounded-xl text-xs sm:text-sm font-bold hover:bg-amber-500/20 transition-colors flex items-center justify-center gap-1.5 shrink-0">
                  Premium <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Remove error toast */}
      {removeError && (
        <div className="fixed top-4 right-4 z-50 card p-3 border border-red-500/30 bg-red-500/10 flex items-center gap-2 text-sm text-red-400 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4" /> {removeError}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card p-3 sm:p-6 aspect-square max-h-[200px] sm:max-h-[300px] animate-pulse flex flex-col items-center justify-center">
              <div className="w-12 h-12 sm:w-20 sm:h-20 bg-white/5 rounded-xl mb-3 sm:mb-4" />
              <div className="h-4 sm:h-5 bg-white/5 rounded-full w-3/4 mb-2" />
              <div className="h-3 sm:h-4 bg-white/5 rounded-full w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="card p-8 sm:p-16 text-center border-navy-800 bg-white/[0.02]">
          <div className="w-16 h-16 sm:w-24 sm:h-24 bg-red-500/10 rounded-xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-red-400" />
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-white mb-2">Impossible de charger vos favoris</h2>
          <p className="text-sm sm:text-lg text-navy-300 mb-6 sm:mb-8">
            Une erreur est survenue. Vérifiez votre connexion et réessayez.
          </p>
          <button onClick={load} className="btn-primary inline-flex items-center gap-2 group text-sm sm:text-lg px-6 py-2.5 sm:px-8 sm:py-3">
            <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
            Réessayer
          </button>
        </div>
      ) : favorites.length === 0 ? (
        <div className="card p-8 sm:p-16 text-center border-navy-800 bg-white/[0.02]">
          <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white/5 rounded-xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <Heart className="w-8 h-8 sm:w-10 sm:h-10 text-navy-400" />
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-white mb-2">Aucun favori</h2>
          <p className="text-sm sm:text-lg text-navy-300 mb-6 sm:mb-8 max-w-md mx-auto">
            Ajoutez vos chaînes préférées en favoris pour les retrouver rapidement ici.
          </p>
          <Link to="/" className="btn-primary inline-flex items-center gap-2 group text-sm sm:text-lg px-6 py-2.5 sm:px-8 sm:py-3">
            <Tv className="w-4 h-4 sm:w-5 sm:h-5" />
            Parcourir les chaînes
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
          {favorites.map((fav) => {
            const ch = fav.channel;
            return (
              <div key={fav.id} className="card p-3 sm:p-5 group relative overflow-hidden flex flex-col justify-between aspect-[4/5] sm:aspect-square max-h-[250px] sm:max-h-[300px] hover:-translate-y-1 transition-all duration-300 hover:shadow-2xl hover:shadow-brand-500/10">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none" />

                {/* Premium badge */}
                {ch.is_premium && (
                  <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20">
                    <div className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-md sm:rounded-lg text-[8px] sm:text-[10px] font-black uppercase flex items-center gap-1 shadow-lg backdrop-blur-md">
                      <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Pro
                    </div>
                  </div>
                )}

                <div className="flex-1 flex flex-col items-center justify-center z-10 relative">
                  {/* Logo */}
                  {ch.logo_url ? (
                    <img loading="lazy"
                      src={safeLogoUrl(ch.logo_url)!}
                      alt={ch.name}
                      className="w-14 h-14 sm:w-20 sm:h-20 object-contain mb-2 sm:mb-4 group-hover:scale-110 transition-transform duration-500 drop-shadow-2xl"
                    />
                  ) : (
                    <div className="w-14 h-14 sm:w-20 sm:h-20 bg-brand-500/10 rounded-xl flex items-center justify-center mb-2 sm:mb-4 border border-brand-500/20 group-hover:scale-110 transition-transform duration-500">
                      <Tv className="w-6 h-6 sm:w-10 sm:h-10 text-brand-400" />
                    </div>
                  )}

                  <h3 className="text-sm sm:text-lg font-bold text-white mb-1 truncate w-full text-center px-1 sm:px-2">{ch.name}</h3>
                  <p className="text-[10px] sm:text-sm text-navy-300 font-medium px-2 py-0.5 sm:px-3 sm:py-1 bg-white/5 rounded-full">{ch.category || 'TV'}</p>
                </div>
                
                {/* Actions overlay */}
                <div className="absolute left-0 right-0 bottom-0 p-2 sm:p-4 translate-y-0 sm:translate-y-full sm:group-hover:translate-y-0 transition-transform duration-300 z-20 flex gap-1.5 sm:gap-2">
                  <Link
                    to={`/watch/${ch.id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-brand-500 text-[#050505] hover:bg-brand-400 transition-colors font-bold text-xs sm:text-sm shadow-md"
                  >
                    <Play className="w-3 h-3 sm:w-4 sm:h-4 fill-[#050505]" />
                    Play
                  </Link>
                  <button
                    onClick={(e) => { e.preventDefault(); remove(fav.id); }}
                    disabled={removingId === fav.id}
                    className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors border border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Retirer des favoris"
                  >
                    {removingId === fav.id ? (
                      <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
