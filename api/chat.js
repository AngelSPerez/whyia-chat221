// 1. Seguimos usando la librería de OpenAI, pero conectaremos con Groq
import OpenAI from 'openai';

// 2. Configuración para Groq
const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY, // La nueva variable que pusiste en Vercel
  baseURL: 'https://api.groq.com/openai/v1', // <--- ESTO ES LO IMPORTANTE
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

        // 3. Mapeamos el historial (Igual que con OpenAI)
        const messages = (incomingHistory || []).map(msg => ({
            role: msg.role === 'ia' ? 'assistant' : 'user', 
            content: msg.text
        }));

        messages.push({
            role: 'user',
            content: userPrompt
        });

        // 4. Hacemos la petición a Groq
        const completion = await openai.chat.completions.create({
            // Usamos Llama 3, que es muy bueno y gratis en Groq
            model: "llama3-8b-8192", 
            messages: messages,
        });

        const text = completion.choices[0].message.content;

        res.status(200).json({ reply: text });

    } catch (error) {
        console.error("Error en Groq:", error);
        res.status(500).json({ reply: 'Error al procesar la solicitud.' });
    }
}
