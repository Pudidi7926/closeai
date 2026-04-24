/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  attachments?: {
    type: 'image' | 'video' | 'file';
    url: string;
    mimeType: string;
    name?: string;
  }[];
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  conversationIds: string[];
  createdAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  projectId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface UserPreferences {
  userName: string;
  theme: 'light' | 'dark' | 'system';
  speakingStyle: 'formal' | 'casual' | 'enthusiastic' | 'concise' | 'creative';
  personaName: string;
  customInstructions?: string;
  aiMode: 'fast' | 'math' | 'critical';
}
