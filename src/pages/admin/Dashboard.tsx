import { useEffect, useState, useMemo } from 'react';
import { fmtDateShort, fmtDateLong, fmtDayMonth, fmtDay } from '../../common/utils/date';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api';
import type { AdminStats, StatsHistoryEntry, Report } from '../../types';
import {
  Users, Tv, Flag, Gift, Crown, Activity, ShieldBan,
  TrendingUp, Heart, ArrowUpRight, Clock, AlertTriangle,
  CheckCircle2, BarChart3, Zap, Newspaper,
  ArrowUp, ArrowDown, Bookmark, Globe,
} from 'lucide-react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend,
} from 'recharts';

/* ══════════════════════════════════════════════════════════════════
   Helpers & Sub-components
   ══════════════════════════════════════════════════════════════════ */

const CHART_COLORS = {
  indigo: '#10b981',
  sky: '#14b8a6',
  amber: '#f59e0b',
  red: '#ef4444',
  purple: '#8b5cf6',
  blue: '#3b82f6',
  slate: '#64748b',
  cyan: '#06b6d4',
};

/* Custom Tooltip */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0e1721] border border-navy-700/60 rounded-xl px-4 py-3 shadow-2xl shadow-black/40">
      <p className="text-xs text-navy-300 mb-2 font-medium">
        {fmtDateShort(label)}
      </p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-navy-200">{p.name}:</span>
          <span className="font-semibold text-white">{p.value.toLocaleString('fr-FR')}</span>
        </div>
      ))}
    </div>
  );
}

