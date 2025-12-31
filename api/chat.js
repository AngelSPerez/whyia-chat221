// 1. Importamos la librería oficial de OpenAI
import OpenAI from 'openai';

// 2. Creamos el cliente usando la variable de entorno
// Asegúrate de llamar a tu variable OPENAI_API_KEY en Vercel
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
    // Solo permitimos peticiones POST
    if (req.method !== 'POST') {
        return res.status(405).json({ reply: 'Método no permitido' });
    }

    try {
        // Leemos el prompt y el historial
        const { prompt: userPrompt, history: incomingHistory } = req.body;

        if (!userPrompt) {
            return res.status(400).json({ reply: 'No se recibió ningún prompt.' });
        }

        // --- CAMBIOS CLAVE PARA OPENAI ---

        // 3. Mapeamos el historial.
        // OpenAI usa roles: "user" y "assistant" (en vez de "model").
        // OpenAI usa contenido directo en "content" (no usa "parts").
        const messages = (incomingHistory || []).map(msg => ({
            role: msg.role === 'ia' ? 'assistant' : 'user', 
            content: msg.text
        }));

        // 4. Agregamos el prompt actual del usuario al final de la lista de mensajes
        // A diferencia de Gemini que usa .sendMessage, en OpenAI enviamos todo junto.
        messages.push({
            role: 'user',
            content: userPrompt
        });

        // 5. Hacemos la petición a OpenAI
        const completion = await openai.chat.completions.create({
            model: "gpt-4o", // O usa "gpt-3.5-turbo" si quieres algo más barato
            messages: messages,
        });

        // 6. Extraemos la respuesta
        const text = completion.choices[0].message.content;

        // --- FIN DE LOS CAMBIOS ---

        // Enviamos la respuesta
        res.status(200).json({ reply: text });

    } catch (error) {
        console.error("Error en OpenAI:", error);
        res.status(500).json({ reply: 'Error al procesar la solicitud con OpenAI.' });
    }
}
