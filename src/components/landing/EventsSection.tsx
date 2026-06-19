import React from 'react';
import { motion } from 'motion/react';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { Event as ChurchEvent } from '../../types'; // Note: path will be adjusted when copying to the final src directory
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EventsSectionProps {
  events: ChurchEvent[];
}

export default function EventsSection({ events }: EventsSectionProps) {
  // Filtra eventos futuros
  const futureEvents = events.filter(event => {
    if (event.isRecurring) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(event.date);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate >= today;
  });

  const getWeekDayName = (dayNum: number) => {
    const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    return days[dayNum] || '';
  };

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

        {futureEvents.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-white rounded-3xl border border-gray-100 shadow-sm max-w-xl mx-auto">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="font-medium text-lg text-gray-700">Nenhum evento agendado para os próximos dias.</p>
            <p className="text-sm mt-1">Fique atento para novas atualizações em breve.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {futureEvents.map((event, index) => {
              const eventBg = event.imageUrl || 'https://images.unsplash.com/photo-1544427920-c49ccfb85579?auto=format&fit=crop&w=800&q=80';
              const formattedDate = event.isRecurring 
                ? `Toda(o) ${getWeekDayName(event.recurrenceDay ?? 0)}`
                : format(new Date(event.date), "dd 'de' MMMM", { locale: ptBR });

              return (
                <motion.div
                  key={event.id || index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ y: -8 }}
                  className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-lg hover:shadow-xl transition-all flex flex-col group h-full"
                >
                  {/* Event Image */}
                  <div className="relative h-56 overflow-hidden">
                    <img 
                      src={eventBg} 
                      alt={event.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {event.isRecurring && (
                      <div className="absolute top-4 right-4 bg-[#5A5A40] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full shadow-md">
                        Recorrente
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
                      <p className="text-gray-500 text-sm leading-relaxed mb-6 flex-1">
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
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
