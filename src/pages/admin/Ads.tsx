import { useEffect, useState } from 'react';
import { adminApi } from '../../api';
import type { Ad } from '../../types';
import {
  Megaphone, Plus, Trash2, Pencil, X, RefreshCw, AlertCircle,
  CheckCircle2, ToggleLeft, ToggleRight, ExternalLink, Loader2,
} from 'lucide-react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export default function AdminAds() {
  useDocumentTitle('Admin — Publicités');
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Create / Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Delete
  const [confirmDeleteId, setConfirmDeleteId] = useState('');
  const [deleting, setDeleting] = useState('');

  const load = () => {
    setLoading(true);
    setErrorMsg('');
    adminApi.getAds()
      .then((data) => setAds(data))
      .catch(() => setErrorMsg('Impossible de charger les publicités.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditingAd(null);
    setFormName('');
    setFormUrl('');
    setFormActive(true);
    setShowModal(true);
  };

  const openEdit = (ad: Ad) => {
    setEditingAd(ad);
    setFormName(ad.name);
    setFormUrl(ad.url);
    setFormActive(ad.is_active);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formUrl.trim()) return;
    setSaving(true);
    setErrorMsg('');
    try {
      if (editingAd) {
        await adminApi.updateAd(editingAd.id, {
          name: formName.trim(),
          url: formUrl.trim(),
          is_active: formActive,
        });
        setSuccessMsg('Publicité mise à jour !');
      } else {
        await adminApi.createAd({
          name: formName.trim(),
          url: formUrl.trim(),
          is_active: formActive,
        });
        setSuccessMsg('Publicité créée !');
      }
      setTimeout(() => setSuccessMsg(''), 3000);
      setShowModal(false);
      load();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Erreur lors de l\'enregistrement.');
      setTimeout(() => setErrorMsg(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (ad: Ad) => {
    try {
      await adminApi.updateAd(ad.id, { is_active: !ad.is_active });
      setAds((prev) => prev.map((a) => a.id === ad.id ? { ...a, is_active: !a.is_active } : a));
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Erreur.');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const remove = async (id: string) => {
    setDeleting(id);
    try {
      await adminApi.deleteAd(id);
      setAds((prev) => prev.filter((a) => a.id !== id));
      setSuccessMsg('Publicité supprimée.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Impossible de supprimer cette publicité.');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setDeleting('');
      setConfirmDeleteId('');
    }
  };

  const activeCount = ads.filter((a) => a.is_active).length;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-black text-white flex items-center gap-3">
            <div className="p-2 rounded-xl bg-brand-500/10">
              <Megaphone className="w-6 h-6 text-brand-400" />
            </div>
            Publicités
          </h1>
          <p className="text-sm text-navy-300 mt-1">
            {ads.length} publicité{ads.length > 1 ? 's' : ''} · {activeCount} active{activeCount > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="btn-secondary h-10 w-10 !p-0 flex items-center justify-center" title="Rafraîchir">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={openCreate} className="btn-primary h-10 px-4 flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm text-emerald-400 animate-fade-up">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 animate-fade-up">
          <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        </div>
      ) : ads.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-navy-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Megaphone className="w-8 h-8 text-navy-500" />
          </div>
          <p className="text-navy-300 mb-4">Aucune publicité configurée.</p>
          <button onClick={openCreate} className="btn-primary h-10 px-5 text-sm inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Créer une publicité
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {ads.map((ad) => (
            <div
              key={ad.id}
              className={`card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                ad.is_active ? 'border-brand-500/20' : 'opacity-60 border-navy-800'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-bold text-white truncate">{ad.name}</h3>
                  <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                    ad.is_active
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-navy-800 text-navy-400 border border-navy-700'
                  }`}>
                    {ad.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs text-navy-400 truncate flex items-center gap-1.5">
                  <ExternalLink className="w-3 h-3 shrink-0" />
                  {ad.url}
                </p>
                <p className="text-xs text-navy-500 mt-1">
                  Créée le {new Date(ad.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleActive(ad)}
                  title={ad.is_active ? 'Désactiver' : 'Activer'}
                  className="h-9 w-9 rounded-lg flex items-center justify-center bg-navy-900 border border-white/10 hover:bg-white/5 text-navy-300 hover:text-white transition-all"
                >
                  {ad.is_active ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => openEdit(ad)}
                  title="Modifier"
                  className="h-9 w-9 rounded-lg flex items-center justify-center bg-navy-900 border border-white/10 hover:bg-white/5 text-navy-300 hover:text-white transition-all"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                {confirmDeleteId === ad.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => remove(ad.id)}
                      disabled={deleting === ad.id}
                      className="h-9 px-3 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold hover:bg-red-500/20 transition-all disabled:opacity-50"
                    >
                      {deleting === ad.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirmer'}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId('')}
                      className="h-9 w-9 rounded-lg flex items-center justify-center bg-navy-900 border border-white/10 hover:bg-white/5 text-navy-400 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(ad.id)}
                    title="Supprimer"
                    className="h-9 w-9 rounded-lg flex items-center justify-center bg-navy-900 border border-white/10 hover:bg-red-500/10 text-navy-300 hover:text-red-400 hover:border-red-500/20 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !saving && setShowModal(false)} />
          <div className="relative w-full max-w-lg card p-8 shadow-2xl animate-fade-scale">
            <button
              onClick={() => !saving && setShowModal(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-navy-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-brand-500/10">
                <Megaphone className="w-5 h-5 text-brand-400" />
              </span>
              {editingAd ? 'Modifier la publicité' : 'Nouvelle publicité'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-navy-200 mb-1.5">Nom (interne)</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Sponsor été 2026"
                  className="input-field"
                  maxLength={200}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy-200 mb-1.5">URL de destination</label>
                <input
                  type="url"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://..."
                  className="input-field"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFormActive(!formActive)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${formActive ? 'bg-brand-500' : 'bg-navy-700'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${formActive ? 'translate-x-5' : ''}`} />
                </button>
                <span className="text-sm text-navy-200 font-medium">{formActive ? 'Active' : 'Inactive'}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => !saving && setShowModal(false)} className="btn-secondary" disabled={saving}>
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formName.trim() || !formUrl.trim()}
                className="btn-primary px-6 py-3 inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {editingAd ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
