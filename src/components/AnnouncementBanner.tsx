import { useState } from 'react';
import { X, Megaphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const colorMap: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  blue:   { bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   text: 'text-blue-300',   icon: 'text-blue-400' },
  green:  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-300', icon: 'text-emerald-400' },
  red:    { bg: 'bg-red-500/10',    border: 'border-red-500/20',    text: 'text-red-300',    icon: 'text-red-400' },
  amber:  { bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  text: 'text-amber-300',  icon: 'text-amber-400' },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-300', icon: 'text-purple-400' },
  brand:  { bg: 'bg-brand-500/10',  border: 'border-brand-500/20',  text: 'text-brand-300',  icon: 'text-brand-400' },
};

export default function AnnouncementBanner() {
  const { announcementActive, announcementText, announcementColor } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (!announcementActive || !announcementText || dismissed) return null;

  const palette = colorMap[announcementColor ?? 'brand'] ?? colorMap.brand;

  return (
    <div className={`w-full ${palette.bg} border-b ${palette.border} backdrop-blur-sm`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-3">
        <Megaphone className={`w-4 h-4 ${palette.icon} shrink-0`} />
        <p className={`text-sm font-medium ${palette.text} flex-1`}>
          {announcementText}
        </p>
        <button
          onClick={() => setDismissed(true)}
          className={`p-1 rounded-lg ${palette.text} hover:bg-white/10 transition-colors shrink-0`}
          aria-label="Fermer l'annonce"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
