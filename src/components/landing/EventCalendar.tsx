import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, MapPin, Clock } from 'lucide-react';
import { Event as ChurchEvent } from '../../types'; // Note: path will be adjusted when copying to the final src directory
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  addDays,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import EventDetailModal from './EventDetailModal';

interface EventCalendarProps {
  events: ChurchEvent[];
  pixKey?: string;
  whatsappNumber?: string;
}

type CalendarView = 'month' | 'week' | 'day';

export default function EventCalendar({ events, pixKey, whatsappNumber }: EventCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ChurchEvent | null>(null);

  // Verificar quais eventos ocorrem em um determinado dia (reutiliza a lógica de recorrência)
  // Hora efetiva para ordenação (sem hora vai para o fim).
  const sortTime = (e: ChurchEvent) => e.isRecurring
    ? (e.recurrenceTime || e.startTime || '99:99')
    : (e.startTime || format(new Date(e.date), 'HH:mm') || '99:99');

  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay(); // 0 = Domingo, 1 = Segunda...

    return events
      .filter(event => {
        if (event.isRecurring) {
          const matchesDay = event.recurrenceDay === dayOfWeek;
          const isExcluded = event.excludedDates?.includes(dateStr);
          return matchesDay && !isExcluded;
        } else {
          // Evento pontual: aparece em todos os dias do intervalo (date → endDate).
          const startStr = format(new Date(event.date), 'yyyy-MM-dd');
          const endStr = event.endDate ? format(new Date(event.endDate), 'yyyy-MM-dd') : startStr;
          return dateStr >= startStr && dateStr <= endStr;
        }
      })
      .sort((a, b) => sortTime(a).localeCompare(sortTime(b)));
  };

  // ===== Navegação coerente com a visão =====
  const goPrev = () => {
    if (view === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (view === 'week') setCurrentDate(addDays(currentDate, -7));
    else setCurrentDate(addDays(currentDate, -1));
    setSelectedDate(null);
  };

  const goNext = () => {
    if (view === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (view === 'week') setCurrentDate(addDays(currentDate, 7));
    else setCurrentDate(addDays(currentDate, 1));
    setSelectedDate(null);
  };

  const changeView = (next: CalendarView) => {
    setView(next);
    setSelectedDate(null);
  };

  // ===== Dados derivados =====
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = useMemo(
    () => eachDayOfInterval({ start: monthStart, end: monthEnd }),
    [currentDate]
  );
  const startDayOfWeek = getDay(monthStart);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const daysInWeek = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: weekEnd }),
    [currentDate]
  );

  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return getEventsForDate(selectedDate);
  }, [selectedDate, events]);

  // Título do cabeçalho conforme a visão
  const headerTitle = useMemo(() => {
    if (view === 'month') {
      return format(currentDate, 'MMMM yyyy', { locale: ptBR });
    }
    if (view === 'week') {
      const sameMonth = format(weekStart, 'MMM', { locale: ptBR }) === format(weekEnd, 'MMM', { locale: ptBR });
      return sameMonth
        ? `${format(weekStart, 'dd')} – ${format(weekEnd, "dd 'de' MMMM", { locale: ptBR })}`
        : `${format(weekStart, "dd 'de' MMM", { locale: ptBR })} – ${format(weekEnd, "dd 'de' MMM", { locale: ptBR })}`;
    }
    return format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR });
  }, [view, currentDate, weekStart, weekEnd]);

  // ===== Cores por tipo =====
  const dotColor = (event: ChurchEvent) =>
    event.isRecurring ? 'bg-purple-500' : 'bg-emerald-500';

  const chipClasses = (event: ChurchEvent) =>
    event.isRecurring
      ? 'bg-purple-50 border-purple-200 text-purple-800 hover:border-purple-400'
      : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:border-emerald-400';

  const getEventTime = (event: ChurchEvent) =>
    event.startTime
      ? `${event.startTime}${event.endTime ? ` - ${event.endTime}` : ''}`
      : event.recurrenceTime || '';

  // Chip reutilizável de evento (clicável → abre modal)
  const EventChip = ({ event, index }: { event: ChurchEvent; index: number }) => {
    const time = getEventTime(event);
    return (
      <button
        key={event.id || index}
        type="button"
        onClick={() => setSelectedEvent(event)}
        className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${chipClasses(event)}`}
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor(event)}`} />
        {time && <span className="text-[11px] font-bold tabular-nums shrink-0">{time}</span>}
        <span className="text-xs font-semibold truncate">{event.title}</span>
      </button>
    );
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
            Calendário da Comunidade
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
          <div className="flex flex-col gap-4 p-6 md:p-8 border-b border-gray-100 bg-[#5A5A40] text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <CalendarIcon className="w-6 h-6 shrink-0" />
                <h3 className="text-xl md:text-2xl font-serif font-bold capitalize truncate">
                  {headerTitle}
                </h3>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={goPrev}
                  aria-label="Anterior"
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all active:scale-95"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={goNext}
                  aria-label="Próximo"
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all active:scale-95"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Seletor de visão */}
            <div className="flex gap-1 bg-white/10 rounded-2xl p-1 self-start">
              {([
                { key: 'month', label: 'Mensal' },
                { key: 'week', label: 'Semanal' },
                { key: 'day', label: 'Diário' },
              ] as { key: CalendarView; label: string }[]).map(opt => (
                <button
                  key={opt.key}
                  onClick={() => changeView(opt.key)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    view === opt.key ? 'bg-white text-[#5A5A40] shadow' : 'text-white/80 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* ===== VISÃO MENSAL ===== */}
          {view === 'month' && (
            <>
              <div className="grid grid-cols-7 gap-1 p-6 text-center text-xs font-bold text-gray-400 border-b border-gray-50 uppercase tracking-widest">
                {weekdays.map((day, i) => (
                  <div key={i} className="py-2">{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2 p-6 bg-gray-50/50">
                {Array.from({ length: startDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {daysInMonth.map((day, i) => {
                  const dayEvents = getEventsForDate(day);
                  const hasEvents = dayEvents.length > 0;
                  const isToday = isSameDay(day, new Date());
                  const isSelected = selectedDate && isSameDay(day, selectedDate);

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
                        ${isSelected ? 'border-[#5A5A40]' : ''}
                      `}
                    >
                      <span className={`text-base ${hasEvents ? 'text-gray-900 font-bold' : 'text-gray-400'}`}>
                        {format(day, 'd')}
                      </span>

                      {hasEvents && (
                        <span className="absolute bottom-2 flex gap-1">
                          {dayEvents.slice(0, 3).map((ev, idx) => (
                            <span key={idx} className={`w-1.5 h-1.5 rounded-full ${dotColor(ev)}`} />
                          ))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* ===== VISÃO SEMANAL ===== */}
          {view === 'week' && (
            <div className="grid grid-cols-1 sm:grid-cols-7 gap-px bg-gray-100">
              {daysInWeek.map((day, i) => {
                const dayEvents = getEventsForDate(day);
                const isToday = isSameDay(day, new Date());
                return (
                  <div key={i} className="bg-white p-3 min-h-[140px] flex flex-col">
                    <div className={`text-center mb-3 pb-2 border-b ${isToday ? 'border-[#5A5A40]' : 'border-gray-100'}`}>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        {format(day, 'EEE', { locale: ptBR })}
                      </div>
                      <div className={`text-lg font-bold ${isToday ? 'text-[#5A5A40]' : 'text-gray-900'}`}>
                        {format(day, 'd')}
                      </div>
                    </div>
                    <div className="space-y-1.5 flex-1">
                      {dayEvents.length === 0 ? (
                        <p className="text-[10px] text-gray-300 text-center mt-2">—</p>
                      ) : (
                        dayEvents.map((event, idx) => <EventChip key={event.id || idx} event={event} index={idx} />)
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ===== VISÃO DIÁRIA ===== */}
          {view === 'day' && (
            <div className="p-6 md:p-8 bg-gray-50/50 min-h-[200px]">
              {(() => {
                const dayEvents = getEventsForDate(currentDate);
                if (dayEvents.length === 0) {
                  return (
                    <div className="text-center py-12 text-gray-400">
                      <CalendarIcon className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                      <p className="font-medium">Nenhum evento neste dia.</p>
                    </div>
                  );
                }
                return (
                  <div className="space-y-3 max-w-2xl mx-auto">
                    {dayEvents.map((event, idx) => (
                      <button
                        key={event.id || idx}
                        type="button"
                        onClick={() => setSelectedEvent(event)}
                        className={`w-full text-left flex items-start gap-4 p-5 rounded-2xl border transition-all ${chipClasses(event)}`}
                      >
                        <span className={`w-3 h-3 rounded-full shrink-0 mt-1.5 ${dotColor(event)}`} />
                        <div className="flex-1 min-w-0">
                          <h5 className="text-base font-bold text-gray-900 truncate">{event.title}</h5>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs font-medium text-gray-600">
                            {getEventTime(event) && (
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                {getEventTime(event)}
                              </span>
                            )}
                            <span className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5" />
                              {event.location}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Legenda de cores por tipo */}
          <div className="flex items-center justify-center gap-6 py-4 border-t border-gray-100 bg-white text-xs font-medium text-gray-500">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              Recorrente
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Evento especial
            </span>
          </div>
        </motion.div>

        {/* Painel de eventos do dia selecionado (visão mensal) */}
        {view === 'month' && selectedDate && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 bg-white p-6 md:p-8 rounded-[2.5rem] border border-gray-100 shadow-xl"
          >
            <h4 className="text-xl font-serif font-bold text-gray-950 mb-6">
              Eventos em {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
            </h4>

            <div className="space-y-3">
              {selectedDayEvents.map((event, index) => (
                <button
                  key={event.id || index}
                  type="button"
                  onClick={() => setSelectedEvent(event)}
                  className={`w-full text-left flex items-start gap-4 p-5 rounded-2xl border transition-all ${chipClasses(event)}`}
                >
                  <span className={`w-3 h-3 rounded-full shrink-0 mt-1.5 ${dotColor(event)}`} />
                  <div className="flex-1 min-w-0">
                    <h5 className="text-base font-bold text-gray-900">{event.title}</h5>
                    {event.description && (
                      <p className="text-gray-500 text-sm mt-1 line-clamp-2">{event.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs font-medium text-gray-600">
                      {getEventTime(event) && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {getEventTime(event)}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {event.location}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
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
