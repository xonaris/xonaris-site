import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api';
import { fmtDateShort } from '../../common/utils/date';
import type { News as NewsType } from '../../types';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import {
  Newspaper, Plus, Search, Trash2, Edit3, Heart, Calendar,
  Image, ArrowUpDown, RefreshCw, Eye, AlertTriangle, X, ChevronLeft, ChevronRight,
} from 'lucide-react';

type SortKey = 'created_at' | 'title' | 'likes_count';

export default function News() {
  useDocumentTitle('Admin — Actualités');
  const [articles, setArticles] = useState<NewsType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortAsc, setSortAsc] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const perPage = 12;

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.getNews();
      setArticles(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Impossible de charger les articles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  /* ---------- sort / filter ---------- */
  const filtered = useMemo(() => {
    let list = [...articles];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) => a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q),
      );
    }
    list.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === 'number' && typeof vb === 'number') return sortAsc ? va - vb : vb - va;
      return sortAsc
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
    return list;
  }, [articles, search, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  useEffect(() => { setPage(1); }, [search, sortKey, sortAsc]);

  /* ---------- handlers ---------- */
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await adminApi.deleteNews(deleteId);
      setArticles((prev) => prev.filter((a) => a.id !== deleteId));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erreur lors de la suppression.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const fmt = fmtDateShort;

  /* ---------- stats ---------- */
  const totalLikes = articles.reduce((s, a) => s + a.likes_count, 0);
  const withImage = articles.filter((a) => a.image_url).length;

  /* ---------- render ---------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <RefreshCw size={28} className="animate-spin text-mint-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" />
          {error}
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2">
            <Newspaper size={26} className="text-mint-400" /> Actualités
          </h1>
          <p className="text-sm text-navy-300 mt-1">{articles.length} article{articles.length > 1 ? 's' : ''} publiés</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-secondary flex items-center gap-1.5 text-sm">
            <RefreshCw size={14} /> Rafraîchir
          </button>
          <Link to="/admin/news/create" className="btn-primary flex items-center gap-1.5 text-sm">
            <Plus size={14} /> Nouvel article
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Articles', value: articles.length, icon: Newspaper, color: 'text-mint-400', bg: 'bg-mint-500/10' },
          { label: 'Likes totaux', value: totalLikes, icon: Heart, color: 'text-pink-400', bg: 'bg-pink-500/10' },
          { label: 'Avec image', value: withImage, icon: Image, color: 'text-brand-400', bg: 'bg-brand-500/10' },
        ].map((s) => (
          <div key={s.label} className="card p-4 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold font-display text-white">{s.value}</p>
              <p className="text-xs text-navy-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un article…"
            className="input-field pl-9 w-full"
          />
        </div>
        <div className="flex items-center gap-2 text-sm">
          {(['created_at', 'title', 'likes_count'] as SortKey[]).map((k) => {
            const labels: Record<SortKey, string> = { created_at: 'Date', title: 'Titre', likes_count: 'Likes' };
            return (
              <button
                key={k}
                onClick={() => toggleSort(k)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition ${
                  sortKey === k ? 'bg-mint-500/20 text-sky-300' : 'bg-white/5 text-white/60 hover:text-white'
                }`}
              >
                <ArrowUpDown size={12} /> {labels[k]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      {paged.length === 0 ? (
        <div className="card p-12 text-center text-white/40">
          <Newspaper size={40} className="mx-auto mb-3 opacity-30" />
          <p>Aucun article trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paged.map((article) => (
            <div key={article.id} className="card-hover flex flex-col overflow-hidden group">
              {/* Image */}
              {article.image_url ? (
                <div className="relative h-40 overflow-hidden">
                  <img
                    src={article.image_url}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
              ) : (
                <div className="h-40 bg-white/5 flex items-center justify-center">
                  <Image size={32} className="text-white/10" />
                </div>
              )}

              {/* Body */}
              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-semibold font-display text-sm line-clamp-2 mb-1">
                  {article.title}
                </h3>
                <p className="text-xs text-white/40 line-clamp-2 flex-1">{article.content}</p>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-navy-800 text-xs text-white/50">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} /> {fmt(article.created_at)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart size={12} className="text-pink-400" /> {article.likes_count}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3">
                  <Link
                    to={`/news/${article.id}`}
                    className="btn-secondary flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5"
                  >
                    <Eye size={12} /> Voir
                  </Link>
                  <Link
                    to={`/admin/news/${article.id}`}
                    className="btn-secondary flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5"
                  >
                    <Edit3 size={12} /> Modifier
                  </Link>
                  <button
                    onClick={() => setDeleteId(article.id)}
                    className="btn-danger flex items-center justify-center gap-1.5 text-xs py-1.5 px-3"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="btn-secondary p-2 disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-xs font-medium transition ${
                p === page ? 'bg-mint-500 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="btn-secondary p-2 disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Delete modal */}
      {deleteId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="card p-6 w-full max-w-sm space-y-4 animate-in fade-in zoom-in">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle size={24} />
              <h3 className="font-semibold font-display">Supprimer l'article ?</h3>
            </div>
            <p className="text-sm text-white/60">Cette action est irréversible.</p>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setDeleteId(null)} className="btn-secondary text-sm flex items-center gap-1.5">
                <X size={14} /> Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn-danger text-sm flex items-center gap-1.5"
              >
                <Trash2 size={14} /> {deleting ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
