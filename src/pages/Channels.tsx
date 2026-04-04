import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { channelApi } from '../api';
import type { Channel } from '../types';
import { Search, Tv, Play, Crown, Antenna, X, MonitorPlay, AlertCircle, RefreshCw, Loader2, Globe, Film, Clapperboard, Dribbble, Newspaper, Compass, Baby, Music, Map as MapIcon, LayoutGrid, Laugh } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { safeLogoUrl } from '../common/utils/safeLogoUrl';

const PAGE_SIZE = 50;

const getCategoryIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n === 'toutes') return <LayoutGrid className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 opacity-80" />;
  if (n.includes('généraliste') || n.includes('generaliste')) return <Tv className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 opacity-80" />;
  if (n.includes('cinéma') || n.includes('cinema')) return <Film className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 opacity-80" />;
  if (n.includes('série') || n.includes('serie')) return <Clapperboard className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 opacity-80" />;
  if (n.includes('sport')) return <Dribbble className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 opacity-80" />;
  if (n.includes('info')) return <Newspaper className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 opacity-80" />;
  if (n.includes('docu')) return <Compass className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 opacity-80" />;
  if (n.includes('jeunesse') || n.includes('enfant')) return <Baby className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 opacity-80" />;
  if (n.includes('musique')) return <Music className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 opacity-80" />;
  if (n.includes('région') || n.includes('region')) return <MapIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 opacity-80" />;
  if (n.includes('inter') || n.includes('monde')) return <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 opacity-80" />;
  if (n.includes('divertissement')) return <Laugh className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 opacity-80" />;
  return <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 opacity-80" />;
};

