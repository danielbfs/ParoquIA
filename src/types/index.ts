export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export interface Parish {
  id?: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface Parishioner {
  id?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Message {
  id?: string;
  platform: 'whatsapp' | 'instagram' | 'email';
  sender: string;
  role: 'user' | 'ai' | 'system';
  content: string;
  status: 'pending' | 'processed' | 'responded';
  aiCategory?: string;
  aiSentiment?: string;
  suggestedResponse?: string;
  critique?: string;
  createdAt: string;
}

export interface ConversationMeta {
  id?: string;
  sender: string;
  isAiEnabled: boolean;
  lastMessageAt: string;
}

export interface Critique {
  id?: string;
  messageId: string;
  originalContent: string;
  aiResponse: string;
  critique: string;
  createdAt: string;
}

export interface Transaction {
  id?: string;
  type: 'tithe' | 'offering' | 'donation' | 'event';
  amount: number;
  date: string;
  parishionerId?: string;
  parishionerName?: string;
  modality?: string;
  isProcessed?: boolean;
  attachmentUrl?: string;
  notes?: string;
}

export interface Event {
  id?: string;
  title: string;
  description?: string;
  date: string;
  location: string;
  isRecurring?: boolean;
  recurrenceDay?: number; // 0-6 (Sunday-Saturday)
  recurrenceTime?: string; // "HH:mm"
  excludedDates?: string[]; // Array of YYYY-MM-DD
  imageUrl?: string;       // imagem do evento
  startTime?: string;      // "HH:mm" - início
  endTime?: string;        // "HH:mm" - fim
  endDate?: string;        // data final (eventos de vários dias); `date` é a inicial
  allowDonation?: boolean; // habilita doação/pagamento (PIX) para este evento
}

export interface Work {
  id?: string;
  title: string;           // ex.: "Reforma do Lar dos Idosos"
  description?: string;
  imageUrl?: string;       // foto da obra/projeto
  status?: string;         // ex.: "Planejamento", "Em andamento", "Concluída"
  isActive?: boolean;      // exibir na landing (padrão: exibir)
  createdAt?: string;
}

export interface Community {
  id?: string;
  name: string;            // ex.: "Comunidade São José"
  address?: string;        // endereço da comunidade
  massSchedule?: string;   // horários de missa (texto livre, ex.: "Dom 8h e 19h")
  imageUrl?: string;       // foto da capela/comunidade
  isActive?: boolean;      // exibir na landing (padrão: exibir)
  order?: number;          // ordenação manual na landing (menor primeiro)
  createdAt?: string;
}

export interface UserProfile {
  id?: string;
  email: string;
  role: 'admin' | 'user';
  name: string;
  photoURL?: string;
  isAuthorized?: boolean;
}

export interface AuthorizedEmail {
  id?: string;
  email: string;
  role: 'admin' | 'user';
  addedBy?: string;
  createdAt: string;
}

export interface SystemConfig {
  id?: string;
  parishName: string;
  aiPrompt: string;
  evolutionApiUrl?: string;
  evolutionApiKey?: string;
  evolutionInstanceName?: string;
  updatedAt: string;
  paymentModalities?: string[];
  heroImageUrl?: string;   // imagem/logo da paróquia
  address?: string;        // endereço para contato
  phone?: string;          // telefone
  email?: string;          // e-mail exibido
  contactEmailTo?: string; // destino do formulário de contato
  pixKey?: string;         // chave PIX da paróquia (exibida nas doações de eventos)
  whatsappNumber?: string; // WhatsApp da paróquia (envio de comprovante)
  // Palavra do Pároco (exibida na landing)
  priestName?: string;     // nome do pároco
  priestRole?: string;     // cargo (ex.: "Pároco")
  priestPhotoUrl?: string; // foto do pároco
  priestMessage?: string;  // mensagem/palavra de boas-vindas
  // Localização
  mapEmbedUrl?: string;    // link do Google Maps (embed ou compartilhamento)
}

