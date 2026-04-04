import { Link } from 'react-router-dom';
import { Home, Tv, Search } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function ErrorPage() {
  useDocumentTitle('Page introuvable');
  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      
      <div className="text-center max-w-md relative animate-fade-up">
        {/* 404 number */}
        <div className="relative mb-8">
          <span className="text-[120px] sm:text-[150px] font-display font-black text-white/[0.03] leading-none select-none tracking-tighter">404</span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 shadow-2xl backdrop-blur-sm">
              <Search className="w-10 h-10 text-navy-300" />
            </div>
          </div>
        </div>

        <h1 className="text-4xl font-display font-black text-white mb-4 tracking-tight">Page introuvable</h1>
        <p className="text-navy-300 text-lg leading-relaxed mb-10">
          La page que vous recherchez n'existe pas, a été déplacée ou supprimée.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/" className="btn-primary inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5">
            <Home className="w-5 h-5" />
            Retour à l'accueil
          </Link>
          <Link to="/" className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-navy-800 hover:border-white/10 text-white font-bold transition-all w-full sm:w-auto">
            <Tv className="w-5 h-5" />
            Chaînes
          </Link>
        </div>

        <div className="mt-16 flex items-center justify-center gap-2 text-navy-700 opacity-50">
          <Tv className="w-5 h-5" />
          <span className="text-base font-display font-black tracking-widest uppercase">Xonaris</span>
        </div>
      </div>
    </div>
  );
}
