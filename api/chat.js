// Importamos la IA de Google
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Creamos el cliente de IA usando la clave secreta
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

// Esta es la función principal que Vercel ejecutará
export default async function handler(req, res) {
    // 1. Solo permitimos peticiones POST
    if (req.method !== 'POST') {
        return res.status(405).json({ reply: 'Método no permitido' });
    }

    try {
        // --- ¡CAMBIOS AQUÍ! ---
        
        // 2. Leemos el prompt Y EL HISTORIAL del usuario
        const { prompt: userPrompt, history: incomingHistory } = req.body;

        if (!userPrompt) {
            return res.status(400).json({ reply: 'No se recibió ningún prompt.' });
        }

        // 3. Obtenemos el modelo
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // 4. Mapeamos el historial del frontend al formato que espera la API
        // La API usa "user" (igual) y "model" (en lugar de "ia")
        const mappedHistory = (incomingHistory || []).map(msg => ({
            role: msg.role === 'ia' ? 'model' : 'user', // Convertimos 'ia' a 'model'
            parts: [{ text: msg.text }]
        }));

        // 5. Iniciamos una sesión de chat con el historial
        const chat = model.startChat({
            history: mappedHistory,
        });

        // 6. Enviamos el nuevo mensaje dentro de esa sesión de chat
        const result = await chat.sendMessage(userPrompt);
        
        // --- FIN DE LOS CAMBIOS ---
        
        const response = await result.response;
        const text = response.text();

        // 7. Enviamos la respuesta de vuelta al frontend
        res.status(200).json({ reply: text });

    } catch (error) {
        console.error(error);
        res.status(500).json({ reply: 'Error al procesar la solicitud de la IA.' });
    }
}
