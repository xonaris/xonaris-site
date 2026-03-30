import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { newsApi } from '../api';
import { fmtDateLong, fmtDateShort } from '../common/utils/date';
import type { News } from '../types';
import { Newspaper, ChevronRight, Calendar, Heart, AlertTriangle } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function NewsList() {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useDocumentTitle('Actualités - Xonaris');

  useEffect(() => {
    newsApi.getAll()
      .then((res) => setNews(res.items))
      .catch((err: any) => setError(err?.response?.data?.message || 'Impossible de charger les actualités.'))
      .finally(() => setLoading(false));
  }, []);

  const featured = news[0];
  const rest = news.slice(1);

  return (
    <div className="w-full min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-12 animate-fade-up">
      {/* Header */}
      <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-brand-500/10 rounded-[1.5rem] flex items-center justify-center border border-brand-500/20 shadow-md">
            <Newspaper className="w-7 h-7 sm:w-8 sm:h-8 text-brand-400" />
          </div>
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-black text-white tracking-tight">
              Actualités <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-mint-500">Xonaris</span>
            </h1>
            <p className="text-navy-300 mt-1 font-medium text-base sm:text-lg">
              {news.length} article{news.length !== 1 ? 's' : ''} publiés
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-8">
          {/* Featured skeleton */}
          <div className="card overflow-hidden animate-pulse border-navy-800 bg-white/[0.02]">
            <div className="h-80 bg-white/5" />
            <div className="p-8">
              <div className="h-4 bg-white/5 rounded-full w-1/6 mb-4" />
              <div className="h-10 bg-white/5 rounded-full w-2/3 mb-4" />
              <div className="h-5 bg-white/5 rounded-full w-full mb-3" />
              <div className="h-5 bg-white/5 rounded-full w-4/5" />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card p-6 animate-pulse border-navy-800 bg-white/[0.02]">
                <div className="h-48 bg-white/5 rounded-xl mb-6" />
                <div className="h-4 bg-white/5 rounded-full w-1/4 mb-4" />
                <div className="h-6 bg-white/5 rounded-full w-3/4 mb-3" />
                <div className="h-5 bg-white/5 rounded-full w-full" />
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="card p-16 text-center border-navy-800 bg-white/[0.02]">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-secondary text-sm">Réessayer</button>
        </div>
      ) : news.length === 0 ? (
        <div className="card p-16 text-center border-navy-800 bg-white/[0.02]">
          <div className="w-24 h-24 bg-white/5 rounded-xl flex items-center justify-center mx-auto mb-6">
            <Newspaper className="w-10 h-10 text-navy-400" />
          </div>
          <h2 className="text-2xl font-display font-bold text-white mb-2">Aucune actualité</h2>
          <p className="text-navy-300 text-lg">Les nouvelles de Xonaris apparaîtront ici.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Featured article */}
          {featured && (
            <Link to={`/news/${featured.id}`} className="card group overflow-hidden block border-navy-800 bg-white/[0.02] hover:bg-white/[0.04] transition-all hover:shadow-2xl hover:shadow-brand-500/10">
              <div className="md:grid md:grid-cols-2 h-full">
                {featured.image_url ? (
                  <div className="relative h-64 md:h-full overflow-hidden">
                    <img loading="lazy"
                      src={featured.image_url}
                      alt={featured.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0a0a0a] hidden md:block" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] to-transparent md:hidden" />
                    <div className="absolute top-6 left-6 z-10">
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-brand-500/20 backdrop-blur-md border border-brand-500/30 text-brand-300 text-xs font-black uppercase tracking-wider rounded-xl shadow-lg">
                        <Newspaper className="w-3.5 h-3.5" />
                        À la une
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="h-64 md:h-full bg-gradient-to-br from-brand-500/10 to-mint-500/5 flex items-center justify-center relative">
                     <div className="absolute top-6 left-6 z-10">
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-brand-500/20 backdrop-blur-md border border-brand-500/30 text-brand-300 text-xs font-black uppercase tracking-wider rounded-xl shadow-lg">
                        <Newspaper className="w-3.5 h-3.5" />
                        À la une
                      </span>
                    </div>
                    <Newspaper className="w-20 h-20 text-brand-500/20" />
                  </div>
                )}
                <div className="p-8 md:p-12 flex flex-col justify-start relative z-10">
                  <div className="flex items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
                    <span className="flex items-center gap-2 text-sm font-bold text-navy-400 uppercase tracking-wide">
                      <Calendar className="w-4 h-4" />
                      {fmtDateLong(featured.created_at)}
                    </span>
                    {featured.likes_count > 0 && (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-navy-800 text-xs font-bold text-navy-300">
                        <Heart className="w-3.5 h-3.5" />
                        {featured.likes_count}
                      </span>
                    )}
                  </div>
                  <h2 className="text-3xl md:text-4xl font-display font-black text-white group-hover:text-brand-400 transition-colors mb-4 line-clamp-3">
                    {featured.title}
                  </h2>
                  <p className="text-lg text-navy-300 line-clamp-3 leading-relaxed mb-6">
                    {featured.content}
                  </p>
                  <span className="inline-flex items-center gap-2 text-base text-brand-400 font-bold group-hover:gap-3 transition-all">
                    Lire l'article <ChevronRight className="w-5 h-5" />
                  </span>
                </div>
              </div>
            </Link>
          )}

          {/* Remaining articles grid */}
          {rest.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rest.map((item) => (
                <Link key={item.id} to={`/news/${item.id}`} className="card group overflow-hidden border-navy-800 bg-white/[0.02] hover:bg-white/[0.04] transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-brand-500/5 flex flex-col">
                  {item.image_url ? (
                    <div className="relative h-56 overflow-hidden shrink-0">
                      <img loading="lazy"
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-80" />
                    </div>
                  ) : (
                    <div className="h-56 bg-white/5 flex items-center justify-center shrink-0">
                      <Newspaper className="w-12 h-12 text-navy-600" />
                    </div>
                  )}
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                      <span className="flex items-center gap-2 text-xs font-bold text-navy-400 uppercase tracking-wide">
                        <Calendar className="w-3.5 h-3.5" />
                        {fmtDateShort(item.created_at)}
                      </span>
                      {item.likes_count > 0 && (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-navy-800 text-xs font-bold text-navy-300">
                          <Heart className="w-3.5 h-3.5" />
                          {item.likes_count}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-white group-hover:text-brand-400 transition-colors mb-3 line-clamp-2">
                      {item.title}
                    </h2>
                    <p className="text-navy-300 line-clamp-3 leading-relaxed mb-6 flex-1">
                      {item.content}
                    </p>
                    <span className="inline-flex items-center gap-1.5 text-sm text-brand-400 font-bold group-hover:gap-2.5 transition-all mt-auto">
                      Lire la suite <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


