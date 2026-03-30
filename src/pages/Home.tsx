import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlayCircle, LogIn } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { authApi } from '../api';

export default function Home() {
  useDocumentTitle('Accueil');
  const [bgLanding, setBgLanding] = useState<string | null>(null);

  useEffect(() => {
    authApi.getPublicConfig().then(config => {
      if (config.background_landing) {
        setBgLanding(config.background_landing);
      }
    }).catch(console.error);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden flex items-center justify-center">
      {/* Dynamic Background Image */}
      {bgLanding ? (
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${bgLanding})` }}
        />
      ) : (
        <div className="absolute inset-0 z-0 bg-navy-950" />
      )}
      
      {/* Dark Overlay */}
      <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/90 via-black/60 to-transparent backdrop-blur-[2px]" />

      {/* Main Content */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 sm:mt-0 animate-fade-up">
        
        <h1 className="font-display leading-tight text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter mb-4 sm:mb-6 drop-shadow-2xl">
          Vos Matchs & <br className="hidden md:block" />
          Chaînes en <span className="text-gradient">Direct</span>
        </h1>
        
        <p className="text-base sm:text-lg md:text-2xl text-white/80 mb-8 sm:mb-12 font-medium leading-relaxed drop-shadow-lg max-w-2xl">
          Ne manquez plus aucune affiche sportive ni votre émission préférée. Accédez instantanément au meilleur de la télévision mondiale en haute définition.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-5 w-full sm:w-auto">
          <Link to="/register" className="btn-primary group w-full sm:w-auto justify-center text-base sm:text-lg md:text-xl py-3.5 sm:py-4 md:py-5 px-6 sm:px-8 md:px-10 shadow-xl shadow-brand-500/20 ring-1 ring-brand-500/50 hover:ring-brand-400 transition-all">
            <PlayCircle className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 group-hover:scale-110 transition-transform" />
            Lancer le Direct
          </Link>
          <Link to="/login" className="btn-secondary bg-white/10 hover:bg-white/20 border-white/10 text-white group w-full sm:w-auto justify-center text-base sm:text-lg md:text-xl py-3.5 sm:py-4 md:py-5 px-6 sm:px-8 md:px-10 backdrop-blur-md shadow-xl hover:shadow-2xl transition-all">
            <LogIn className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 group-hover:scale-110 transition-transform text-white/80 group-hover:text-white" />
            Accéder à mon compte
          </Link>
        </div>

      </div>
    </div>
  );
}
