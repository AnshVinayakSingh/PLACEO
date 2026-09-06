export type Role = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  personaId: string;
  model: string;
}

export interface AIPersona {
  id: string;
  name: string;
  iconName: string;
  description: string;
  systemPrompt: string;
  badge?: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  isFree?: boolean;
  contextWindow: string;
}

export interface Settings {
  apiKey: string;
  customEndpoint: string;
  selectedModel: string;
  selectedPersona: string;
  temperature: number;
  streamResponse: boolean;
  languageMode: 'hinglish' | 'english';
}
