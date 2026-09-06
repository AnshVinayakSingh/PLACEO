import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ChatCanvas } from './components/ChatCanvas';
import { ChatSession, Message } from './types/chat';
import { CHATGPT_MODELS } from './data/constants';
import { streamAIChatResponse } from './services/aiService';

export const App: React.FC = () => {
  const [selectedModelId, setSelectedModelId] = useState<string>('vaxgard-coder');

  // Load chat sessions from localStorage
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('vaxgard_chatgpt_sessions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    return sessions[0]?.id || '';
  });

  const [isOpenMobileSidebar, setIsOpenMobileSidebar] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    localStorage.setItem('vaxgard_chatgpt_sessions', JSON.stringify(sessions));
  }, [sessions]);

  const currentSession = sessions.find(s => s.id === currentSessionId);
  const currentMessages = currentSession?.messages || [];

  const handleNewChat = () => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: 'New Chat',
      messages: [],
      createdAt: Date.now(),
      personaId: 'vaxgard-core',
      model: selectedModelId,
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
  };

  const handleDeleteSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) {
      const remaining = sessions.filter(s => s.id !== id);
      setCurrentSessionId(remaining[0]?.id || '');
    }
  };

  const handleSendMessage = async (text: string) => {
    let sessionId = currentSessionId;
    let targetSession = currentSession;

    if (!sessionId || !targetSession) {
      const newSession: ChatSession = {
        id: `session-${Date.now()}`,
        title: text.slice(0, 26) + (text.length > 26 ? '...' : ''),
        messages: [],
        createdAt: Date.now(),
        personaId: 'vaxgard-core',
        model: selectedModelId,
      };
      setSessions(prev => [newSession, ...prev]);
      sessionId = newSession.id;
      setCurrentSessionId(sessionId);
      targetSession = newSession;
    }

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const updatedMessages = [...(targetSession?.messages || []), userMessage];

    const updatedTitle = targetSession.messages.length === 0
      ? text.slice(0, 26) + (text.length > 26 ? '...' : '')
      : targetSession.title;

    setSessions(prev =>
      prev.map(s =>
        s.id === sessionId
          ? { ...s, title: updatedTitle, messages: updatedMessages }
          : s
      )
    );

    setIsStreaming(true);

    const assistantMsgId = `msg-asst-${Date.now()}`;
    const initialAssistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };

    setSessions(prev =>
      prev.map(s =>
        s.id === sessionId
          ? { ...s, messages: [...updatedMessages, initialAssistantMsg] }
          : s
      )
    );

    const activeModel = CHATGPT_MODELS.find(m => m.id === selectedModelId);
    const modelParam = activeModel?.modelParam || 'qwen-coder';

    try {
      await streamAIChatResponse(updatedMessages, modelParam, (chunk) => {
        setSessions(prev =>
          prev.map(s => {
            if (s.id !== sessionId) return s;
            const msgs = s.messages.map(m =>
              m.id === assistantMsgId ? { ...m, content: chunk } : m
            );
            return { ...s, messages: msgs };
          })
        );
      });
    } catch (err) {
      console.error('Streaming error:', err);
    } finally {
      setIsStreaming(false);
      setSessions(prev =>
        prev.map(s => {
          if (s.id !== sessionId) return s;
          const msgs = s.messages.map(m =>
            m.id === assistantMsgId ? { ...m, isStreaming: false } : m
          );
          return { ...s, messages: msgs };
        })
      );
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#212121] text-slate-100 font-sans">
      {/* ChatGPT Sidebar */}
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={setCurrentSessionId}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        isOpenMobile={isOpenMobileSidebar}
        onCloseMobile={() => setIsOpenMobileSidebar(false)}
        onOpenSettings={() => {}}
      />

      {/* Main Canvas */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header
          onOpenMobileSidebar={() => setIsOpenMobileSidebar(true)}
          selectedModelId={selectedModelId}
          onSelectModel={setSelectedModelId}
          onNewChat={handleNewChat}
        />
        <ChatCanvas
          messages={currentMessages}
          onSendMessage={handleSendMessage}
          isStreaming={isStreaming}
        />
      </div>
    </div>
  );
};

export default App;
