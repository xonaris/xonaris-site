import { useEffect, useState } from 'react';
import { reportApi } from '../api';
import { fmtDateLong } from '../common/utils/date';
import type { Report } from '../types';
import { Flag, Clock, CheckCircle, XCircle, Inbox, AlertTriangle, Filter } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const statusConfig: Record<string, { icon: typeof Clock; label: string; badge: string; color: string; dot: string }> = {
  PENDING:  { icon: Clock,       label: 'En attente', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', color: 'text-amber-400', dot: 'bg-amber-400'  },
  ACCEPTED: { icon: CheckCircle, label: 'Accepté',    badge: 'bg-brand-500/10 text-brand-400 border-brand-500/20', color: 'text-brand-400', dot: 'bg-brand-400'  },
  REFUSED:  { icon: XCircle,     label: 'Refusé',     badge: 'bg-red-500/10 text-red-400 border-red-500/20',       color: 'text-red-400',   dot: 'bg-red-400'    },
};

const filters = [
  { value: '', label: 'Tous' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'ACCEPTED', label: 'Acceptés' },
  { value: 'REFUSED', label: 'Refusés' },
];

export default function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  useDocumentTitle('Mes signalements - Xonaris');

  useEffect(() => {
    reportApi.getMine()
      .then(setReports)
      .catch((err: any) => setError(err?.response?.data?.message || 'Impossible de charger vos signalements.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter ? reports.filter((r) => r.status === filter) : reports;

  const counts = {
    total: reports.length,
    pending: reports.filter((r) => r.status === 'PENDING').length,
    accepted: reports.filter((r) => r.status === 'ACCEPTED').length,
    refused: reports.filter((r) => r.status === 'REFUSED').length,
  };

  return (
    <div className="w-full min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 pb-8 sm:pb-12 animate-fade-up">
      {/* Header */}
      <div className="mb-6 sm:mb-10 flex flex-col sm:flex-row md:items-end justify-between gap-4 sm:gap-6">
        <div>
          <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-brand-500/10 rounded-xl sm:rounded-[1.5rem] flex items-center justify-center border border-brand-500/20 shadow-md shrink-0">
              <Flag className="w-6 h-6 sm:w-8 sm:h-8 text-brand-400 fill-brand-400" />
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-4xl font-black text-white tracking-tight">
                Mes <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-emerald-600">Signalements</span>
              </h1>
              <p className="text-navy-300 sm:mt-1 font-medium text-sm sm:text-lg">
                {counts.total} signalement{counts.total !== 1 ? 's' : ''} soumis
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      {!loading && !error && reports.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
          {[
            { label: 'En attente', count: counts.pending, colorClass: 'text-amber-400' },
            { label: 'Acceptés', count: counts.accepted, colorClass: 'text-brand-400' },
            { label: 'Refusés', count: counts.refused, colorClass: 'text-red-400' },
          ].map((s) => (
            <div key={s.label} className="card p-2.5 sm:p-4 text-center border-navy-800 bg-white/[0.02]">
              <p className={`text-xl sm:text-2xl font-black ${s.colorClass}`}>{s.count}</p>
              <p className="text-[10px] sm:text-xs text-navy-400 font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      {!loading && !error && reports.length > 0 && (
        <div className="flex items-center gap-2 mb-4 sm:mb-6 overflow-x-auto pb-2 scrollbar-none w-full">
          <Filter className="w-4 h-4 text-navy-400 shrink-0 hidden sm:block" />
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
                filter === f.value
                  ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                  : 'bg-white/[0.03] text-navy-400 border border-navy-800 hover:bg-white/[0.06] hover:text-navy-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-4 sm:p-6 animate-pulse border-navy-800 bg-white/[0.02]">
              <div className="flex items-center gap-3 sm:gap-4 mb-4">
                <div className="h-5 sm:h-6 w-20 sm:w-24 bg-white/5 rounded-full" />
                <div className="h-3 sm:h-4 w-24 sm:w-32 bg-white/5 rounded" />
              </div>
              <div className="h-4 sm:h-5 bg-white/5 rounded-full w-3/4" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="card p-8 sm:p-16 text-center border-navy-800 bg-white/[0.02]">
          <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 text-red-400 mx-auto mb-3" />
          <p className="text-sm sm:text-base text-red-400 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-secondary text-xs sm:text-sm">Réessayer</button>
        </div>
      ) : reports.length === 0 ? (
        <div className="card p-8 sm:p-16 text-center border-navy-800 bg-white/[0.02]">
          <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white/5 rounded-xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <Inbox className="w-8 h-8 sm:w-10 sm:h-10 text-navy-400" />
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-white mb-2">Aucun signalement</h2>
          <p className="text-sm sm:text-lg text-navy-300">
            Vos signalements de chaînes apparaîtront ici avec leur statut.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 sm:p-12 text-center border-navy-800 bg-white/[0.02]">
          <Filter className="w-6 h-6 sm:w-8 sm:h-8 text-navy-500 mx-auto mb-3" />
          <p className="text-sm sm:text-base text-navy-300">Aucun signalement avec ce filtre.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const cfg = statusConfig[r.status] || statusConfig.PENDING;
            const Icon = cfg.icon;
            return (
              <div key={r.id} className="card border-navy-800 bg-white/[0.02] hover:bg-white/[0.04] transition-colors overflow-hidden">
                {/* Status bar */}
                <div className={`h-0.5 ${cfg.dot}`} />
                <div className="p-4 sm:p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg border text-[10px] sm:text-xs font-bold uppercase tracking-wider w-fit ${cfg.badge}`}>
                      <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      {cfg.label}
                    </span>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-navy-400">
                      <span className="flex items-center gap-1 sm:gap-1.5">
                        <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        {fmtDateLong(r.created_at)}
                      </span>
                      {r.channel && (
                        <span className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 bg-navy-900 rounded-md border border-navy-800 text-[10px] sm:text-xs">
                          <div className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${cfg.dot}`} />
                          <span className="truncate max-w-[120px] sm:max-w-none">{r.channel.name}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-sm sm:text-base text-navy-200 font-medium leading-relaxed">
                    « {r.reason} »
                  </p>

                  {r.admin_response && (
                    <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-brand-500/5 border border-brand-500/15 rounded-xl">
                      <p className="text-[10px] sm:text-xs font-bold text-brand-400 uppercase tracking-wider mb-1 sm:mb-1.5">Réponse de l'équipe</p>
                      <p className="text-xs sm:text-sm text-navy-200 leading-relaxed">{r.admin_response}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
