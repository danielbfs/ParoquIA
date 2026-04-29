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
  type: 'tithe' | 'offering';
  amount: number;
  date: string;
  parishionerId?: string;
  parishionerName?: string;
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
}

export interface UserProfile {
  id?: string;
  email: string;
  role: 'admin' | 'staff';
  name: string;
}

export interface SystemConfig {
  id?: string;
  parishName: string;
  aiPrompt: string;
  evolutionApiUrl?: string;
  evolutionApiKey?: string;
  evolutionInstanceName?: string;
  updatedAt: string;
}
