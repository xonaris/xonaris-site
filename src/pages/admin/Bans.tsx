import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api';
import type { AdminUser } from '../../types';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import {
  ShieldBan, Search, RefreshCw, UserX, CheckCircle, AlertTriangle,
  Calendar, ExternalLink, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Copy, X, Shield,
} from 'lucide-react';

export default function Bans() {
  useDocumentTitle('Admin — Bannissements');

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [unbanId, setUnbanId] = useState<string | null>(null);
  const [unbanning, setUnbanning] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');
  const perPage = 20;

  const load = async (p: number) => {
    setLoading(true);
    try {
      const res = await adminApi.getBannedUsers(p, perPage);
      setUsers(res.users);
      setTotal(res.total);
    } catch { setError('Impossible de charger les bannissements.'); } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(page); }, [page]);

  /* ---------- search filter (client side on current page) ---------- */
  const filtered = useMemo(() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.pseudo.toLowerCase().includes(q) ||
        (u.ban_reason ?? '').toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q) ||
        (u.discord_id ?? '').includes(q),
    );
  }, [users, search]);

  /* ---------- handlers ---------- */
  const handleUnban = async () => {
    if (!unbanId) return;
    setUnbanning(true);
    const prevUsers = [...users];
    const prevTotal = total;
    try {
      await adminApi.unbanUser(unbanId);
      setUsers((prev) => prev.filter((u) => u.id !== unbanId));
      setTotal((t) => t - 1);
      setToast('Utilisateur débanni');
      setTimeout(() => setToast(''), 3000);
    } catch (err: any) {
      setUsers(prevUsers);
      setTotal(prevTotal);
      setError(err?.response?.data?.message || 'Impossible de débannir cet utilisateur.');
      setTimeout(() => setError(''), 4000);
    } finally {
      setUnbanning(false);
      setUnbanId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const copyId = (text: string) => {
    navigator.clipboard.writeText(text);
    setToast('Copié !');
    setTimeout(() => setToast(''), 2000);
  };

  /* ---------- render ---------- */
  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[200] card p-3 border border-brand-500/30 bg-brand-500/10 flex items-center gap-2 text-sm text-indigo-300 animate-in fade-in slide-in-from-top-2">
          <CheckCircle size={16} /> {toast}
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="fixed top-4 right-4 z-[200] card p-3 border border-red-500/30 bg-red-500/10 flex items-center gap-2 text-sm text-red-400 animate-in fade-in slide-in-from-top-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2">
            <ShieldBan size={24} className="text-red-400" /> Bannissements
          </h1>
          <p className="text-sm text-navy-300 mt-1">{total} utilisateur{total > 1 ? 's' : ''} banni{total > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => load(page)}
          className="btn-secondary flex items-center gap-1.5 text-sm"
        >
          <RefreshCw size={14} /> Rafraîchir
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
            <UserX className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-white">{total}</p>
            <p className="text-xs text-navy-400">Total bannis</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-white">
              {users.filter((u) => u.ban_reason).length}
            </p>
            <p className="text-xs text-navy-400">Avec raison</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-mint-500/10 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-mint-400" />
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-white">
              {users.filter((u) => !u.ban_reason).length}
            </p>
            <p className="text-xs text-navy-400">Sans raison</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par pseudo, raison, ID…"
            className="input-field pl-9 w-full"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={24} className="animate-spin text-mint-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-white/40">
          <UserX size={40} className="mx-auto mb-3 opacity-30" />
          <p>Aucun utilisateur banni trouvé</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs text-white/40 uppercase tracking-wider">
                  <th className="p-3">Utilisateur</th>
                  <th className="p-3">Raison</th>
                  <th className="p-3">IPs</th>
                  <th className="p-3">Inscrit le</th>
                  <th className="p-3">Dernier login</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition">
                    {/* User cell */}
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {u.avatar_discord ? (
                          <img
                            src={u.avatar_discord}
                            alt=""
                            className="w-9 h-9 rounded-full"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold">
                            {u.pseudo.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{u.pseudo}</p>
                          <button
                            onClick={() => copyId(u.id)}
                            className="text-xs text-white/30 hover:text-white/60 font-mono flex items-center gap-1"
                          >
                            {u.id.slice(0, 8)}… <Copy size={10} />
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Reason */}
                    <td className="p-3 max-w-xs">
                      {u.ban_reason ? (
                        <p className="text-white/70 text-xs line-clamp-2">{u.ban_reason}</p>
                      ) : (
                        <span className="text-white/20 text-xs italic">Non spécifiée</span>
                      )}
                    </td>

                    {/* IPs */}
                    <td className="p-3 text-xs font-mono text-white/40">
                      <div>{u.first_ip ?? '—'}</div>
                      {u.last_ip && u.last_ip !== u.first_ip && (
                        <div className="text-white/25">{u.last_ip}</div>
                      )}
                    </td>

                    {/* Dates */}
                    <td className="p-3 text-xs text-white/50 whitespace-nowrap">
                      <span className="flex items-center gap-1"><Calendar size={10} /> {fmt(u.created_at)}</span>
                    </td>
                    <td className="p-3 text-xs text-white/50 whitespace-nowrap">{fmt(u.last_login_at)}</td>

                    {/* Actions */}
                    <td className="p-3 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Link
                          to={`/admin/users/${u.id}`}
                          className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1"
                        >
                          <ExternalLink size={12} /> Détails
                        </Link>
                        <button
                          onClick={() => setUnbanId(u.id)}
                          className="btn-primary text-xs px-2.5 py-1.5 flex items-center gap-1"
                        >
                          <CheckCircle size={12} /> Débannir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <button disabled={page <= 1} onClick={() => setPage(1)} className="btn-secondary p-2 disabled:opacity-30">
            <ChevronsLeft size={16} />
          </button>
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="btn-secondary p-2 disabled:opacity-30">
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce<(number | '...')[]>((acc, p, i, arr) => {
              if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === '...' ? (
                <span key={`e${i}`} className="px-1 text-white/20">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition ${
                    p === page ? 'bg-mint-500 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {p}
                </button>
              ),
            )}
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="btn-secondary p-2 disabled:opacity-30">
            <ChevronRight size={16} />
          </button>
          <button disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="btn-secondary p-2 disabled:opacity-30">
            <ChevronsRight size={16} />
          </button>
        </div>
      )}

      {/* Unban modal */}
      {unbanId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="card p-6 w-full max-w-sm space-y-4 animate-in fade-in zoom-in">
            <div className="flex items-center gap-3 text-brand-400">
              <CheckCircle size={24} />
              <h3 className="font-semibold font-display">Débannir cet utilisateur ?</h3>
            </div>
            <p className="text-sm text-white/60">
              {users.find((u) => u.id === unbanId)?.pseudo ?? 'Utilisateur'} pourra à nouveau accéder à la plateforme.
            </p>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setUnbanId(null)} className="btn-secondary text-sm flex items-center gap-1.5">
                <X size={14} /> Annuler
              </button>
              <button
                onClick={handleUnban}
                disabled={unbanning}
                className="btn-primary text-sm flex items-center gap-1.5"
              >
                <CheckCircle size={14} /> {unbanning ? 'Débannissement…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
