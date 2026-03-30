import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { adminApi } from '../../api';
import type { News } from '../../types';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import {
  ArrowLeft, Save, Image, Type, FileText, Eye, AlertCircle,
  Edit3, Trash2, RefreshCw, Calendar, Heart, CheckCircle, X, AlertTriangle,
} from 'lucide-react';

export default function NewsEdit() {
  useDocumentTitle('Admin — Modifier article');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [article, setArticle] = useState<News | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);
  const [toast, setToast] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      if (!id) return;
      setLoading(true);
      try {
        const found = await adminApi.getNewsById(id);
        setArticle(found);
        setTitle(found.title);
        setContent(found.content);
        setImageUrl(found.image_url ?? '');
      } catch {
        setArticle(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const hasChanges = useMemo(() => {
    if (!article) return false;
    return (
      title !== article.title ||
      content !== article.content ||
      (imageUrl || '') !== (article.image_url || '')
    );
  }, [article, title, content, imageUrl]);

  const valid = title.trim().length >= 3 && content.trim().length >= 10;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || !id) return;
    setSaving(true);
    setError('');
    try {
      await adminApi.updateNews(id, {
        title: title.trim(),
        content: content.trim(),
        image_url: imageUrl.trim() || undefined,
      });
      setArticle((prev) =>
        prev ? { ...prev, title: title.trim(), content: content.trim(), image_url: imageUrl.trim() || null } : prev,
      );
      setToast('Article mis à jour !');
      setTimeout(() => setToast(''), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erreur lors de la mise à jour.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await adminApi.deleteNews(id);
      navigate('/admin/news');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erreur lors de la suppression.');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  /* ---------- loading / not found ---------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <RefreshCw size={28} className="animate-spin text-mint-400" />
      </div>
    );
  }
  if (!article) {
    return (
      <div className="card p-12 text-center space-y-3">
        <AlertCircle size={36} className="mx-auto text-red-400" />
        <p className="text-white/60">Article introuvable</p>
        <Link to="/admin/news" className="btn-secondary text-sm inline-flex items-center gap-1.5">
          <ArrowLeft size={14} /> Retour
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[200] card p-3 border border-brand-500/30 bg-brand-500/10 flex items-center gap-2 text-sm text-indigo-300 animate-in fade-in slide-in-from-top-2">
          <CheckCircle size={16} /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/admin/news" className="btn-secondary p-2"><ArrowLeft size={18} /></Link>
          <div>
            <h1 className="text-2xl font-bold font-display flex items-center gap-2">
              <Edit3 size={22} className="text-mint-400" /> Modifier l'article
            </h1>
            <div className="flex items-center gap-3 text-xs text-white/40 mt-1">
              <span className="flex items-center gap-1"><Calendar size={10} /> {fmt(article.created_at)}</span>
              <span className="flex items-center gap-1"><Heart size={10} className="text-pink-400" /> {article.likes_count} likes</span>
              <span className="font-mono text-white/20">{article.id.slice(0, 8)}</span>
            </div>
          </div>
        </div>
        {hasChanges && (
          <span className="badge text-xs">Modifications non sauvegardées</span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <form onSubmit={handleSave} className="lg:col-span-3 space-y-5">
          {error && (
            <div className="card p-3 border border-red-500/30 bg-red-500/10 flex items-center gap-2 text-sm text-red-300">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Title */}
          <div className="card p-4 space-y-2">
            <label className="text-sm font-medium flex items-center gap-2 text-white/70">
              <Type size={14} className="text-mint-400" /> Titre
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de l'article"
              className="input-field w-full"
              maxLength={200}
            />
            <div className="flex justify-between text-xs text-white/30">
              <span>{title.length < 3 ? 'Min. 3 caractères' : ''}</span>
              <span>{title.length}/200</span>
            </div>
          </div>

          {/* Image URL */}
          <div className="card p-4 space-y-2">
            <label className="text-sm font-medium flex items-center gap-2 text-white/70">
              <Image size={14} className="text-brand-400" /> Image (URL, optionnel)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="input-field w-full"
            />
            {imageUrl && (
              <div className="mt-2 rounded-lg overflow-hidden border border-white/10 max-h-40">
                <img
                  src={imageUrl}
                  alt="Aperçu"
                  className="w-full h-40 object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2 text-white/70">
                <FileText size={14} className="text-amber-400" /> Contenu
              </label>
              <button
                type="button"
                onClick={() => setPreview(!preview)}
                className="text-xs flex items-center gap-1 text-mint-400 hover:text-sky-300 transition"
              >
                <Eye size={12} /> {preview ? 'Éditeur' : 'Aperçu'}
              </button>
            </div>
            {preview ? (
              <div className="prose prose-invert prose-sm max-w-none min-h-[200px] p-3 rounded-lg bg-white/5 whitespace-pre-wrap text-sm text-white/80">
                {content || <span className="text-white/30 italic">Aucun contenu…</span>}
              </div>
            ) : (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Rédigez le contenu de l'article…"
                rows={10}
                className="input-field w-full resize-y min-h-[200px]"
              />
            )}
            <div className="flex justify-between text-xs text-white/30">
              <span>{content.length < 10 ? 'Min. 10 caractères' : `${content.split(/\s+/).filter(Boolean).length} mots`}</span>
              <span>{content.length} caractères</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={!valid || !hasChanges || saving}
              className="btn-primary flex items-center gap-2 text-sm disabled:opacity-40"
            >
              <Save size={14} /> {saving ? 'Sauvegarde…' : 'Enregistrer'}
            </button>
            <Link to="/admin/news" className="btn-secondary text-sm">Annuler</Link>
          </div>
        </form>

        {/* Sidebar: preview + danger */}
        <div className="lg:col-span-2 space-y-4">
          {/* Live preview */}
          <div className="card p-4 sticky top-6">
            <h3 className="text-sm font-semibold font-display flex items-center gap-2 mb-4 text-white/70">
              <Eye size={14} className="text-mint-400" /> Aperçu
            </h3>
            <div className="rounded-lg overflow-hidden border border-white/10 bg-white/[0.02]">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt=""
                  className="w-full h-36 object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className="h-36 bg-white/5 flex items-center justify-center">
                  <Image size={28} className="text-white/10" />
                </div>
              )}
              <div className="p-4 space-y-2">
                <h4 className="font-semibold font-display text-sm">
                  {title || <span className="text-white/20 italic">Titre…</span>}
                </h4>
                <p className="text-xs text-white/40 line-clamp-4 whitespace-pre-wrap">
                  {content || <span className="italic">Contenu…</span>}
                </p>
                <div className="flex items-center gap-3 pt-2 border-t border-navy-800 text-xs text-white/30">
                  <span className="flex items-center gap-1"><Calendar size={10} /> {fmt(article.created_at)}</span>
                  <span className="flex items-center gap-1"><Heart size={10} className="text-pink-400" /> {article.likes_count}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Danger zone */}
          <div className="card p-4 border border-red-500/20">
            <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2 mb-3">
              <AlertTriangle size={14} /> Zone dangereuse
            </h3>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="btn-danger text-sm w-full flex items-center justify-center gap-2"
              >
                <Trash2 size={14} /> Supprimer cet article
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-white/60">Cette action est irréversible. L'article et ses likes seront supprimés.</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="btn-secondary flex-1 text-sm flex items-center justify-center gap-1.5"
                  >
                    <X size={14} /> Annuler
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="btn-danger flex-1 text-sm flex items-center justify-center gap-1.5"
                  >
                    <Trash2 size={14} /> {deleting ? 'Suppression…' : 'Confirmer'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
