import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminApi } from '../../api';
import type { ChannelFull, ChannelSourceFull } from '../../types';
import {
  ArrowLeft, Save, Tv, Eye, Crown, Hash,
  Image, LayoutList, GripVertical, AlertCircle, Trash2,
  AlertTriangle, Calendar, CheckCircle2, CheckCircle, Plus, Signal, Pencil, X,
} from 'lucide-react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const categories = ['Généraliste', 'Sport', 'Info', 'Divertissement', 'Cinéma', 'Musique', 'Jeunesse', 'Documentaire'];

export default function AdminChannelEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  useDocumentTitle('Admin — Éditer chaîne');

  const [form, setForm] = useState({
    name: '', slug: '', logo_url: '',
    category: '', is_premium: false, is_active: true, sort_order: 0,
  });
  const [original, setOriginal] = useState<ChannelFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Sources
  const [sources, setSources] = useState<ChannelSourceFull[]>([]);
  const [sourceForm, setSourceForm] = useState({ label: '', hls_url: '', is_premium: false, sort_order: 0, is_active: true });
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [sourceError, setSourceError] = useState('');
  const [sourceSaving, setSourceSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    adminApi.getChannelById(id)
      .then((ch: ChannelFull) => {
        setOriginal(ch);
        setForm({
          name: ch.name, slug: ch.slug,
          logo_url: ch.logo_url || '', category: ch.category || '',
          is_premium: ch.is_premium, is_active: ch.is_active, sort_order: ch.sort_order,
        });
        setSources(ch.sources ?? []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const update = (field: string, value: unknown) => setForm((f) => ({ ...f, [field]: value }));

  const hasChanges = original && (
    form.name !== original.name || form.slug !== original.slug ||
    form.logo_url !== (original.logo_url || '') ||
    form.category !== (original.category || '') || form.is_premium !== original.is_premium ||
    form.is_active !== original.is_active || form.sort_order !== original.sort_order
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!form.name.trim()) { setError('Le nom est requis.'); return; }
    if (!form.slug.trim()) { setError('Le slug est requis.'); return; }
    setSaving(true);
    setError('');
    setToast('');
    try {
      await adminApi.updateChannel(id, form);
      setToast('Modifications enregistrées !');
      setOriginal({ ...original!, ...form });
      setTimeout(() => setToast(''), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erreur lors de la modification.');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await adminApi.deleteChannel(id);
      navigate('/admin/channels');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erreur lors de la suppression de la chaîne.');
      setDeleting(false);
    }
  };

  const resetSourceForm = () => {
    setSourceForm({ label: '', hls_url: '', is_premium: false, sort_order: 0, is_active: true });
    setEditingSourceId(null);
    setSourceError('');
  };

  const startEditSource = (source: ChannelSourceFull) => {
    setEditingSourceId(source.id);
    setSourceForm({
      label: source.label,
      hls_url: source.hls_url,
      is_premium: source.is_premium,
      sort_order: source.sort_order,
      is_active: source.is_active,
    });
    setSourceError('');
  };

  const saveSource = async () => {
    if (!id) return;
    if (!sourceForm.label.trim()) { setSourceError('Le label est requis.'); return; }
    if (!sourceForm.hls_url.trim()) { setSourceError("L'URL HLS est requise."); return; }
    setSourceSaving(true);
    setSourceError('');
    try {
      if (editingSourceId) {
        const updated = await adminApi.updateChannelSource(id, editingSourceId, sourceForm);
        setSources((prev) => prev.map((s) => (s.id === editingSourceId ? updated : s)));
      } else {
        const created = await adminApi.createChannelSource(id, sourceForm);
        setSources((prev) => [...prev, created]);
      }
      resetSourceForm();
    } catch (err: any) {
      setSourceError(err?.response?.data?.message || 'Erreur lors de la sauvegarde de la source.');
    } finally { setSourceSaving(false); }
  };

  const deleteSource = async (sourceId: string) => {
    if (!id) return;
    try {
      await adminApi.deleteChannelSource(id, sourceId);
      setSources((prev) => prev.filter((s) => s.id !== sourceId));
      if (editingSourceId === sourceId) resetSourceForm();
    } catch (err: any) {
      setSourceError(err?.response?.data?.message || 'Erreur lors de la suppression de la source.');
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-6 bg-navy-800 rounded w-32" />
        <div className="card p-6 space-y-4 max-w-2xl">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 bg-navy-800 rounded" />)}
        </div>
      </div>
    );
  }

  if (!original) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-white mb-2">Chaîne introuvable</h2>
        <button onClick={() => navigate('/admin/channels')} className="btn-secondary text-sm">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[200] card p-3 border border-brand-500/30 bg-brand-500/10 flex items-center gap-2 text-sm text-indigo-300 animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="w-4 h-4" /> {toast}
        </div>
      )}

      <button onClick={() => navigate('/admin/channels')}
        className="flex items-center gap-2 text-sm text-navy-400 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Retour aux chaînes
      </button>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
            <Tv className="w-6 h-6 text-mint-400" />
            Modifier : {original.name}
          </h1>
          <p className="text-xs text-navy-400 mt-1 flex items-center gap-2">
            <Calendar className="w-3 h-3" /> Créée le {new Date(original.created_at).toLocaleDateString('fr-FR')}
            <span>·</span> ID: {original.id}
          </p>
        </div>
        <button onClick={() => setShowDelete(!showDelete)} className="btn-danger text-xs">
          <Trash2 className="w-3.5 h-3.5" /> Supprimer
        </button>
      </div>

      {showDelete && (
        <div className="card p-4 border-red-500/20 bg-red-500/5">
          <p className="text-sm text-red-400 mb-3">
            <AlertTriangle className="w-4 h-4 inline mr-1" />
            Supprimer <strong>{original.name}</strong> ? Cette action est irréversible.
          </p>
          <div className="flex items-center gap-2">
            <button onClick={handleDelete} disabled={deleting} className="btn-danger text-xs">
              {deleting ? 'Suppression…' : 'Confirmer la suppression'}
            </button>
            <button onClick={() => setShowDelete(false)} className="btn-secondary text-xs">Annuler</button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 card p-6">
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-navy-200 mb-1.5">
                <Tv className="w-3.5 h-3.5 text-navy-400" /> Nom *
              </label>
              <input type="text" value={form.name} onChange={(e) => update('name', e.target.value)}
                className="input-field" />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-navy-200 mb-1.5">
                <Hash className="w-3.5 h-3.5 text-navy-400" /> Slug *
              </label>
              <input type="text" value={form.slug} onChange={(e) => update('slug', e.target.value)}
                className="input-field font-mono text-sm" />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-navy-200 mb-1.5">
                <Image className="w-3.5 h-3.5 text-navy-400" /> URL du logo
              </label>
              <input type="text" value={form.logo_url} onChange={(e) => update('logo_url', e.target.value)}
                className="input-field text-sm" />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-navy-200 mb-1.5">
                <LayoutList className="w-3.5 h-3.5 text-navy-400" /> Catégorie *
              </label>
              <select value={form.category} onChange={(e) => update('category', e.target.value)}
                className="input-field text-sm">
                <option value="">Sélectionner</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-navy-200 mb-1.5">
                <GripVertical className="w-3.5 h-3.5 text-navy-400" /> Ordre d'affichage
              </label>
              <input type="number" value={form.sort_order}
                onChange={(e) => update('sort_order', Number(e.target.value))}
                className="input-field text-sm !w-32" min={0} />
            </div>

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

            {error && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={saving || !hasChanges} className="btn-primary flex items-center gap-2 disabled:opacity-40">
                <Save className="w-4 h-4" />
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button type="button" onClick={() => navigate('/admin/channels')} className="btn-secondary">Annuler</button>
              {hasChanges && <span className="text-xs text-amber-400">Modifications non sauvegardées</span>}
            </div>
          </form>
        </div>

        {/* Preview */}
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
              <p className="text-sm font-semibold text-white">{form.name || '—'}</p>
              <p className="text-xs text-navy-400">/{form.slug || '—'}</p>
            </div>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-navy-400">Catégorie</span><span className="text-white">{form.category || '—'}</span></div>
            <div className="flex justify-between"><span className="text-navy-400">Ordre</span><span className="text-white">{form.sort_order}</span></div>
            <div className="flex items-center gap-2 pt-1">
              {form.is_active ? <span className="badge badge-active text-[10px]">Active</span> : <span className="badge badge-banned text-[10px]">Inactive</span>}
              {form.is_premium && <span className="badge badge-premium text-[10px]">Premium</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Sources ──────────────────────── */}
      <div className="card p-6 space-y-5">
        <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
          <Signal className="w-5 h-5 text-brand-400" />
          Sources ({sources.length})
        </h2>

        {/* Source list */}
        {sources.length > 0 && (
          <div className="space-y-3">
            {sources.map((src) => (
              <div key={src.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                editingSourceId === src.id ? 'bg-brand-500/5 border-brand-500/30' : 'bg-navy-900 border-navy-800'
              }`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white flex items-center gap-2">
                    {src.label}
                    {src.is_premium && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                    {!src.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">Inactive</span>}
                  </p>
                  <p className="text-xs text-navy-400 truncate font-mono mt-0.5">{src.hls_url}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-navy-500">#{src.sort_order}</span>
                  <button onClick={() => startEditSource(src)} className="p-2 rounded-lg hover:bg-white/5 text-navy-300 hover:text-brand-400 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteSource(src.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-navy-300 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {sources.length === 0 && (
          <p className="text-sm text-navy-400 py-4 text-left">Aucune source configurée. La chaîne utilise l'URL HLS par défaut.</p>
        )}

        {/* Source form */}
        <div className="border-t border-navy-800 pt-5 space-y-4">
          <h3 className="text-sm font-semibold text-navy-200 flex items-center gap-2">
            {editingSourceId ? (
              <><Pencil className="w-3.5 h-3.5 text-brand-400" /> Modifier la source</>
            ) : (
              <><Plus className="w-3.5 h-3.5 text-mint-400" /> Ajouter une source</>
            )}
          </h3>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-navy-400 mb-1 block">Label *</label>
              <input type="text" value={sourceForm.label}
                onChange={(e) => setSourceForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="Ex: HD, SD, Source 1…"
                className="input-field text-sm" />
            </div>
            <div>
              <label className="text-xs text-navy-400 mb-1 block">URL HLS *</label>
              <input type="text" value={sourceForm.hls_url}
                onChange={(e) => setSourceForm((f) => ({ ...f, hls_url: e.target.value }))}
                placeholder="https://..."
                className="input-field font-mono text-sm" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div>
              <label className="text-xs text-navy-400 mb-1 block">Ordre</label>
              <input type="number" value={sourceForm.sort_order}
                onChange={(e) => setSourceForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
                className="input-field text-sm !w-24" min={0} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer pt-4">
              <input type="checkbox" checked={sourceForm.is_premium}
                onChange={(e) => setSourceForm((f) => ({ ...f, is_premium: e.target.checked }))}
                className="w-4 h-4 rounded bg-navy-800 border-navy-600 text-brand-600 focus:ring-brand-500/30" />
              <span className="text-sm text-navy-200 flex items-center gap-1.5"><Crown className="w-3.5 h-3.5 text-amber-400" /> Premium</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer pt-4">
              <input type="checkbox" checked={sourceForm.is_active}
                onChange={(e) => setSourceForm((f) => ({ ...f, is_active: e.target.checked }))}
                className="w-4 h-4 rounded bg-navy-800 border-navy-600 text-brand-600 focus:ring-brand-500/30" />
              <span className="text-sm text-navy-200 flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-brand-400" /> Active</span>
            </label>
          </div>

          {sourceError && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" /> {sourceError}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button type="button" onClick={saveSource} disabled={sourceSaving}
              className="btn-primary flex items-center gap-2 text-sm disabled:opacity-40">
              {editingSourceId ? <Save className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {sourceSaving ? 'Sauvegarde…' : editingSourceId ? 'Mettre à jour' : 'Ajouter'}
            </button>
            {editingSourceId && (
              <button type="button" onClick={resetSourceForm} className="btn-secondary text-sm flex items-center gap-1.5">
                <X className="w-3.5 h-3.5" /> Annuler
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
