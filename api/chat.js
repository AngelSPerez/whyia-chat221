import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

const ALLOWED_ORIGINS = [
  'https://angelsperez.github.io',
  'https://whyia-chat221.vercel.app'
];

// Rate Limiting: almacena peticiones por IP
const requestLog = new Map();
const MAX_REQUESTS = 10; // Máximo 10 peticiones
const TIME_WINDOW = 60000; // Por minuto

function checkRateLimit(ip) {
  const now = Date.now();
  const userRequests = requestLog.get(ip) || [];
  
  const recentRequests = userRequests.filter(timestamp => now - timestamp < TIME_WINDOW);
  
  if (recentRequests.length >= MAX_REQUESTS) {
    return false;
  }
  
  recentRequests.push(now);
  requestLog.set(ip, recentRequests);
  
  return true;
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ reply: 'Método no permitido' });
  }

  // Rate Limiting: obtener IP del usuario
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
             req.headers['x-real-ip'] || 
             req.socket.remoteAddress || 
             'unknown';

  if (!checkRateLimit(ip)) {
    return res.status(429).json({ 
      reply: 'Has excedido el límite de peticiones. Por favor espera un momento antes de intentar nuevamente.' 
    });
  }

  try {
    const { prompt: userPrompt, history: incomingHistory } = req.body;

    if (!userPrompt) {
      return res.status(400).json({ reply: 'No se recibió ningún prompt.' });
    }

    const messages = (incomingHistory || []).map(msg => ({
      role: msg.role === 'ia' ? 'assistant' : 'user',
      content: msg.text
    }));
    messages.push({ role: 'user', content: userPrompt });

    const completion = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: messages,
      temperature: 0.7,
      max_tokens: 4096, // ✅ Aumentado
      stream: false
    });

    const text = completion.choices[0].message.content;
    res.status(200).json({ reply: text });
    
  } catch (error) {
    console.error("Error en Groq:", error);
    
    // Manejo especial para rate limit de Groq
    if (error.status === 429) {
      return res.status(429).json({ 
        reply: 'El servicio está temporalmente saturado. Por favor intenta en unos segundos.' 
      });
    }
    
    res.status(500).json({ reply: 'Error interno: ' + error.message });
  }
}
