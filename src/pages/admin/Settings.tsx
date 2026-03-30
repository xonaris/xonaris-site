import { useEffect, useState } from 'react';
import { adminApi } from '../../api';
import type { Setting } from '../../types';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import {
  Settings as SettingsIcon, Plus, Save, Trash2, RefreshCw,
  CheckCircle, AlertCircle, Key, FileText, X, Edit3,
  AlertTriangle, Info,
} from 'lucide-react';

export default function AdminSettings() {
  useDocumentTitle('Admin — Paramètres');

  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  /* Editing state */
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  /* New setting form */
  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.getSettings();
      setSettings(data);
    } catch {
      setError('Impossible de charger les paramètres.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  /* ---------- Edit ---------- */
  const startEdit = (s: Setting) => {
    setEditingKey(s.key);
    setEditValue(s.value);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const saveEdit = async () => {
    if (!editingKey) return;
    setSaving(true);
    setError('');
    try {
      const updated = await adminApi.updateSetting(editingKey, editValue);
      setSettings((prev) =>
        prev.map((s) => (s.key === editingKey ? { ...s, value: updated.value } : s)),
      );
      showToast(`Paramètre « ${editingKey} » mis à jour`);
      cancelEdit();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erreur lors de la mise à jour.');
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Add ---------- */
  const handleAdd = async () => {
    const key = newKey.trim();
    const value = newValue.trim();
    if (!key) return;
    setAdding(true);
    setError('');
    try {
      const created = await adminApi.updateSetting(key, value);
      setSettings((prev) => {
        const exists = prev.find((s) => s.key === key);
        if (exists) return prev.map((s) => (s.key === key ? { ...s, value: created.value } : s));
        return [...prev, { key: created.key ?? key, value: created.value }];
      });
      showToast(`Paramètre « ${key} » ajouté`);
      setNewKey('');
      setNewValue('');
      setShowAdd(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Erreur lors de l'ajout.");
    } finally {
      setAdding(false);
    }
  };

  /* ---------- Render ---------- */
  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[200] card p-3 border border-brand-500/30 bg-brand-500/10 flex items-center gap-2 text-sm text-indigo-300 animate-in fade-in slide-in-from-top-2">
          <CheckCircle className="w-4 h-4" /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
            <SettingsIcon className="w-6 h-6 text-mint-400" />
            Paramètres
          </h1>
          <p className="text-sm text-navy-300 mt-1">
            {settings.length} paramètre{settings.length !== 1 ? 's' : ''} configuré{settings.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="btn-secondary !px-3 !py-2" title="Rafraîchir">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowAdd(!showAdd)} className="btn-primary text-sm">
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="card p-5 border border-brand-500/20 bg-brand-500/5">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
            <Plus className="w-4 h-4 text-brand-400" /> Nouveau paramètre
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-navy-300 mb-1 block">Clé</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-navy-400" />
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="ex: site_name"
                  className="input-field !pl-9 text-sm font-mono"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-navy-300 mb-1 block">Valeur</label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-navy-400" />
                <input
                  type="text"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="Valeur du paramètre"
                  className="input-field !pl-9 text-sm"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={handleAdd}
              disabled={adding || !newKey.trim()}
              className="btn-primary text-sm disabled:opacity-40"
            >
              <Save className="w-3.5 h-3.5" />
              {adding ? 'Ajout…' : 'Enregistrer'}
            </button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary text-sm">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Settings list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse flex items-center gap-4">
              <div className="h-10 w-10 bg-navy-800 rounded-xl" />
              <div className="flex-1">
                <div className="h-4 bg-navy-800 rounded w-1/4 mb-2" />
                <div className="h-3 bg-navy-800 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : settings.length === 0 ? (
        <div className="card p-16 text-center">
          <SettingsIcon className="w-12 h-12 text-navy-700 mx-auto mb-3" />
          <p className="text-sm text-navy-400">Aucun paramètre configuré.</p>
          <p className="text-xs text-navy-600 mt-1">Créez votre premier paramètre avec le bouton ci-dessus.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-navy-800/50">
                  <th className="text-left text-xs font-medium text-navy-400 uppercase tracking-wider px-5 py-3">Clé</th>
                  <th className="text-left text-xs font-medium text-navy-400 uppercase tracking-wider px-5 py-3">Valeur</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {settings.map((s) => (
                  <tr key={s.key} className="border-b border-navy-800/30 hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-mint-500/10 flex items-center justify-center shrink-0">
                          <Key className="w-4 h-4 text-mint-400" />
                        </div>
                        <code className="text-sm font-mono text-white">{s.key}</code>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {editingKey === s.key ? (
                        <div className="flex items-center gap-2 max-w-xl">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="input-field text-sm flex-1"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                          />
                          <button
                            onClick={saveEdit}
                            disabled={saving}
                            className="p-1.5 rounded-lg text-brand-400 hover:bg-brand-500/10 transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1.5 rounded-lg text-navy-400 hover:text-white hover:bg-white/5 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-sm text-navy-200 max-w-md block truncate">
                          {s.value || <span className="text-navy-600 italic">vide</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {editingKey !== s.key && (
                        <button
                          onClick={() => startEdit(s)}
                          className="p-1.5 rounded-lg text-navy-400 hover:text-brand-400 hover:bg-brand-500/10 transition-colors"
                          title="Modifier"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="card p-4 border border-mint-500/20 bg-mint-500/5 flex gap-3">
        <Info className="w-5 h-5 text-mint-400 mt-0.5 shrink-0" />
        <div className="text-sm text-navy-300 space-y-1">
          <p className="font-medium text-navy-200">À propos des paramètres</p>
          <ul className="list-disc list-inside space-y-0.5 text-xs">
            <li>Les paramètres sont des paires clé-valeur stockées en base de données.</li>
            <li>Ils permettent de configurer dynamiquement le comportement de la plateforme.</li>
            <li>Modifiez une valeur en cliquant sur le bouton d'édition.</li>
            <li>Les changements prennent effet immédiatement.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
