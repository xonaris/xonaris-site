import { useEffect, useState } from 'react';
import { adminApi } from '../../api';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import {
  Wrench, Power, AlertTriangle, CheckCircle, RefreshCw,
  ShieldAlert, FileText, Save, ToggleLeft, ToggleRight, Info,
} from 'lucide-react';

export default function Maintenance() {
  useDocumentTitle('Admin — Maintenance');

  const [enabled, setEnabled] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  /* original values for "hasChanges" */
  const [origEnabled, setOrigEnabled] = useState(false);
  const [origReason, setOrigReason] = useState('');

  const hasChanges = enabled !== origEnabled || reason !== origReason;

  const load = async () => {
    setLoading(true);
    try {
      const s = await adminApi.getMaintenanceStatus();
      setEnabled(s.active);
      setReason(s.reason ?? '');
      setOrigEnabled(s.active);
      setOrigReason(s.reason ?? '');
    } catch { setError('Impossible de charger le statut.'); } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const s = await adminApi.toggleMaintenance(enabled, reason.trim() || undefined);
      setEnabled(s.active);
      setReason(s.reason ?? '');
      setOrigEnabled(s.active);
      setOrigReason(s.reason ?? '');
      setToast(s.active ? 'Maintenance activée' : 'Maintenance désactivée');
      setTimeout(() => setToast(''), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erreur lors de la mise à jour.');
    } finally {
      setSaving(false);
    }
  };

  const quickToggle = async () => {
    const next = !enabled;
    setEnabled(next);
    setSaving(true);
    setError('');
    try {
      const s = await adminApi.toggleMaintenance(next, reason.trim() || undefined);
      setEnabled(s.active);
      setReason(s.reason ?? '');
      setOrigEnabled(s.active);
      setOrigReason(s.reason ?? '');
      setToast(s.active ? 'Maintenance activée' : 'Maintenance désactivée');
      setTimeout(() => setToast(''), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erreur lors du changement.');
      setEnabled(!next);
    } finally {
      setSaving(false);
    }
  };

  /* ---------- loading ---------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <RefreshCw size={28} className="animate-spin text-mint-400" />
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2">
            <Wrench size={24} className="text-mint-400" /> Maintenance
          </h1>
          <p className="text-sm text-navy-300 mt-1">Gérer le mode maintenance de la plateforme</p>
        </div>
        <button onClick={load} className="btn-secondary flex items-center gap-1.5 text-sm">
          <RefreshCw size={14} /> Rafraîchir
        </button>
      </div>

      {/* Status Banner */}
      <div
        className={`card p-5 border ${
          enabled
            ? 'border-amber-500/30 bg-amber-500/5'
            : 'border-brand-500/30 bg-brand-500/5'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                enabled ? 'bg-amber-500/20 text-amber-400' : 'bg-brand-500/20 text-brand-400'
              }`}
            >
              {enabled ? <ShieldAlert size={28} /> : <Power size={28} />}
            </div>
            <div>
              <h2 className="text-lg font-semibold font-display">
                {enabled ? 'Maintenance active' : 'Plateforme en ligne'}
              </h2>
              <p className="text-sm text-white/50">
                {enabled
                  ? 'Les utilisateurs voient la page de maintenance.'
                  : 'Tous les utilisateurs ont accès à la plateforme.'}
              </p>
            </div>
          </div>
          <button
            onClick={quickToggle}
            disabled={saving}
            className="flex items-center gap-2 transition"
            title={enabled ? 'Désactiver' : 'Activer'}
          >
            {enabled ? (
              <ToggleRight size={44} className="text-amber-400" />
            ) : (
              <ToggleLeft size={44} className="text-white/30 hover:text-white/60" />
            )}
          </button>
        </div>
      </div>

      {/* Config card */}
      <div className="card p-6 space-y-5">
        <h3 className="text-sm font-semibold font-display flex items-center gap-2 text-white/70">
          <FileText size={14} className="text-mint-400" /> Configuration
        </h3>

        {error && (
          <div className="p-3 border border-red-500/30 bg-red-500/10 rounded-lg flex items-center gap-2 text-sm text-red-300">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        {/* Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.03] border border-navy-800">
          <div>
            <p className="text-sm font-medium">Mode maintenance</p>
            <p className="text-xs text-white/40 mt-0.5">Active la page de maintenance pour tous les visiteurs</p>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className="flex items-center gap-2"
          >
            {enabled ? (
              <ToggleRight size={36} className="text-amber-400" />
            ) : (
              <ToggleLeft size={36} className="text-white/30 hover:text-white/60" />
            )}
          </button>
        </div>

        {/* Reason */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2 text-white/70">
            <FileText size={14} className="text-amber-400" /> Message affiché (optionnel)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex : Nous effectuons une mise à jour, nous serons de retour très bientôt !"
            rows={4}
            className="input-field w-full resize-y"
          />
          <p className="text-xs text-white/30">{reason.length} caractères</p>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-40"
          >
            <Save size={14} /> {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </button>
          {hasChanges && (
            <button
              onClick={() => { setEnabled(origEnabled); setReason(origReason); }}
              className="btn-secondary text-sm"
            >
              Annuler
            </button>
          )}
        </div>
      </div>

      {/* Info box */}
      <div className="card p-4 border border-mint-500/20 bg-mint-500/5 flex gap-3">
        <Info size={18} className="text-mint-400 mt-0.5 shrink-0" />
        <div className="text-sm text-white/60 space-y-1">
          <p className="font-medium text-white/80">Comment ça fonctionne ?</p>
          <ul className="list-disc list-inside space-y-0.5 text-xs">
            <li>Quand la maintenance est activée, les utilisateurs non-admin voient une page dédiée.</li>
            <li>Les administrateurs conservent un accès complet au site.</li>
            <li>Le message optionnel s'affiche sur la page de maintenance.</li>
            <li>Utilisez le toggle rapide pour un changement immédiat.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
