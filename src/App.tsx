import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Wallet, 
  FileSearch, 
  Settings, 
  Bell, 
  Menu, 
  X, 
  Plus,
  Send,
  MoreVertical,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  Users,
  Calendar,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  Mail,
  Instagram,
  Smartphone,
  ThumbsDown,
  Pause,
  Play,
  Bot,
  Check,
  Paperclip
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { firestoreService } from './services/firestoreService';
import { generateChatResponse } from './services/geminiService';
import { evolutionService } from './services/evolutionService';
import { auth, signInWithGoogle } from './lib/firebase';
import { Message, Transaction, Parishioner, Event as ChurchEvent, UserProfile, SystemConfig, ConversationMeta, Critique, AuthorizedEmail } from './types';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import { orderBy } from 'firebase/firestore';

// Mock data generator for initial state if Firestore is empty
const MOCK_MESSAGES: Message[] = [
  {
    id: '1',
    platform: 'whatsapp',
    sender: 'Maria Silva',
    role: 'user',
    content: 'Olá, gostaria de saber o horário das missas de domingo e se haverá batizado no próximo mês.',
    status: 'pending',
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    platform: 'instagram',
    sender: 'Joao_Vlog',
    role: 'user',
    content: 'Paz de Cristo! Como faço para começar a pagar o dízimo online?',
    status: 'pending',
    createdAt: new Date(Date.now() - 3600000).toISOString()
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'messages' | 'finance' | 'reports' | 'events' | 'admin' | 'chat_test'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [parishioners, setParishioners] = useState<Parishioner[]>([]);
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [conversationMetas, setConversationMetas] = useState<ConversationMeta[]>([]);
  const [critiques, setCritiques] = useState<Critique[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Fetch user profile by ID (UID)
        try {
          const profiles = await firestoreService.getCollection<UserProfile>('profiles');
          let userProfile = profiles?.find(p => p.id === u.uid);
          
          if (!userProfile) {
            // Check if email is in authorized list
            const authEmails = await firestoreService.getCollection<AuthorizedEmail>('authorized_emails');
            const authEntry = authEmails?.find(ae => ae.email.toLowerCase() === u.email?.toLowerCase());

            const isBootstrapAdmin = u.email === 'danielbfs@gmail.com';
            let authorized = isBootstrapAdmin || !!authEntry;

            const newProfile: UserProfile = { 
              email: u.email!, 
              role: isBootstrapAdmin ? 'admin' : (authEntry?.role || 'user'), 
              name: u.displayName || 'Usuário',
              photoURL: u.photoURL || undefined,
              isAuthorized: authorized
            };
            await firestoreService.setDocument('profiles', u.uid, newProfile);
            userProfile = { ...newProfile, id: u.uid };
          } else {
            // Update profile info if changed (name/photo)
            if (userProfile.name !== u.displayName || userProfile.photoURL !== u.photoURL) {
              const updates: Partial<UserProfile> = {
                name: u.displayName || userProfile.name,
                photoURL: u.photoURL || userProfile.photoURL
              };
              await firestoreService.updateDocument('profiles', u.uid, updates);
              userProfile = { ...userProfile, ...updates };
            }

            // Force admin if bootstrap email
            if (u.email === 'danielbfs@gmail.com' && (userProfile.role !== 'admin' || !userProfile.isAuthorized)) {
              const forceUpdates: Partial<UserProfile> = { role: 'admin', isAuthorized: true };
              await firestoreService.updateDocument('profiles', u.uid, forceUpdates);
              userProfile = { ...userProfile, ...forceUpdates };
            }

            // Re-verify authorization for regular users
            if (!userProfile.isAuthorized) {
              const authEmails = await firestoreService.getCollection<AuthorizedEmail>('authorized_emails');
              const authEntry = authEmails?.find(ae => ae.email.toLowerCase() === u.email?.toLowerCase());
              
              if (authEntry) {
                const updates: Partial<UserProfile> = { 
                  isAuthorized: true,
                  role: authEntry.role // Sync role from auth list
                };
                await firestoreService.updateDocument('profiles', u.uid, updates);
                userProfile = { ...userProfile, ...updates };
              }
            }
          }
          setProfile(userProfile);
          if (userProfile.isAuthorized || userProfile.role === 'admin') {
            const configs = await firestoreService.getCollection<SystemConfig>('config');
            if (configs && configs.length > 0) {
              setConfig(configs[0]);
            } else if (userProfile.role === 'admin') {
              const defConfig: Partial<SystemConfig> = { 
                parishName: 'Paróquia Central', 
                aiPrompt: 'Você é o ParoquIA, assistente da secretaria paroquial. Sua missão é acolher os fiéis e organizar informações. \n\n' +
                          'REGRAS DE FINANÇAS:\n' +
                          '1. Sempre que identificar um comprovante ou conversa sobre dinheiro, identifique o valor e o paroquiano.\n' +
                          '2. PERGUNTE EDUCIDAMENTE a modalidade (Dízimo, Oferta ou algum Evento específico da lista) se não estiver claro.\n' +
                          '3. Se houver um anexo (imagem), mencione que o anexo foi recebido.',
                paymentModalities: ['Dízimo', 'Oferta', 'Festa do Padroeiro', 'Encontro de Casais'],
                updatedAt: new Date().toISOString() 
              };
              const cid = await firestoreService.addDocument('config', defConfig);
              setConfig({ ...defConfig, id: cid } as SystemConfig);
            }
          }
        } catch (error) {
          console.error("Error fetching profile/config:", error);
        }
      }
      setLoading(false);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user || !profile?.isAuthorized) return;

    // Real-time subscriptions
    const unsubMessages = firestoreService.subscribeCollection<Message>('messages', [orderBy('createdAt', 'desc')], setMessages);
    const unsubTransactions = firestoreService.subscribeCollection<Transaction>('transactions', [orderBy('date', 'desc')], setTransactions);
    const unsubParishioners = firestoreService.subscribeCollection<Parishioner>('parishioners', [], setParishioners);
    const unsubEvents = firestoreService.subscribeCollection<ChurchEvent>('events', [orderBy('date', 'asc')], setEvents);
    const unsubConversations = firestoreService.subscribeCollection<ConversationMeta>('conversations', [orderBy('lastMessageAt', 'desc')], setConversationMetas);
    const unsubCritiques = firestoreService.subscribeCollection<Critique>('critiques', [orderBy('createdAt', 'desc')], setCritiques);
    const unsubConfig = firestoreService.subscribeCollection<SystemConfig>('config', [], (configs) => {
      if (configs && configs.length > 0) {
        setConfig(configs[0]);
      }
    });

    // Initial Seeding if empty
    const seedIfEmpty = async () => {
      const existingMsgs = await firestoreService.getCollection<Message>('messages');
      if (existingMsgs && existingMsgs.length === 0) {
        for (const msg of MOCK_MESSAGES) {
          await firestoreService.addDocument('messages', msg);
        }
        
        const mockEvents = [
          { title: 'Festa da Padroeira', date: new Date(Date.now() + 86400000 * 5).toISOString(), location: 'Salão Paroquial', description: 'Grande celebração com quermesse e procissão.' },
          { title: 'Missa das Crianças', date: new Date(Date.now() + 86400000 * 2).toISOString(), location: 'Igreja Matriz', description: 'Celebração especial para as famílias.' }
        ];
        for (const ev of mockEvents) {
          await firestoreService.addDocument('events', ev);
        }

        const mockTxs = [
          { type: 'tithe', amount: 150.00, date: new Date().toISOString(), parishionerName: 'Maria Silva' },
          { type: 'offering', amount: 45.50, date: new Date().toISOString(), parishionerName: 'Anônimo' }
        ];
        for (const tx of mockTxs) {
          await firestoreService.addDocument('transactions', tx);
        }
      }
    };
    seedIfEmpty();

    return () => {
      unsubMessages();
      unsubTransactions();
      unsubParishioners();
      unsubEvents();
      unsubConversations();
      unsubCritiques();
      unsubConfig();
    };
  }, [user]);

  const getSystemMemory = () => {
    const singleEvents = events.filter(e => !e.isRecurring).slice(0, 5).map(e => `- ${e.title} em ${format(new Date(e.date), 'dd/MM/yyyy')} no local ${e.location}`).join('\n');
    const recurringEvents = events.filter(e => e.isRecurring).map(e => {
      const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      return `- ${e.title} (Fixo): Todo(a) ${days[e.recurrenceDay || 0]} às ${e.recurrenceTime} no local ${e.location}`;
    }).join('\n');

    const membersCount = parishioners.length;
    const recentFinance = transactions.slice(0, 5).map(t => `- R$${t.amount} de ${t.parishionerName} como ${t.type}`).join('\n');
    
    return `
      NOME DA PARÓQUIA: ${config?.parishName || 'Paróquia Central'}
      MEMBROS ATIVOS: ${membersCount}
      PRÓXIMOS EVENTOS PONTUAIS:
      ${singleEvents || 'Nenhum evento agendado.'}
      AGENDA FIXA/RECORRENTE:
      ${recurringEvents || 'Nenhuma atividade recorrente cadastrada.'}
      HISTÓRICO FINANCEIRO RECENTE:
      ${recentFinance || 'Nenhuma transação recente.'}
    `;
  };

  const handleAnalyze = async (msg: Message) => {
    if (!msg.id) return;
    setIsAnalyzing(true);
    
    const context = getSystemMemory();
    const result = await generateChatResponse(msg.content, [], context, config?.aiPrompt);
    
    await firestoreService.updateDocument('messages', msg.id, {
      aiCategory: result.analysis.category,
      aiSentiment: result.analysis.sentiment,
      suggestedResponse: result.text,
      status: 'processed'
    });
    
    setSelectedMessage(prev => prev?.id === msg.id ? { 
      ...prev, 
      aiCategory: result.analysis.category, 
      aiSentiment: result.analysis.sentiment, 
      suggestedResponse: result.text, 
      status: 'processed' 
    } as Message : prev);
    setIsAnalyzing(false);
  };

  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#F8F9FA]">
      <div className="w-12 h-12 border-4 border-[#5A5A40]/20 border-t-[#5A5A40] rounded-full animate-spin" />
    </div>
  );

  if (!user) return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#F8F9FA] p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white p-12 rounded-[2rem] shadow-2xl border border-gray-100 text-center"
      >
        <div className="w-20 h-20 bg-[#5A5A40] rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-[#5A5A40]/20">
          <Sparkles className="text-white w-10 h-10" />
        </div>
        <h1 className="text-4xl font-serif font-bold text-gray-900 mb-2">ParoquIA</h1>
        <p className="text-gray-500 mb-10 leading-relaxed">Gestão Pastoral Inteligente. Conectando corações e organizando a missão paroquial.</p>
        
        <button 
          onClick={() => signInWithGoogle()}
          className="w-full bg-[#5A5A40] text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-4 hover:bg-[#4A4A35] transition-all shadow-lg shadow-[#5A5A40]/10 active:scale-[0.98]"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 invert" />
          Acessar com Google
        </button>
        
        <p className="mt-8 text-[10px] text-gray-400 uppercase tracking-widest font-bold">Uso restrito a secretarias e pastores</p>
      </motion.div>
    </div>
  );
  
  if (user && !profile?.isAuthorized) return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#F8F9FA] p-6 text-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white p-12 rounded-[2rem] shadow-2xl border border-gray-100"
      >
        <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-8">
          <Clock className="text-amber-500 w-10 h-10" />
        </div>
        <h1 className="text-3xl font-serif font-bold text-gray-900 mb-4">Acesso Pendente</h1>
        <p className="text-gray-500 mb-8 leading-relaxed">
          Seu email (<strong>{user.email}</strong>) ainda não foi autorizado para acessar o sistema. 
          Entre em contato com o administrador da paróquia.
        </p>
        
        <button 
          onClick={() => auth.signOut()}
          className="w-full border-2 border-gray-100 text-gray-500 py-4 rounded-xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
        >
          <X className="w-4 h-4" />
          Sair do Sistema
        </button>
      </motion.div>
    </div>
  );

  const tabs = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Painel Central' },
    { id: 'messages', icon: MessageSquare, label: 'Mensagens' },
    { id: 'finance', icon: Wallet, label: 'Financeiro' },
    { id: 'events', icon: Calendar, label: 'Agenda' },
    { id: 'reports', icon: FileSearch, label: 'Relatórios' },
    { id: 'chat_test', icon: Smartphone, label: 'Teste seu chat' },
    ...(profile?.role === 'admin' ? [{ id: 'admin', icon: Settings, label: 'Administração' }] : []),
  ];

  return (
    <div className="flex h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        className="bg-white border-r border-[#E5E7EB] flex flex-col h-full z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]"
      >
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#5A5A40] rounded-xl flex items-center justify-center shadow-lg shadow-[#5A5A40]/20 shrink-0">
            <Sparkles className="text-white w-6 h-6" />
          </div>
          {isSidebarOpen && (
            <motion.h1 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-serif font-bold text-xl tracking-tight whitespace-nowrap"
            >
              ParoquIA
            </motion.h1>
          )}
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative",
                activeTab === tab.id 
                  ? "bg-[#F3F4F1] text-[#5A5A40] font-medium" 
                  : "text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#1A1A1A]"
              )}
            >
              <tab.icon className={cn(
                "w-5 h-5 shrink-0",
                activeTab === tab.id ? "text-[#5A5A40]" : "text-[#9CA3AF] group-hover:text-[#1A1A1A]"
              )} />
              {isSidebarOpen && <span className="whitespace-nowrap">{tab.label}</span>}
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTabIndicator"
                  className="absolute left-0 w-1 h-6 bg-[#5A5A40] rounded-r-full"
                />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-[#E5E7EB] space-y-2">
          {isSidebarOpen && (
            <div className="px-4 py-2 mb-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{user.email}</p>
            </div>
          )}
          <button 
            onClick={() => auth.signOut()}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span>Sair</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-16 border-b border-[#E5E7EB] bg-white px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5 text-gray-500" />
            </button>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-widest">
              {tabs.find(t => t.id === activeTab)?.label}
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <Bell className="w-5 h-5 text-gray-400 cursor-pointer" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white">
                3
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-gray-200 border border-gray-300 overflow-hidden">
              <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="User avatar" />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-[#F8F9FA]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl mx-auto"
            >
              {activeTab === 'dashboard' && <DashboardView transactions={transactions} messages={messages} parishioners={parishioners} config={config} events={events} setActiveTab={setActiveTab} />}
              {activeTab === 'messages' && (
                <MessagesView 
                  messages={messages} 
                  conversationMetas={conversationMetas}
                  critiques={critiques}
                  selectedConversation={selectedConversation}
                  setSelectedConversation={setSelectedConversation}
                  handleAnalyze={handleAnalyze}
                  isAnalyzing={isAnalyzing}
                />
              )}
              {activeTab === 'finance' && <FinanceView transactions={transactions} config={config} />}
              {activeTab === 'events' && <EventsView events={events} />}
              {activeTab === 'reports' && <ReportsView transactions={transactions} parishioners={parishioners} />}
              {activeTab === 'chat_test' && <ChatTestView config={config} getSystemContext={getSystemMemory} />}
              {activeTab === 'admin' && profile?.role === 'admin' && (
                <AdminView 
                  config={config} 
                  setConfig={setConfig} 
                  parishioners={parishioners}
                  critiques={critiques}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function AdminView({ config, setConfig, parishioners, critiques }: { config: SystemConfig | null, setConfig: any, parishioners: Parishioner[], critiques: Critique[] }) {
  const [activeAdminTab, setActiveAdminTab] = useState<'general' | 'evolution' | 'critiques' | 'users'>('general');
  const [prompt, setPrompt] = useState(config?.aiPrompt || '');
  const [parishName, setParishName] = useState(config?.parishName || '');
  
  // Modalities management
  const [modalities, setModalities] = useState<string[]>(config?.paymentModalities || []);
  const [newModality, setNewModality] = useState('');

  // Sync modalities state when config changes
  useEffect(() => {
    if (config?.paymentModalities) {
      setModalities(config.paymentModalities);
    }
  }, [config?.paymentModalities]);

  // Authorized Emails State
  const [authorizedEmails, setAuthorizedEmails] = useState<AuthorizedEmail[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  const [isAddingEmail, setIsAddingEmail] = useState(false);

  // Evolution API State
  const defaultUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const [apiUrl, setApiUrl] = useState(config?.evolutionApiUrl || defaultUrl);
  const [apiKey, setApiKey] = useState(config?.evolutionApiKey || 'paroquia_secret_key');
  const [instanceName, setInstanceName] = useState(config?.evolutionInstanceName || 'paroquia');
  const [isApiOnline, setIsApiOnline] = useState<boolean | null>(null);
  const [instanceStatus, setInstanceStatus] = useState<any>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);

  // Sync state if config updates
  useEffect(() => {
    if (config) {
      setPrompt(config.aiPrompt || '');
      setParishName(config.parishName || '');
      if (config.evolutionApiUrl) setApiUrl(config.evolutionApiUrl);
      if (config.evolutionApiKey) setApiKey(config.evolutionApiKey);
      if (config.evolutionInstanceName) setInstanceName(config.evolutionInstanceName);
    }
  }, [config]);

  useEffect(() => {
    if (activeAdminTab === 'evolution' && apiUrl && apiKey) {
      checkEvolutionStatus();
    }
    if (activeAdminTab === 'users') {
      fetchAuthorizedEmails();
    }
  }, [activeAdminTab]);

  const handleUpdateModalities = async (newList: string[]) => {
    if (!config?.id) return;
    try {
      await firestoreService.updateDocument('config', config.id, {
        paymentModalities: newList,
        updatedAt: new Date().toISOString()
      });
      setModalities(newList);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddModality = () => {
    if (!newModality.trim() || modalities.includes(newModality.trim())) return;
    const newList = [...modalities, newModality.trim()];
    handleUpdateModalities(newList);
    setNewModality('');
  };

  const handleRemoveModality = (m: string) => {
    const newList = modalities.filter(item => item !== m);
    handleUpdateModalities(newList);
  };

  const fetchAuthorizedEmails = async () => {
    const emails = await firestoreService.getCollection<AuthorizedEmail>('authorized_emails');
    setAuthorizedEmails(emails || []);
  };

  const handleAddEmail = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) return;
    setIsAddingEmail(true);
    try {
      const emailLower = newEmail.toLowerCase().trim();
      await firestoreService.setDocument('authorized_emails', emailLower, {
        email: emailLower,
        role: newRole,
        createdAt: new Date().toISOString()
      });
      setNewEmail('');
      await fetchAuthorizedEmails();
    } catch (error) {
      console.error(error);
    } finally {
      setIsAddingEmail(false);
    }
  };

  const handleRemoveEmail = async (email: string) => {
    if (!confirm(`Remover acesso de ${email}?`)) return;
    try {
      await firestoreService.deleteDocument('authorized_emails', email);
      await fetchAuthorizedEmails();
    } catch (error) {
      console.error(error);
    }
  };

  const checkEvolutionStatus = async () => {
    if (!apiUrl || !apiKey) return;
    setIsLoadingStatus(true);
    try {
      const online = await evolutionService.getStatus(apiUrl, apiKey);
      setIsApiOnline(online);
      if (online && instanceName) {
        const status = await evolutionService.getInstance(apiUrl, apiKey, instanceName);
        setInstanceStatus(status);
      }
    } catch (error) {
      setIsApiOnline(false);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleCreateInstance = async () => {
    if (!apiUrl || !apiKey || !instanceName) return;
    setIsSaving(true);
    try {
      await evolutionService.createInstance(apiUrl, apiKey, instanceName);
      await checkEvolutionStatus();
      alert('Instância criada! Agora escaneie o QR Code.');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGetQr = async () => {
    if (!apiUrl || !apiKey || !instanceName) return;
    setIsSaving(true);
    try {
      const data = await evolutionService.getQrCode(apiUrl, apiKey, instanceName);
      if (data.base64) {
        setQrCode(data.base64);
      } else {
        alert('QR Code indisponível no momento. Tente novamente em alguns segundos.');
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetWebhook = async () => {
    if (!apiUrl || !apiKey || !instanceName) return;
    setIsSaving(true);
    try {
      // Base application URL (using current window location)
      const baseUrl = window.location.origin;
      const webhookUrl = `${baseUrl}/api/webhook/whatsapp`;
      await evolutionService.setWebhook(apiUrl, apiKey, instanceName, webhookUrl);
      alert('Webhook configurado com sucesso!');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!config?.id) return;
    setIsSaving(true);
    const updatedData = {
      aiPrompt: prompt,
      parishName,
      evolutionApiUrl: apiUrl,
      evolutionApiKey: apiKey,
      evolutionInstanceName: instanceName,
      updatedAt: new Date().toISOString()
    };
    await firestoreService.updateDocument('config', config.id, updatedData);
    setConfig({ ...config, ...updatedData });
    setIsSaving(false);
  };

  return (
    <div className="space-y-8 pb-12">
      <header className="flex justify-between items-start">
        <div>
          <h3 className="text-3xl font-serif font-bold text-gray-900">Administração do Sistema</h3>
          <p className="text-gray-500">Controle de IA, integração de mensagens e parâmetros globais.</p>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
          <button 
            onClick={() => setActiveAdminTab('general')}
            className={cn(
              "px-6 py-2 rounded-xl font-bold text-sm transition-all",
              activeAdminTab === 'general' ? "bg-[#5A5A40] text-white shadow-lg shadow-[#5A5A40]/20" : "text-gray-400 hover:text-gray-600"
            )}
          >
            Geral
          </button>
          <button 
            onClick={() => setActiveAdminTab('evolution')}
            className={cn(
              "px-6 py-2 rounded-xl font-bold text-sm transition-all",
              activeAdminTab === 'evolution' ? "bg-[#5A5A40] text-white shadow-lg shadow-[#5A5A40]/20" : "text-gray-400 hover:text-gray-600"
            )}
          >
            WhatsApp (Evolution)
          </button>
          <button 
            onClick={() => setActiveAdminTab('users')}
            className={cn(
              "px-6 py-2 rounded-xl font-bold text-sm transition-all",
              activeAdminTab === 'users' ? "bg-[#5A5A40] text-white shadow-lg shadow-[#5A5A40]/20" : "text-gray-400 hover:text-gray-600"
            )}
          >
            Acessos
          </button>
          <button 
            onClick={() => setActiveAdminTab('critiques')}
            className={cn(
              "px-6 py-2 rounded-xl font-bold text-sm transition-all",
              activeAdminTab === 'critiques' ? "bg-[#5A5A40] text-white shadow-lg shadow-[#5A5A40]/20" : "text-gray-400 hover:text-gray-600"
            )}
          >
            Críticas e IA
          </button>
        </div>
      </header>

      {activeAdminTab === 'general' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-[#5A5A40]/10 rounded-lg">
                <Sparkles className="w-5 h-5 text-[#5A5A40]" />
              </div>
              <h4 className="text-xl font-bold">Personalidade da IA</h4>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block px-1">Nome da Paróquia</label>
              <input 
                type="text" 
                value={parishName}
                onChange={e => setParishName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-[#5A5A40]/10"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block px-1">Prompt de Instruções (Persona)</label>
              <textarea 
                rows={10}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-[#5A5A40]/10 font-medium text-sm leading-relaxed"
                placeholder="Ex: Você é um assistente católico acolhedor. Sempre que falarem de dízimo, explique o conceito teológico de partilha..."
              />
              <p className="text-[10px] text-gray-400 mt-2 italic">* Este prompt guia o comportamento de todas as respostas automáticas da IA.</p>
            </div>

            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="w-full bg-[#5A5A40] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#4A4A35] transition-all shadow-lg shadow-[#5A5A40]/10 disabled:opacity-50"
            >
              {isSaving ? <Clock className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {isSaving ? 'Salvando Configurações...' : 'Atualizar IA'}
            </button>
          </div>

          <div className="space-y-8">
            <div className="bg-[#1A1A1A] p-8 rounded-3xl shadow-xl text-white">
              <div className="flex items-center gap-3 mb-6">
                <Users className="w-6 h-6 text-[#5A5A40]" />
                <h4 className="text-xl font-medium font-serif">Equipe e Membros</h4>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-sm">Total de Paroquianos</span>
                  <span className="font-mono text-xl">{parishioners.length}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-sm">Nível Administrativo</span>
                  <span className="px-3 py-1 bg-[#5A5A40] rounded-full text-[10px] font-black uppercase">Host/Admin</span>
                </div>
              </div>
              <button 
                onClick={() => setActiveAdminTab('users')}
                className="w-full mt-8 border border-white/10 py-4 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-colors"
              >
                Gerenciar Operadores
              </button>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <h4 className="text-xl font-bold mb-4">Modalidades de Pagamento / Eventos</h4>
              <p className="text-sm text-gray-500 mb-6 font-serif">Defina os tipos de eventos para os quais a paróquia recebe pagamentos (ex: Festa do Padroeiro, Encontro de Casais).</p>
              
              <div className="flex gap-4 mb-6">
                <input 
                  type="text" 
                  value={newModality}
                  onChange={e => setNewModality(e.target.value)}
                  placeholder="Nova modalidade..."
                  className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none"
                />
                <button 
                  onClick={handleAddModality}
                  className="bg-[#5A5A40] text-white px-8 py-3 rounded-xl font-bold"
                >
                  Adicionar
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {modalities.map(m => (
                  <div key={m} className="bg-gray-50 border border-gray-100 px-4 py-2 rounded-lg flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-700">{m}</span>
                    <button onClick={() => handleRemoveModality(m)} className="text-red-300 hover:text-red-500 font-bold"><X size={14}/></button>
                  </div>
                ))}
                {modalities.length === 0 && <span className="text-gray-400 italic text-sm">Nenhuma modalidade cadastrada.</span>}
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden text-center flex flex-col items-center justify-center py-12">
               <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                 <ThumbsDown className="w-8 h-8" />
               </div>
               <h4 className="text-lg font-bold">Feedback Negativo</h4>
               <p className="text-sm text-gray-500 mb-6 max-w-[200px]">Existem {critiques.length} respostas da IA que foram criticadas por operadores.</p>
               <button 
                 onClick={() => setActiveAdminTab('critiques')}
                 className="text-[#5A5A40] font-bold text-sm flex items-center gap-2 group"
               >
                 Ver críticas <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
               </button>
            </div>
          </div>
        </div>
      ) : activeAdminTab === 'evolution' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <Smartphone className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h4 className="text-xl font-bold">Evolution API</h4>
                </div>
                
                <div className="flex items-center gap-2">
                  {isLoadingStatus ? (
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Clock className="w-3 h-3 animate-spin" /> Verificando...
                    </div>
                  ) : (
                    <div className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2",
                      isApiOnline ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    )}>
                      <div className={cn("w-2 h-2 rounded-full", isApiOnline ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
                      {isApiOnline ? 'Serviço Online' : 'Serviço Offline'}
                    </div>
                  )}
                  <button 
                    onClick={checkEvolutionStatus}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Atualizar Status"
                  >
                    <Sparkles className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block px-1">URL da API</label>
                  <input 
                    type="text" 
                    value={apiUrl}
                    onChange={e => setApiUrl(e.target.value)}
                    placeholder="https://sua-url-evolution.com"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-[#5A5A40]/10 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block px-1">API Key Global</label>
                  <input 
                    type="password" 
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="Sua chave secreta"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-[#5A5A40]/10 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block px-1">Nome da Instância</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={instanceName}
                    onChange={e => setInstanceName(e.target.value)}
                    placeholder="ex: openclinic"
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-[#5A5A40]/10 transition-all"
                  />
                  <button 
                    onClick={handleCreateInstance}
                    className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-600 transition-all text-sm"
                  >
                    Criar
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-50 flex gap-4">
                <button 
                  onClick={handleSave}
                  className="flex-1 bg-[#5A5A40] text-white py-4 rounded-xl font-bold hover:bg-[#4A4A35] transition-all text-sm"
                >
                  Salvar Configurações
                </button>
                <button 
                  onClick={handleSetWebhook}
                  className="flex-1 border-2 border-emerald-100 text-emerald-600 py-4 rounded-xl font-bold hover:bg-emerald-50 transition-all text-sm"
                >
                  Registrar Webhook
                </button>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                <h4 className="font-bold mb-4">Como configurar</h4>
                <ol className="space-y-4 text-sm text-gray-600">
                  <li className="flex gap-3">
                    <span className="w-6 h-6 bg-[#5A5A40]/10 text-[#5A5A40] rounded-full flex items-center justify-center font-bold shrink-0">1</span>
                    <p>Aguarde o serviço Evolution API ficar online (até ~30s na primeira inicialização)</p>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 bg-[#5A5A40]/10 text-[#5A5A40] rounded-full flex items-center justify-center font-bold shrink-0">2</span>
                    <p>Crie uma instância com o nome desejado (ex: openclinic)</p>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 bg-[#5A5A40]/10 text-[#5A5A40] rounded-full flex items-center justify-center font-bold shrink-0">3</span>
                    <p>Escaneie o QR Code com o WhatsApp do número da paróquia</p>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 bg-[#5A5A40]/10 text-[#5A5A40] rounded-full flex items-center justify-center font-bold shrink-0">4</span>
                    <p>Clique em <strong>Registrar Webhook WhatsApp</strong> para que a IA receba as mensagens</p>
                  </li>
                </ol>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
              <h4 className="font-bold mb-2">Status da Conexão</h4>
              
              {!isApiOnline ? (
                <div className="py-12 flex flex-col items-center opacity-30">
                  <X className="w-12 h-12 text-red-400 mb-4" />
                  <p className="text-sm font-medium">API Offline ou não configurada</p>
                </div>
              ) : instanceStatus?.instance?.state === 'open' ? (
                <div className="py-12 flex flex-col items-center">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4 border-4 border-emerald-50">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  </div>
                  <h5 className="font-bold text-emerald-900">Conectado!</h5>
                  <p className="text-xs text-emerald-600 mt-2">Pronto para receber mensagens.</p>
                </div>
              ) : (
                <div className="py-6 w-full space-y-6">
                  {qrCode ? (
                    <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-gray-100 mx-auto w-fit">
                      <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48 bg-gray-50" />
                      <p className="mt-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Escaneie no WhatsApp</p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-12 rounded-2xl border-2 border-dashed border-gray-100 flex flex-col items-center opacity-50">
                      <Smartphone className="w-12 h-12 text-gray-300 mb-2" />
                      <p className="text-xs font-medium">QR Code pronto para geração</p>
                    </div>
                  )}
                  
                  <button 
                    onClick={handleGetQr}
                    disabled={isSaving}
                    className="w-full bg-[#1A1A1A] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg shadow-black/10 disabled:opacity-50"
                  >
                    {isSaving ? <Clock className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {qrCode ? 'Atualizar QR Code' : 'Gerar QR Code Conexão'}
                  </button>
                  
                  {qrCode && (
                    <p className="text-[9px] text-gray-400 uppercase tracking-tighter">O QR Code expira em alguns minutos. Se falhar, gere um novo.</p>
                  )}
                </div>
              )}
            </div>

            {instanceStatus && (
              <div className="bg-[#1A1A1A] p-6 rounded-3xl text-white space-y-4">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h5 className="font-bold text-sm">Dados da Instância</h5>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-[10px] uppercase font-black text-gray-500">
                    <span>Nome</span>
                    <span className="text-white">{instanceStatus.instance?.instanceName || instanceName}</span>
                  </div>
                  <div className="flex justify-between text-[10px] uppercase font-black text-gray-500">
                    <span>Status</span>
                    <span className="text-white">{instanceStatus.instance?.state || 'Desconhecido'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : activeAdminTab === 'users' ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h4 className="text-xl font-bold mb-6">Autorizar Novos Operadores</h4>
            <div className="flex flex-col md:flex-row gap-4">
              <input 
                type="email" 
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="email@gmail.com"
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-[#5A5A40]/10"
              />
              <select 
                value={newRole}
                onChange={e => setNewRole(e.target.value as 'admin' | 'user')}
                className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-[#5A5A40]"
              >
                <option value="user">Operador (User)</option>
                <option value="admin">Administrador</option>
              </select>
              <button 
                onClick={handleAddEmail}
                disabled={isAddingEmail || !newEmail.includes('@')}
                className="bg-[#5A5A40] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#4A4A35] transition-all disabled:opacity-50 whitespace-nowrap"
              >
                {isAddingEmail ? 'Adicionando...' : 'Autorizar Acesso'}
              </button>
            </div>
            <p className="mt-4 text-xs text-gray-400 italic">
              * Administradores podem alterar configurações do sistema. Usuários têm acesso apenas operacional (financeiro/paroquianos).
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
              <h5 className="font-bold text-gray-700">Emails com Acesso Liberado</h5>
            </div>
            <div className="divide-y divide-gray-50">
              {authorizedEmails.map((ae) => (
                <div key={ae.email} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-50 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-700 font-mono">{ae.email}</span>
                      <span className={cn(
                        "text-[10px] uppercase font-black px-2 py-0.5 rounded w-fit mt-1",
                        ae.role === 'admin' ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                      )}>
                        {ae.role === 'admin' ? 'Administrador' : 'Operador'}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRemoveEmail(ae.email)}
                    className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
              {authorizedEmails.length === 0 && (
                <div className="p-12 text-center text-gray-400">
                  Nenhum email autorizado adicional. Apenas o administrador mestre tem acesso.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <header className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/10">
            <div>
              <h4 className="text-xl font-bold font-serif text-gray-900">Treinamento & Respostas Recusadas</h4>
              <p className="text-sm text-gray-500 font-medium">Histórico de intervenções humanas e correções pastorais.</p>
            </div>
            <div className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-100">
              {critiques.length} Recusas
            </div>
          </header>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/30">
                  <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Data</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Contexto (Usuário)</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Resposta IA</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-red-500">Crítica Pastoral</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {critiques.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-6 text-xs text-gray-400 whitespace-nowrap font-medium">{format(new Date(c.createdAt), 'dd/MM HH:mm', { locale: ptBR })}</td>
                    <td className="px-8 py-6 text-sm font-bold text-gray-700 max-w-[200px] leading-relaxed italic">"{c.originalContent}"</td>
                    <td className="px-8 py-6 text-[13px] text-gray-500 max-w-xs leading-relaxed bg-gray-50/20 group-hover:bg-transparent transition-colors">
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{c.aiResponse || ''}</ReactMarkdown>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="bg-red-50 text-red-700 p-4 rounded-2xl text-[13px] font-medium border border-red-100 shadow-sm leading-relaxed">
                        {c.critique}
                      </div>
                    </td>
                  </tr>
                ))}
                {critiques.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-8 py-32 text-center">
                      <div className="opacity-20 flex flex-col items-center select-none">
                        <CheckCircle2 className="w-16 h-16 mb-4 text-[#5A5A40]" />
                        <h5 className="font-serif font-bold text-2xl text-gray-900">IA Impecável</h5>
                        <p className="text-sm mt-1">Nenhuma sugestão foi criticada pelos operadores ainda.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-views
function ChatTestView({ config, getSystemContext }: { config: SystemConfig | null, getSystemContext: () => string }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string, timestamp: Date }[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMsg = { role: 'user' as const, content: inputText, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const context = getSystemContext();
      
      const response = await generateChatResponse(
        inputText, 
        history, 
        context, 
        config?.aiPrompt
      );

      const aiMsg = { role: 'ai' as const, content: response.text, timestamp: new Date() };
      setMessages(prev => [...prev, aiMsg]);

      // Salvar na memória global do sistema também para auditoria/histórico
      await firestoreService.addDocument('messages', {
        platform: 'whatsapp',
        sender: 'Simulador (Teste)',
        role: 'user',
        content: inputText,
        status: 'responded',
        createdAt: userMsg.timestamp.toISOString(),
        aiCategory: response.analysis.category,
        aiSentiment: response.analysis.sentiment,
        suggestedResponse: response.text
      });

      // Salvar a resposta da IA também para que apareça na "Conversa" no menu Mensagens
      await firestoreService.addDocument('messages', {
        platform: 'whatsapp',
        sender: 'Simulador (Teste)',
        role: 'ai',
        content: response.text,
        status: 'processed',
        createdAt: new Date().toISOString()
      });

    } catch (error) {
      console.error("Chat Test Error:", error);
      setMessages(prev => [...prev, { role: 'ai', content: "Desculpe, tive um problema ao processar sua mensagem.", timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-160px)] flex flex-col max-w-2xl mx-auto bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
      <header className="p-6 bg-[#25D366] text-white flex items-center gap-4">
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <Smartphone className="w-6 h-6" />
        </div>
        <div>
          <h4 className="font-bold">WhatsApp Paroquial</h4>
          <p className="text-[10px] opacity-80 uppercase tracking-widest font-black">Simulador de Usuário Externo</p>
        </div>
      </header>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 bg-[#E5DDD5] space-y-4 scroll-smooth"
      >
        {messages.length === 0 && (
          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl text-center text-sm text-gray-600 border border-gray-100 shadow-sm mx-8">
            <p className="font-bold mb-1">Paz de Cristo!</p>
            <p>Envie uma mensagem para testar como a IA responde com base na memória do sistema (eventos, dízimos, etc).</p>
          </div>
        )}
        
        {messages.map((m, i) => (
          <div key={i} className={cn(
            "flex flex-col max-w-[85%] animate-in fade-in slide-in-from-bottom-2",
            m.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
          )}>
            <div className={cn(
              "px-4 py-3 rounded-2xl shadow-sm text-sm relative",
              m.role === 'user' 
                ? "bg-[#DCF8C6] text-gray-800 rounded-tr-none" 
                : "bg-white text-gray-800 rounded-tl-none"
            )}>
              <ReactMarkdown>{m.content}</ReactMarkdown>
              <div className={cn(
                "absolute top-0 w-0 h-0 border-t-[10px] border-l-[10px] border-l-transparent",
                m.role === 'user' 
                  ? "-right-2 border-t-[#DCF8C6]" 
                  : "-left-2 border-t-white"
              )} />
            </div>
            <span className="text-[9px] text-gray-500 mt-1 px-1">
              {format(m.timestamp, 'HH:mm')}
            </span>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-[10px] text-gray-500 bg-white/50 px-3 py-1 rounded-full w-fit">
            <Clock className="w-3 h-3 animate-spin" />
            IA digitando...
          </div>
        )}
      </div>

      <div className="p-4 bg-[#F0F0F0] flex gap-2 items-center">
        <input 
          type="text" 
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Digite sua mensagem como um paroquiano..."
          className="flex-1 px-4 py-3 bg-white rounded-full border-none outline-none text-sm shadow-sm focus:ring-2 focus:ring-[#25D366]/50 transition-all font-medium"
        />
        <button 
          onClick={handleSend}
          disabled={isLoading || !inputText.trim()}
          className="w-12 h-12 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-md hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
        >
          <Send className="w-5 h-5 ml-1" />
        </button>
      </div>
    </div>
  );
}

function DashboardView({ transactions, messages, parishioners, config, events, setActiveTab }: { 
  transactions: Transaction[], 
  messages: Message[], 
  parishioners: Parishioner[], 
  config: SystemConfig | null, 
  events: ChurchEvent[],
  setActiveTab: (tab: 'dashboard' | 'messages' | 'finance' | 'reports' | 'events' | 'admin' | 'chat_test') => void 
}) {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const tithesThisMonth = transactions.filter(t => {
    const d = new Date(t.date);
    return t.type === 'tithe' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).reduce((acc, t) => acc + t.amount, 0);

  const stats = [
    { label: 'Dízimos do Mês', value: `R$ ${tithesThisMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', tab: 'finance' as const },
    { label: 'Total de Membros', value: parishioners.length || '0', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', tab: 'admin' as const },
    { label: 'Mensagens Pendentes', value: messages.filter(m => m.status === 'pending').length || '0', icon: Bell, color: 'text-orange-600', bg: 'bg-orange-50', tab: 'messages' as const },
    { label: 'Próximos Eventos', value: events.filter(e => new Date(e.date) >= new Date()).length || '0', icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50', tab: 'events' as const },
  ];

  const chartData = transactions.length > 0 ? transactions.slice(-7).map(t => ({
    date: format(new Date(t.date), 'dd/MM'),
    amount: t.amount
  })) : [];

  const upcomingEvents = [...events]
    .filter(e => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  return (
    <div className="space-y-8">
      <header className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="text-3xl font-serif font-bold text-gray-900">{config?.parishName || 'Dashboard Pastoral'}</h3>
        <p className="text-gray-500">Resumo das atividades da nossa comunidade.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label} 
            onClick={() => setActiveTab(stat.tab)}
            className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all group"
          >
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform", stat.bg)}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{stat.label}</p>
            <h4 className="text-2xl font-bold mt-1 text-gray-800">{stat.value}</h4>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all" onClick={() => setActiveTab('finance')}>
          <div className="flex justify-between items-center mb-8">
            <h4 className="text-xl font-bold">Fluxo de Contribuições</h4>
            <div className="text-sm text-gray-400 font-medium">Ver Financeiro Completo</div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748B'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748B'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="amount" fill="#5A5A40" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-xl font-bold">Próximos Eventos</h4>
            <Calendar className="w-5 h-5 text-gray-300" />
          </div>
          <div className="space-y-6">
            {upcomingEvents.length === 0 ? (
              <div className="p-12 text-center text-gray-400 italic">Nenhum evento agendado.</div>
            ) : (
              upcomingEvents.map((e, i) => (
                <div key={i} onClick={() => setActiveTab('events')} className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-blue-50 text-blue-600")}>
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-gray-800 line-clamp-1">{e.title}</h5>
                    <p className="text-sm text-gray-500">
                      {format(new Date(e.date), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MessagesView({ 
  messages, 
  conversationMetas,
  selectedConversation, 
  setSelectedConversation, 
  handleAnalyze, 
  isAnalyzing 
}: any) {
  const conversations = useMemo(() => {
    const groups: Record<string, Message[]> = {};
    messages.forEach((m: Message) => {
      // Group by sender name/id
      if (!groups[m.sender]) groups[m.sender] = [];
      groups[m.sender].push(m);
    });
    
    return Object.entries(groups).map(([sender, msgs]) => {
      const sorted = [...msgs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const last = sorted[sorted.length - 1];
      const meta = conversationMetas.find((c: any) => c.sender === sender) || { sender, isAiEnabled: true };
      return { sender, messages: sorted, lastMessage: last, meta };
    }).sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());
  }, [messages, conversationMetas]);

  const activeConv = conversations.find(c => c.sender === selectedConversation);

  const toggleAi = async (sender: string, current: boolean) => {
    const meta = conversationMetas.find((c: any) => c.sender === sender);
    if (meta?.id) {
      await firestoreService.updateDocument('conversations', meta.id, { isAiEnabled: !current });
    } else {
      await firestoreService.addDocument('conversations', { sender, isAiEnabled: !current, lastMessageAt: new Date().toISOString() });
    }
  };

  const handleSaveCritique = async (msg: Message) => {
    const critiqueText = prompt("Qual a sua crítica ou correção para esta resposta? Ela será usada para treinar melhor a IA.");
    if (!critiqueText) return;

    await firestoreService.updateDocument('messages', msg.id!, { critique: critiqueText });
    
    // Encontrar a mensagem anterior do usuário para contexto
    const senderMessages = activeConv?.messages || [];
    const msgIndex = senderMessages.findIndex(m => m.id === msg.id);
    const userMsg = msgIndex > 0 ? senderMessages[msgIndex - 1].content : "N/A";

    await firestoreService.addDocument('critiques', {
      messageId: msg.id!,
      originalContent: userMsg,
      aiResponse: msg.content,
      critique: critiqueText,
      createdAt: new Date().toISOString()
    });
    alert('Crítica salva com sucesso!');
  };

  const handleHumanMessage = async (content: string) => {
    if (!activeConv || !content.trim()) return;
    
    // Se o humano enviar mensagem, desativamos a IA para esta conversa automaticamente
    if (activeConv.meta.isAiEnabled) {
      await toggleAi(activeConv.sender, true);
    }

    await firestoreService.addDocument('messages', {
      platform: activeConv.messages[0].platform,
      sender: activeConv.sender,
      role: 'system', // ou 'ai' marcado como humano? Usaremos system para indicar operador
      content: content,
      status: 'responded',
      createdAt: new Date().toISOString()
    });
  };

  return (
    <div className="h-[calc(100vh-160px)] flex gap-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Sidebar de Conversas */}
      <div className="w-80 flex flex-col gap-4 bg-white rounded-3xl border border-gray-100 shadow-sm p-4 h-full overflow-hidden">
        <div className="flex items-center justify-between px-2 mb-2">
          <h4 className="font-serif font-bold text-lg">Conversas</h4>
          <span className="text-[10px] bg-gray-100 px-2 py-1 rounded-full font-bold text-gray-500">{conversations.length}</span>
        </div>
        
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Filtrar por nome..." 
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-[#5A5A40]/10 text-xs"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
          {conversations.map(conv => (
            <div 
              key={conv.sender}
              onClick={() => setSelectedConversation(conv.sender)}
              className={cn(
                "p-4 rounded-2xl cursor-pointer transition-all border group relative",
                selectedConversation === conv.sender 
                  ? "bg-[#F3F4F1] border-[#5A5A40]/20 shadow-sm" 
                  : "bg-white border-transparent hover:bg-gray-50"
              )}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-sm truncate max-w-[140px] text-gray-900 group-hover:text-[#5A5A40] transition-colors">{conv.sender}</span>
                <span className="text-[10px] text-gray-400 font-medium">
                  {format(new Date(conv.lastMessage.createdAt), 'HH:mm')}
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate leading-snug">{conv.lastMessage.content}</p>
              
              {!conv.meta.isAiEnabled && (
                <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-1 text-[9px] font-black text-orange-600 uppercase tracking-tighter">
                  <Pause className="w-2.5 h-2.5" /> Intervenção Humana
                </div>
              )}
            </div>
          ))}
          {conversations.length === 0 && (
            <div className="text-center py-12 px-4 opacity-30">
              <MessageSquare className="w-10 h-10 mx-auto mb-2" />
              <p className="text-xs font-medium">Nenhuma mensagem ainda</p>
            </div>
          )}
        </div>
      </div>

      {/* Janela de Chat */}
      <div className="flex-1 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col overflow-hidden relative">
        {activeConv ? (
          <>
            <header className="px-8 py-5 border-b border-gray-50 flex justify-between items-center bg-gray-50/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#5A5A40] text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-[#5A5A40]/20">
                  {activeConv.sender.charAt(0)}
                </div>
                <div>
                  <h5 className="font-bold text-lg text-gray-900 leading-tight">{activeConv.sender}</h5>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full shadow-sm", activeConv.meta.isAiEnabled ? "bg-emerald-500 animate-pulse" : "bg-orange-500")} />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      {activeConv.meta.isAiEnabled ? 'IA Automatizada Ativa' : 'Pausado para Intervenção'}
                    </span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => toggleAi(activeConv.sender, activeConv.meta.isAiEnabled)}
                className={cn(
                  "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm active:scale-95",
                  activeConv.meta.isAiEnabled 
                    ? "bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-100" 
                    : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100"
                )}
              >
                {activeConv.meta.isAiEnabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {activeConv.meta.isAiEnabled ? 'Liberar Canal Humano' : 'Retomar Automação IA'}
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-gray-50/5 scrollbar-thin">
              {activeConv.messages.map((m: Message) => (
                <div key={m.id} className={cn(
                  "flex flex-col max-w-[75%] animate-in fade-in slide-in-from-bottom-2 duration-300",
                  m.role === 'user' ? "mr-auto items-start" : "ml-auto items-end"
                )}>
                  <div className={cn(
                    "p-5 rounded-2xl text-[13px] leading-relaxed relative group shadow-sm transition-transform hover:scale-[1.01]",
                    m.role === 'user' 
                      ? "bg-white border border-gray-100 rounded-tl-none text-gray-800" 
                      : m.role === 'system'
                        ? "bg-[#1A1A1A] text-white rounded-tr-none"
                        : "bg-[#5A5A40] text-white rounded-tr-none"
                  )}>
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                    
                    {m.role === 'ai' && !m.critique && (
                      <button 
                        onClick={() => handleSaveCritique(m)}
                        className="absolute -left-10 top-1/2 -translate-y-1/2 p-2 bg-white text-gray-400 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:text-red-500 border border-gray-50"
                        title="Criticar resposta da IA"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                    )}
                    
                    {m.critique && (
                      <div className="mt-3 pt-3 border-t border-white/10 flex items-start gap-2">
                        <Bot className="w-3 h-3 mt-0.5 shrink-0" />
                        <p className="text-[10px] italic text-white/70">Crítica: {m.critique}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 px-1">
                    <span className="text-[9px] text-gray-400 font-medium">
                      {format(new Date(m.createdAt), 'HH:mm')}
                    </span>
                    {m.role !== 'user' && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded uppercase font-black tracking-tighter">
                        {m.role === 'system' ? 'Operador' : 'IA Paroquial'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-gray-100 bg-white flex gap-3 shadow-[0_-4px_24px_rgba(0,0,0,0.02)]">
               <input 
                 type="text" 
                 placeholder="Digite sua resposta aqui... (A IA será pausada automaticamente)" 
                 className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#5A5A40]/10 text-sm font-medium transition-all"
                 onKeyDown={(e: any) => {
                   if (e.key === 'Enter') {
                     handleHumanMessage(e.target.value);
                     e.target.value = '';
                   }
                 }}
               />
               <button 
                 onClick={(e: any) => {
                   const input = e.currentTarget.previousSibling as HTMLInputElement;
                   handleHumanMessage(input.value);
                   input.value = '';
                 }}
                 className="bg-[#5A5A40] text-white px-8 rounded-2xl font-bold hover:bg-[#4A4A35] transition-all shadow-lg shadow-[#5A5A40]/10 active:scale-95 flex items-center gap-2"
               >
                 <Send className="w-4 h-4" /> 
                 <span className="hidden md:inline">Enviar</span>
               </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 opacity-30 select-none">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
              <MessageSquare className="w-10 h-10 text-gray-300" />
            </div>
            <h5 className="text-xl font-serif font-bold text-gray-900 mb-2">Canal de Comunicação</h5>
            <p className="text-sm text-gray-500 max-w-xs">Selecione uma paroquiana ou paroquiano ao lado para visualizar o histórico de conversas.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FinanceView({ transactions, config }: { transactions: Transaction[], config: SystemConfig | null }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTx, setNewTx] = useState({ 
    type: 'tithe' as Transaction['type'], 
    amount: 0, 
    parishionerName: '', 
    date: new Date().toISOString(),
    modality: '',
    attachmentUrl: ''
  });

  const handleAdd = async () => {
    if (newTx.amount <= 0 || !newTx.parishionerName) return;
    await firestoreService.addDocument('transactions', {
      ...newTx,
      amount: Number(newTx.amount),
      isProcessed: false
    });
    setIsModalOpen(false);
    setNewTx({ 
      type: 'tithe', 
      amount: 0, 
      parishionerName: '', 
      date: new Date().toISOString(),
      modality: '',
      attachmentUrl: ''
    });
  };

  const toggleProcessed = async (txId: string, current: boolean) => {
    await firestoreService.updateDocument('transactions', txId, { isProcessed: !current });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <header>
          <h3 className="text-3xl font-serif font-bold text-gray-900">Financeiro Pastoral</h3>
          <p className="text-gray-500">Acompanhamento de dízimos, ofertas e eventos.</p>
        </header>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#5A5A40] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" /> Novo Lançamento
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-16 text-center">OK</th>
                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Inscrito</th>
                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Modalidade</th>
                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Data</th>
                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Montante</th>
                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Anexo</th>
                <th className="px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-16 text-center text-gray-400 italic font-medium">Nenhum registro financeiro encontrado no sistema.</td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className={cn(
                    "hover:bg-gray-50 transition-colors group",
                    tx.isProcessed && "bg-gray-50/50 opacity-60"
                  )}>
                    <td className="px-8 py-5 text-center">
                      <button 
                        onClick={() => tx.id && toggleProcessed(tx.id, !!tx.isProcessed)}
                        className={cn(
                          "w-5 h-5 rounded border transition-all flex items-center justify-center",
                          tx.isProcessed 
                            ? "bg-[#5A5A40] border-[#5A5A40] text-white" 
                            : "bg-white border-gray-300 hover:border-[#5A5A40]"
                        )}
                      >
                        {tx.isProcessed && <Check className="w-3 h-3" />}
                      </button>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#F3F4F1] flex items-center justify-center font-bold text-xs text-[#5A5A40]">
                          {tx.parishionerName?.charAt(0)}
                        </div>
                        <span className="font-bold text-gray-900">{tx.parishionerName}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight w-fit",
                          tx.type === 'tithe' ? "bg-emerald-100 text-emerald-700" : 
                          tx.type === 'event' ? "bg-purple-100 text-purple-700" :
                          "bg-blue-100 text-blue-700"
                        )}>
                          {tx.type === 'tithe' ? 'Dízimo' : tx.type === 'event' ? 'Evento' : 'Oferta'}
                        </span>
                        {tx.modality && <span className="text-[9px] text-gray-400 mt-1 font-bold">{tx.modality}</span>}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm text-gray-500 font-medium">
                      {format(new Date(tx.date), "dd/MM/yyyy", { locale: ptBR })}
                    </td>
                    <td className="px-8 py-5 text-right font-mono font-bold text-gray-900">
                      R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-8 py-5 text-center">
                      {tx.attachmentUrl ? (
                        <a 
                          href={tx.attachmentUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[#5A5A40] hover:scale-110 transition-transform inline-block"
                        >
                          <Paperclip className="w-4 h-4" />
                        </a>
                      ) : (
                        <span className="text-gray-200"><Paperclip className="w-4 h-4" /></span>
                      )}
                    </td>
                    <td className="px-8 py-4 text-right">
                      <button className="p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white rounded-lg border border-transparent hover:border-gray-200">
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/20">
                <h4 className="text-xl font-bold">Novo Lançamento</h4>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-full transition-colors text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block px-1">Colaborador</label>
                  <input 
                    type="text" 
                    value={newTx.parishionerName}
                    onChange={e => setNewTx({...newTx, parishionerName: e.target.value})}
                    placeholder="Nome completo" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-[#5A5A40]/10 transition-all font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block px-1">Natureza</label>
                    <select 
                      value={newTx.type}
                      onChange={e => setNewTx({...newTx, type: e.target.value as any})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-[#5A5A40]/10 transition-all font-medium appearance-none"
                    >
                      <option value="tithe">Dízimo</option>
                      <option value="offering">Oferta</option>
                      <option value="event">Evento</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block px-1">Valor</label>
                    <input 
                      type="number" 
                      value={newTx.amount || ''}
                      onChange={e => setNewTx({...newTx, amount: Number(e.target.value)})}
                      placeholder="0.00" 
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-[#5A5A40]/10 transition-all font-mono font-bold"
                    />
                  </div>
                </div>

                {newTx.type === 'event' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block px-1">Modalidade / Evento</label>
                    <select 
                      value={newTx.modality}
                      onChange={e => setNewTx({...newTx, modality: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-[#5A5A40]/10 transition-all font-medium appearance-none"
                    >
                      <option value="">Selecione...</option>
                      {config?.paymentModalities?.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block px-1">Link do Comprovante</label>
                  <input 
                    type="text" 
                    value={newTx.attachmentUrl}
                    onChange={e => setNewTx({...newTx, attachmentUrl: e.target.value})}
                    placeholder="URL do arquivo recebido" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-[#5A5A40]/10 transition-all font-medium"
                  />
                </div>

                <button 
                  onClick={handleAdd}
                  className="w-full bg-[#5A5A40] text-white py-4 rounded-2xl font-bold hover:bg-[#4A4A35] transition-all mt-4 shadow-lg shadow-[#5A5A40]/20 active:scale-[0.98]"
                >
                  Registrar Entrada
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EventsView({ events }: { events: ChurchEvent[] }) {
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ChurchEvent | null>(null);
  const [selectedInstanceDate, setSelectedInstanceDate] = useState<string | null>(null);
  const [showRecurrenceChoice, setShowRecurrenceChoice] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('08:00');
  const [location, setLocation] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceDay, setRecurrenceDay] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title);
      setDate(format(new Date(editingEvent.date), 'yyyy-MM-dd'));
      setTime(format(new Date(editingEvent.date), 'HH:mm'));
      setLocation(editingEvent.location);
      setIsRecurring(!!editingEvent.isRecurring);
      setRecurrenceDay(editingEvent.recurrenceDay || 0);
      setShowAddModal(true);
    } else {
      setTitle('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setTime('08:00');
      setLocation('');
      setIsRecurring(false);
      setRecurrenceDay(0);
    }
  }, [editingEvent]);

  const handleSaveEvent = async (mode: 'all' | 'single' = 'all') => {
    if (!title) return;
    
    // If editing a recurring event and choice not yet made
    if (editingEvent?.isRecurring && !showRecurrenceChoice && mode === 'all') {
      setShowRecurrenceChoice(true);
      return;
    }

    setIsSaving(true);
    const eventData: Partial<ChurchEvent> = {
      title,
      date: `${date}T${time}:00`,
      location,
      description: '',
      isRecurring: mode === 'all' ? isRecurring : false,
      recurrenceDay: (mode === 'all' && isRecurring) ? recurrenceDay : undefined,
      recurrenceTime: (mode === 'all' && isRecurring) ? time : undefined
    };

    if (editingEvent?.id) {
       if (mode === 'single' && editingEvent.isRecurring && selectedInstanceDate) {
         // 1. Add current date to exceptions of the recurring series
         const exclusions = [...(editingEvent.excludedDates || []), selectedInstanceDate];
         await firestoreService.updateDocument('events', editingEvent.id, { excludedDates: exclusions });
         
         // 2. Create a new single event document
         await firestoreService.addDocument('events', {
           ...eventData,
           isRecurring: false,
           date: `${selectedInstanceDate}T${time}:00`
         } as ChurchEvent);
       } else {
         // Update existing document (series or single)
         await firestoreService.updateDocument('events', editingEvent.id, eventData);
       }
    } else {
      await firestoreService.addDocument('events', eventData as ChurchEvent);
    }

    setShowAddModal(false);
    setShowRecurrenceChoice(false);
    setEditingEvent(null);
    setSelectedInstanceDate(null);
    setIsSaving(false);
  };

  const handleDeleteEvent = async () => {
    if (!editingEvent?.id) return;
    if (confirm('Tem certeza que deseja excluir este evento?')) {
      setIsSaving(true);
      await firestoreService.deleteDocument('events', editingEvent.id);
      setShowAddModal(false);
      setEditingEvent(null);
      setIsSaving(false);
    }
  };

  const daysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= lastDate; i++) days.push(new Date(year, month, i));
    return days;
  };

  const getDayEvents = (d: Date) => {
    const dStr = format(d, 'yyyy-MM-dd');
    return events.filter(e => {
      if (e.isRecurring) {
        const matchesDay = e.recurrenceDay === d.getDay();
        const isExcluded = e.excludedDates?.includes(dStr);
        return matchesDay && !isExcluded;
      }
      return format(new Date(e.date), 'yyyy-MM-dd') === dStr;
    });
  };

  return (
    <div className="space-y-8 h-full flex flex-col">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-6">
          <header>
            <h3 className="text-2xl font-serif font-bold text-gray-900">Agenda Paroquial</h3>
            <p className="text-xs text-gray-500 font-medium">Gestão de horários e liturgia</p>
          </header>

          <div className="flex bg-gray-50 p-1 rounded-xl">
             {(['month', 'week', 'day'] as const).map(v => (
               <button 
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                  view === v ? "bg-white text-[#5A5A40] shadow-sm" : "text-gray-400 hover:text-gray-600"
                )}
               >
                 {v === 'month' ? 'Mensal' : v === 'week' ? 'Semanal' : 'Diário'}
               </button>
             ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl">
             <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 hover:bg-white rounded-lg transition-colors">
               <ChevronLeft className="w-4 h-4 text-[#5A5A40]" />
             </button>
             <span className="px-4 font-bold text-sm min-w-[140px] text-center">
               {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
             </span>
             <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 hover:bg-white rounded-lg transition-colors">
               <ChevronRight className="w-4 h-4 text-[#5A5A40]" />
             </button>
           </div>
           
           <button 
            onClick={() => { setEditingEvent(null); setShowAddModal(true); }}
            className="bg-[#5A5A40] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:shadow-lg transition-all"
           >
             <Plus className="w-5 h-5" /> Novo Evento
           </button>
        </div>
      </div>

      {view === 'month' && (
        <div className="flex-1 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
              <div key={d} className="py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">{d}</div>
            ))}
          </div>
          <div className="flex-1 grid grid-cols-7 overflow-y-auto">
            {daysInMonth(currentDate).map((d, i) => (
              <div key={i} className={cn(
                "min-h-[120px] p-2 border-r border-b border-gray-50 flex flex-col gap-1 transition-colors",
                !d ? "bg-gray-50/20" : "hover:bg-gray-50/50"
              )}>
                {d && (
                  <>
                    <span className={cn(
                      "text-xs font-bold mb-1 ml-1 w-6 h-6 flex items-center justify-center rounded-full",
                      format(d, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') 
                        ? "bg-[#5A5A40] text-white" 
                        : "text-gray-400"
                    )}>
                      {d.getDate()}
                    </span>
                    <div className="space-y-1">
                      {getDayEvents(d).map((ev, idx) => (
                        <button 
                          key={idx} 
                          onClick={() => {
                            setEditingEvent(ev);
                            if (ev.isRecurring) setSelectedInstanceDate(format(d, 'yyyy-MM-dd'));
                          }}
                          className={cn(
                            "w-full text-left px-2 py-1 rounded-md text-[9px] font-bold truncate border transition-all hover:scale-[1.02] active:scale-[0.98]",
                            ev.isRecurring 
                              ? "bg-purple-50 text-purple-700 border-purple-100" 
                              : "bg-emerald-50 text-emerald-700 border-emerald-100"
                          )}
                        >
                          {ev.isRecurring && <Clock className="w-2 h-2 inline mr-1" />}
                          {format(new Date(ev.date), 'HH:mm')} {ev.title}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {(view === 'week' || view === 'day') && (
        <div className="flex-1 bg-white rounded-3xl border border-gray-100 shadow-sm p-12 text-center flex flex-col items-center justify-center space-y-4">
           <div className="p-4 bg-[#5A5A40]/10 rounded-full">
             <Calendar className="w-12 h-12 text-[#5A5A40]" />
           </div>
           <h4 className="text-xl font-bold">Visão em Implementação</h4>
           <p className="text-gray-500 max-w-sm">Estamos otimizando as visões semanais e diárias para facilitar a escala litúrgica. Use a visão mensal por enquanto.</p>
           <button onClick={() => setView('month')} className="text-[#5A5A40] font-bold border-b-2 border-[#5A5A40]">Voltar para Mensal</button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-gray-100"
          >
            <header className="p-6 bg-[#5A5A40] text-white flex justify-between items-center">
              <div>
                <h4 className="text-xl font-serif font-bold">{editingEvent ? 'Editar Evento' : 'Agendar Evento'}</h4>
                <p className="text-[10px] text-white/70 uppercase tracking-widest font-black">
                  {editingEvent ? 'Alterar informações da agenda' : 'Adicionar à agenda paroquial'}
                </p>
              </div>
              <button onClick={() => { setShowAddModal(false); setEditingEvent(null); }} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <ChevronRight className="w-6 h-6 rotate-90" />
              </button>
            </header>

            <div className="p-8 space-y-6">
              {showRecurrenceChoice ? (
                <div className="space-y-6 animate-in fade-in zoom-in-95">
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm h-fit">
                      <Clock className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h5 className="font-bold text-blue-900">Evento Recorrente</h5>
                      <p className="text-xs text-blue-700 leading-relaxed">Você está editando uma atividade fixa. Deseja aplicar as alterações em toda a série ou apenas no dia {selectedInstanceDate && format(new Date(selectedInstanceDate + 'T12:00:00'), 'dd/MM')}?</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <button 
                      onClick={() => handleSaveEvent('single')}
                      className="w-full p-4 bg-white border-2 border-gray-100 rounded-2xl hover:border-[#5A5A40] hover:bg-gray-50 transition-all text-left group"
                    >
                      <span className="block font-bold text-gray-900 group-hover:text-[#5A5A40]">Apenas este dia</span>
                      <span className="block text-[10px] text-gray-500 uppercase font-black tracking-widest mt-1">Cria uma exceção na série</span>
                    </button>
                    
                    <button 
                      onClick={() => handleSaveEvent('all')}
                      className="w-full p-4 bg-[#5A5A40] text-white rounded-2xl hover:bg-[#4A4A35] transition-all text-left shadow-lg shadow-[#5A5A40]/10"
                    >
                      <span className="block font-bold">Toda a série</span>
                      <span className="block text-[10px] text-white/70 uppercase font-black tracking-widest mt-1">Atualiza todos os domingos (ou dia fixo)</span>
                    </button>
                    
                    <button 
                      onClick={() => setShowRecurrenceChoice(false)}
                      className="w-full py-3 text-sm font-bold text-gray-400 hover:text-gray-600"
                    >
                      Voltar para edição
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block px-1">Título do Evento</label>
                    <input 
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ex: Missa Solene, Reunião de Pastorais..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-[#5A5A40]/10"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block px-1">Data / Início</label>
                  <input 
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block px-1">Horário</label>
                  <input 
                    type="time"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block px-1">Local</label>
                <input 
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="Ex: Matriz, Capela, Salão Paroquial..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none"
                />
              </div>

              <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-2xl border border-purple-100">
                <input 
                  type="checkbox" 
                  id="recurring"
                  checked={isRecurring}
                  onChange={e => setIsRecurring(e.target.checked)}
                  className="accent-[#5A5A40] w-5 h-5"
                />
                <label htmlFor="recurring" className="flex-1 text-sm font-bold text-purple-900 cursor-pointer">
                  Evento Recorrente (Atividade Fixa)
                  <span className="block text-[10px] font-medium opacity-70">Repetir semanalmente no mesmo dia/hora</span>
                </label>
              </div>

              {isRecurring && (
                <div className="animate-in fade-in slide-in-from-top-2">
                   <label className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block px-1 mb-2">Dia da Semana</label>
                   <div className="grid grid-cols-7 gap-1">
                      {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setRecurrenceDay(i)}
                          className={cn(
                            "py-2 rounded-lg text-xs font-black transition-all border",
                            recurrenceDay === i 
                              ? "bg-purple-600 text-white border-purple-600 shadow-md" 
                              : "bg-white text-purple-400 border-purple-200 hover:bg-purple-50"
                          )}
                        >
                          {d}
                        </button>
                      ))}
                   </div>
                </div>
              )}

              <div className="flex gap-3">
                {editingEvent && (
                  <button 
                    onClick={handleDeleteEvent}
                    disabled={isSaving}
                    className="flex-1 border-2 border-red-100 text-red-500 py-4 rounded-xl font-bold hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                  >
                    Excluir
                  </button>
                )}
                <button 
                  onClick={() => handleSaveEvent()}
                  disabled={isSaving}
                  className="flex-[2] bg-[#5A5A40] text-white py-4 rounded-xl font-bold hover:bg-[#4A4A35] transition-all flex items-center justify-center gap-2 shadow-xl shadow-[#5A5A40]/20"
                >
                  {isSaving ? <Clock className="w-4 h-4 animate-spin" /> : editingEvent ? <Smartphone className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {isSaving ? 'Salvando...' : editingEvent ? 'Salvar Alterações' : 'Confirmar Agendamento'}
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
      )}
    </div>
  );
}

function ReportsView({ transactions, parishioners }: { transactions: Transaction[], parishioners: Parishioner[] }) {
  const last3Months = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 2);
    d.setDate(1);
    return transactions.filter(t => new Date(t.date) >= d);
  }, [transactions]);

  const totalTrimestre = last3Months.reduce((acc, t) => acc + t.amount, 0);

  const last6Months = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = format(d, 'MMM', { locale: ptBR });
      const amount = transactions
        .filter(t => {
          const td = new Date(t.date);
          return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
        })
        .reduce((acc, t) => acc + t.amount, 0);
      months.push({ month: label, amount });
    }
    return months;
  }, [transactions]);

  return (
    <div className="space-y-8">
      <header>
        <h3 className="text-3xl font-serif font-bold text-gray-900">Relatórios Administrativos</h3>
        <p className="text-gray-500">Inteligência de dados para suporte à pastoral.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-10">
            <h4 className="text-xl font-bold">Histórico de Contribuições</h4>
            <div className="text-sm font-medium text-gray-400">Últimos 6 meses</div>
          </div>
          <div className="flex-1 min-h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={last6Months}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748B'}} />
                 <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748B'}} />
                 <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                 <Line type="monotone" dataKey="amount" stroke="#5A5A40" strokeWidth={4} dot={{ r: 6, fill: '#5A5A40', strokeWidth: 2, stroke: '#fff' }} />
               </LineChart>
             </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-10 rounded-3xl shadow-2xl text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-10 scale-150 rotate-12 transition-transform group-hover:rotate-0">
            <Sparkles className="w-32 h-32" />
          </div>
          
          <div className="flex justify-between items-start mb-16 relative z-10">
            <div>
              <p className="text-[#5A5A40] font-black uppercase text-[10px] tracking-[0.2em] mb-2">Relatório Executivo</p>
              <h4 className="text-3xl font-serif font-medium">Análise ParoquIA</h4>
            </div>
            <div className="w-12 h-12 bg-[#5A5A40] rounded-2xl flex items-center justify-center">
              <FileSearch className="w-6 h-6" />
            </div>
          </div>

          <div className="space-y-10 relative z-10">
            <div className="flex justify-between items-end border-b border-white/5 pb-6">
              <span className="text-gray-400 text-sm font-medium">Receita Consolidada (90 dias)</span>
              <span className="text-2xl font-mono font-bold">R$ {totalTrimestre.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between items-end border-b border-white/5 pb-6">
              <span className="text-gray-400 text-sm font-medium">Novos Paroquianos Inscritos</span>
              <span className="text-2xl font-mono font-bold text-emerald-400">{parishioners.length}</span>
            </div>
            <div className="flex justify-between items-end border-b border-white/5 pb-6">
              <span className="text-gray-400 text-sm font-medium">Lançamentos Processados</span>
              <span className="text-2xl font-mono font-bold">{transactions.filter((t: Transaction) => t.isProcessed).length}</span>
            </div>
          </div>

          <button className="w-full mt-16 bg-white text-[#1A1A1A] py-5 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-[#F3F4F1] transition-all relative z-10 active:scale-[0.98]">
            Gerar Diagnóstico Pastoral <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
