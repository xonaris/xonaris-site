import { useEffect, useState } from 'react';
import { fmtDate } from '../../common/utils/date';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api';
import type { PremiumCode } from '../../types';
import {
  Gift, Plus, Copy, Check, Trash2, Search, X,
  Calendar, User, Filter, RefreshCw, Clock, AlertCircle,
  CheckCircle2, XCircle, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

type FilterStatus = 'ALL' | 'AVAILABLE' | 'USED';

export default function AdminPremiumCodes() {
  useDocumentTitle('Admin — Codes Premium');
  const [codes, setCodes] = useState<PremiumCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleting, setDeleting] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedId, setCopiedId] = useState('');

  // Generate modal state
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [genDuration, setGenDuration] = useState(30);
  const [genCount, setGenCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [genCopied, setGenCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState('');

  const load = () => {
    setLoading(true);
    setErrorMsg('');
    adminApi.getPremiumCodes(page)
      .then((res) => {
        setCodes(res.codes || []);
        setTotal(res.total || 0);
      })
      .catch(() => {
        setErrorMsg('Impossible de charger les codes.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [page]);

  const generate = async () => {
    setGenerating(true);
    setErrorMsg('');
    try {
      const res = await adminApi.generatePremiumCodes(genDuration, genCount);
      const newCodes: string[] = res.codes || [];
      setGeneratedCodes(newCodes);
      setSuccessMsg(`${genCount} code${genCount > 1 ? 's' : ''} de ${genDuration} jours généré${genCount > 1 ? 's' : ''} !`);
      setTimeout(() => setSuccessMsg(''), 3000);
      load();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Erreur lors de la génération des codes.');
      setTimeout(() => setErrorMsg(''), 5000);
    } finally { setGenerating(false); }
  };

  const remove = async (id: string) => {
    setDeleting(id);
    const prev = [...codes];
    try {
      await adminApi.deletePremiumCode(id);
      setCodes((c) => c.filter((code) => code.id !== id));
    } catch (err: any) {
      setCodes(prev);
      setErrorMsg(err?.response?.data?.message || 'Impossible de supprimer ce code.');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally { setDeleting(''); setConfirmDeleteId(''); }
  };

  const copy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(''), 2000);
  };

  const copyGeneratedCodes = () => {
    navigator.clipboard.writeText(generatedCodes.join('\n'));
    setGenCopied(true);
    setTimeout(() => setGenCopied(false), 2000);
  };

  const copySingleCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  // Client-side filter + search
  const filtered = codes.filter((c) => {
    if (search && !c.code.toLowerCase().includes(search.toLowerCase()) &&
        !c.user?.pseudo?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus === 'AVAILABLE' && c.used) return false;
    if (filterStatus === 'USED' && !c.used) return false;
    return true;
  });

  const usedCount = codes.filter((c) => c.used).length;
  const availableCount = codes.filter((c) => !c.used).length;
  const perPage = 50;
  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
            <Gift className="w-6 h-6 text-amber-400" />
            Codes Premium
          </h1>
          <p className="text-sm text-navy-300 mt-1">
            {total} code{total !== 1 ? 's' : ''} au total ·
            <span className="text-brand-400"> {availableCount} disponible{availableCount !== 1 ? 's' : ''}</span> ·
            <span className="text-navy-400"> {usedCount} utilisé{usedCount !== 1 ? 's' : ''}</span>
          </p>
        </div>

        {/* Generate */}
        <div className="flex items-center gap-3">
          <button onClick={load} className="btn-secondary !px-3 !py-2" title="Rafraîchir">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => { setShowGenerateModal(true); setGeneratedCodes([]); setGenCopied(false); }} className="btn-primary text-sm">
            <Plus className="w-4 h-4" />
            Générer un code
          </button>
        </div>
      </div>

      {/* Success message */}
      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-brand-500/10 border border-brand-500/20 rounded-xl text-sm text-brand-400">
          <CheckCircle2 className="w-4 h-4" /> {successMsg}
        </div>
      )}

      {/* Error message */}
      {errorMsg && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          <AlertCircle className="w-4 h-4" /> {errorMsg}
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
            <Gift className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{total}</p>
            <p className="text-xs text-navy-400">Total</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{availableCount}</p>
            <p className="text-xs text-navy-400">Disponibles</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-navy-400/10 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5 text-navy-300" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{usedCount}</p>
            <p className="text-xs text-navy-400">Utilisés</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Chercher un code…" className="input-field !pl-10 !py-2 text-sm" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          {(['ALL', 'AVAILABLE', 'USED'] as FilterStatus[]).map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === s ? 'bg-brand-600/20 text-brand-400' : 'bg-navy-800/50 text-navy-400 hover:text-white'
              }`}>
              {s === 'ALL' ? 'Tous' : s === 'AVAILABLE' ? 'Disponibles' : 'Utilisés'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-navy-800/50">
                <th className="text-left text-xs font-medium text-navy-400 uppercase tracking-wider px-5 py-3">Code</th>
                <th className="text-left text-xs font-medium text-navy-400 uppercase tracking-wider px-5 py-3">Durée</th>
                <th className="text-left text-xs font-medium text-navy-400 uppercase tracking-wider px-5 py-3">Statut</th>
                <th className="text-left text-xs font-medium text-navy-400 uppercase tracking-wider px-5 py-3">Utilisé par</th>
                <th className="text-left text-xs font-medium text-navy-400 uppercase tracking-wider px-5 py-3">Créé le</th>
                <th className="text-left text-xs font-medium text-navy-400 uppercase tracking-wider px-5 py-3">Utilisé le</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-navy-800/30">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-5 py-4"><div className="h-4 bg-navy-800 rounded w-20 animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <Gift className="w-10 h-10 text-navy-700 mx-auto mb-3" />
                    <p className="text-sm text-navy-400">Aucun code trouvé.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="border-b border-navy-800/30 hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono text-white bg-navy-800/50 px-2.5 py-1 rounded">{c.code}</code>
                        <button onClick={() => copy(c.code, c.id)}
                          className="text-navy-400 hover:text-white transition-colors">
                          {copiedId === c.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm text-navy-300 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-navy-600" /> {c.duration_days}j
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {c.used ? (
                        <span className="badge badge-banned text-[11px]"><XCircle className="w-3 h-3" /> Utilisé</span>
                      ) : (
                        <span className="badge badge-active text-[11px]"><CheckCircle2 className="w-3 h-3" /> Disponible</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-navy-300">
                      {c.user ? (
                        <Link to={`/admin/users/${c.user.id}`} className="flex items-center gap-1 hover:text-brand-400 transition-colors">
                          <User className="w-3 h-3 text-navy-600" /> {c.user.pseudo}
                        </Link>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3 text-sm text-navy-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-navy-600" />
                        {fmtDate(c.created_at)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-navy-400">
                      {fmtDate(c.used_at)}
                    </td>
                    <td className="px-5 py-3">
                      {!c.used && (
                        confirmDeleteId === c.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => remove(c.id)} disabled={deleting === c.id}
                              className="px-2 py-1 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">
                              {deleting === c.id ? '…' : 'Oui'}
                            </button>
                            <button onClick={() => setConfirmDeleteId('')}
                              className="px-2 py-1 rounded-lg text-xs font-medium text-navy-400 hover:text-white hover:bg-white/5 transition-colors">
                              Non
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDeleteId(c.id)}
                            className="p-1.5 rounded-lg text-navy-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-navy-600">Page {page} / {totalPages}</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="btn-secondary !px-3 !py-1.5 text-xs disabled:opacity-30">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="btn-secondary !px-3 !py-1.5 text-xs disabled:opacity-30">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowGenerateModal(false)} />
          <div className="relative w-full max-w-lg card p-8 shadow-2xl animate-fade-scale">
            <button onClick={() => setShowGenerateModal(false)} className="absolute top-4 right-4 p-2 rounded-xl text-navy-400 hover:text-white hover:bg-white/5 transition-colors">
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-amber-500/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                <Gift className="w-7 h-7 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Générer un code Premium</h2>
              <p className="text-sm text-navy-300 mt-1">Choisissez la durée et le nombre de codes à créer.</p>
            </div>

            {generatedCodes.length === 0 ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-navy-400 uppercase tracking-wider mb-2 block">Durée</label>
                  <select value={genDuration} onChange={(e) => setGenDuration(Number(e.target.value))}
                    className="input-field !py-3 text-sm">
                    <option value={7}>7 jours</option>
                    <option value={14}>14 jours</option>
                    <option value={30}>1 mois (30 jours)</option>
                    <option value={60}>2 mois (60 jours)</option>
                    <option value={90}>3 mois (90 jours)</option>
                    <option value={180}>6 mois (180 jours)</option>
                    <option value={365}>1 an (365 jours)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-navy-400 uppercase tracking-wider mb-2 block">Quantité</label>
                  <select value={genCount} onChange={(e) => setGenCount(Number(e.target.value))}
                    className="input-field !py-3 text-sm">
                    {[1, 5, 10, 25, 50].map((n) => (
                      <option key={n} value={n}>{n} code{n > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
                <button onClick={generate} disabled={generating}
                  className="btn-primary w-full py-3.5 text-base mt-2">
                  <Plus className="w-4 h-4" />
                  {generating ? 'Génération…' : 'Générer'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-navy-400 uppercase tracking-wider">
                    {generatedCodes.length} code{generatedCodes.length > 1 ? 's' : ''} générés · {genDuration}j
                  </p>
                  <button onClick={copyGeneratedCodes}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      genCopied
                        ? 'bg-brand-500/20 text-brand-400'
                        : 'bg-navy-800 text-navy-300 hover:text-white hover:bg-navy-700'
                    }`}>
                    {genCopied ? <><Check className="w-3.5 h-3.5" /> Tout copié</> : <><Copy className="w-3.5 h-3.5" /> Tout copier</>}
                  </button>
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {generatedCodes.map((c, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-navy-900 border border-navy-800 group">
                      <code className="text-sm font-mono text-amber-400 flex-1 select-all tracking-wide">{c}</code>
                      <button
                        onClick={() => copySingleCode(c)}
                        className={`shrink-0 p-1.5 rounded-lg transition-colors ${
                          copiedCode === c
                            ? 'text-brand-400 bg-brand-500/10'
                            : 'text-navy-500 hover:text-white hover:bg-white/10'
                        }`}
                        title="Copier"
                      >
                        {copiedCode === c ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => { setShowGenerateModal(false); setGeneratedCodes([]); }}
                  className="btn-secondary w-full py-3 mt-1">
                  Fermer
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
