import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve production static frontend build
app.use(express.static(path.join(__dirname, 'dist')));

// Server-side Approach 1 AI Execution Engine (Groq / OpenRouter / Gemini Provider)
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, apiKey, model = 'qwen-coder' } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const lastMsg = messages[messages.length - 1]?.content || '';
    const q = lastMsg.toLowerCase();

    // Identity Check
    const identityKeywords = ['who created you', 'who made you', 'who is your creator', 'who is your developer', 'kisne banaya hai', 'tumhe kisne banaya', 'who owns you'];
    if (identityKeywords.some(k => q.includes(k))) {
      return res.json({
        response: `I am **VaxGard AI**! 🛡️\n\n> **Slogan**: *Build. Scan. Secure.*\n> **Creator & Developer**: **Ansh Vinayak Singh**\n\nI am an advanced AI system engineered for fullstack software development, code generation, security scanning, and high-performance problem solving!`
      });
    }

    const systemPrompt = `You are VaxGard AI (Slogan: Build. Scan. Secure.), designed, engineered, and created by Ansh Vinayak Singh. Always be helpful, intelligent, concise, and provide complete, beautifully formatted code blocks when coding.`;

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ];

    // Priority 1: Groq API Key (If provided in request or Render env GROQ_API_KEY)
    const groqKey = apiKey || process.env.GROQ_API_KEY;
    if (groqKey) {
      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: apiMessages,
            temperature: 0.7,
            max_tokens: 4096
          })
        });

        if (groqRes.ok) {
          const data = await groqRes.json();
          const output = data.choices?.[0]?.message?.content;
          if (output) return res.json({ response: output });
        }
      } catch (err) {
        console.warn('Groq API Error:', err);
      }
    }

    // Priority 2: Gemini API Key (If provided in Render env GEMINI_API_KEY)
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: apiMessages.map(m => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }]
            }))
          })
        });

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return res.json({ response: text });
        }
      } catch (err) {
        console.warn('Gemini API Error:', err);
      }
    }

    // Priority 3: Server-side Open Source Provider Engine (Qwen 2.5 Coder / Llama 3.3)
    try {
      const pubRes = await fetch('https://text.pollinations.ai/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) VaxGard/1.0'
        },
        body: JSON.stringify({
          messages: apiMessages,
          model: model === 'vaxgard-4o' ? 'openai' : 'qwen-coder',
          seed: Math.floor(Math.random() * 1000000)
        })
      });

      if (pubRes.ok) {
        const text = await pubRes.text();
        if (text && text.trim()) return res.json({ response: text.trim() });
      }
    } catch (err) {
      console.warn('Pollinations POST error:', err);
    }

    // Secondary GET Server Call
    try {
      const promptEncoded = encodeURIComponent(lastMsg);
      const getRes = await fetch(`https://text.pollinations.ai/${promptEncoded}?model=qwen-coder`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      if (getRes.ok) {
        const text = await getRes.text();
        if (text && text.trim()) return res.json({ response: text.trim() });
      }
    } catch (err) {
      console.warn('Pollinations GET error:', err);
    }

    return res.status(500).json({ error: 'AI Engine unreachable right now.' });
  } catch (err) {
    console.error('VaxGard Server AI Error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`VaxGard AI Approach-1 Fullstack Server running on port ${PORT}`);
});
