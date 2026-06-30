import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, MapPin, Clock, X } from 'lucide-react';
import { Event as ChurchEvent } from '../../types'; // Note: path will be adjusted when copying to the final src directory
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EventDetailModalProps {
  event: ChurchEvent | null;
  onClose: () => void;
}

const WEEK_DAY_NAMES = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

const getWeekDayName = (dayNum: number) => WEEK_DAY_NAMES[dayNum] || '';

// Monta a string de horário a partir de início/fim ou do horário de recorrência
const formatTimeRange = (event: ChurchEvent): string => {
  const time = event.recurrenceTime || event.startTime;
  if (event.startTime) {
    return `${event.startTime}${event.endTime ? ` - ${event.endTime}` : ''}`;
  }
  return time || '';
};

export default function EventDetailModal({ event, onClose }: EventDetailModalProps) {
  const [zoomed, setZoomed] = useState(false);
  return (
    <>
    <AnimatePresence>
      {event && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.4 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[2rem] overflow-hidden shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative"
          >
            {/* Botão fechar */}
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="absolute top-4 right-4 z-10 p-2 bg-white/90 hover:bg-white text-gray-600 rounded-full shadow-md transition-all active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Imagem (clique abre inteira/original) */}
            {event.imageUrl && (
              <div className="relative h-56 overflow-hidden">
                <img
                  src={event.imageUrl}
                  alt={event.title}
                  onClick={() => setZoomed(true)}
                  title="Clique para ver a imagem inteira"
                  className="w-full h-full object-cover cursor-zoom-in"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
                {event.isRecurring && (
                  <div className="absolute top-4 left-4 bg-purple-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full shadow-md">
                    Recorrente
                  </div>
                )}
              </div>
            )}

            {/* Conteúdo */}
            <div className="p-8">
              {!event.imageUrl && event.isRecurring && (
                <div className="inline-block mb-4 bg-purple-100 text-purple-700 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full">
                  Recorrente
                </div>
              )}

              <h3 className="text-2xl font-serif font-bold text-gray-900 mb-5">
                {event.title}
              </h3>

              <div className="space-y-3 text-sm text-gray-700 font-medium">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-[#5A5A40] shrink-0" />
                  <span>
                    {event.isRecurring
                      ? `Toda(o) ${getWeekDayName(event.recurrenceDay ?? 0)}${
                          event.recurrenceTime || event.startTime
                            ? ` às ${event.recurrenceTime || event.startTime}`
                            : ''
                        }`
                      : format(new Date(event.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                </div>

                {(event.startTime || event.recurrenceTime) && (
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-[#5A5A40] shrink-0" />
                    <span>{formatTimeRange(event)}</span>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-[#5A5A40] shrink-0" />
                  <span>{event.location}</span>
                </div>
              </div>

              {event.description && (
                <p className="mt-6 pt-6 border-t border-gray-100 text-gray-600 text-sm leading-relaxed">
                  {event.description}
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Lightbox: imagem inteira/original */}
    <AnimatePresence>
      {zoomed && event?.imageUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setZoomed(false)}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 cursor-zoom-out"
        >
          <button
            onClick={() => setZoomed(false)}
            aria-label="Fechar imagem"
            className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
          >
            <X className="w-6 h-6" />
          </button>
          <motion.img
            initial={{ scale: 0.92 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.92 }}
            src={event.imageUrl}
            alt={event.title}
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
