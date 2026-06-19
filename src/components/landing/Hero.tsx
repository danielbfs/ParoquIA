import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Sparkles, Calendar, ArrowRight } from 'lucide-react';
import { SystemConfig } from '../../types'; // Note: path will be adjusted when copying to the final src directory

interface HeroProps {
  config: SystemConfig;
}

export default function Hero({ config }: HeroProps) {
  const navigate = useNavigate();

  const heroBg = config.heroImageUrl || 'https://images.unsplash.com/photo-1438032005730-c779502df39b?auto=format&fit=crop&w=1920&q=80';

  return (
    <div className="relative min-h-[90vh] md:min-h-screen flex items-center justify-center overflow-hidden bg-[#5A5A40] rounded-b-[3rem] shadow-2xl">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroBg} 
          alt="Paróquia Background" 
          className="w-full h-full object-cover object-center opacity-30 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1F2015] via-[#5A5A40]/50 to-[#5A5A40]/30 mix-blend-multiply" />
      </div>

      {/* Content Container */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center text-white flex flex-col items-center py-16">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center mb-8 border border-white/20 shadow-2xl"
        >
          <Sparkles className="text-white w-10 h-10 animate-pulse" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-4xl md:text-7xl font-serif font-bold tracking-tight leading-tight mb-6"
        >
          {config.parishName || 'Paróquia Central'}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-base md:text-2xl text-white/90 font-light max-w-3xl mb-12 leading-relaxed"
        >
          Seja muito bem-vindo à nossa comunidade paroquial. Um espaço de fé, comunhão e partilha. Descubra nossas celebrações, pastorais e eventos.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full sm:w-auto"
        >
          <a
            href="#eventos"
            className="px-8 py-4 bg-white text-[#5A5A40] rounded-2xl font-bold hover:bg-[#F3F4F1] transition-all flex items-center justify-center gap-2 shadow-xl shadow-black/10 active:scale-[0.98]"
          >
            <Calendar className="w-5 h-5" />
            Ver Próximos Eventos
          </a>
          <button
            onClick={() => navigate('/app')}
            className="px-8 py-4 bg-transparent border-2 border-white/80 text-white rounded-2xl font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            Acessar Painel Pastoral
            <ArrowRight className="w-5 h-5" />
          </button>
        </motion.div>
      </div>

      {/* Down Arrow Decorative element */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 animate-bounce hidden md:block">
        <a href="#eventos" className="text-white/60 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </a>
      </div>
    </div>
  );
}
