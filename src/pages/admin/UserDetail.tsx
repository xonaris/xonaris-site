import { useEffect, useState } from 'react';
import { fmtDate, fmtDateTime } from '../../common/utils/date';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { adminApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import type { AdminUser } from '../../types';
import {
  ArrowLeft, Shield, Crown, Ban, Trash2, Calendar, Clock,
  Heart, Flag, Gift, Globe, Monitor, Activity, UserCheck,
  AlertTriangle, CheckCircle2, XCircle, Copy, Check, ShieldBan,
  ChevronDown, ChevronUp, ExternalLink, RefreshCw, Hash,
} from 'lucide-react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

type Tab = 'overview' | 'favorites' | 'reports' | 'codes' | 'logins' | 'actions';

export default function AdminUserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  useDocumentTitle('Admin — Détail utilisateur');

  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [banReason, setBanReason] = useState('');
  const [showBanForm, setShowBanForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [copiedField, setCopiedField] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (!id) return;
    adminApi.getUserById(id)
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [id]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 2000);
  };

  const handleBan = async () => {
    if (!id || !banReason.trim()) return;
    setActionLoading('ban');
    setActionError('');
    try {
      await adminApi.banUser(id, banReason);
      const u = await adminApi.getUserById(id);
      setUser(u);
      setShowBanForm(false);
      setBanReason('');
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Impossible de bannir cet utilisateur.');
      setTimeout(() => setActionError(''), 5000);
    } finally { setActionLoading(''); }
  };

  const handleUnban = async () => {
    if (!id) return;
    setActionLoading('unban');
    setActionError('');
    try {
      await adminApi.unbanUser(id);
      const u = await adminApi.getUserById(id);
      setUser(u);
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Impossible de débannir cet utilisateur.');
      setTimeout(() => setActionError(''), 5000);
    } finally { setActionLoading(''); }
  };

  const handleDelete = async () => {
    if (!id) return;
    setActionLoading('delete');
    setActionError('');
    try {
      await adminApi.deleteUser(id);
      navigate('/admin/users');
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Impossible de supprimer cet utilisateur.');
      setTimeout(() => setActionError(''), 5000);
      setActionLoading('');
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-6 bg-navy-800 rounded w-32" />
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-navy-800 rounded-xl" />
            <div className="space-y-2"><div className="h-5 bg-navy-800 rounded w-40" /><div className="h-4 bg-navy-800 rounded w-24" /></div>
          </div>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-4 bg-navy-800 rounded w-full" />)}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-white mb-2">Utilisateur introuvable</h2>
        <button onClick={() => navigate('/admin/users')} className="btn-secondary text-sm">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
      </div>
    );
  }

  const isPremium = user.premium_expires_at && new Date(user.premium_expires_at) > new Date();
  const isSelf = currentUser?.id === user.id;
  const isTargetAdmin = user.role === 'ADMIN';

  const tabs: { key: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: 'overview', label: 'Aperçu', icon: UserCheck },
    { key: 'favorites', label: 'Favoris', icon: Heart, count: user.favorites?.length ?? 0 },
    { key: 'reports', label: 'Signalements', icon: Flag, count: user.reports?.length ?? 0 },
    { key: 'codes', label: 'Codes utilisés', icon: Gift, count: user.used_codes?.length ?? 0 },
    { key: 'logins', label: 'Connexions', icon: Globe, count: user.login_logs?.length ?? 0 },
    { key: 'actions', label: 'Actions', icon: Activity, count: user.action_logs?.length ?? 0 },
  ];

  const InfoRow = ({ label, value, copyable }: { label: string; value: string | null | undefined; copyable?: boolean }) => (
    <div className="flex items-center justify-between py-2.5 border-b border-navy-800/30 last:border-0">
      <span className="text-sm text-navy-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm text-white font-medium">{value || '—'}</span>
        {copyable && value && (
          <button onClick={() => copyToClipboard(value, label)} className="text-navy-600 hover:text-white transition-colors">
            {copiedField === label ? <Check className="w-3 h-3 text-brand-400" /> : <Copy className="w-3 h-3" />}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {actionError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {actionError}
        </div>
      )}
      {/* Back */}
      <button onClick={() => navigate('/admin/users')}
        className="flex items-center gap-2 text-sm text-navy-400 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Retour aux utilisateurs
      </button>

      {/* Header card */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          {/* Avatar */}
          {user.avatar_discord ? (
            <img loading="lazy" src={user.avatar_discord} alt="" className="w-16 h-16 rounded-xl object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-brand-600/20 flex items-center justify-center text-xl font-bold text-brand-400">
              {user.pseudo?.[0]?.toUpperCase()}
            </div>
          )}

          {/* Name + badges */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-display font-bold text-white">{user.pseudo}</h1>
              {user.role === 'ADMIN' && (
                <span className="badge badge-active flex items-center gap-1"><Shield className="w-3 h-3" /> Admin</span>
              )}
              {isPremium && (
                <span className="badge badge-premium flex items-center gap-1"><Crown className="w-3 h-3" /> Premium</span>
              )}
              {user.is_banned && (
                <span className="badge badge-banned flex items-center gap-1"><ShieldBan className="w-3 h-3" /> Banni</span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-navy-400 flex-wrap">
              <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> {user.discord_id}</span>
              {user.username_discord && (
                <span className="flex items-center gap-1"><Monitor className="w-3 h-3" /> {user.username_discord}</span>
              )}
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Inscrit le {fmtDate(user.created_at)}</span>
            </div>
            {user.is_banned && user.ban_reason && (
              <div className="mt-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                <strong>Raison du ban :</strong> {user.ban_reason}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {!isSelf && !isTargetAdmin && (
              <>
                {user.is_banned ? (
                  <button onClick={handleUnban} disabled={actionLoading === 'unban'}
                    className="btn-secondary text-xs !text-brand-400 !border-brand-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {actionLoading === 'unban' ? '…' : 'Débannir'}
                  </button>
                ) : (
                  <button onClick={() => setShowBanForm(!showBanForm)}
                    className="btn-danger text-xs">
                    <Ban className="w-3.5 h-3.5" /> Bannir
                  </button>
                )}
                <button onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                  className="btn-danger text-xs !bg-red-600/10">
                  <Trash2 className="w-3.5 h-3.5" /> Supprimer
                </button>
              </>
            )}
            {isSelf && (
              <span className="text-xs text-navy-600 italic">Vous ne pouvez pas modifier votre propre compte</span>
            )}
            {!isSelf && isTargetAdmin && (
              <span className="text-xs text-navy-600 italic">Impossible de bannir ou supprimer un admin</span>
            )}
          </div>
        </div>

        {/* Ban form */}
        {showBanForm && (
          <div className="mt-4 p-4 bg-red-500/5 border border-red-500/20 rounded-xl space-y-3">
            <p className="text-sm font-medium text-red-400">Bannir {user.pseudo}</p>
            <input
              type="text"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Raison du bannissement…"
              className="input-field !bg-red-500/5 !border-red-500/20 text-sm"
            />
            <div className="flex items-center gap-2">
              <button onClick={handleBan} disabled={!banReason.trim() || actionLoading === 'ban'}
                className="btn-danger text-xs">
                {actionLoading === 'ban' ? 'Bannissement…' : 'Confirmer le ban'}
              </button>
              <button onClick={() => { setShowBanForm(false); setBanReason(''); }}
                className="btn-secondary text-xs">
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Delete confirm */}
        {showDeleteConfirm && (
          <div className="mt-4 p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
            <p className="text-sm text-red-400 mb-3">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              Êtes-vous sûr de vouloir supprimer <strong>{user.pseudo}</strong> ? Cette action est irréversible.
            </p>
            <div className="flex items-center gap-2">
              <button onClick={handleDelete} disabled={actionLoading === 'delete'}
                className="btn-danger text-xs">
                {actionLoading === 'delete' ? 'Suppression…' : 'Oui, supprimer'}
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary text-xs">
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.key
                ? 'bg-brand-600/15 text-brand-400'
                : 'text-navy-400 hover:text-white hover:bg-white/5'
            }`}>
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-md bg-navy-800 text-[10px] text-navy-300">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="card p-6">
        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-brand-400" /> Informations générales
              </h3>
              <div className="space-y-0">
                <InfoRow label="ID" value={user.id} copyable />
                <InfoRow label="Pseudo" value={user.pseudo} copyable />
                <InfoRow label="Discord ID" value={user.discord_id} copyable />
                <InfoRow label="Username Discord" value={user.username_discord} />
                <InfoRow label="Rôle" value={user.role} />
                <InfoRow label="Code parrainage" value={user.referral_code} copyable />
                <InfoRow label="Parrainé par" value={user.referred_by} copyable />
                <InfoRow label="Parrainages effectués" value={String(user.referral_count)} />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" /> Dates & activité
              </h3>
              <div className="space-y-0">
                <InfoRow label="Inscrit le" value={fmtDateTime(user.created_at)} />
                <InfoRow label="Dernière connexion" value={fmtDateTime(user.last_login_at)} />
                <InfoRow label="Premium depuis" value={fmtDateTime(user.premium_started_at)} />
                <InfoRow label="Premium expire" value={fmtDateTime(user.premium_expires_at)} />
                <InfoRow label="Première IP" value={user.first_ip} copyable />
                <InfoRow label="Dernière IP" value={user.last_ip} copyable />
                <InfoRow label="Favoris" value={String(user.favorites_count)} />
                <InfoRow label="Signalements" value={String(user.reports_count)} />
              </div>
            </div>
          </div>
        )}

        {/* FAVORITES */}
        {tab === 'favorites' && (
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-400" /> Favoris ({user.favorites?.length ?? 0})
            </h3>
            {!user.favorites?.length ? (
              <p className="text-sm text-navy-400 py-6 text-center">Aucun favori</p>
            ) : (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                {user.favorites.map((f) => (
                  <div key={f.id} className="p-3 rounded-xl bg-navy-800/30 flex items-center gap-3">
                    <Heart className="w-4 h-4 text-red-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">{f.channel?.name ?? 'Chaîne supprimée'}</p>
                      <p className="text-[11px] text-navy-600">{f.channel_id}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* REPORTS */}
        {tab === 'reports' && (
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Flag className="w-4 h-4 text-orange-400" /> Signalements effectués ({user.reports?.length ?? 0})
            </h3>
            {!user.reports?.length ? (
              <p className="text-sm text-navy-400 py-6 text-center">Aucun signalement</p>
            ) : (
              <div className="space-y-2">
                {user.reports.map((r) => (
                  <div key={r.id} className="p-3 rounded-xl bg-navy-800/30 flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      r.status === 'PENDING' ? 'bg-brand-400' : r.status === 'ACCEPTED' ? 'bg-brand-400' : 'bg-red-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{r.reason}</p>
                      <p className="text-[11px] text-navy-600">
                        {r.channel?.name ?? 'Chaîne'} · {fmtDate(r.created_at)} · {r.status}
                      </p>
                    </div>
                    {r.admin_response && (
                      <span className="text-[11px] text-navy-400 italic truncate max-w-[200px]">« {r.admin_response} »</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CODES */}
        {tab === 'codes' && (
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Gift className="w-4 h-4 text-amber-400" /> Codes Premium utilisés ({user.used_codes?.length ?? 0})
            </h3>
            {!user.used_codes?.length ? (
              <p className="text-sm text-navy-400 py-6 text-center">Aucun code utilisé</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-navy-800/40">
                      <th className="text-left text-xs text-navy-400 uppercase tracking-wider px-3 py-2">Code</th>
                      <th className="text-left text-xs text-navy-400 uppercase tracking-wider px-3 py-2">Durée</th>
                      <th className="text-left text-xs text-navy-400 uppercase tracking-wider px-3 py-2">Utilisé le</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.used_codes.map((c, i) => (
                      <tr key={i} className="border-b border-navy-800/20">
                        <td className="px-3 py-2">
                          <code className="text-xs font-mono text-white bg-navy-800/50 px-2 py-0.5 rounded">{c.code}</code>
                        </td>
                        <td className="px-3 py-2 text-sm text-navy-300">{c.duration_days} jours</td>
                        <td className="px-3 py-2 text-sm text-navy-300">{fmtDateTime(c.used_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* LOGINS */}
        {tab === 'logins' && (
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4 text-green-400" /> Dernières connexions ({user.login_logs?.length ?? 0})
            </h3>
            {!user.login_logs?.length ? (
              <p className="text-sm text-navy-400 py-6 text-center">Aucune connexion enregistrée</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-navy-800/40">
                      <th className="text-left text-xs text-navy-400 uppercase tracking-wider px-3 py-2">Date</th>
                      <th className="text-left text-xs text-navy-400 uppercase tracking-wider px-3 py-2">IP</th>
                      <th className="text-left text-xs text-navy-400 uppercase tracking-wider px-3 py-2">User Agent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.login_logs.map((l) => (
                      <tr key={l.id} className="border-b border-navy-800/20 hover:bg-white/[0.02]">
                        <td className="px-3 py-2 text-sm text-navy-300 whitespace-nowrap">
                          {fmtDateTime(l.created_at)}
                        </td>
                        <td className="px-3 py-2">
                          <code className="text-xs font-mono text-white">{l.ip}</code>
                        </td>
                        <td className="px-3 py-2 text-xs text-navy-400 max-w-xs truncate">{l.user_agent}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ACTIONS */}
        {tab === 'actions' && (
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" /> Journal d'actions ({user.action_logs?.length ?? 0})
            </h3>
            {!user.action_logs?.length ? (
              <p className="text-sm text-navy-400 py-6 text-center">Aucune action enregistrée</p>
            ) : (
              <div className="space-y-2">
                {user.action_logs.map((a) => (
                  <div key={a.id} className="p-3 rounded-xl bg-navy-800/30 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      a.action.includes('BAN') ? 'bg-red-500/10' :
                      a.action.includes('REPORT') ? 'bg-orange-500/10' :
                      'bg-brand-500/10'
                    }`}>
                      <Activity className={`w-3.5 h-3.5 ${
                        a.action.includes('BAN') ? 'text-red-400' :
                        a.action.includes('REPORT') ? 'text-orange-400' :
                        'text-brand-400'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium">{a.action}</p>
                      {a.details != null && (
                        <p className="text-[11px] text-navy-600 truncate">
                          {typeof a.details === 'string' ? a.details : JSON.stringify(a.details)}
                        </p>
                      )}
                    </div>
                    <span className="text-[11px] text-navy-600 shrink-0">
                      {fmtDateTime(a.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
