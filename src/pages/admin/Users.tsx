import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api';
import type { AdminUser } from '../../types';
import {
  Users, Search, Shield, Crown, ChevronRight, Ban,
  ChevronLeft, ChevronsLeft, ChevronsRight, ArrowUpDown,
  Calendar, UserCheck, UserX, Filter, X, RefreshCw, AlertTriangle,
} from 'lucide-react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

type SortKey = 'pseudo' | 'created_at' | 'role' | 'last_login_at';
type SortDir = 'asc' | 'desc';
type FilterRole = 'ALL' | 'ADMIN' | 'USER';
type FilterStatus = 'ALL' | 'PREMIUM' | 'BANNED' | 'ACTIVE';

export default function AdminUsers() {
  useDocumentTitle('Admin — Utilisateurs');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterRole, setFilterRole] = useState<FilterRole>('ALL');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState('');
  const perPage = 20;

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    adminApi
      .getUsers(page, debouncedSearch || undefined, perPage)
      .then((res) => {
        setUsers(res.users || []);
        setTotal(res.total || 0);
      })
      .catch((err: any) => {
        setError(err?.response?.data?.message || 'Impossible de charger les utilisateurs.');
      })
      .finally(() => setLoading(false));
  }, [page, debouncedSearch]);

  useEffect(load, [load]);

  // Client-side filter + sort
  const filtered = users
    .filter((u) => {
      if (filterRole === 'ADMIN' && u.role !== 'ADMIN') return false;
      if (filterRole === 'USER' && u.role !== 'USER') return false;
      if (filterStatus === 'PREMIUM' && !(u.premium_expires_at && new Date(u.premium_expires_at) > new Date())) return false;
      if (filterStatus === 'BANNED' && !u.is_banned) return false;
      if (filterStatus === 'ACTIVE' && (u.is_banned || (u.premium_expires_at && new Date(u.premium_expires_at) > new Date()))) return false;
      return true;
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'pseudo') return dir * (a.pseudo ?? '').localeCompare(b.pseudo ?? '');
      if (sortKey === 'role') return dir * a.role.localeCompare(b.role);
      if (sortKey === 'last_login_at') {
        const da = a.last_login_at ? new Date(a.last_login_at).getTime() : 0;
        const db = b.last_login_at ? new Date(b.last_login_at).getTime() : 0;
        return dir * (da - db);
      }
      return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const totalPages = Math.ceil(total / perPage);
  const activeFilters = (filterRole !== 'ALL' ? 1 : 0) + (filterStatus !== 'ALL' ? 1 : 0);

  const clearFilters = () => { setFilterRole('ALL'); setFilterStatus('ALL'); };

  const isPremium = (u: AdminUser) => u.premium_expires_at && new Date(u.premium_expires_at) > new Date();

  const ThSort = ({ label, sortK }: { label: string; sortK: SortKey }) => (
    <button onClick={() => toggleSort(sortK)}
      className="flex items-center gap-1 text-xs font-medium text-navy-400 uppercase tracking-wider hover:text-white transition-colors group">
      {label}
      <ArrowUpDown className={`w-3 h-3 transition-colors ${sortKey === sortK ? 'text-brand-400' : 'text-navy-700 group-hover:text-navy-400'}`} />
    </button>
  );

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
            <Users className="w-6 h-6 text-brand-400" />
            Utilisateurs
          </h1>
          <p className="text-sm text-navy-300 mt-1">
            {total} utilisateur{total !== 1 ? 's' : ''} inscrit{total !== 1 ? 's' : ''}
            {filtered.length !== users.length && ` · ${filtered.length} affiché${filtered.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh */}
          <button onClick={load} className="btn-secondary !px-3 !py-2" title="Rafraîchir">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Filter toggle */}
          <button onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary !px-3 !py-2 relative ${showFilters ? '!border-brand-500/40 !text-brand-400' : ''}`}>
            <Filter className="w-4 h-4" />
            {activeFilters > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-brand-600 text-[10px] text-white flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </button>

          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pseudo, Discord ID…"
              className="input-field !pl-10 !py-2 text-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-brand-400" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold text-white leading-tight">{total.toLocaleString('fr-FR')}</p>
            <p className="text-[10px] text-navy-400 uppercase tracking-wider">Total</p>
          </div>
        </div>
        <div className="card px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <Crown className="w-4 h-4 text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold text-white leading-tight">
              {users.filter((u) => u.premium_expires_at && new Date(u.premium_expires_at) > new Date()).length}
            </p>
            <p className="text-[10px] text-navy-400 uppercase tracking-wider">Premium</p>
          </div>
        </div>
        <div className="card px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
            <UserX className="w-4 h-4 text-red-400" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold text-white leading-tight">{users.filter((u) => u.is_banned).length}</p>
            <p className="text-[10px] text-navy-400 uppercase tracking-wider">Bannis</p>
          </div>
        </div>
        <div className="card px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-purple-400" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold text-white leading-tight">{users.filter((u) => u.role === 'ADMIN').length}</p>
            <p className="text-[10px] text-navy-400 uppercase tracking-wider">Admins</p>
          </div>
        </div>
      </div>

      {/* Filters bar */}
      {showFilters && (
        <div className="card p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-navy-400 uppercase tracking-wider">Rôle</span>
            {(['ALL', 'ADMIN', 'USER'] as FilterRole[]).map((r) => (
              <button key={r} onClick={() => setFilterRole(r)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  filterRole === r ? 'bg-brand-600/20 text-brand-400' : 'bg-navy-800/50 text-navy-400 hover:text-white'
                }`}>
                {r === 'ALL' ? 'Tous' : r === 'ADMIN' ? 'Admin' : 'User'}
              </button>
            ))}
          </div>
          <div className="w-px h-6 bg-navy-800" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-navy-400 uppercase tracking-wider">Statut</span>
            {(['ALL', 'PREMIUM', 'BANNED', 'ACTIVE'] as FilterStatus[]).map((s) => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  filterStatus === s ? 'bg-brand-600/20 text-brand-400' : 'bg-navy-800/50 text-navy-400 hover:text-white'
                }`}>
                {s === 'ALL' ? 'Tous' : s === 'PREMIUM' ? 'Premium' : s === 'BANNED' ? 'Bannis' : 'Actifs'}
              </button>
            ))}
          </div>
          {activeFilters > 0 && (
            <>
              <div className="w-px h-6 bg-navy-800" />
              <button onClick={clearFilters} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                <X className="w-3 h-3" /> Réinitialiser
              </button>
            </>
          )}
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-navy-800/50">
                <th className="text-left px-5 py-3"><ThSort label="Utilisateur" sortK="pseudo" /></th>
                <th className="text-left px-5 py-3"><ThSort label="Rôle" sortK="role" /></th>
                <th className="text-left px-5 py-3">
                  <span className="text-xs font-medium text-navy-400 uppercase tracking-wider">Statut</span>
                </th>
                <th className="text-left px-5 py-3"><ThSort label="Inscrit le" sortK="created_at" /></th>
                <th className="text-left px-5 py-3"><ThSort label="Dernière co." sortK="last_login_at" /></th>
                <th className="text-left px-5 py-3">
                  <span className="text-xs font-medium text-navy-400 uppercase tracking-wider">Infos</span>
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-navy-800/30">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-5 py-4"><div className="h-4 bg-navy-800 rounded w-20 animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <UserX className="w-10 h-10 text-navy-700 mx-auto mb-3" />
                    <p className="text-navy-400 text-sm">Aucun utilisateur trouvé.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="border-b border-navy-800/30 hover:bg-white/[0.02] transition-colors group">
                    {/* Avatar + name */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {u.avatar_discord ? (
                          <img loading="lazy" src={u.avatar_discord} alt="" className="w-9 h-9 rounded-xl object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-brand-600/20 flex items-center justify-center text-xs font-bold text-brand-400">
                            {u.pseudo?.[0]?.toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-white group-hover:text-brand-400 transition-colors">{u.pseudo}</p>
                          <p className="text-[11px] text-navy-600">{u.discord_id}</p>
                        </div>
                      </div>
                    </td>
                    {/* Role */}
                    <td className="px-5 py-3">
                      {u.role === 'ADMIN' ? (
                        <span className="badge badge-active flex items-center gap-1 w-fit">
                          <Shield className="w-3 h-3" /> Admin
                        </span>
                      ) : (
                        <span className="text-xs text-navy-400 flex items-center gap-1">
                          <UserCheck className="w-3 h-3" /> User
                        </span>
                      )}
                    </td>
                    {/* Status */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {u.is_banned && (
                          <span className="badge badge-banned flex items-center gap-1">
                            <Ban className="w-3 h-3" /> Banni
                          </span>
                        )}
                        {isPremium(u) && (
                          <span className="badge badge-premium flex items-center gap-1">
                            <Crown className="w-3 h-3" /> Premium
                          </span>
                        )}
                        {!u.is_banned && !isPremium(u) && (
                          <span className="text-xs text-navy-400">Actif</span>
                        )}
                      </div>
                    </td>
                    {/* Created at */}
                    <td className="px-5 py-3">
                      <span className="text-sm text-navy-300 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-navy-600" />
                        {new Date(u.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </td>
                    {/* Last login */}
                    <td className="px-5 py-3">
                      <span className="text-sm text-navy-400">
                        {u.last_login_at
                          ? new Date(u.last_login_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </span>
                    </td>
                    {/* Info badges */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 text-xs text-navy-600">
                        <span title="Favoris">♥ {u.favorites_count}</span>
                        <span title="Reports">⚑ {u.reports_count}</span>
                        <span title="Parrainages">⟳ {u.referral_count}</span>
                      </div>
                    </td>
                    {/* Action */}
                    <td className="px-5 py-3">
                      <Link to={`/admin/users/${u.id}`}
                        className="p-2 rounded-lg text-navy-600 hover:text-brand-400 hover:bg-brand-500/10 transition-colors inline-flex">
                        <ChevronRight className="w-4 h-4" />
                      </Link>
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
          <p className="text-xs text-navy-600">
            Page {page} sur {totalPages} · {total} résultat{total !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)} disabled={page === 1}
              className="btn-secondary !px-2 !py-1.5 text-xs disabled:opacity-30">
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="btn-secondary !px-2 !py-1.5 text-xs disabled:opacity-30">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              let p: number;
              if (totalPages <= 5) p = i + 1;
              else if (page <= 3) p = i + 1;
              else if (page >= totalPages - 2) p = totalPages - 4 + i;
              else p = page - 2 + i;
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                    p === page ? 'bg-brand-600 text-white' : 'bg-navy-800/50 text-navy-400 hover:text-white'
                  }`}>
                  {p}
                </button>
              );
            })}

            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="btn-secondary !px-2 !py-1.5 text-xs disabled:opacity-30">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setPage(totalPages)} disabled={page >= totalPages}
              className="btn-secondary !px-2 !py-1.5 text-xs disabled:opacity-30">
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
