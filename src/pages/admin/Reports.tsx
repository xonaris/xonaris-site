import { useEffect, useState } from 'react';
import { fmtDateTimeShort } from '../../common/utils/date';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api';
import type { Report } from '../../types';
import {
  Flag, CheckCircle2, XCircle, Clock, User, Tv,
  MessageSquare, Calendar, RefreshCw, Filter, Search, X,
  AlertTriangle, Send, ChevronDown, ChevronUp, Eye,
} from 'lucide-react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

type StatusFilter = 'ALL' | 'PENDING' | 'ACCEPTED' | 'REFUSED';

const statusConfig = {
  PENDING:  { label: 'En attente', icon: Clock,        color: 'text-brand-400',    bg: 'bg-brand-500/10',    badge: 'badge-pending' },
  ACCEPTED: { label: 'Accepté',    icon: CheckCircle2, color: 'text-brand-400', bg: 'bg-brand-500/10', badge: 'badge-active' },
  REFUSED:  { label: 'Refusé',     icon: XCircle,      color: 'text-red-400',     bg: 'bg-red-500/10',     badge: 'badge-banned' },
};

export default function AdminReports() {
  useDocumentTitle('Admin — Signalements');
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDING');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [response, setResponse] = useState('');
  const [responding, setResponding] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    const apiStatus = statusFilter === 'ALL' ? undefined : statusFilter;
    adminApi.getReports(apiStatus)
      .then((r) => setReports(r as Report[]))
      .catch((err: any) => setError(err?.response?.data?.message || 'Impossible de charger les signalements.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [statusFilter]);

  const handleResolve = async (id: string, status: 'ACCEPTED' | 'REFUSED') => {
    setResponding(id);
    setError('');
    try {
      const updated = await adminApi.updateReport(id, status, response || undefined);
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, ...(updated as Report) } : r)));
      setExpandedId(null);
      setResponse('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erreur lors du traitement du signalement.');
      setTimeout(() => setError(''), 5000);
    } finally { setResponding(''); }
  };

  const filtered = reports.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return r.reason.toLowerCase().includes(s) ||
      r.user?.pseudo?.toLowerCase().includes(s) ||
      r.channel?.name?.toLowerCase().includes(s);
  });

  const pendingCount = reports.filter((r) => r.status === 'PENDING').length;
  const acceptedCount = reports.filter((r) => r.status === 'ACCEPTED').length;
  const refusedCount = reports.filter((r) => r.status === 'REFUSED').length;

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
            <Flag className="w-6 h-6 text-orange-400" />
            Signalements
          </h1>
          <p className="text-sm text-navy-300 mt-1">{reports.length} signalement{reports.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={load} className="btn-secondary !px-3 !py-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{pendingCount}</p>
            <p className="text-xs text-navy-400">En attente</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-brand-500/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{acceptedCount}</p>
            <p className="text-xs text-navy-400">Acceptés</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{refusedCount}</p>
            <p className="text-xs text-navy-400">Refusés</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          {(['ALL', 'PENDING', 'ACCEPTED', 'REFUSED'] as StatusFilter[]).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s ? 'bg-brand-600/20 text-brand-400' : 'bg-navy-800/50 text-navy-400 hover:text-white'
              }`}>
              {s === 'ALL' ? 'Tous' : statusConfig[s].label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…" className="input-field !pl-10 !py-2 text-sm" />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Reports list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse space-y-2">
              <div className="h-4 bg-navy-800 rounded w-1/3" />
              <div className="h-4 bg-navy-800 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <CheckCircle2 className="w-12 h-12 text-brand-500/30 mx-auto mb-3" />
          <p className="text-sm text-navy-400">
            {statusFilter === 'PENDING' ? 'Aucun signalement en attente !' : 'Aucun signalement trouvé.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const cfg = statusConfig[r.status];
            const isExpanded = expandedId === r.id;
            return (
              <div key={r.id} className="card overflow-hidden">
                {/* Main row */}
                <div className="p-5 flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
                    <cfg.icon className={`w-5 h-5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`${cfg.badge} badge text-[11px]`}>{cfg.label}</span>
                      <span className="text-xs text-navy-600 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {fmtDateTimeShort(r.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-white mb-1.5">{r.reason}</p>
                    <div className="flex items-center gap-4 text-xs text-navy-400">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {r.user?.pseudo ? (
                          <Link to={`/admin/users/${r.user_id}`} className="text-brand-400 hover:text-indigo-300">{r.user.pseudo}</Link>
                        ) : 'Inconnu'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Tv className="w-3 h-3" />
                        {r.channel?.name ?? 'Chaîne supprimée'}
                      </span>
                    </div>
                    {r.admin_response && (
                      <div className="mt-2 px-3 py-2 bg-navy-800/30 rounded-lg text-sm text-navy-300 flex items-start gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-navy-600 mt-0.5 shrink-0" />
                        <span>« {r.admin_response} »</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {r.status === 'PENDING' && (
                      <>
                        <button onClick={() => { setExpandedId(isExpanded ? null : r.id); setResponse(''); }}
                          className="btn-secondary !px-2.5 !py-1.5 text-xs">
                          <Eye className="w-3.5 h-3.5" />
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Expanded response form */}
                {isExpanded && r.status === 'PENDING' && (
                  <div className="px-5 pb-5 pt-0 space-y-3 border-t border-navy-800/30 mt-0 pt-4">
                    <div>
                      <label className="text-xs text-navy-400 mb-1 block">Réponse admin (optionnel)</label>
                      <textarea value={response} onChange={(e) => setResponse(e.target.value)}
                        rows={2} placeholder="Ajouter un commentaire…"
                        className="input-field text-sm resize-none" />
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleResolve(r.id, 'ACCEPTED')}
                        disabled={responding === r.id}
                        className="px-4 py-2 rounded-xl text-xs font-medium bg-brand-600/20 text-brand-400 hover:bg-brand-600/30 border border-brand-500/20 transition-colors flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {responding === r.id ? '…' : 'Accepter'}
                      </button>
                      <button onClick={() => handleResolve(r.id, 'REFUSED')}
                        disabled={responding === r.id}
                        className="px-4 py-2 rounded-xl text-xs font-medium bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/20 transition-colors flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5" />
                        {responding === r.id ? '…' : 'Refuser'}
                      </button>
                      <button onClick={() => setExpandedId(null)} className="btn-secondary !px-3 !py-1.5 text-xs">
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
