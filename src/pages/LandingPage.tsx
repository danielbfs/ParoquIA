import React, { useState, useEffect } from 'react';
import Hero from '../components/landing/Hero';
import PriestSection from '../components/landing/PriestSection';
import EventsSection from '../components/landing/EventsSection';
import EventCalendar from '../components/landing/EventCalendar';
import CommunitiesSection from '../components/landing/CommunitiesSection';
import WorksSection from '../components/landing/WorksSection';
import ContactSection from '../components/landing/ContactSection';
import { SystemConfig, Event as ChurchEvent, Work, Community } from '../types';
import { motion } from 'motion/react';
import { AlertCircle, Clock } from 'lucide-react';

// Fallback elegante de demonstração
const FALLBACK_CONFIG: SystemConfig = {
  parishName: 'Paróquia Nossa Senhora das Dores',
  aiPrompt: '',
  updatedAt: new Date().toISOString(),
  heroImageUrl: 'https://images.unsplash.com/photo-1438032005730-c779502df39b?auto=format&fit=crop&w=1920&q=80',
  address: 'Praça da Matriz, 100 - Centro, Paróquia da Fé - SP, 12345-678',
  phone: '(11) 98765-4321',
  email: 'contato@paroquiansdores.org.br',
  priestName: 'Pe. João Batista',
  priestRole: 'Pároco',
  priestPhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
  priestMessage:
    'Que a paz de Cristo habite o seu coração. Nossa comunidade é a sua casa — venha rezar, servir e partilhar conosco a alegria do Evangelho.'
};

const FALLBACK_COMMUNITIES: Community[] = [
  {
    id: 'c1',
    name: 'Comunidade São José',
    address: 'Rua das Oliveiras, 45 - Bairro Alto',
    massSchedule: 'Domingo às 8h e 19h\nQuarta-feira às 19h30',
    imageUrl: 'https://images.unsplash.com/photo-1543968996-ee822b8176ba?auto=format&fit=crop&w=800&q=80',
    isActive: true,
    order: 1,
    createdAt: new Date().toISOString()
  },
  {
    id: 'c2',
    name: 'Capela Santa Rita',
    address: 'Estrada do Campo, s/n - Zona Rural',
    massSchedule: 'Sábado às 17h',
    imageUrl: 'https://images.unsplash.com/photo-1473177104440-ffee2f376098?auto=format&fit=crop&w=800&q=80',
    isActive: true,
    order: 2,
    createdAt: new Date().toISOString()
  }
];

const FALLBACK_EVENTS: ChurchEvent[] = [
  {
    id: 'f1',
    title: 'Missa Dominical Solene',
    description: 'Celebração comunitária de nossa fé. Venha partilhar a Palavra e a Eucaristia com toda a comunidade.',
    date: new Date().toISOString(),
    location: 'Igreja Matriz',
    isRecurring: true,
    recurrenceDay: 0, // Domingo
    recurrenceTime: '09:00',
    startTime: '09:00',
    endTime: '10:30',
    imageUrl: 'https://images.unsplash.com/photo-1438032005730-c779502df39b?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'f2',
    title: 'Grupo de Oração Semanal',
    description: 'Um momento de louvor, pregação da Palavra e oração comunitária sob a luz do Espírito Santo.',
    date: new Date().toISOString(),
    location: 'Salão Paroquial',
    isRecurring: true,
    recurrenceDay: 4, // Quinta-feira
    recurrenceTime: '19:30',
    startTime: '19:30',
    endTime: '21:00',
    imageUrl: 'https://images.unsplash.com/photo-1544427920-c49ccfb85579?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'f3',
    title: 'Festa da Padroeira NS Dores',
    description: 'Nossa grande quermesse anual com barraquinhas de comidas típicas, shows ao vivo e momentos de oração em família.',
    date: new Date(Date.now() + 86400000 * 10).toISOString(), // Daqui a 10 dias
    location: 'Praça da Matriz',
    isRecurring: false,
    startTime: '18:00',
    endTime: '23:00',
    imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'f4',
    title: 'Catequese Infantil',
    description: 'Formação na fé e preparação para a Primeira Eucaristia de nossas crianças.',
    date: new Date().toISOString(),
    location: 'Salas de Catequese',
    isRecurring: true,
    recurrenceDay: 6, // Sábado
    recurrenceTime: '09:00',
    startTime: '09:00',
    endTime: '11:00',
    imageUrl: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=800&q=80'
  }
];

