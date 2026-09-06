import React from 'react';
import { Menu, ChevronDown, Sparkles, ShieldCheck, SquarePen } from 'lucide-react';
import { CHATGPT_MODELS } from '../data/constants';

interface HeaderProps {
  onOpenMobileSidebar: () => void;
  selectedModelId: string;
  onSelectModel: (id: string) => void;
  onNewChat: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileSidebar,
  selectedModelId,
  onSelectModel,
  onNewChat,
}) => {
  const currentModel = CHATGPT_MODELS.find(m => m.id === selectedModelId) || CHATGPT_MODELS[0];

  return (
    <header className="h-14 bg-[#212121] border-b border-[#2f2f2f] px-3 sm:px-4 flex items-center justify-between sticky top-0 z-30">
      {/* Left side */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden p-2 text-slate-300 hover:text-white rounded-lg hover:bg-[#2f2f2f] transition"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* ChatGPT Style Model Switcher Pill */}
        <div className="relative group">
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[#2f2f2f] text-slate-200 hover:text-white text-sm font-semibold transition">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{currentModel.name}</span>
            {currentModel.badge && (
              <span className="hidden sm:inline text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-normal border border-emerald-500/30">
                {currentModel.badge}
              </span>
            )}
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {/* Model Selector Dropdown */}
          <div className="absolute left-0 mt-1 w-72 bg-[#2f2f2f] border border-[#3f3f3f] rounded-xl shadow-2xl p-2 hidden group-hover:block z-50">
            <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
              Select VaxGard Model
            </div>
            {CHATGPT_MODELS.map(m => (
              <button
                key={m.id}
                onClick={() => onSelectModel(m.id)}
                className={`w-full text-left p-2.5 rounded-lg text-xs transition flex flex-col ${
                  m.id === selectedModelId
                    ? 'bg-[#212121] text-white font-medium border border-emerald-500/40'
                    : 'text-slate-300 hover:bg-[#212121]/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{m.name}</span>
                  {m.badge && (
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                      {m.badge}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-400 font-normal mt-0.5">
                  {m.description}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onNewChat}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow-md"
        >
          <SquarePen className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Chat</span>
        </button>
      </div>
    </header>
  );
};
