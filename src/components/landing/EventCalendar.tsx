import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, MapPin, Clock } from 'lucide-react';
import { Event as ChurchEvent } from '../../types'; // Note: path will be adjusted when copying to the final src directory
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EventCalendarProps {
  events: ChurchEvent[];
}

export default function EventCalendar({ events }: EventCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  
  // Lista de todos os dias do mês atual
  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [currentMonth]);

  // Descobrir qual o dia da semana do primeiro dia do mês para alinhar a grade (0 = Domingo)
  const startDayOfWeek = getDay(monthStart);

  // Mudar de mês
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  // Verificar quais eventos ocorrem em um determinado dia
  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay(); // 0 = Domingo, 1 = Segunda...

    return events.filter(event => {
      if (event.isRecurring) {
        const matchesDay = event.recurrenceDay === dayOfWeek;
        const isExcluded = event.excludedDates?.includes(dateStr);
        return matchesDay && !isExcluded;
      } else {
        const eventDate = new Date(event.date);
        return (
          eventDate.getDate() === date.getDate() &&
          eventDate.getMonth() === date.getMonth() &&
          eventDate.getFullYear() === date.getFullYear()
        );
      }
    });
  };

  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Eventos do dia selecionado
  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return getEventsForDate(selectedDate);
  }, [selectedDate, events]);

  const getWeekDayName = (dayNum: number) => {
    const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    return days[dayNum] || '';
  };

  return (
    <section id="calendario" className="py-24 bg-[#F5F5F0]">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-16">
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-[#5A5A40] font-black uppercase text-xs tracking-[0.2em] mb-3"
          >
            Agenda Litúrgica
          </motion.p>
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-serif font-bold text-gray-900"
          >
            Calendário Mensal
          </motion.h2>
          <div className="w-12 h-1 bg-[#5A5A40] mx-auto mt-6 rounded-full" />
        </div>

        {/* Calendário Container */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden"
        >
          {/* Header do Calendário */}
          <div className="flex items-center justify-between p-8 border-b border-gray-100 bg-[#5A5A40] text-white">
            <div className="flex items-center gap-3">
              <CalendarIcon className="w-6 h-6" />
              <h3 className="text-2xl font-serif font-bold capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </h3>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={prevMonth}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all active:scale-95"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={nextMonth}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all active:scale-95"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Dias da semana */}
          <div className="grid grid-cols-7 gap-1 p-6 text-center text-xs font-bold text-gray-400 border-b border-gray-50 uppercase tracking-widest">
            {weekdays.map((day, i) => (
              <div key={i} className="py-2">{day}</div>
            ))}
          </div>

          {/* Grade do Calendário */}
          <div className="grid grid-cols-7 gap-2 p-6 bg-gray-50/50">
            {/* Espaços vazios no início */}
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {/* Dias do mês */}
            {daysInMonth.map((day, i) => {
              const dayEvents = getEventsForDate(day);
              const hasEvents = dayEvents.length > 0;
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={i}
                  onClick={() => hasEvents && setSelectedDate(day)}
                  disabled={!hasEvents}
                  className={`
                    aspect-square rounded-2xl flex flex-col items-center justify-center relative transition-all duration-300 border
                    ${hasEvents 
                      ? 'bg-white border-[#5A5A40]/20 hover:border-[#5A5A40] cursor-pointer shadow-sm hover:shadow-md' 
                      : 'bg-transparent border-transparent text-gray-400'
                    }
                    ${isToday ? 'ring-2 ring-[#5A5A40] ring-offset-2 font-bold' : ''}
                  `}
                >
                  <span className={`text-base ${hasEvents ? 'text-gray-900 font-bold' : 'text-gray-400'}`}>
                    {format(day, 'd')}
                  </span>
                  
                  {hasEvents && (
                    <span className="absolute bottom-2 flex gap-1">
                      {dayEvents.slice(0, 3).map((_, idx) => (
                        <span key={idx} className="w-1.5 h-1.5 rounded-full bg-[#5A5A40]" />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Modal / Card para Eventos do Dia Selecionado */}
        <AnimatePresence>
          {selectedDate && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mt-8 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl relative"
            >
              <button 
                onClick={() => setSelectedDate(null)}
                className="absolute top-6 right-6 p-2 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <h4 className="text-xl font-serif font-bold text-gray-950 mb-6">
                Eventos em {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
              </h4>

              <div className="space-y-6">
                {selectedDayEvents.map((event, index) => (
                  <div key={event.id || index} className="p-6 bg-[#FDFDFB] rounded-2xl border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        {event.isRecurring && (
                          <span className="bg-[#5A5A40]/10 text-[#5A5A40] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                            Recorrente
                          </span>
                        )}
                        <span className="text-xs font-bold text-[#5A5A40] uppercase tracking-wider">
                          {event.isRecurring ? `Toda(o) ${getWeekDayName(event.recurrenceDay ?? 0)}` : 'Evento Especial'}
                        </span>
                      </div>
                      <h5 className="text-lg font-bold text-gray-900 mb-1">{event.title}</h5>
                      {event.description && <p className="text-gray-500 text-sm">{event.description}</p>}
                    </div>

                    <div className="flex flex-col gap-2 text-xs font-medium text-gray-600 border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 md:pl-6 min-w-[150px]">
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
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
