import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, ShieldCheck, RefreshCw, Code2, Bug, BookOpen, Lightbulb } from 'lucide-react';
import { Message } from '../types/chat';
import { CodeBlock } from './CodeBlock';
import { CHATGPT_QUICK_PROMPTS, AI_BRAND_NAME, AI_SLOGAN } from '../data/constants';

interface ChatCanvasProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isStreaming: boolean;
}

const quickIconMap: Record<string, React.ReactNode> = {
  Code2: <Code2 className="w-5 h-5 text-indigo-400" />,
  Bug: <Bug className="w-5 h-5 text-rose-400" />,
  BookOpen: <BookOpen className="w-5 h-5 text-amber-400" />,
  Lightbulb: <Lightbulb className="w-5 h-5 text-emerald-400" />,
};

export const ChatCanvas: React.FC<ChatCanvasProps> = ({
  messages,
  onSendMessage,
  isStreaming,
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const renderFormattedMessage = (content: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <p key={`text-${lastIndex}`} className="whitespace-pre-wrap leading-relaxed">
            {content.substring(lastIndex, match.index)}
          </p>
        );
      }

      const language = match[1] || 'typescript';
      const code = match[2].trim();

      parts.push(
        <CodeBlock key={`code-${match.index}`} language={language} code={code} />
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push(
        <p key={`text-${lastIndex}`} className="whitespace-pre-wrap leading-relaxed">
          {content.substring(lastIndex)}
        </p>
      );
    }

    return parts.length > 0 ? parts : <p className="whitespace-pre-wrap leading-relaxed">{content}</p>;
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] bg-[#212121] overflow-hidden relative">
      {/* Scrollable Message Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.length === 0 ? (
          /* ChatGPT Hero Opening Screen */
          <div className="max-w-2xl mx-auto my-auto pt-16 text-center space-y-8 animate-in fade-in duration-300">
            <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-10 h-10" />
            </div>

            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                What can I help with today?
              </h1>
              <p className="text-emerald-400 font-semibold text-sm mt-1">
                {AI_SLOGAN}
              </p>
            </div>

            {/* Quick Prompt Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              {CHATGPT_QUICK_PROMPTS.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(qp.prompt)}
                  className="p-4 rounded-2xl bg-[#2f2f2f]/60 hover:bg-[#2f2f2f] border border-[#3f3f3f]/50 transition text-xs sm:text-sm text-slate-300 hover:text-white flex flex-col justify-between h-28 group"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-slate-200">{qp.title}</span>
                    {quickIconMap[qp.icon]}
                  </div>
                  <p className="text-slate-400 text-xs line-clamp-2">{qp.prompt}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Active Chat Rows */
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-4 ${
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {/* Assistant Avatar */}
                {m.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                )}

                {/* Message Content */}
                <div
                  className={`max-w-[88%] rounded-2xl p-4 text-sm sm:text-base leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[#2f2f2f] text-white rounded-br-none'
                      : 'bg-transparent text-slate-200'
                  }`}
                >
                  {renderFormattedMessage(m.content)}
                </div>

                {/* User Avatar */}
                {m.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 flex-shrink-0 font-bold text-xs">
                    U
                  </div>
                )}
              </div>
            ))}

            {/* Streaming Indicator */}
            {isStreaming && (
              <div className="flex gap-3 items-center text-xs text-emerald-400 font-mono animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{AI_BRAND_NAME} is thinking & generating response...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ChatGPT Input Box */}
      <div className="p-3 sm:p-4 bg-[#212121] border-t border-[#2f2f2f]">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative flex items-center bg-[#2f2f2f] border border-[#3f3f3f] rounded-3xl p-1.5 focus-within:border-slate-500 transition shadow-xl">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${AI_BRAND_NAME}...`}
            rows={1}
            disabled={isStreaming}
            className="w-full bg-transparent text-white placeholder-slate-400 rounded-2xl pl-4 pr-12 py-2.5 text-sm sm:text-base focus:outline-none resize-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="p-2 bg-white text-black disabled:opacity-30 hover:bg-slate-200 rounded-full transition shadow"
          >
            <ArrowUp className="w-4 h-4 stroke-[3]" />
          </button>
        </form>

        <div className="text-[11px] text-slate-500 text-center mt-2">
          {AI_BRAND_NAME} can make mistakes. Verify important info.
        </div>
      </div>
    </div>
  );
};
