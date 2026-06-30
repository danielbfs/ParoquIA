import React, { useState } from 'react';
import { motion } from 'motion/react';
import { HandHeart, Building2, ImageOff } from 'lucide-react';
import { Work } from '../../types';
import DonationModal from './DonationModal';

interface WorksSectionProps {
  works: Work[];
  pixKey?: string;
  whatsappNumber?: string;
}

// Mapeia o status da obra para uma paleta de badge adequada.
const getStatusStyle = (status?: string) => {
  const normalized = (status || '').toLowerCase();
  if (normalized.includes('conclu')) {
    return 'bg-emerald-500 text-white';
  }
  if (normalized.includes('andamento') || normalized.includes('execu')) {
    return 'bg-[#5A5A40] text-white';
  }
  if (normalized.includes('planej')) {
    return 'bg-amber-500 text-white';
  }
  return 'bg-gray-700 text-white';
};

export default function WorksSection({ works, pixKey, whatsappNumber }: WorksSectionProps) {
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);

  // Degradação graciosa: sem obras ativas, a seção não é renderizada.
  if (!works || works.length === 0) {
    return null;
  }

  return (
    <section id="obras" className="py-24 bg-[#F5F5F0]">
      <div className="max-w-7xl mx-auto px-6">
        {/* Cabeçalho da seção */}
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-[#5A5A40] font-black uppercase text-xs tracking-[0.2em] mb-3"
          >
            Construindo Juntos
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-serif font-bold text-gray-900"
          >
            Obras Paroquiais
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-gray-500 text-base mt-4 max-w-xl mx-auto"
          >
            Projetos permanentes da nossa comunidade. Sua doação ajuda a transformar realidades.
          </motion.p>
          <div className="w-12 h-1 bg-[#5A5A40] mx-auto mt-6 rounded-full" />
        </div>

        {/* Grade de obras */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {works.map((work, index) => (
            <motion.div
              key={work.id || index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -8 }}
              className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-lg hover:shadow-xl transition-all flex flex-col group h-full"
            >
              {/* Imagem da obra (com placeholder gracioso) */}
              <div className="relative h-56 overflow-hidden bg-[#E8E8E0]">
                {work.imageUrl ? (
                  <img
                    src={work.imageUrl}
                    alt={work.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[#5A5A40]/40">
                    <ImageOff className="w-10 h-10 mb-2" />
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      Sem imagem
                    </span>
                  </div>
                )}

                {/* Badge de status */}
                {work.status && (
                  <div
                    className={`absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full shadow-md ${getStatusStyle(
                      work.status
                    )}`}
                  >
                    {work.status}
                  </div>
                )}
              </div>

              {/* Detalhes da obra */}
              <div className="p-8 flex flex-col flex-1">
                <div className="flex items-center gap-2 text-xs font-bold text-[#5A5A40] uppercase tracking-wider mb-3">
                  <Building2 className="w-4 h-4" />
                  Projeto Paroquial
                </div>

                <h3 className="text-xl font-serif font-bold text-gray-900 mb-3 group-hover:text-[#5A5A40] transition-colors">
                  {work.title}
                </h3>

                {work.description && (
                  <p className="text-gray-500 text-sm leading-relaxed mb-6 flex-1 line-clamp-4">
                    {work.description}
                  </p>
                )}

                {/* Botão de doação */}
                <button
                  type="button"
                  onClick={() => setSelectedWork(work)}
                  className="mt-auto w-full flex items-center justify-center gap-2 bg-[#5A5A40] hover:bg-[#4a4a34] text-white font-bold py-3.5 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-[#5A5A40]/20 focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:ring-offset-2"
                >
                  <HandHeart className="w-5 h-5" />
                  Doar
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Modal de doação da obra selecionada */}
      <DonationModal
        open={selectedWork !== null}
        onClose={() => setSelectedWork(null)}
        eventTitle={selectedWork?.title || ''}
        pixKey={pixKey}
        whatsappNumber={whatsappNumber}
      />
    </section>
  );
}
