import OpenAI from 'openai';

// Configuración para usar Groq a través de la librería de OpenAI
const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

// Dominios permitidos para CORS
const ALLOWED_ORIGINS = [
  'https://angelsperez.github.io',
  'https://whyia-chat221.vercel.app'
];

export default async function handler(req, res) {
  // Verificar el origen de la petición
  const origin = req.headers.origin;
  
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  // Manejar preflight requests (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ reply: 'Método no permitido' });
  }

  try {
    const { prompt: userPrompt, history: incomingHistory } = req.body;

    if (!userPrompt) {
      return res.status(400).json({ reply: 'No se recibió ningún prompt.' });
    }

    // Preparamos los mensajes
    const messages = (incomingHistory || []).map(msg => ({
      role: msg.role === 'ia' ? 'assistant' : 'user',
      content: msg.text
    }));
    messages.push({ role: 'user', content: userPrompt });

    // Hacemos la petición a Groq
    const completion = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: messages,
      temperature: 0.7,
      max_tokens: 1024,
      stream: false
    });

    const text = completion.choices[0].message.content;
    res.status(200).json({ reply: text });
    
  } catch (error) {
    console.error("Error en Groq:", error);
    res.status(500).json({ reply: 'Error interno: ' + error.message });
  }
}
