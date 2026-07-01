import React from 'react';
import { motion } from 'motion/react';
import { Quote, UserRound } from 'lucide-react';
import { SystemConfig } from '../../types';

interface PriestSectionProps {
  config: SystemConfig;
}

/**
 * "Palavra do Pároco" — momento humano da landing.
 * A foto usa um topo em arco, evocando a janela/vitral da igreja.
 * Degrada com elegância: sem nome nem mensagem, a seção não é renderizada.
 */
export default function PriestSection({ config }: PriestSectionProps) {
  const { priestName, priestRole, priestPhotoUrl, priestMessage } = config;

  if (!priestName && !priestMessage) {
    return null;
  }

  return (
    <section id="paroco" className="py-20 bg-[#FDFDFB]">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,240px)_1fr] gap-10 md:gap-14 items-center">
          {/* Retrato em arco */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto md:mx-0 w-48 md:w-full max-w-[240px]"
          >
            <div className="relative aspect-[3/4] rounded-b-[2rem] rounded-t-[7rem] overflow-hidden border border-[#5A5A40]/15 shadow-xl bg-[#5A5A40]/5">
              {priestPhotoUrl ? (
                <img
                  src={priestPhotoUrl}
                  alt={priestName || 'Pároco'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#5A5A40]/30">
                  <UserRound className="w-16 h-16" />
                </div>
              )}
            </div>
          </motion.div>

          {/* Mensagem */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <p className="text-[#5A5A40] font-black uppercase text-xs tracking-[0.2em] mb-5">
              Palavra do Pároco
            </p>

            {priestMessage && (
              <div className="relative">
                <Quote className="absolute -top-2 -left-1 w-8 h-8 text-[#5A5A40]/15" aria-hidden />
                <p className="relative text-xl md:text-2xl font-serif text-gray-800 leading-relaxed pl-6">
                  {priestMessage}
                </p>
              </div>
            )}

            {priestName && (
              <div className="mt-7 pl-6 flex items-center gap-3">
                <span className="w-8 h-px bg-[#5A5A40]/40" />
                <div>
                  <p className="font-serif font-bold text-gray-900 leading-tight">{priestName}</p>
                  {priestRole && (
                    <p className="text-xs text-gray-500 uppercase tracking-wider">{priestRole}</p>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
