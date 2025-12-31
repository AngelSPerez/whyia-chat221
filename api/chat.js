import OpenAI from 'openai';

// Configuración para usar Groq a través de la librería de OpenAI
// Esto evita que tengas que instalar 'groq-sdk' y cambiar configuraciones complejas
const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY, 
  baseURL: 'https://api.groq.com/openai/v1', 
});

export default async function handler(req, res) {
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

        messages.push({
            role: 'user',
            content: userPrompt
        });

        // Hacemos la petición a Groq
        const completion = await openai.chat.completions.create({
            // ESTE es el modelo correcto y gratis que funciona hoy
            // El que tenías en tu ejemplo (gpt-oss-120b) a veces da error o no existe
            model: "llama-3.3-70b-versatile", 
            messages: messages,
            temperature: 0.7, // Creatividad equilibrada
            max_tokens: 1024,
            stream: false // IMPORTANTE: Falso para que funcione con tu frontend actual
        });

        const text = completion.choices[0].message.content;

        res.status(200).json({ reply: text });

    } catch (error) {
        console.error("Error en Groq:", error);
        // Esto te ayudará a ver en los logs de Vercel qué pasó si falla
        res.status(500).json({ reply: 'Error interno: ' + error.message });
    }
}
