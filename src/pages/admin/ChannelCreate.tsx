import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../api';
import {
  ArrowLeft, Plus, Tv, Eye, Crown, Hash,
  Image, LayoutList, GripVertical, AlertCircle,
} from 'lucide-react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const categories = ['Généraliste', 'Sport', 'Info', 'Divertissement', 'Cinéma', 'Musique', 'Jeunesse', 'Documentaire'];

function slugify(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function AdminChannelCreate() {
  const navigate = useNavigate();
  useDocumentTitle('Admin — Créer une chaîne');

  const [form, setForm] = useState({
    name: '', slug: '', logo_url: '',
    category: '', is_premium: false, is_active: true, sort_order: 0,
  });
  const [autoSlug, setAutoSlug] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewLogo, setPreviewLogo] = useState(false);

  const update = (field: string, value: unknown) => {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === 'name' && autoSlug) next.slug = slugify(next.name);
      return next;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Le nom est requis.'); return; }
    if (!form.slug.trim()) { setError('Le slug est requis.'); return; }
    if (!form.category) { setError('La catégorie est requise.'); return; }
    setLoading(true);
    setError('');
    try {
      const created = await adminApi.createChannel(form);
      navigate(`/admin/channels/${created.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erreur lors de la création.');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/admin/channels')}
        className="flex items-center gap-2 text-sm text-navy-400 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Retour aux chaînes
      </button>

      <div>
        <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
          <Tv className="w-6 h-6 text-mint-400" />
          Nouvelle chaîne
        </h1>
        <p className="text-sm text-navy-300 mt-1">Créer une nouvelle chaîne de streaming</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Form */}
        <div className="md:col-span-2 card p-6">
          <form onSubmit={submit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-navy-200 mb-1.5">
                <Tv className="w-3.5 h-3.5 text-navy-400" /> Nom de la chaîne *
              </label>
              <input type="text" value={form.name} onChange={(e) => update('name', e.target.value)}
                className="input-field" placeholder="ex: TF1" />
            </div>

            {/* Slug */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-navy-200 mb-1.5">
                <Hash className="w-3.5 h-3.5 text-navy-400" /> Slug *
              </label>
              <div className="flex items-center gap-2">
                <input type="text" value={form.slug}
                  onChange={(e) => { setAutoSlug(false); update('slug', e.target.value); }}
                  className="input-field font-mono text-sm" placeholder="tf1" />
                <button type="button" onClick={() => { setAutoSlug(true); update('name', form.name); }}
                  className="btn-secondary !px-3 !py-2.5 text-xs whitespace-nowrap" title="Auto-générer depuis le nom">
                  Auto
                </button>
              </div>
              {autoSlug && <p className="text-[11px] text-navy-600 mt-1">Slug généré automatiquement depuis le nom</p>}
            </div>

            {/* Logo URL */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-navy-200 mb-1.5">
                <Image className="w-3.5 h-3.5 text-navy-400" /> URL du logo
              </label>
              <input type="text" value={form.logo_url} onChange={(e) => update('logo_url', e.target.value)}
                className="input-field text-sm" placeholder="https://..." />
            </div>

            {/* Category */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-navy-200 mb-1.5">
                <LayoutList className="w-3.5 h-3.5 text-navy-400" /> Catégorie *
              </label>
              <select value={form.category} onChange={(e) => update('category', e.target.value)}
                className="input-field text-sm">
                <option value="">Sélectionner une catégorie</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Sort order */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-navy-200 mb-1.5">
                <GripVertical className="w-3.5 h-3.5 text-navy-400" /> Ordre d'affichage
              </label>
              <input type="number" value={form.sort_order}
                onChange={(e) => update('sort_order', Number(e.target.value))}
                className="input-field text-sm !w-32" min={0} />
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap gap-6 pt-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={(e) => update('is_active', e.target.checked)}
                  className="w-4 h-4 rounded bg-navy-800 border-navy-600 text-brand-600 focus:ring-brand-500/30" />
                <span className="text-sm text-navy-200 flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-brand-400" /> Chaîne active</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.is_premium} onChange={(e) => update('is_premium', e.target.checked)}
                  className="w-4 h-4 rounded bg-navy-800 border-navy-600 text-brand-600 focus:ring-brand-500/30" />
                <span className="text-sm text-navy-200 flex items-center gap-1.5"><Crown className="w-3.5 h-3.5 text-amber-400" /> Chaîne Premium</span>
              </label>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" />
                {loading ? 'Création en cours…' : 'Créer la chaîne'}
              </button>
              <button type="button" onClick={() => navigate('/admin/channels')} className="btn-secondary">
                Annuler
              </button>
            </div>
          </form>
        </div>

        {/* Preview panel */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Aperçu</h3>
            <div className="flex items-center gap-3 mb-4">
              {form.logo_url ? (
                <img loading="lazy" src={form.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover"
                  onError={(e) => (e.currentTarget.style.display = 'none')} />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-mint-500/10 flex items-center justify-center">
                  <Tv className="w-5 h-5 text-mint-400" />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-white">{form.name || 'Nom de la chaîne'}</p>
                <p className="text-xs text-navy-400">/{form.slug || 'slug'}</p>
              </div>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-navy-400">Catégorie</span>
                <span className="text-white">{form.category || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-navy-400">Ordre</span>
                <span className="text-white">{form.sort_order}</span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                {form.is_active && <span className="badge badge-active text-[10px]">Active</span>}
                {!form.is_active && <span className="badge badge-banned text-[10px]">Inactive</span>}
                {form.is_premium && <span className="badge badge-premium text-[10px]">Premium</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
