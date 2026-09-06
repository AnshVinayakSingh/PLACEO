import { Message } from '../types/chat';

/**
 * Fullstack AI Driver for VaxGard AI
 * Connects directly to VaxGard Express Server (/api/chat) for zero-CORS server-side execution.
 */
export async function streamAIChatResponse(
  messages: Message[],
  modelParam: string = 'qwen-coder',
  onChunk: (chunk: string) => void
): Promise<string> {
  const lastUserMessage = messages[messages.length - 1]?.content || '';

  // 1. Send request to our Express Backend Server (/api/chat)
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, model: modelParam })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.response) {
        await simulateTokenStream(data.response, onChunk);
        return data.response;
      }
    }
  } catch (err) {
    console.warn('Backend route call failed, attempting direct fetch:', err);
  }

  // 2. Direct client-side fetch (for local dev mode)
  try {
    const promptText = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
    const encodedPrompt = encodeURIComponent(`System: You are VaxGard AI created by Ansh Vinayak Singh.\n${promptText}`);
    const url = `https://text.pollinations.ai/${encodedPrompt}?model=${modelParam}`;
    const directRes = await fetch(url);
    if (directRes.ok) {
      const text = await directRes.text();
      if (text && text.trim()) {
        await simulateTokenStream(text.trim(), onChunk);
        return text.trim();
      }
    }
  } catch (err) {
    console.error('Direct fetch failed:', err);
  }

  const errorMsg = "Unable to process response right now. Please refresh and try again.";
  await simulateTokenStream(errorMsg, onChunk);
  return errorMsg;
}

async function simulateTokenStream(text: string, onChunk: (chunk: string) => void) {
  const words = text.split(' ');
  let current = '';
  for (let i = 0; i < words.length; i++) {
    current += (i === 0 ? '' : ' ') + words[i];
    onChunk(current);
    await new Promise(r => setTimeout(r, 12));
  }
}
