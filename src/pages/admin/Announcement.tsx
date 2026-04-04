import { useEffect, useState } from 'react';
import { adminApi } from '../../api';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import {
  Megaphone, Power, CheckCircle, RefreshCw, AlertTriangle,
  FileText, Save, ToggleLeft, ToggleRight, Info, Palette, Eye,
} from 'lucide-react';

const COLORS = [
  { value: 'brand',  label: 'Indigo',  ring: 'ring-brand-500',  bg: 'bg-brand-500',  preview: 'bg-brand-500/10 text-brand-300 border-brand-500/20' },
  { value: 'blue',   label: 'Bleu',    ring: 'ring-blue-500',   bg: 'bg-blue-500',   preview: 'bg-blue-500/10 text-blue-300 border-blue-500/20' },
  { value: 'green',  label: 'Vert',    ring: 'ring-emerald-500', bg: 'bg-emerald-500', preview: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' },
  { value: 'amber',  label: 'Ambre',   ring: 'ring-amber-500',  bg: 'bg-amber-500',  preview: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
  { value: 'red',    label: 'Rouge',   ring: 'ring-red-500',    bg: 'bg-red-500',    preview: 'bg-red-500/10 text-red-300 border-red-500/20' },
  { value: 'purple', label: 'Violet',  ring: 'ring-purple-500', bg: 'bg-purple-500', preview: 'bg-purple-500/10 text-purple-300 border-purple-500/20' },
];

export default function Announcement() {
  useDocumentTitle('Admin — Bandeau d\'annonce');

  const [active, setActive] = useState(false);
  const [text, setText] = useState('');
  const [color, setColor] = useState('brand');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  /* original values for dirty check */
  const [origActive, setOrigActive] = useState(false);
  const [origText, setOrigText] = useState('');
  const [origColor, setOrigColor] = useState('brand');

  const hasChanges = active !== origActive || text !== origText || color !== origColor;

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const settings = await adminApi.getSettings();
      const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
      const a = map['announcement_active'] === 'true';
      const t = map['announcement_text'] ?? '';
      const c = map['announcement_color'] ?? 'brand';
      setActive(a); setOrigActive(a);
      setText(t);   setOrigText(t);
      setColor(c);  setOrigColor(c);
    } catch {
      setError('Impossible de charger la configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await Promise.all([
        adminApi.updateSetting('announcement_active', String(active)),
        adminApi.updateSetting('announcement_text', text.trim()),
        adminApi.updateSetting('announcement_color', color),
      ]);
      setOrigActive(active);
      setOrigText(text.trim());
      setOrigColor(color);
      setText(text.trim());
      showToast(active ? 'Bandeau activé et mis à jour' : 'Bandeau désactivé');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const quickToggle = async () => {
    const next = !active;
    setActive(next);
    setSaving(true);
    setError('');
    try {
      await adminApi.updateSetting('announcement_active', String(next));
      setOrigActive(next);
      showToast(next ? 'Bandeau activé' : 'Bandeau désactivé');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erreur lors du changement.');
      setActive(!next);
    } finally {
      setSaving(false);
    }
  };

  const selectedColorObj = COLORS.find((c) => c.value === color) ?? COLORS[0];

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
            <Megaphone size={24} className="text-mint-400" /> Bandeau d'annonce
          </h1>
          <p className="text-sm text-navy-300 mt-1">Affichez un message global visible par tous les utilisateurs</p>
        </div>
        <button onClick={load} className="btn-secondary flex items-center gap-1.5 text-sm">
          <RefreshCw size={14} /> Rafraîchir
        </button>
      </div>

      {/* Status Banner */}
      <div className={`card p-5 border ${active ? 'border-amber-500/30 bg-amber-500/5' : 'border-brand-500/30 bg-brand-500/5'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${active ? 'bg-amber-500/20 text-amber-400' : 'bg-brand-500/20 text-brand-400'}`}>
              {active ? <Megaphone size={28} /> : <Power size={28} />}
            </div>
            <div>
              <h2 className="text-lg font-semibold font-display">
                {active ? 'Bandeau actif' : 'Bandeau désactivé'}
              </h2>
              <p className="text-sm text-white/50">
                {active ? 'Le message est visible sur toutes les pages.' : 'Aucun bandeau n\'est affiché actuellement.'}
              </p>
            </div>
          </div>
          <button onClick={quickToggle} disabled={saving} className="flex items-center gap-2 transition" title={active ? 'Désactiver' : 'Activer'}>
            {active ? (
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
            <p className="text-sm font-medium">Afficher le bandeau</p>
            <p className="text-xs text-white/40 mt-0.5">Le bandeau s'affiche sous la barre de navigation sur toutes les pages</p>
          </div>
          <button onClick={() => setActive(!active)} className="flex items-center gap-2">
            {active ? (
              <ToggleRight size={36} className="text-amber-400" />
            ) : (
              <ToggleLeft size={36} className="text-white/30 hover:text-white/60" />
            )}
          </button>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2 text-white/70">
            <FileText size={14} className="text-amber-400" /> Texte du bandeau
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ex : 🎉 Nouvelle fonctionnalité disponible ! Découvrez le mode Premium."
            rows={3}
            className="input-field w-full resize-y"
          />
          <p className="text-xs text-white/30">{text.length} caractères</p>
        </div>

        {/* Color */}
        <div className="space-y-3">
          <label className="text-sm font-medium flex items-center gap-2 text-white/70">
            <Palette size={14} className="text-purple-400" /> Couleur du bandeau
          </label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                key={c.value}
                onClick={() => setColor(c.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                  color === c.value
                    ? `${c.preview} ring-2 ${c.ring} ring-offset-1 ring-offset-navy-950`
                    : 'bg-white/[0.03] border-navy-800 text-navy-300 hover:bg-white/[0.06]'
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${c.bg}`} />
                {c.label}
              </button>
            ))}
          </div>
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
              onClick={() => { setActive(origActive); setText(origText); setColor(origColor); }}
              className="btn-secondary text-sm"
            >
              Annuler
            </button>
          )}
        </div>
      </div>

      {/* Preview */}
      {text.trim() && (
        <div className="card p-6 space-y-3">
          <h3 className="text-sm font-semibold font-display flex items-center gap-2 text-white/70">
            <Eye size={14} className="text-mint-400" /> Aperçu
          </h3>
          <div className={`w-full rounded-xl border p-3 flex items-center gap-3 ${selectedColorObj.preview}`}>
            <Megaphone size={16} className="shrink-0" />
            <p className="text-sm font-medium flex-1">{text.trim()}</p>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="card p-4 border border-mint-500/20 bg-mint-500/5 flex gap-3">
        <Info size={18} className="text-mint-400 mt-0.5 shrink-0" />
        <div className="text-sm text-white/60 space-y-1">
          <p className="font-medium text-white/80">Comment ça fonctionne ?</p>
          <ul className="list-disc list-inside space-y-0.5 text-xs">
            <li>Le bandeau s'affiche sous la barre de navigation sur toutes les pages publiques.</li>
            <li>Les utilisateurs peuvent le fermer temporairement (il réapparaît à la prochaine visite).</li>
            <li>Choisissez une couleur adaptée au type de message (info, alerte, promotion…).</li>
            <li>Les changements prennent effet immédiatement après l'enregistrement.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
