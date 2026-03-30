import { useEffect, useState } from 'react';
import { fmtDate } from '../../common/utils/date';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api';
import type { ChannelFull } from '../../types';
import {
  Tv, Plus, Pencil, Trash2, Search, X, Crown,
  CheckCircle2, XCircle, LayoutGrid, List, Eye, EyeOff,
  GripVertical, Calendar, ArrowUpDown, Filter, RefreshCw, AlertTriangle,
} from 'lucide-react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

type ViewMode = 'table' | 'grid';
type SortKey = 'name' | 'sort_order' | 'category' | 'created_at';

export default function AdminChannels() {
  useDocumentTitle('Admin — Chaînes');
  const [channels, setChannels] = useState<ChannelFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewMode>('table');
  const [sortKey, setSortKey] = useState<SortKey>('sort_order');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'PREMIUM'>('ALL');
  const [deleting, setDeleting] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    adminApi.getChannels()
      .then(setChannels)
      .catch((err: any) => setError(err?.response?.data?.message || 'Impossible de charger les chaînes.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    setError('');
    try {
      await adminApi.deleteChannel(id);
      setChannels((c) => c.filter((ch) => ch.id !== id));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erreur lors de la suppression de la chaîne.');
      setTimeout(() => setError(''), 5000);
    } finally { setDeleting(''); setConfirmDeleteId(''); }
  };

  const categories = Array.from(new Set(channels.map((c) => c.category).filter(Boolean)));

  const filtered = channels
    .filter((c) => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase()) &&
          !c.slug.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCategory !== 'ALL' && c.category !== filterCategory) return false;
      if (filterStatus === 'ACTIVE' && !c.is_active) return false;
      if (filterStatus === 'INACTIVE' && c.is_active) return false;
      if (filterStatus === 'PREMIUM' && !c.is_premium) return false;
      return true;
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'name') return dir * a.name.localeCompare(b.name);
      if (sortKey === 'category') return dir * (a.category ?? '').localeCompare(b.category ?? '');
      if (sortKey === 'created_at') return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      return dir * (a.sort_order - b.sort_order);
    });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const activeCount = channels.filter((c) => c.is_active).length;
  const premiumCount = channels.filter((c) => c.is_premium).length;

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
            <Tv className="w-6 h-6 text-mint-400" />
            Chaînes
          </h1>
          <p className="text-sm text-navy-300 mt-1">
            {channels.length} chaîne{channels.length !== 1 ? 's' : ''} ·
            {activeCount} active{activeCount !== 1 ? 's' : ''} ·
            {premiumCount} premium
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="btn-secondary !px-3 !py-2" title="Rafraîchir">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex items-center gap-1 bg-navy-800/50 rounded-lg p-0.5">
            <button onClick={() => setView('table')}
              className={`p-1.5 rounded-md transition-colors ${view === 'table' ? 'bg-brand-600/20 text-brand-400' : 'text-navy-400 hover:text-white'}`}>
              <List className="w-4 h-4" />
            </button>
            <button onClick={() => setView('grid')}
              className={`p-1.5 rounded-md transition-colors ${view === 'grid' ? 'bg-brand-600/20 text-brand-400' : 'text-navy-400 hover:text-white'}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          <Link to="/admin/channels/create" className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> Nouvelle chaîne
          </Link>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
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

        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
          className="input-field !w-auto !py-2 !px-3 text-sm">
          <option value="ALL">Toutes catégories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          className="input-field !w-auto !py-2 !px-3 text-sm">
          <option value="ALL">Tous statuts</option>
          <option value="ACTIVE">Actives</option>
          <option value="INACTIVE">Inactives</option>
          <option value="PREMIUM">Premium</option>
        </select>

        <span className="text-xs text-navy-600">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse space-y-3">
              <div className="h-10 bg-navy-800 rounded-xl w-10" />
              <div className="h-4 bg-navy-800 rounded w-3/4" />
              <div className="h-3 bg-navy-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <Tv className="w-12 h-12 text-navy-700 mx-auto mb-3" />
          <p className="text-navy-400">Aucune chaîne trouvée.</p>
        </div>
      ) : view === 'grid' ? (
        /* Grid view */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((ch) => (
            <div key={ch.id} className="card-hover p-5 group relative">
              <div className="flex items-start gap-4">
                {ch.logo_url ? (
                  <img loading="lazy" src={ch.logo_url} alt={ch.name} className="w-12 h-12 rounded-xl object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-mint-500/10 flex items-center justify-center">
                    <Tv className="w-5 h-5 text-mint-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate">{ch.name}</h3>
                  <p className="text-xs text-navy-400">/{ch.slug}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-navy-800/50 text-navy-300">{ch.category}</span>
                    {ch.is_premium && (
                      <span className="badge badge-premium text-[10px]"><Crown className="w-2.5 h-2.5" /> Premium</span>
                    )}
                    {ch.is_active ? (
                      <span className="badge badge-active text-[10px]"><CheckCircle2 className="w-2.5 h-2.5" /> Active</span>
                    ) : (
                      <span className="badge badge-banned text-[10px]"><XCircle className="w-2.5 h-2.5" /> Inactive</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-navy-800/30">
                <span className="text-xs text-navy-600 flex items-center gap-1 flex-1">
                  <GripVertical className="w-3 h-3" /> Ordre: {ch.sort_order}
                </span>
                <Link to={`/admin/channels/${ch.id}`}
                  className="p-1.5 rounded-lg text-navy-400 hover:text-brand-400 hover:bg-brand-500/10 transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </Link>
                {confirmDeleteId === ch.id ? (
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleDelete(ch.id)} disabled={deleting === ch.id}
                      className="px-2 py-1 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">
                      {deleting === ch.id ? '…' : 'Oui'}
                    </button>
                    <button onClick={() => setConfirmDeleteId('')}
                      className="px-2 py-1 rounded-lg text-xs font-medium text-navy-400 hover:text-white hover:bg-white/5 transition-colors">
                      Non
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDeleteId(ch.id)}
                    className="p-1.5 rounded-lg text-navy-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table view */
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-navy-800/50">
                  <th className="text-left px-5 py-3">
                    <button onClick={() => toggleSort('sort_order')} className="flex items-center gap-1 text-xs font-medium text-navy-400 uppercase tracking-wider hover:text-white">
                      # <ArrowUpDown className={`w-3 h-3 ${sortKey === 'sort_order' ? 'text-brand-400' : 'text-navy-700'}`} />
                    </button>
                  </th>
                  <th className="text-left px-5 py-3">
                    <button onClick={() => toggleSort('name')} className="flex items-center gap-1 text-xs font-medium text-navy-400 uppercase tracking-wider hover:text-white">
                      Chaîne <ArrowUpDown className={`w-3 h-3 ${sortKey === 'name' ? 'text-brand-400' : 'text-navy-700'}`} />
                    </button>
                  </th>
                  <th className="text-left px-5 py-3">
                    <button onClick={() => toggleSort('category')} className="flex items-center gap-1 text-xs font-medium text-navy-400 uppercase tracking-wider hover:text-white">
                      Catégorie <ArrowUpDown className={`w-3 h-3 ${sortKey === 'category' ? 'text-brand-400' : 'text-navy-700'}`} />
                    </button>
                  </th>
                  <th className="text-left px-5 py-3"><span className="text-xs font-medium text-navy-400 uppercase tracking-wider">Statut</span></th>
                  <th className="text-left px-5 py-3"><span className="text-xs font-medium text-navy-400 uppercase tracking-wider">Type</span></th>
                  <th className="text-left px-5 py-3">
                    <button onClick={() => toggleSort('created_at')} className="flex items-center gap-1 text-xs font-medium text-navy-400 uppercase tracking-wider hover:text-white">
                      Créée le <ArrowUpDown className={`w-3 h-3 ${sortKey === 'created_at' ? 'text-brand-400' : 'text-navy-700'}`} />
                    </button>
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((ch) => (
                  <tr key={ch.id} className="border-b border-navy-800/30 hover:bg-white/[0.02] transition-colors group">
                    <td className="px-5 py-3 text-xs text-navy-600 font-mono">{ch.sort_order}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {ch.logo_url ? (
                          <img loading="lazy" src={ch.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-mint-500/10 flex items-center justify-center">
                            <Tv className="w-3.5 h-3.5 text-mint-400" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-white">{ch.name}</p>
                          <p className="text-[11px] text-navy-600">/{ch.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-md bg-navy-800/50 text-navy-300">{ch.category}</span>
                    </td>
                    <td className="px-5 py-3">
                      {ch.is_active ? (
                        <span className="badge badge-active text-[11px]"><Eye className="w-3 h-3" /> Active</span>
                      ) : (
                        <span className="badge badge-banned text-[11px]"><EyeOff className="w-3 h-3" /> Inactive</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {ch.is_premium ? (
                        <span className="badge badge-premium text-[11px]"><Crown className="w-3 h-3" /> Premium</span>
                      ) : (
                        <span className="text-xs text-navy-400">Gratuit</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-navy-300 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-navy-600" />
                      {fmtDate(ch.created_at)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <Link to={`/admin/channels/${ch.id}`}
                          className="p-1.5 rounded-lg text-navy-400 hover:text-brand-400 hover:bg-brand-500/10 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </Link>
                        {confirmDeleteId === ch.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleDelete(ch.id)} disabled={deleting === ch.id}
                              className="px-2 py-1 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">
                              {deleting === ch.id ? '…' : 'Oui'}
                            </button>
                            <button onClick={() => setConfirmDeleteId('')}
                              className="px-2 py-1 rounded-lg text-xs font-medium text-navy-400 hover:text-white hover:bg-white/5 transition-colors">
                              Non
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDeleteId(ch.id)}
                            className="p-1.5 rounded-lg text-navy-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