/* Metric Card with optional trend */
function MetricCard({ label, value, icon: Icon, gradient, subtitle, link, trend }: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  gradient: string;
  subtitle?: string;
  link?: string;
  trend?: { value: number; label: string };
}) {
  const inner = (
    <div className={`relative overflow-hidden rounded-xl border border-navy-800/40 bg-[#0b1219] p-5 transition-all duration-300 group ${link ? 'hover:border-navy-700/60 hover:bg-[#0d1520] cursor-pointer hover:shadow-lg hover:shadow-black/20' : ''}`}>
      {/* Gradient accent */}
      <div className={`absolute top-0 right-0 w-32 h-32 ${gradient} opacity-[0.06] rounded-full -translate-y-1/2 translate-x-1/2 transition-opacity group-hover:opacity-[0.1]`} />

      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl ${gradient} flex items-center justify-center shadow-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex items-center gap-2">
          {trend && (
            <span className={`flex items-center gap-0.5 text-xs font-semibold ${trend.value >= 0 ? 'text-brand-400' : 'text-red-400'}`}>
              {trend.value >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              {Math.abs(trend.value)}%
            </span>
          )}
          {link && <ArrowUpRight className="w-4 h-4 text-navy-600 group-hover:text-navy-300 transition-colors" />}
        </div>
      </div>
      <p className="text-3xl font-bold text-white tracking-tight leading-none">
        {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
      </p>
      <p className="text-xs font-medium text-navy-400 uppercase tracking-wider mt-1.5">{label}</p>
      {subtitle && <p className="text-[11px] text-navy-600 mt-0.5">{subtitle}</p>}
    </div>
  );

  return link ? <Link to={link}>{inner}</Link> : inner;
}

/* Progress Bar */
function ProgressRow({ label, value, max, color, icon: Icon }: {
  label: string; value: number; max: number; color: string; icon: React.ElementType;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-4">
      <Icon className={`w-4 h-4 shrink-0 ${color.replace('bg-', 'text-')}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm text-navy-200 font-medium">{label}</span>
          <span className="text-sm font-bold text-white">{pct}%</span>
        </div>
        <div className="h-2 bg-navy-800/80 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${color} transition-all duration-700 ease-out`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[11px] text-navy-600 mt-1">{value.toLocaleString('fr-FR')} / {max.toLocaleString('fr-FR')}</p>
      </div>
    </div>
  );
}

/* Donut Chart using recharts */
function DonutWidget({ title, icon: Icon, iconColor, data }: {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  data: { name: string; value: number; color: string }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="card p-6 flex flex-col">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        {title}
      </h3>
      <div className="flex-1 flex items-center justify-center">
        <div className="relative">
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0];
                  return (
                    <div className="bg-[#0e1721] border border-navy-700/60 rounded-lg px-3 py-2 shadow-xl text-sm">
                      <span className="text-navy-200">{item.name}: </span>
                      <span className="text-white font-semibold">{Number(item.value).toLocaleString('fr-FR')}</span>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-start">
            <span className="text-xl font-bold text-white">{total.toLocaleString('fr-FR')}</span>
            <span className="text-[10px] text-navy-400 uppercase tracking-wider">Total</span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap justify-start gap-x-4 gap-y-1 mt-4">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs text-navy-300">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
            {d.name}
            <span className="text-navy-600">({d.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Page Component
   ══════════════════════════════════════════════════════════════════ */

export default function AdminDashboard() {
  useDocumentTitle('Admin — Dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [history, setHistory] = useState<StatsHistoryEntry[]>([]);
  const [recentReports, setRecentReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chartRange, setChartRange] = useState<7 | 14 | 30>(30);

  useEffect(() => {
    Promise.all([
      adminApi.getStats(),
      adminApi.getStatsHistory(30),
      adminApi.getReports('PENDING'),
    ])
      .then(([s, h, r]) => {
        setStats(s);
        setHistory(h.history || []);
        setRecentReports((r as Report[]).slice(0, 6));
      })
      .catch((err: any) => setError(err?.response?.data?.message || 'Impossible de charger le dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  const filteredHistory = useMemo(() => {
    if (!history.length) return [];
    return history.slice(-chartRange);
  }, [history, chartRange]);

  // Compute trends (last 7 days vs previous 7 days) from history
  const trends = useMemo(() => {
    if (history.length < 14) return { registrations: 0, logins: 0, reports: 0 };
    const recent = history.slice(-7);
    const prev = history.slice(-14, -7);
    const sum = (arr: StatsHistoryEntry[], key: keyof StatsHistoryEntry) =>
      arr.reduce((s, e) => s + (e[key] as number), 0);
    const calc = (key: keyof StatsHistoryEntry) => {
      const r = sum(recent, key);
      const p = sum(prev, key);
      if (p === 0) return r > 0 ? 100 : 0;
      return Math.round(((r - p) / p) * 100);
    };
    return { registrations: calc('registrations'), logins: calc('logins'), reports: calc('reports') };
  }, [history]);

  /* --- Loading skeleton --- */
  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-navy-800 rounded-xl" />
          <div>
            <div className="h-7 bg-navy-800 rounded-lg w-48" />
            <div className="h-4 bg-navy-800/60 rounded w-72 mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 bg-navy-800/40 rounded-xl" />
          ))}
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-navy-800/40 rounded-xl" />
          <div className="h-80 bg-navy-800/40 rounded-xl" />
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 bg-navy-800/40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="card p-16 text-center">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-sm text-red-400 mb-4">{error || 'Impossible de charger le dashboard.'}</p>
        <button onClick={() => window.location.reload()} className="btn-secondary text-sm">Réessayer</button>
      </div>
    );
  }

  const premiumPct = stats.users.total > 0 ? Math.round((stats.users.premium / stats.users.total) * 100) : 0;
  const standardUsers = Math.max(0, stats.users.total - stats.users.premium - stats.users.banned);

  return (
    <div className="space-y-8 animate-fade-up">
      {/* ═══ Header ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-sky-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            Dashboard
          </h1>
          <p className="text-navy-300 text-sm mt-1.5 ml-[52px]">
            Vue d'ensemble complète — Plateforme Xonaris
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-navy-400">
          <Clock className="w-3.5 h-3.5" />
          Mis à jour le {fmtDateLong(new Date())}
        </div>
      </div>

      {/* ═══ Primary Stat Cards — 6 columns ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          label="Utilisateurs" value={stats.users.total} icon={Users}
          gradient="bg-gradient-to-br from-brand-500 to-brand-700"
          link="/admin/users" subtitle={`${premiumPct}% premium`}
          trend={trends.registrations ? { value: trends.registrations, label: '7j' } : undefined}
        />
        <MetricCard
          label="Premium" value={stats.users.premium} icon={Crown}
          gradient="bg-gradient-to-br from-amber-500 to-amber-700"
          subtitle={`${premiumPct}% des utilisateurs`}
        />
        <MetricCard
          label="Chaînes" value={stats.channels.total} icon={Tv}
          gradient="bg-gradient-to-br from-mint-500 to-sky-700"
          link="/admin/channels" subtitle={`${stats.channels.active} actives`}
        />
        <MetricCard
          label="Signalements" value={stats.reports.pending} icon={Flag}
          gradient="bg-gradient-to-br from-red-500 to-red-700"
          link="/admin/reports" subtitle={`${stats.reports.total} au total`}
          trend={trends.reports ? { value: trends.reports, label: '7j' } : undefined}
        />
        <MetricCard
          label="Codes Premium" value={stats.premium_codes.total} icon={Gift}
          gradient="bg-gradient-to-br from-purple-500 to-purple-700"
          link="/admin/premium-codes"
          subtitle={`${stats.premium_codes.used} utilisés`}
        />
        <MetricCard
          label="Connexions" value={stats.activity.total_logins} icon={TrendingUp}
          gradient="bg-gradient-to-br from-blue-500 to-blue-700"
          trend={trends.logins ? { value: trends.logins, label: '7j' } : undefined}
        />
      </div>

      {/* ═══ Secondary row — complementary metrics ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Bannis', value: stats.users.banned, icon: ShieldBan, color: 'text-red-400', bg: 'bg-red-500/10' },
          { label: 'Likes', value: stats.activity.total_likes, icon: Heart, color: 'text-pink-400', bg: 'bg-pink-500/10' },
          { label: 'Articles', value: stats.news?.total ?? 0, icon: Newspaper, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
          { label: 'Favoris', value: stats.favorites?.total ?? 0, icon: Bookmark, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Std. users', value: standardUsers, icon: Users, color: 'text-brand-400', bg: 'bg-brand-500/10' },
          { label: 'Taux ban', value: `${stats.users.total > 0 ? (stats.users.banned / stats.users.total * 100).toFixed(1) : 0}%`, icon: Globe, color: 'text-navy-300', bg: 'bg-navy-400/10' },
        ].map((item) => (
          <div key={item.label} className="card px-4 py-3 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
              <item.icon className={`w-4 h-4 ${item.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold text-white leading-tight">
                {typeof item.value === 'number' ? item.value.toLocaleString('fr-FR') : item.value}
              </p>
              <p className="text-[10px] text-navy-400 uppercase tracking-wider truncate">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ Activity Chart + Donut  ═══ */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Area Chart — Activity Over Time */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-400" />
              Activité de la plateforme
            </h2>
            <div className="flex items-center bg-navy-800/60 rounded-lg p-0.5">
              {([7, 14, 30] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setChartRange(d)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    chartRange === d
                      ? 'bg-brand-500/20 text-brand-400 shadow-sm'
                      : 'text-navy-400 hover:text-navy-200'
                  }`}
                >
                  {d}j
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={filteredHistory} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="gradLogin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.indigo} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS.indigo} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradReg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.blue} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS.blue} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradReport" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.red} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS.red} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(30 41 59 / 0.4)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={fmtDayMonth}
                stroke="#475569"
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#475569"
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={35}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '12px', color: '#94a3b8', paddingTop: '12px' }}
              />
              <Area
                type="monotone" dataKey="logins" name="Connexions"
                stroke={CHART_COLORS.indigo} fill="url(#gradLogin)"
                strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Area
                type="monotone" dataKey="registrations" name="Inscriptions"
                stroke={CHART_COLORS.blue} fill="url(#gradReg)"
                strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Area
                type="monotone" dataKey="reports" name="Signalements"
                stroke={CHART_COLORS.red} fill="url(#gradReport)"
                strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Users Donut */}
        <DonutWidget
          title="Répartition utilisateurs"
          icon={Users}
          iconColor="text-brand-400"
          data={[
            { name: 'Standard', value: standardUsers, color: CHART_COLORS.indigo },
            { name: 'Premium', value: stats.users.premium, color: CHART_COLORS.amber },
            { name: 'Bannis', value: stats.users.banned, color: CHART_COLORS.red },
          ]}
        />
      </div>

      {/* ═══ Bar Chart + Donuts row ═══ */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Bar Chart — Daily Registrations & Premium */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            Inscriptions & Premium
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={filteredHistory.slice(-14)} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(30 41 59 / 0.3)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={fmtDay}
                stroke="#475569"
                tick={{ fill: '#64748b', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis stroke="#475569" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} width={28} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="registrations" name="Inscriptions" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} maxBarSize={20} />
              <Bar dataKey="premium" name="Premium" fill={CHART_COLORS.amber} radius={[4, 4, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Channels Donut */}
        <DonutWidget
          title="État des chaînes"
          icon={Tv}
          iconColor="text-mint-400"
          data={[
            { name: 'Actives', value: stats.channels.active, color: CHART_COLORS.indigo },
            { name: 'Inactives', value: Math.max(0, stats.channels.total - stats.channels.active), color: CHART_COLORS.slate },
          ]}
        />

        {/* Premium Codes Donut */}
        <DonutWidget
          title="Codes Premium"
          icon={Gift}
          iconColor="text-purple-400"
          data={[
            { name: 'Utilisés', value: stats.premium_codes.used, color: CHART_COLORS.purple },
            { name: 'Disponibles', value: Math.max(0, stats.premium_codes.total - stats.premium_codes.used), color: CHART_COLORS.slate },
          ]}
        />
      </div>

      {/* ═══ Key Ratios + Recent Reports ═══ */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Progress Bars */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-6">
            <Activity className="w-4 h-4 text-brand-400" />
            Ratios clés
          </h2>
          <div className="space-y-5">
            <ProgressRow
              label="Taux Premium" value={stats.users.premium} max={stats.users.total}
              color="bg-amber-500" icon={Crown}
            />
            <ProgressRow
              label="Chaînes actives" value={stats.channels.active} max={stats.channels.total}
              color="bg-brand-500" icon={Tv}
            />
            <ProgressRow
              label="Codes utilisés" value={stats.premium_codes.used} max={stats.premium_codes.total}
              color="bg-purple-500" icon={Gift}
            />
            <ProgressRow
              label="Taux de ban" value={stats.users.banned} max={stats.users.total}
              color="bg-red-500" icon={ShieldBan}
            />
          </div>
        </div>

        {/* Recent pending reports */}
        <div className="card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Signalements récents
            </h2>
            <Link to="/admin/reports" className="text-xs text-brand-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
              Voir tout <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {recentReports.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-start py-8">
              <div className="w-14 h-14 rounded-xl bg-brand-500/10 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-7 h-7 text-brand-500/60" />
              </div>
              <p className="text-sm text-navy-400 font-medium">Aucun signalement en attente</p>
              <p className="text-xs text-navy-600 mt-1">Tout est sous contrôle !</p>
            </div>
          ) : (
            <div className="space-y-2 flex-1">
              {recentReports.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-navy-800/20 hover:bg-navy-800/40 transition-colors group">
                  <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                    <Flag className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate font-medium">{r.reason}</p>
                    <p className="text-xs text-navy-400">
                      {r.user?.pseudo ?? 'Inconnu'} → {r.channel?.name ?? 'Chaîne supprimée'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-navy-600 shrink-0">
                    <Clock className="w-3 h-3" />
                    {new Date(r.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Quick Actions ═══ */}
      <div>
        <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-amber-400" />
          Actions rapides
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { to: '/admin/channels/create', label: 'Nouvelle chaîne', icon: Tv, gradient: 'from-mint-500/20 to-sky-600/5', iconColor: 'text-mint-400' },
            { to: '/admin/news/create', label: 'Nouvel article', icon: Newspaper, gradient: 'from-brand-500/20 to-brand-600/5', iconColor: 'text-brand-400' },
            { to: '/admin/premium-codes', label: 'Générer un code', icon: Gift, gradient: 'from-amber-500/20 to-amber-600/5', iconColor: 'text-amber-400' },
            { to: '/admin/reports', label: 'Voir les reports', icon: Flag, gradient: 'from-red-500/20 to-red-600/5', iconColor: 'text-red-400' },
            { to: '/admin/settings', label: 'Paramètres', icon: Activity, gradient: 'from-navy-400/20 to-navy-600/5', iconColor: 'text-navy-300' },
          ].map((a) => (
            <Link key={a.to} to={a.to}
              className={`card group p-4 flex items-center gap-3 hover:border-navy-700/60 transition-all duration-300 bg-gradient-to-r ${a.gradient}`}>
              <div className={`w-10 h-10 rounded-xl bg-navy-800/50 flex items-center justify-center ${a.iconColor}`}>
                <a.icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-navy-200 group-hover:text-white transition-colors">{a.label}</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-navy-600 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
