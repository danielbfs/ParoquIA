import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Calendar, MapPin, Clock, Repeat, HandHeart } from 'lucide-react';
import { Event as ChurchEvent } from '../../types'; // Note: path will be adjusted when copying to the final src directory
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import EventDetailModal from './EventDetailModal';

interface EventsSectionProps {
  events: ChurchEvent[];
  pixKey?: string;
  whatsappNumber?: string;
}

const getWeekDayName = (dayNum: number) => {
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return days[dayNum] || '';
};

export default function EventsSection({ events, pixKey, whatsappNumber }: EventsSectionProps) {
  const [selectedEvent, setSelectedEvent] = useState<ChurchEvent | null>(null);

  // Eventos específicos (pontuais e futuros), ordenados cronologicamente
  const specificEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return events
      .filter(event => {
        if (event.isRecurring) return false;
        const eventDate = new Date(event.date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= today;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [events]);

  // Eventos recorrentes, ordenados por dia da semana e horário
  const recurringEvents = useMemo(() => {
    return events
      .filter(event => event.isRecurring)
      .sort((a, b) => {
        const dayDiff = (a.recurrenceDay ?? 0) - (b.recurrenceDay ?? 0);
        if (dayDiff !== 0) return dayDiff;
        const timeA = a.recurrenceTime || a.startTime || '';
        const timeB = b.recurrenceTime || b.startTime || '';
        return timeA.localeCompare(timeB);
      });
  }, [events]);

  const hasAnyEvent = specificEvents.length > 0 || recurringEvents.length > 0;

  return (
    <section id="eventos" className="py-24 bg-[#FDFDFB]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-[#5A5A40] font-black uppercase text-xs tracking-[0.2em] mb-3"
          >
            Programação
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-serif font-bold text-gray-900"
          >
            Próximos Eventos & Celebrações
          </motion.h2>
          <div className="w-12 h-1 bg-[#5A5A40] mx-auto mt-6 rounded-full" />
        </div>

        {!hasAnyEvent ? (
          <div className="text-center py-12 text-gray-500 bg-white rounded-3xl border border-gray-100 shadow-sm max-w-xl mx-auto">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="font-medium text-lg text-gray-700">Nenhum evento agendado para os próximos dias.</p>
            <p className="text-sm mt-1">Fique atento para novas atualizações em breve.</p>
          </div>
        ) : (
          <>
            {/* CARDS PRINCIPAIS — Eventos específicos */}
            {specificEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {specificEvents.map((event, index) => {
                  const eventBg = event.imageUrl || 'https://images.unsplash.com/photo-1544427920-c49ccfb85579?auto=format&fit=crop&w=800&q=80';
                  const formattedDate = format(new Date(event.date), "dd 'de' MMMM", { locale: ptBR });

                  return (
                    <motion.button
                      key={event.id || index}
                      type="button"
                      onClick={() => setSelectedEvent(event)}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      whileHover={{ y: -8 }}
                      className="text-left bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-lg hover:shadow-xl transition-all flex flex-col group h-full focus:outline-none focus:ring-2 focus:ring-[#5A5A40] focus:ring-offset-2"
                    >
                      {/* Event Image */}
                      <div className="relative h-56 overflow-hidden">
                        <img
                          src={eventBg}
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-4 right-4 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full shadow-md">
                          Evento Especial
                        </div>
                        {event.allowDonation && (
                          <div className="absolute top-4 left-4 bg-[#5A5A40] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full shadow-md flex items-center gap-1">
                            <HandHeart className="w-3 h-3" />
                            Doação
                          </div>
                        )}
                      </div>

                      {/* Event Details */}
                      <div className="p-8 flex flex-col flex-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-[#5A5A40] uppercase tracking-wider mb-3">
                          <Calendar className="w-4 h-4" />
                          {formattedDate}
                        </div>

                        <h3 className="text-xl font-serif font-bold text-gray-900 mb-3 group-hover:text-[#5A5A40] transition-colors">
                          {event.title}
                        </h3>

                        {event.description && (
                          <p className="text-gray-500 text-sm leading-relaxed mb-6 flex-1 line-clamp-3">
                            {event.description}
                          </p>
                        )}

                        <div className="space-y-3 pt-4 border-t border-gray-50 text-xs text-gray-600 font-medium mt-auto">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-[#5A5A40]" />
                            <span>{event.location}</span>
                          </div>

                          {(event.startTime || event.recurrenceTime) && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-[#5A5A40]" />
                              <span>
                                {event.startTime
                                  ? `${event.startTime}${event.endTime ? ` - ${event.endTime}` : ''}`
                                  : event.recurrenceTime
                                }
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 bg-white rounded-3xl border border-gray-100 shadow-sm max-w-xl mx-auto">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="font-medium text-lg text-gray-700">Nenhum evento especial agendado.</p>
                <p className="text-sm mt-1">Confira nossas celebrações semanais abaixo.</p>
              </div>
            )}

            {/* LISTA MENOR — Celebrações semanais (recorrentes) */}
            {recurringEvents.length > 0 && (
              <div className="mt-20 max-w-3xl mx-auto">
                <div className="flex items-center justify-center gap-2 mb-8">
                  <Repeat className="w-4 h-4 text-purple-600" />
                  <h3 className="text-center text-sm font-black uppercase tracking-[0.2em] text-purple-700">
                    Celebrações Semanais
                  </h3>
                </div>

                <div className="bg-white rounded-3xl border border-gray-100 shadow-lg divide-y divide-gray-50 overflow-hidden">
                  {recurringEvents.map((event, index) => {
                    const time = event.recurrenceTime || event.startTime;
                    return (
                      <motion.button
                        key={event.id || index}
                        type="button"
                        onClick={() => setSelectedEvent(event)}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="w-full text-left flex items-center gap-4 p-5 hover:bg-purple-50/40 transition-colors focus:outline-none focus:bg-purple-50/60 group"
                      >
                        {/* Indicador de dia */}
                        <div className="shrink-0 w-16 text-center">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-purple-600">
                            {getWeekDayName(event.recurrenceDay ?? 0).slice(0, 3)}
                          </span>
                          {time && (
                            <span className="block text-sm font-bold text-gray-900 mt-0.5">{time}</span>
                          )}
                        </div>

                        <div className="w-px self-stretch bg-purple-100" />

                        <div className="flex-1 min-w-0">
                          <h4 className="text-base font-bold text-gray-900 truncate group-hover:text-purple-700 transition-colors">
                            {event.title}
                          </h4>
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        </div>

                        <span className="shrink-0 hidden sm:inline-block bg-purple-100 text-purple-700 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                          Recorrente
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de resumo do evento */}
      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        pixKey={pixKey}
        whatsappNumber={whatsappNumber}
      />
    </section>
  );
}
