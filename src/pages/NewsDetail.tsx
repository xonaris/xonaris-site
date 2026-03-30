import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { newsApi } from '../api';
import { fmtDateLong } from '../common/utils/date';
import { useAuth } from '../context/AuthContext';
import type { News } from '../types';
import { ArrowLeft, Calendar, Heart, Newspaper, Share2, AlertCircle } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function NewsDetail() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const [news, setNews] = useState<News | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [shared, setShared] = useState(false);
  const [likeError, setLikeError] = useState('');
  useDocumentTitle(news?.title ? `${news.title} - Xonaris` : 'Article - Xonaris');

  useEffect(() => {
    if (!id) return;
    newsApi
      .getById(id)
      .then(setNews)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  const toggleLike = async () => {
    if (!news || !isAuthenticated) return;
    setLikeError('');
    try {
      if (news.liked_by_me) {
        const res = await newsApi.unlike(news.id);
        setNews({ ...news, liked_by_me: false, likes_count: res.likes_count });
      } else {
        const res = await newsApi.like(news.id);
        setNews({ ...news, liked_by_me: true, likes_count: res.likes_count });
      }
    } catch {
      setLikeError('Impossible d\'envoyer votre like. Réessayez.');
      setTimeout(() => setLikeError(''), 4000);
    }
  };

  const shareArticle = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      // Fallback for non-HTTPS or denied permissions
      const textarea = document.createElement('textarea');
      textarea.value = window.location.href;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-32 pb-12">
        <div className="animate-pulse">
          <div className="h-5 bg-white/5 rounded-full w-32 mb-10" />
          <div className="h-12 bg-white/5 rounded-full w-5/6 mb-6" />
          <div className="h-6 bg-white/5 rounded-full w-1/3 mb-12" />
          <div className="h-96 bg-white/5 rounded-xl mb-12" />
          <div className="space-y-4">
            <div className="h-5 bg-white/5 rounded-full w-full" />
            <div className="h-5 bg-white/5 rounded-full w-full" />
            <div className="h-5 bg-white/5 rounded-full w-4/5" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !news) {
    return (
      <div className="w-full min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 text-center animate-fade-down">
        <div className="w-24 h-24 bg-white/5 rounded-xl flex items-center justify-center mx-auto mb-8 border border-white/10 shadow-2xl">
          <Newspaper className="w-10 h-10 text-navy-400" />
        </div>
        <h2 className="text-3xl font-display font-black text-white mb-4">Article introuvable</h2>
        <p className="text-navy-300 text-lg mb-10">Cet article n'existe pas, a été supprimé ou est en cours de rédaction.</p>
        <Link to="/news" className="btn-primary inline-flex items-center gap-2 group text-lg px-8 py-3">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Retour aux actualités
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-32 pb-16 animate-fade-up relative">
      {/* Background glow */}

      {/* Back link */}
      <Link
        to="/news"
        className="inline-flex items-center gap-2 text-sm font-bold text-navy-400 hover:text-brand-400 transition-colors mb-12 group uppercase tracking-wider"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Retour aux actualités
      </Link>

      <article>
        {/* Title layer */}
        <div className="mb-10 w-full">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm font-bold uppercase tracking-wider mb-6">
            <Newspaper className="w-4 h-4" />
            Actualité
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-display font-black text-white leading-[1.1] tracking-tight mb-8">
            {news.title}
          </h1>

          <div className="flex flex-wrap items-center justify-start gap-4 text-sm font-bold text-navy-300 uppercase tracking-wider">
            <span className="flex items-center gap-2 bg-white/5 px-4 py-2 border border-navy-800 rounded-xl">
              <Calendar className="w-4 h-4" />
              {fmtDateLong(news.created_at)}
            </span>
          </div>
        </div>

        {/* Image */}
        {news.image_url && (
          <div className="rounded-[2.5rem] overflow-hidden mb-12 shadow-2xl shadow-black/50 border border-navy-800 relative group">
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <img loading="lazy"
              src={news.image_url}
              alt={news.title}
              className="w-full object-cover max-h-[500px] hover:scale-105 transition-transform duration-700"
            />
          </div>
        )}

        {/* Content */}
        <div className="prose prose-invert prose-lg prose-slate max-w-none prose-headings:font-display prose-headings:font-black prose-a:text-brand-400 hover:prose-a:text-brand-300 prose-p:text-navy-200 prose-p:leading-relaxed whitespace-pre-wrap">
          {news.content}
        </div>

        {/* Action Bottom */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6">
          {likeError && (
            <div className="w-full flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 mb-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {likeError}
            </div>
          )}
          <div className="flex items-center gap-4">
             {isAuthenticated ? (
              <button
                onClick={toggleLike}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl border text-base font-bold transition-all shadow-lg ${
                  news.liked_by_me
                    ? 'bg-red-500/20 border-red-500/30 text-red-400 shadow-red-500/10 hover:bg-red-500/30'
                    : 'bg-white/5 border-white/10 text-navy-200 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400'
                }`}
              >
                <Heart className={`w-5 h-5 ${news.liked_by_me ? 'fill-current' : ''}`} />
                {news.liked_by_me ? 'Aimé' : "J'aime"} {news.likes_count > 0 && `· ${news.likes_count}`}
              </button>
            ) : news.likes_count > 0 ? (
              <span className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-navy-800 text-navy-300 font-bold">
                <Heart className="w-5 h-5" />
                {news.likes_count} mentions J'aime
              </span>
            ) : null}

            <button
              onClick={shareArticle}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl border text-base font-bold transition-all shadow-lg ${
                shared
                  ? 'bg-brand-500/20 border-brand-500/30 text-brand-400 shadow-brand-500/10'
                  : 'bg-white/5 border-white/10 text-navy-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Share2 className="w-5 h-5" />
              {shared ? 'Lien copié !' : 'Partager'}
            </button>
          </div>
          
          <Link to="/news" className="text-sm font-bold text-navy-400 hover:text-white transition-colors flex items-center gap-2 group uppercase tracking-wider">
            Plus d'articles
            <ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </article>
    </div>
  );
}