export default function Channels() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([]);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useDocumentTitle('Chaînes TV - Xonaris');

  const urlSearch = searchParams.get('q') || '';
  const category = searchParams.get('cat') || 'Toutes';

  const [inputValue, setInputValue] = useState(urlSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(urlSearch);

  useEffect(() => {
    setInputValue(urlSearch);
  }, [urlSearch]);

  const setSearch = (value: string) => {
    setInputValue(value);
  };

  const setCategory = (value: string) => {
    setSearchParams((prev) => {
      if (value && value !== 'Toutes') prev.set('cat', value); else prev.delete('cat');
      return prev;
    }, { replace: true });
  };

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(inputValue);
      setSearchParams((prev) => {
        if (inputValue !== (prev.get('q') || '')) {
            if (inputValue) prev.set('q', inputValue);
            else prev.delete('q');
            return prev;
        }
        return prev;
      }, { replace: true });
    }, 300);
    return () => clearTimeout(t);
  }, [inputValue, setSearchParams]);

  // Load categories once
  useEffect(() => {
    channelApi.getCategories().then(setCategories).catch(() => {});
  }, []);

  // Load channels (reset on filter change)
  const loadChannels = useCallback(async (pageNum: number, append = false) => {
    if (!append) {
      setLoading(true);
      setError(false);
    } else {
      setLoadingMore(true);
    }

    try {
      const data = await channelApi.getAll(
        pageNum,
        PAGE_SIZE,
        debouncedSearch || undefined,
        category !== 'Toutes' ? category : undefined,
      );
      if (append) {
        setChannels((prev) => [...prev, ...data.items]);
      } else {
        // Shuffle channels for a fresh random order on each page load
        const shuffled = [...data.items].sort(() => Math.random() - 0.5);
        setChannels(shuffled);
      }
      setTotalCount(data.total);
      setPage(pageNum);
      setHasMore(pageNum < data.totalPages);
    } catch {
      if (!append) setError(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [debouncedSearch, category]);

  // Reset to page 1 when filters change
  useEffect(() => {
    loadChannels(1, false);
  }, [debouncedSearch, category]);

  // Infinite scroll with IntersectionObserver
  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore || loading) return;
    loadChannels(page + 1, true);
  }, [hasMore, loadingMore, loading, page, loadChannels]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) loadMore(); },
      { rootMargin: '400px' },
    );
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [loadMore]);

  // Build category list: "Toutes" + dynamic categories from API
  const allCategories = [{ name: 'Toutes', count: totalCount }, ...categories];

  return (
    <div className="min-h-screen relative pt-20 sm:pt-28 pb-8 sm:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <div className="flex flex-col gap-6 sm:gap-8 mb-6 sm:mb-10 animate-fade-down">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
            <div>
              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mb-2 sm:mb-3">
                Zappez, <span className="text-gradient">Profitez.</span>
              </h1>
              <p className="text-navy-300 text-sm sm:text-lg font-medium max-w-xl">
                Accédez à {totalCount > 0 ? `plus de ${totalCount}` : 'vos'} chaînes en direct avec une qualité optimale et sans coupure.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-80 shrink-0 group">
              <div className="absolute inset-0 bg-brand-500/20 rounded-xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 -z-10" />
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-navy-400 group-focus-within:text-brand-400 transition-colors" />
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une chaîne..."
                className="w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-3 sm:py-4 bg-navy-900 border border-white/10 rounded-xl text-white text-sm sm:text-base placeholder-navy-400 focus:outline-none focus:ring-1 focus:ring-brand-500/50 focus:border-brand-500/50 focus:bg-white/[0.02] shadow-sm transition-all duration-300"
              />
              {inputValue && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 p-1 sm:p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-navy-300 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Categories */}
          <div className="flex flex-nowrap lg:flex-wrap items-center gap-2 sm:gap-3 overflow-x-auto lg:overflow-visible pb-2 sm:pb-4 lg:pb-0 scrollbar-none snap-x w-full">
            {allCategories.map((cat) => {
              const isActive = category === cat.name;
              return (
                <button
                  key={cat.name}
                  onClick={() => setCategory(cat.name)}
                  className={`snap-start flex flex-shrink-0 lg:flex-grow-0 items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-base font-semibold whitespace-nowrap transition-all duration-300 ${
                    isActive
                      ? 'bg-brand-500 text-[#050505] shadow-md'
                      : 'bg-navy-900 border border-navy-800 text-navy-200 hover:bg-white/5 hover:border-white/10 hover:text-white'
                  }`}
                >
                  {getCategoryIcon(cat.name)}
                  <span className="flex items-center">{cat.name}</span>
                  {cat.count > 0 && (
                    <span className={`text-[11px] px-2 py-0.5 rounded-full flex items-center justify-center font-bold ${
                      isActive ? 'bg-navy-950/20 text-[#050505]' : 'bg-brand-500/10 text-brand-400'
                    }`}>
                      {cat.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Filters */}
        {(urlSearch || category !== 'Toutes') && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-6 sm:mb-8 animate-fade-up">
            <span className="text-xs sm:text-sm font-medium text-brand-400 flex items-center gap-1.5">
              <MonitorPlay className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{totalCount} résultat{totalCount !== 1 ? 's' : ''}</span>
            </span>
            <div className="h-3 sm:h-4 w-px bg-white/10 mx-0.5 sm:mx-1" />
            {urlSearch && (
              <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium">
                "{urlSearch}"
                <button onClick={() => setSearch('')} className="hover:text-white transition-colors ml-1">
                  <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              </span>
            )}
            {category !== 'Toutes' && (
              <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 bg-white/5 border border-white/10 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium">
                {category}
                <button onClick={() => setCategory('Toutes')} className="hover:text-red-400 transition-colors ml-1">
                  <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Channels Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="card p-4 sm:p-6 animate-pulse border-navy-800">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/5 rounded-xl sm:rounded-[1.25rem] mx-auto mb-3 sm:mb-4" />
                <div className="h-4 sm:h-5 bg-white/5 rounded-lg w-2/3 mx-auto mb-2 sm:mb-3" />
                <div className="h-2 sm:h-3 bg-white/5 rounded-lg w-1/3 mx-auto" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="card border-dashed border-2 border-red-500/20 bg-transparent p-8 sm:p-16 text-center animate-fade-up">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-500/10 rounded-xl sm:rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-red-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Impossible de charger les chaînes</h3>
            <p className="text-sm sm:text-base text-navy-300">
              Veuillez vérifier votre connexion internet et réessayer.
            </p>
            <button
              onClick={() => loadChannels(1)}
              className="mt-4 sm:mt-6 btn-primary inline-flex items-center gap-2 text-sm sm:text-base px-4 py-2"
            >
              <RefreshCw className="w-4 h-4" /> Réessayer
            </button>
          </div>
        ) : channels.length === 0 ? (
          <div className="card border-dashed border-2 border-white/10 bg-transparent p-8 sm:p-16 text-center animate-fade-up">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/5 rounded-xl sm:rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <Tv className="w-8 h-8 sm:w-10 sm:h-10 text-navy-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Aucune chaîne trouvée</h3>
            <p className="text-sm sm:text-base text-navy-300 max-w-sm mx-auto">
               Essayez de modifier vos filtres ou de chercher avec un autre mot-clé.
            </p>
            <button 
              onClick={() => { setSearch(''); setCategory('Toutes'); }}
              className="mt-4 sm:mt-6 btn-secondary text-sm sm:text-base px-4 py-2"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5 auto-rows-max">
              {channels.map((ch, idx) => (
                <Link
                  key={ch.id}
                  to={`/watch/${ch.id}`}
                  className="card-hover group relative overflow-hidden flex flex-col p-4 sm:p-6 animate-fade-up"
                  style={{ animationDelay: `${Math.min(idx * 0.03, 0.3)}s` }}
                >
                  {ch.is_premium && (
                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10">
                      <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-[#050505] p-1 sm:p-1.5 rounded-lg sm:rounded-xl shadow-md">
                        <Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </div>
                    </div>
                  )}

                  <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-red-500/90 backdrop-blur-md rounded-md sm:rounded-lg text-[8px] sm:text-[10px] font-black text-white uppercase tracking-widest shadow-lg shadow-red-500/30">
                      <span className="w-1 h-1 sm:w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      Live
                    </div>
                  </div>

                  <div className="relative mb-3 sm:mb-5 flex-1 flex items-center justify-center min-h-[64px] sm:min-h-[80px]">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 relative">
                      {ch.logo_url ? (
                        <img loading="lazy"
                          src={safeLogoUrl(ch.logo_url)!}
                          alt={ch.name}
                          className="w-full h-full object-contain drop-shadow-2xl group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-xl sm:rounded-[1.25rem] flex items-center justify-center group-hover:scale-110 group-hover:border-brand-500/30 group-hover:bg-brand-500/10 transition-all duration-500 shadow-inner">
                          <Tv className="w-6 h-6 sm:w-8 sm:h-8 text-navy-300 group-hover:text-brand-400 transition-colors" />
                        </div>
                      )}

                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-500 rounded-full flex items-center justify-center shadow-md opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 transition-all duration-500 ease-out">
                          <Play className="w-4 h-4 sm:w-5 sm:h-5 text-[#050505] ml-0.5" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center mt-auto">
                    <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-brand-400 transition-colors truncate mb-1 sm:mb-1.5">
                      {ch.name}
                    </h3>
                    <div className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-md sm:rounded-lg bg-white/5 border border-navy-800 text-[10px] sm:text-xs font-medium text-navy-300 group-hover:bg-brand-500/10 group-hover:text-brand-400 group-hover:border-brand-500/20 transition-colors">
                      {ch.category || 'TV'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-1" />

            {/* Loading more indicator */}
            {loadingMore && (
              <div className="flex items-center justify-center py-8 gap-3 text-navy-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-medium">Chargement…</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
