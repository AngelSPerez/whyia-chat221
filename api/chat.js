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
        // 2. Leemos el prompt del usuario
        const userPrompt = req.body.prompt;
        
        // 3. Obtenemos el modelo (¡Con tu versión correcta!)
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        
        const result = await model.generateContent(userPrompt);
        const response = await result.response;
        const text = response.text();

        // 4. Enviamos la respuesta de vuelta al frontend
        res.status(200).json({ reply: text });

    } catch (error) {
        console.error(error);
        res.status(500).json({ reply: 'Error al procesar la solicitud de la IA.' });
    }
}