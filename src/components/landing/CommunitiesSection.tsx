import React from 'react';
import { motion } from 'motion/react';
import { Church, MapPin, Clock } from 'lucide-react';
import { Community } from '../../types';

interface CommunitiesSectionProps {
  communities: Community[];
}

/**
 * "Nossas Comunidades" — capelas e comunidades que formam a paróquia.
 * Degrada com elegância: sem comunidades ativas, a seção não é renderizada.
 */
export default function CommunitiesSection({ communities }: CommunitiesSectionProps) {
  if (!communities || communities.length === 0) {
    return null;
  }

  return (
    <section id="comunidades" className="py-20 bg-[#FDFDFB]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-[#5A5A40] font-black uppercase text-xs tracking-[0.2em] mb-3"
          >
            Uma Só Família
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-serif font-bold text-gray-900"
          >
            Nossas Comunidades
          </motion.h2>
          <div className="w-12 h-1 bg-[#5A5A40] mx-auto mt-6 rounded-full" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {communities.map((community, index) => (
            <motion.div
              key={community.id || index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              whileHover={{ y: -6 }}
              className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-lg hover:shadow-xl transition-all flex flex-col h-full group"
            >
              {/* Imagem da comunidade */}
              <div className="relative h-44 overflow-hidden bg-[#5A5A40]/5">
                {community.imageUrl ? (
                  <img
                    src={community.imageUrl}
                    alt={community.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#5A5A40]/25">
                    <Church className="w-12 h-12" />
                  </div>
                )}
              </div>

              {/* Detalhes */}
              <div className="p-7 flex flex-col flex-1">
                <h3 className="text-xl font-serif font-bold text-gray-900 mb-4 group-hover:text-[#5A5A40] transition-colors">
                  {community.name}
                </h3>

                <div className="space-y-3 text-sm text-gray-600 mt-auto">
                  {community.address && (
                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-[#5A5A40] shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{community.address}</span>
                    </div>
                  )}
                  {community.massSchedule && (
                    <div className="flex items-start gap-2.5">
                      <Clock className="w-4 h-4 text-[#5A5A40] shrink-0 mt-0.5" />
                      <span className="leading-relaxed whitespace-pre-line">{community.massSchedule}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
