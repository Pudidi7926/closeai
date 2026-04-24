/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Groq from 'groq-sdk';
import { 
  Plus, 
  MessageSquare, 
  Send, 
  User, 
  Bot, 
  Trash2, 
  Settings, 
  Menu, 
  X, 
  Sparkles,
  Search,
  History,
  MoreVertical,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Paperclip,
  Globe,
  Layout,
  Download,
  FolderOpen,
  Import,
  PaperclipIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { cn } from './lib/utils';
import { Message, Conversation, UserPreferences, Project } from './types';
import { Canvas } from './components/Canvas';
import { ProjectManager } from './components/ProjectManager';
import { ImportModal } from './components/ImportModal';

const INITIAL_SYSTEM_INSTRUCTION = (prefs: UserPreferences) => {
  let modeInstruction = "";
  switch(prefs.aiMode) {
    case 'fast': modeInstruction = "Focus on extreme speed and brevity. Brief and direct answers."; break;
    case 'math': modeInstruction = "Focus on logic, precision, and step-by-step mathematical or logical reasoning. Ensure accuracy over speed."; break;
    case 'critical': modeInstruction = "Focus on deep analysis, philosophical depth, and looking at problems from multiple critical perspectives."; break;
    default: modeInstruction = "Maintain a helpful and balanced tone.";
  }

  return `You are "${prefs.personaName || 'Close AI'}", a highly intelligent, empathetic, and sophisticated digital assistant powered by Llama models from GroqCloud.
The user is ${prefs.userName}. Your speaking style is ${prefs.speakingStyle || 'casual'}.
AI Mode Active: ${prefs.aiMode.toUpperCase()}. ${modeInstruction}
${prefs.customInstructions ? `Additional Instructions: ${prefs.customInstructions}` : ''}
Always try to be helpful and accurate. If you generate large chunks of code, documents, or UI, wrap them in specialized markdown blocks if they are intended for a "Canvas" or "Artifact" view (e.g. \`\`\`html or \`\`\`markdown).
You are "Close AI". Always maintain your identity.`;
};

export default function App() {
  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [preferences, setPreferences] = useState<UserPreferences>({
    userName: 'Teman',
    theme: 'light',
    speakingStyle: 'casual',
    personaName: 'Close AI',
    customInstructions: '',
    aiMode: 'fast'
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showImport, setShowImport] = useState(false);
  
  // File & Link State
  const [attachments, setAttachments] = useState<Message['attachments']>([]);
  const [isFetchingLinks, setIsFetchingLinks] = useState(false);

  // Canvas State
  const [canvasData, setCanvasData] = useState<{ content: string; type: any; isOpen: boolean }>({
    content: '',
    type: 'markdown',
    isOpen: false
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Persistence
  useEffect(() => {
    const saved = {
      convo: localStorage.getItem('close_ai_conversations'),
      projects: localStorage.getItem('close_ai_projects'),
      prefs: localStorage.getItem('close_ai_preferences')
    };
    if (saved.convo) setConversations(JSON.parse(saved.convo));
    if (saved.projects) setProjects(JSON.parse(saved.projects));
    if (saved.prefs) setPreferences(JSON.parse(saved.prefs));
  }, []);

  useEffect(() => {
    localStorage.setItem('close_ai_conversations', JSON.stringify(conversations));
    localStorage.setItem('close_ai_projects', JSON.stringify(projects));
    localStorage.setItem('close_ai_preferences', JSON.stringify(preferences));
  }, [conversations, projects, preferences]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, activeId, isLoading]);

  // Handlers
  const activeConversation = conversations.find(c => c.id === activeId);
  const displayedConversations = activeProjectId 
    ? conversations.filter(c => c.projectId === activeProjectId)
    : conversations;

  const createNewChat = () => {
    const newId = Date.now().toString();
    const newConvo: Conversation = {
      id: newId,
      title: 'Percakapan Baru',
      messages: [],
      projectId: activeProjectId || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setConversations([newConvo, ...conversations]);
    setActiveId(newId);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newAttachments = await Promise.all(acceptedFiles.map(async file => {
      return new Promise<NonNullable<Message['attachments']>[number]>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file',
            url: e.target?.result as string,
            mimeType: file.type,
            name: file.name
          });
        };
        reader.readAsDataURL(file);
      });
    }));
    setAttachments([...(attachments || []), ...newAttachments]);
  }, [attachments]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({ 
    onDrop,
    noClick: true,
    accept: { 'image/*': [], 'video/*': [], 'application/pdf': [], 'text/*': [] }
  });

  const extractLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };

  const handleSend = async () => {
    if ((!inputText.trim() && (!attachments || attachments.length === 0)) || isLoading) return;

    let currentConvoId = activeId;
    if (!currentConvoId) {
      const newId = Date.now().toString();
      const newConvo: Conversation = {
        id: newId,
        title: inputText.slice(0, 30) || 'Lampiran Baru',
        messages: [],
        projectId: activeProjectId || undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setConversations([newConvo, ...conversations]);
      setActiveId(newId);
      currentConvoId = newId;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText,
      timestamp: Date.now(),
      attachments: attachments
    };

    setConversations(prev => prev.map(c => 
      c.id === currentConvoId 
        ? { 
            ...c, 
            messages: [...c.messages, userMsg],
            title: c.messages.length === 0 ? (inputText.slice(0, 30) || 'Lampiran Baru') : c.title,
            updatedAt: Date.now() 
          } 
        : c
    ));

    const finalInput = inputText;
    setInputText('');
    setAttachments([]);
    setIsLoading(true);

    try {
      const links = extractLinks(finalInput);
      let contextFromLinks = "";

      if (links.length > 0) {
        setIsFetchingLinks(true);
        const linkResults = await Promise.all(links.map(async url => {
          try {
            const res = await axios.post('/api/fetch-link', { url });
            return `--- CONTENT FROM ${url} ---\nTitle: ${res.data.title}\n${res.data.content}\n--- END ---`;
          } catch (e) { return `--- FAILED TO FETCH ${url} ---`; }
        }));
        contextFromLinks = "\n\n" + linkResults.join("\n\n");
        setIsFetchingLinks(false);
      }

      const groq = new Groq({
        apiKey: process.env.GROQ_API_KEY,
        dangerouslyAllowBrowser: true,
      });

      const currentConvo = conversations.find(c => c.id === currentConvoId);
      
      const messages: any[] = [
        { role: 'system', content: INITIAL_SYSTEM_INSTRUCTION(preferences) }
      ];

      currentConvo?.messages.forEach(m => {
        const content: any[] = [{ type: 'text', text: m.content }];
        m.attachments?.forEach(at => {
          if (at.type === 'image') {
            content.push({
              type: 'image_url',
              image_url: { url: at.url }
            });
          }
        });
        messages.push({ role: m.role === 'model' ? 'assistant' : 'user', content });
      });

      // Add current message
      const currentContent: any[] = [{ type: 'text', text: finalInput + contextFromLinks }];
      userMsg.attachments?.forEach(at => {
        if (at.type === 'image') {
          currentContent.push({
            type: 'image_url',
            image_url: { url: at.url }
          });
        }
      });
      messages.push({ role: 'user', content: currentContent });

      // Retry Logic
      let chatCompletion;
      let retries = 0;
      const MAX_RETRIES = 3;
      
      // Select model based on presence of images or requested mode
      const hasImages = messages.some(m => Array.isArray(m.content) && m.content.some((c: any) => c.type === 'image_url'));
      const model = hasImages ? 'llama-3.2-11b-vision-preview' : 'llama-3.3-70b-versatile';

      while (retries < MAX_RETRIES) {
        try {
          chatCompletion = await groq.chat.completions.create({
            messages: messages,
            model: model,
            temperature: preferences.aiMode === 'math' ? 0.1 : (preferences.aiMode === 'critical' ? 1.0 : 0.7),
            max_completion_tokens: 4096,
            top_p: 1,
            stop: null,
            stream: false,
          });
          break; 
        } catch (e: any) {
          retries++;
          if (retries >= MAX_RETRIES || !e.message?.includes('503')) throw e;
          await new Promise(r => setTimeout(r, Math.pow(2, retries - 1) * 1000));
        }
      }

      if (!chatCompletion) throw new Error("Gagal mendapatkan respon dari Groq.");

      const aiText = chatCompletion.choices[0]?.message?.content || '';
      
      // Check for code/html for canvas
      if (aiText.includes('```html') || aiText.includes('```markdown') || aiText.includes('<!DOCTYPE html>')) {
        const match = aiText.match(/```(html|markdown|code|text)\n([\s\S]*?)```/) || aiText.match(/(<!DOCTYPE html>[\s\S]*?<\/html>)/);
        if (match) {
          setCanvasData({
            content: match[2] || match[1],
            type: match[1] === '<!DOCTYPE html>' ? 'html' : (match[1] || 'html'),
            isOpen: true
          });
        }
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: aiText,
        timestamp: Date.now(),
      };

      setConversations(prev => prev.map(c => 
        c.id === currentConvoId 
          ? { ...c, messages: [...c.messages, aiMsg], updatedAt: Date.now() } 
          : c
      ));
    } catch (error: any) {
      console.error('Error:', error);
      let friendlyError = `Terjadi kesalahan sistem: ${error.message || 'Unknown error'}.`;
      
      if (error.message?.includes('503') || error.message?.includes('high demand') || error.message?.includes('rate_limit')) {
        friendlyError = "Layanan sedang sibuk atau mencapai batas. AI akan otomatis mencoba kembali atau silakan kirim ulang pesan Anda.";
      }

      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: friendlyError,
        timestamp: Date.now(),
      };
      setConversations(prev => prev.map(c => 
        c.id === currentConvoId 
          ? { ...c, messages: [...c.messages, errorMsg], updatedAt: Date.now() } 
          : c
      ));
    } finally {
      setIsLoading(false);
      setIsFetchingLinks(false);
    }
  };

  const handleImport = (imported: Conversation[]) => {
    const withIds = imported.map(c => ({
      ...c,
      id: c.id || Date.now().toString() + Math.random(),
      messages: c.messages || [],
      createdAt: c.createdAt || Date.now(),
      updatedAt: c.updatedAt || Date.now()
    }));
    setConversations([...withIds, ...conversations]);
    if (withIds[0]) setActiveId(withIds[0].id);
  };

  return (
    <div className={cn(
      "flex h-screen w-full transition-all duration-500 font-sans",
      preferences.theme === 'light' ? "bg-[#FBF9F6] text-[#333333]" : "bg-[#111111] text-[#E0E0E0]"
    )}>
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-350 ease-[cubic-bezier(0.25,1,0.5,1)] lg:relative lg:translate-x-0 w-[300px]",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        preferences.theme === 'light' ? "bg-[#F3F0E9] border-r border-[#E5E0D5]" : "bg-[#181818] border-r border-[#222]"
      )}>
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <div className="bg-[#D97757] p-2 rounded-2xl shadow-sm">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-extrabold text-xl font-serif tracking-tight">{preferences.personaName}</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-black/5 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 mb-6">
          <button 
            onClick={createNewChat}
            className="flex items-center justify-center gap-3 w-full p-4 rounded-3xl bg-[#D97757] hover:bg-[#C06040] text-white font-bold text-sm transition-all shadow-md active:scale-[0.98]"
          >
            <Plus className="w-5 h-5" />
            Percakapan Baru
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-8 custom-scrollbar">
          <ProjectManager 
            projects={projects}
            activeProjectId={activeProjectId}
            onSelectProject={setActiveProjectId}
            onCreateProject={() => {
              const name = prompt('Nama Proyek:');
              if(name) {
                const newProj: Project = { id: Date.now().toString(), name, conversationIds: [], createdAt: Date.now() };
                setProjects([...projects, newProj]);
              }
            }}
            onDeleteProject={(id) => {
              setProjects(projects.filter(p => p.id !== id));
              setConversations(conversations.map(c => c.projectId === id ? { ...c, projectId: undefined } : c));
              if(activeProjectId === id) setActiveProjectId(null);
            }}
          />

          <div className="space-y-2">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 px-2">Riwayat</h3>
            {displayedConversations.map(convo => (
              <div
                key={convo.id}
                onClick={() => {
                  setActiveId(convo.id);
                  if (window.innerWidth < 1024) setIsSidebarOpen(false);
                }}
                className={cn(
                  "group flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all",
                  activeId === convo.id 
                    ? "bg-[#D97757] text-white shadow-lg shadow-orange-500/10" 
                    : "hover:bg-black/5 dark:hover:bg-white/5"
                )}
              >
                <MessageSquare className="w-4 h-4 shrink-0 opacity-60" />
                <span className="flex-1 text-sm font-semibold truncate">{convo.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const updated = conversations.filter(c => c.id !== convo.id);
                    setConversations(updated);
                    if (activeId === convo.id) setActiveId(null);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-black/10 rounded-lg transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-black/5 flex flex-col gap-2">
          <button onClick={() => setShowImport(true)} className="flex items-center gap-3 w-full p-3 rounded-2xl hover:bg-black/5 transition-colors text-sm font-bold">
            <Import className="w-5 h-5 opacity-60" /> Impor JSON
          </button>
          <button onClick={() => setShowSettings(true)} className="flex items-center gap-3 w-full p-3 rounded-2xl hover:bg-black/5 transition-colors text-sm font-bold">
            <Settings className="w-5 h-5 opacity-60" /> Pengaturan
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="relative flex flex-col flex-1 h-full min-w-0" {...getRootProps()}>
        <input {...getInputProps()} />
        <header className="flex items-center justify-between px-6 py-4 border-b border-black/5 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 lg:hidden"><Menu className="w-6 h-6" /></button>
            <div className="flex flex-col">
              <h2 className="font-bold text-lg font-serif">{activeConversation?.title || 'Selamat Datang'}</h2>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Groq Llama 3 Active</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center bg-black/5 dark:bg-white/5 rounded-2xl p-1 gap-1 border border-black/5">
              {[
                { id: 'fast', label: 'Cepat', icon: '⚡' },
                { id: 'math', label: 'Matematis', icon: '🔢' },
                { id: 'critical', label: 'Kritis', icon: '🧠' }
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setPreferences({ ...preferences, aiMode: m.id as any })}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                    preferences.aiMode === m.id ? "bg-[#D97757] text-white shadow-sm" : "text-gray-500 hover:bg-black/5"
                  )}
                >
                  <span className="mr-1.5">{m.icon}</span>
                  {m.label}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setCanvasData(p => ({ ...p, isOpen: !p.isOpen }))}
              className={cn("p-2 rounded-xl transition-all", canvasData.isOpen ? "bg-[#D97757] text-white shadow-md" : "hover:bg-black/5")}
            >
              <Layout className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 rounded-full bg-[#D97757] border-2 border-white shadow-sm flex items-center justify-center text-white font-black italic">
              {preferences.userName[0]}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-12 space-y-12 custom-scrollbar">
          {!activeConversation || activeConversation.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-3xl mx-auto py-12">
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <Bot className="w-20 h-20 text-[#D97757] mb-8" />
              </motion.div>
              <h3 className="text-4xl lg:text-5xl font-black font-serif italic mb-4">Bagaimana saya bisa membantu?</h3>
              <p className="text-gray-500 text-lg font-medium max-w-xl mx-auto leading-relaxed">
                Halo {preferences.userName}, saya {preferences.personaName}. Silakan ajukan pertanyaan, bagikan file, atau kirimkan link untuk saya analisis.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12 w-full">
                {[
                  "Analisis data finansial ini",
                  "Ringkas artikel dari link ini",
                  "Bantu saya coding fitur baru",
                  "Rencanakan strategi konten"
                ].map((s, i) => (
                  <button 
                    key={i} 
                    onClick={() => { setInputText(s); inputRef.current?.focus(); }}
                    className="p-6 text-left border border-black/5 bg-white/40 backdrop-blur-sm rounded-3xl hover:border-[#D97757] hover:bg-white hover:shadow-xl transition-all font-bold text-sm"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-10 pb-10">
              {activeConversation.messages.map((m) => (
                <div key={m.id} className={cn("flex gap-6", m.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                  <div className={cn(
                    "w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center text-white shadow-sm font-bold",
                    m.role === 'user' ? "bg-[#333]" : "bg-[#D97757]"
                  )}>
                    {m.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                  </div>
                  <div className={cn("flex flex-col gap-3", m.role === 'user' ? "items-end" : "items-start")}>
                    <div className={cn(
                      "p-6 rounded-[2rem] text-base leading-relaxed font-medium shadow-sm transition-all",
                      m.role === 'user' 
                        ? "bg-[#D97757] text-white rounded-tr-none" 
                        : (preferences.theme === 'light' ? "bg-white border border-black/5 rounded-tl-none" : "bg-[#1A1A1A] border border-[#222] rounded-tl-none")
                    )}>
                      {m.attachments && m.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {m.attachments.map((at, i) => (
                            <div key={i} className="relative group">
                              {at.type === 'image' ? (
                                <img src={at.url} alt="upload" className="w-32 h-32 object-cover rounded-2xl shadow-sm hover:scale-105 transition-transform" />
                              ) : at.type === 'video' ? (
                                <video src={at.url} className="w-32 h-32 object-cover rounded-2xl" />
                              ) : (
                                <div className="p-3 bg-white/20 rounded-xl flex items-center gap-2 backdrop-blur-sm">
                                  <Download className="w-4 h-4" /> <span className="text-xs truncate max-w-[80px]">{at.name}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="prose dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-[#222] prose-pre:rounded-2xl">
                        <ReactMarkdown>
                          {m.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {isLoading && (
            <div className="max-w-4xl mx-auto flex gap-6">
              <div className="w-10 h-10 rounded-2xl bg-[#D97757] flex items-center justify-center text-white shrink-0 animate-bounce">
                <Bot className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="px-6 py-4 bg-black/5 rounded-[2rem] rounded-tl-none animate-pulse text-sm font-bold text-gray-400">
                  {isFetchingLinks ? "Membaca Link..." : "Sedang berpikir..."}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Improved Input Area */}
        <div className="p-6 md:p-10">
          <div className="max-w-4xl mx-auto relative">
            <AnimatePresence>
              {isDragActive && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 bg-[#D97757]/10 backdrop-blur-sm border-2 border-[#D97757] border-dashed rounded-[2.5rem] flex items-center justify-center"
                >
                  <p className="text-[#D97757] font-black italic">Lepaskan untuk Mengunggah</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={cn(
              "flex flex-col gap-2 p-3 rounded-[2.5rem] shadow-2xl transition-all ring-1",
              preferences.theme === 'light' ? "bg-white ring-black/5" : "bg-[#1A1A1A] ring-white/10"
            )}>
              {attachments && attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2">
                  {attachments.map((at, i) => (
                    <div key={i} className="relative group">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-white/5 border border-black/5 group-hover:scale-105 transition-transform">
                        {at.type === 'image' ? <img src={at.url} className="w-full h-full object-cover" /> : <PaperclipIcon className="w-full h-full p-4 opacity-50" />}
                      </div>
                      <button 
                        onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex items-end gap-2 pr-2">
                <button 
                  onClick={() => open()}
                  className="p-4 hover:bg-black/5 rounded-full transition-colors"
                >
                  <Paperclip className="w-5 h-5 text-gray-400" />
                </button>
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    e.target.style.height = 'inherit';
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Ceritakan sesuatu atau ajukan pertanyaan..."
                  className="flex-1 bg-transparent border-none focus:ring-0 text-base py-3 px-2 max-h-64 custom-scrollbar font-sans font-medium"
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || (!inputText.trim() && (!attachments || attachments.length === 0))}
                  className={cn(
                    "p-4 rounded-full transition-all shadow-xl active:scale-90",
                    (inputText.trim() || (attachments && attachments.length > 0)) && !isLoading ? "bg-[#D97757] text-white" : "bg-black/10 text-gray-400"
                  )}
                >
                  <Send className="w-5 h-5 -translate-y-0.5 translate-x-0.5" />
                </button>
              </div>
            </div>
            <p className="text-[10px] text-center mt-4 text-gray-400 font-bold uppercase tracking-widest leading-loose">
              Didukung oleh Llama GroqCloud & Close AI Core. Semua data terenkripsi lokal.
            </p>
          </div>
        </div>
      </main>

      {/* Canvas Sidebar */}
      <AnimatePresence>
        {canvasData.isOpen && (
          <Canvas 
            isOpen={canvasData.isOpen}
            onClose={() => setCanvasData({ ...canvasData, isOpen: false })}
            content={canvasData.content}
            type={canvasData.type}
          />
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div onClick={() => setShowSettings(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={cn("relative w-full max-w-lg p-8 rounded-[2.5rem] shadow-2xl", preferences.theme === 'light' ? "bg-[#FBF9F6]" : "bg-[#1A1A1A]")}>
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-2xl font-serif font-black italic">Personalisasi AI</h3>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-black/5 rounded-full"><X className="w-6 h-6" /></button>
              </div>
              <div className="space-y-6 overflow-y-auto max-h-[70vh] px-2 custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Panggilan Anda</label>
                    <input type="text" value={preferences.userName} onChange={(e) => setPreferences({ ...preferences, userName: e.target.value })} className="w-full p-4 bg-black/5 border-none rounded-2xl font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Nama AI</label>
                    <input type="text" value={preferences.personaName} onChange={(e) => setPreferences({ ...preferences, personaName: e.target.value })} className="w-full p-4 bg-black/5 border-none rounded-2xl font-bold" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Gaya Bicara</label>
                  <div className="flex flex-wrap gap-2">
                    {['formal', 'casual', 'enthusiastic', 'concise', 'creative'].map(s => (
                      <button key={s} onClick={() => setPreferences({ ...preferences, speakingStyle: s as any })} className={cn("px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all", preferences.speakingStyle === s ? "bg-[#D97757] text-white" : "bg-black/5")}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Instruksi Kustom</label>
                  <textarea value={preferences.customInstructions} onChange={(e) => setPreferences({ ...preferences, customInstructions: e.target.value })} className="w-full p-4 bg-black/5 border-none rounded-2xl min-h-[100px] text-sm font-medium" placeholder="Contoh: Selalu menjawab dalam Bahasa Indonesia..." />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Mode AI</label>
                  <div className="flex gap-2">
                    {[
                      { id: 'fast', label: 'Cepat' },
                      { id: 'math', label: 'Matematis' },
                      { id: 'critical', label: 'Kritis' }
                    ].map(m => (
                      <button
                        key={m.id}
                        onClick={() => setPreferences({ ...preferences, aiMode: m.id as any })}
                        className={cn(
                          "flex-1 p-3 rounded-2xl text-xs font-bold uppercase transition-all",
                          preferences.aiMode === m.id ? "bg-[#D97757] text-white" : "bg-black/5"
                        )}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Tema</label>
                  <div className="flex gap-2">
                    {['light', 'dark'].map(t => (
                      <button key={t} onClick={() => setPreferences({ ...preferences, theme: t as any })} className={cn("flex-1 p-4 rounded-2xl font-bold uppercase text-xs", preferences.theme === t ? "bg-[#333] text-white" : "bg-black/5")}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => { if(confirm('Hapus semua chat?')) { setConversations([]); setProjects([]); setActiveId(null); setShowSettings(false); } }} className="w-full p-4 bg-red-500/10 text-red-500 font-bold rounded-2xl hover:bg-red-500 hover:text-white transition-all">Format Ulang Data</button>
              </div>
            </motion.div>
          </div>
        )}
        {showImport && <ImportModal onClose={() => setShowImport(false)} onImport={handleImport} />}
      </AnimatePresence>
    </div>
  );
}

