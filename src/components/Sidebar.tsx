import React from 'react';
import { SquarePen, MessageSquare, Trash2, ShieldCheck, X, User, Settings as SettingsIcon } from 'lucide-react';
import { ChatSession } from '../types/chat';
import { AI_BRAND_NAME, AI_SLOGAN } from '../data/constants';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  isOpenMobile,
  onCloseMobile,
  onOpenSettings,
}) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* ChatGPT-style Left Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 w-[260px] bg-[#171717] border-r border-[#2f2f2f] z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-white font-semibold text-sm">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="font-bold tracking-tight">{AI_BRAND_NAME}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                onNewChat();
                onCloseMobile();
              }}
              title="New Chat"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#212121] transition"
            >
              <SquarePen className="w-5 h-5" />
            </button>
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#212121]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* New Chat Big Button */}
        <div className="px-3 py-1">
          <button
            onClick={() => {
              onNewChat();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-between bg-[#212121] hover:bg-[#2f2f2f] text-slate-200 hover:text-white p-2.5 rounded-lg font-medium text-xs border border-[#2f2f2f] transition group"
          >
            <div className="flex items-center gap-2">
              <SquarePen className="w-4 h-4 text-emerald-400" />
              <span>New chat</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Ctrl K</span>
          </button>
        </div>

        {/* Slogan Badge */}
        <div className="mx-3 my-2 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 font-medium flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{AI_SLOGAN}</span>
        </div>

        {/* Chat History Section */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          <div className="px-3 py-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Recent Chats
          </div>
          {sessions.length === 0 ? (
            <p className="text-xs text-slate-500 italic px-3 py-4 text-center">
              No conversations yet
            </p>
          ) : (
            sessions.map(s => {
              const isActive = s.id === currentSessionId;
              return (
                <div
                  key={s.id}
                  className={`group flex items-center justify-between p-2 rounded-lg text-xs transition cursor-pointer ${
                    isActive
                      ? 'bg-[#212121] text-white font-medium'
                      : 'text-slate-400 hover:bg-[#212121]/60 hover:text-slate-200'
                  }`}
                  onClick={() => {
                    onSelectSession(s.id);
                    onCloseMobile();
                  }}
                >
                  <div className="flex items-center gap-2 truncate">
                    <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span className="truncate">{s.title || 'New Chat'}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(s.id);
                    }}
                    title="Delete Chat"
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 rounded transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Profile */}
        <div className="p-2 border-t border-[#2f2f2f] bg-[#171717]">
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[#212121] transition text-left text-xs"
          >
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="truncate">
                <div className="font-semibold text-slate-200 truncate">VaxGard Account</div>
                <div className="text-[10px] text-slate-500 truncate">Pro Version</div>
              </div>
            </div>
            <SettingsIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
          </button>
        </div>
      </aside>
    </>
  );
};
