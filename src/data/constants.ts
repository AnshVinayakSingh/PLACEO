export interface AIPersona {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
}

export interface AIModel {
  id: string;
  name: string;
  badge?: string;
  description: string;
  modelParam: string;
}

export const CREATOR_NAME = "Ansh Vinayak Singh";
export const AI_BRAND_NAME = "VaxGard AI";
export const AI_SLOGAN = "Build. Scan. Secure.";

export const CHATGPT_MODELS: AIModel[] = [
  {
    id: 'vaxgard-4o',
    name: 'VaxGard 4o',
    badge: 'Fast & Smart',
    description: 'Our most intelligent model for everyday coding & reasoning.',
    modelParam: 'openai',
  },
  {
    id: 'vaxgard-coder',
    name: 'VaxGard Coder (Qwen 2.5)',
    badge: 'Best for Code',
    description: 'SOTA Open-Source model specialized in programming & debugging.',
    modelParam: 'qwen-coder',
  },
  {
    id: 'vaxgard-deepseek',
    name: 'VaxGard DeepSeek R1',
    badge: 'Reasoning',
    description: 'Advanced open-source reasoning engine for complex logic.',
    modelParam: 'deepseek-r1',
  },
  {
    id: 'vaxgard-mistral',
    name: 'VaxGard Mistral 7B',
    badge: 'Open Source',
    description: 'Lightweight, ultra-fast open-source model.',
    modelParam: 'mistral',
  }
];

export const CHATGPT_QUICK_PROMPTS = [
  {
    icon: 'Code2',
    title: 'Write code & scripts',
    prompt: 'Write a complete, responsive React + Tailwind CSS dashboard layout with sidebar, stats cards, and data table.',
  },
  {
    icon: 'Bug',
    title: 'Debug & fix code',
    prompt: 'Explain common memory leaks in React useEffect and how to prevent them with clean code examples.',
  },
  {
    icon: 'BookOpen',
    title: 'Hinglish tech lesson',
    prompt: 'Samjha do ki Promises, Async/Await aur Event Loop JavaScript me kaise kaam karta hai simple Hinglish me.',
  },
  {
    icon: 'Lightbulb',
    title: 'Architect fullstack app',
    prompt: 'Design a high-level system architecture for a scalable real-time chat application with WebSockets and Redis.',
  }
];