const FALLBACK_WORKS: Work[] = [
  {
    id: 'w1',
    title: 'Reforma do Lar dos Idosos',
    description:
      'Ampliação e modernização dos espaços que acolhem nossos idosos, oferecendo mais conforto, segurança e dignidade a quem tanto serviu à comunidade.',
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    status: 'Em andamento',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'w2',
    title: 'Construção do Centro Catequético',
    description:
      'Um novo espaço dedicado à formação na fé de crianças, jovens e adultos, com salas amplas e acolhedoras para a evangelização.',
    imageUrl: 'https://images.unsplash.com/photo-1473177104440-ffee2f376098?auto=format&fit=crop&w=800&q=80',
    status: 'Planejamento',
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

export default function LandingPage() {
  const [config, setConfig] = useState<SystemConfig>(FALLBACK_CONFIG);
  const [events, setEvents] = useState<ChurchEvent[]>(FALLBACK_EVENTS);
  const [works, setWorks] = useState<Work[]>(FALLBACK_WORKS);
  const [communities, setCommunities] = useState<Community[]>(FALLBACK_COMMUNITIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchLandingData() {
      try {
        const response = await fetch('/api/public/landing');
        if (!response.ok) {
          throw new Error('Falha ao obter os dados da paróquia');
        }
        const data = await response.json();
        
        if (data.config && data.config.parishName) {
          setConfig(data.config);
        }
        if (data.events && Array.isArray(data.events) && data.events.length > 0) {
          setEvents(data.events);
        }
        if (data.works && Array.isArray(data.works)) {
          setWorks(data.works);
        }
        if (data.communities && Array.isArray(data.communities)) {
          setCommunities(data.communities);
        }
      } catch (err) {
        console.warn('Erro ao carregar dados reais da Landing Page, usando fallback.', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchLandingData();
  }, []);

  // Título da aba reflete o nome da paróquia (varia por implantação)
  useEffect(() => {
    if (config?.parishName) {
      document.title = config.parishName;
    }
  }, [config.parishName]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#FDFDFB]">
        <div className="w-12 h-12 border-4 border-[#5A5A40]/20 border-t-[#5A5A40] rounded-full animate-spin mb-4" />
        <p className="text-gray-500 font-medium text-sm">Carregando acolhimento...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFB] text-gray-900 scroll-smooth">
      {/* Exibir aviso suave se houver erro (dados em fallback) */}
      {error && (
        <div className="bg-[#5A5A40] text-white/90 text-xs py-2 px-4 text-center flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-white" />
          <span>Serviço temporariamente offline. Exibindo informações de demonstração da paróquia.</span>
        </div>
      )}

      {/* Hero Section */}
      <Hero config={config} />

      {/* Palavra do Pároco */}
      <PriestSection config={config} />

      {/* Events Section */}
      <EventsSection events={events} pixKey={config.pixKey} whatsappNumber={config.whatsappNumber} />

      {/* Monthly Calendar Section */}
      <EventCalendar events={events} pixKey={config.pixKey} whatsappNumber={config.whatsappNumber} />

      {/* Nossas Comunidades */}
      <CommunitiesSection communities={communities} />

      {/* Parish Works Section */}
      <WorksSection works={works} pixKey={config.pixKey} whatsappNumber={config.whatsappNumber} />

      {/* Contact Section */}
      <ContactSection config={config} />

      {/* Footer */}
      <footer className="bg-[#1F2015] py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h3 className="text-2xl font-serif font-bold text-white mb-4">
            {config.parishName || 'Paróquia Central'}
          </h3>
          <p className="text-white/40 text-xs tracking-wider uppercase mb-8">
            © {new Date().getFullYear()} ParoquIA. Todos os direitos reservados.
          </p>
          <div className="w-16 h-1 bg-[#5A5A40] mx-auto rounded-full" />
        </div>
      </footer>
    </div>
  );
}
