import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { adminApi } from '../../api';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import {
  Newspaper, ArrowLeft, Save, Image, Type, FileText,
  Eye, AlertCircle,
} from 'lucide-react';

export default function NewsCreate() {
  useDocumentTitle('Admin — Nouvel article');
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);

  const valid = title.trim().length >= 3 && content.trim().length >= 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setError('');
    try {
      await adminApi.createNews({
        title: title.trim(),
        content: content.trim(),
        ...(imageUrl.trim() ? { image_url: imageUrl.trim() } : {}),
      });
      navigate('/admin/news');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erreur lors de la création.');
    } finally {
      setSaving(false);
    }
  };

  const fmt = () =>
    new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/admin/news" className="btn-secondary p-2"><ArrowLeft size={18} /></Link>
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2">
            <Newspaper size={22} className="text-mint-400" /> Nouvel article
          </h1>
          <p className="text-sm text-white/50 mt-0.5">Créer une actualité visible par tous les utilisateurs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-5">
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
              disabled={!valid || saving}
              className="btn-primary flex items-center gap-2 text-sm disabled:opacity-40"
            >
              <Save size={14} /> {saving ? 'Publication…' : 'Publier l\'article'}
            </button>
            <Link to="/admin/news" className="btn-secondary text-sm">Annuler</Link>
          </div>
        </form>

        {/* Live preview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-4 sticky top-6">
            <h3 className="text-sm font-semibold font-display flex items-center gap-2 mb-4 text-white/70">
              <Eye size={14} className="text-mint-400" /> Aperçu en direct
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
                  {title || <span className="text-white/20 italic">Titre de l'article</span>}
                </h4>
                <p className="text-xs text-white/40 line-clamp-4 whitespace-pre-wrap">
                  {content || <span className="italic">Le contenu apparaîtra ici…</span>}
                </p>
                <div className="flex items-center gap-3 pt-2 border-t border-navy-800 text-xs text-white/30">
                  <span className="flex items-center gap-1"><Newspaper size={10} /> {fmt()}</span>
                  <span className="flex items-center gap-1"><span className="text-pink-400">♥</span> 0</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
