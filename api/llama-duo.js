import OpenAI from 'openai';

// ============================================
// CONFIGURACIÓN DE MODELOS
// ============================================

const MODELS = {
  // Modelo 1: Visión (describe la imagen)
  DUO_1: {
    client: new OpenAI({
      apiKey: process.env.GROQ_API_KEY_2,
      baseURL: 'https://api.groq.com/openai/v1',
    }),
    model: 'llama-4-scout-17b-16e-instruct', // Modelo con capacidad de visión
    systemPrompt: `Eres un asistente experto en análisis visual. Tu única tarea es describir imágenes de forma extremadamente detallada y precisa.

INSTRUCCIONES ESTRICTAS:
1. Describe TODO lo que ves en la imagen sin omitir ningún detalle
2. Incluye: personas (edad aproximada, género, ropa, expresiones, posiciones), objetos (tamaños, colores, materiales, ubicación), acciones, escenarios, iluminación, colores dominantes, atmósfera, contexto
3. Sé específico con cantidades, posiciones relativas y características visuales
4. Organiza la descripción de forma lógica: primero el contexto general, luego los elementos principales, finalmente los detalles secundarios
5. NO hagas análisis, interpretaciones ni conclusiones
6. NO respondas preguntas del usuario
7. SOLO describe lo que ves objetivamente

Tu descripción será usada por otro modelo que no puede ver la imagen, así que debe ser completa y clara.`
  },

  // Modelo 2: Razonamiento (procesa la descripción)
  DUO_2: {
    client: new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1',
    }),
    model: 'llama-3.3-70b-versatile', // Modelo potente para análisis
    systemPrompt: `Eres un asistente inteligente que analiza descripciones detalladas de imágenes para responder preguntas o realizar tareas específicas.

IMPORTANTE:
- Recibirás una descripción textual EXTREMADAMENTE DETALLADA de una imagen
- Esta descripción ha sido generada por un modelo de visión que vio la imagen directamente
- Tu trabajo es usar ÚNICAMENTE esa descripción para responder la solicitud del usuario
- Sé preciso, útil y responde exactamente lo que el usuario pide
- Si la descripción no contiene información suficiente para responder, indícalo claramente
- Responde en el mismo idioma que el usuario utilizó en su pregunta`
  }
};

// ============================================
// CONFIGURACIÓN DE CORS Y RATE LIMITING
// ============================================

const ALLOWED_ORIGINS = [
  'https://angelsperez.github.io',
  'https://whyia-chat221.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:5500' // Para desarrollo local
];

const requestLog = new Map();
const MAX_REQUESTS = 5; // Máximo 5 imágenes por minuto (más restrictivo)
const TIME_WINDOW = 60000;

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

// ============================================
// VALIDACIÓN DE IMAGEN BASE64
// ============================================

function validateBase64Image(base64String) {
  try {
    // Verificar formato data:image/...;base64,...
    const matches = base64String.match(/^data:image\/(png|jpg|jpeg|gif|webp);base64,(.+)$/);
    if (!matches) {
      return { valid: false, error: 'Formato de imagen inválido' };
    }

    const imageType = matches[1];
    const base64Data = matches[2];

    // Calcular tamaño aproximado (Base64 aumenta ~33% el tamaño)
    const sizeInBytes = (base64Data.length * 3) / 4;
    const sizeInMB = sizeInBytes / (1024 * 1024);

    // Límite: 5MB
    if (sizeInMB > 5) {
      return { valid: false, error: `Imagen demasiado grande (${sizeInMB.toFixed(2)}MB). Máximo: 5MB` };
    }

    return { 
      valid: true, 
      imageType, 
      base64Data,
      size: sizeInMB.toFixed(2) 
    };
  } catch (error) {
    return { valid: false, error: 'Error al procesar la imagen' };
  }
}

// ============================================
// FUNCIÓN PRINCIPAL: PROCESAMIENTO LLAMA DUO
// ============================================

async function processLlamaDuo(imageBase64, userPrompt) {
  console.log('🔄 Iniciando LLaMA Duo...');
  
  // ──────────────────────────────────────────
  // PASO 1: GENERAR DESCRIPCIÓN DE LA IMAGEN
  // ──────────────────────────────────────────
  console.log('📸 Paso 1: Generando descripción de la imagen...');
  
  let imageDescription;
  try {
    const descriptionResponse = await MODELS.DUO_1.client.chat.completions.create({
      model: MODELS.DUO_1.model,
      messages: [
        {
          role: 'system',
          content: MODELS.DUO_1.systemPrompt
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Describe esta imagen con el máximo detalle posible siguiendo las instrucciones del sistema.'
            },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64
              }
            }
          ]
        }
      ],
      temperature: 0.3, // Baja temperatura para descripciones precisas
      max_tokens: 2000
    });

    imageDescription = descriptionResponse.choices[0].message.content;
    console.log('✅ Descripción generada:', imageDescription.substring(0, 150) + '...');
    
  } catch (error) {
    console.error('❌ Error en LLaMA Duo 1:', error);
    throw new Error(`Error al analizar la imagen: ${error.message}`);
  }

  // ──────────────────────────────────────────
  // PASO 2: PROCESAR LA DESCRIPCIÓN CON EL PROMPT DEL USUARIO
  // ──────────────────────────────────────────
  console.log('🧠 Paso 2: Procesando con LLaMA Duo 2...');
  
  try {
    // Construir el prompt combinando descripción + solicitud del usuario
    const finalPrompt = userPrompt 
      ? `DESCRIPCIÓN DE LA IMAGEN:
${imageDescription}

SOLICITUD DEL USUARIO:
${userPrompt}

Responde a la solicitud del usuario basándote ÚNICAMENTE en la descripción de la imagen proporcionada.`
      : `DESCRIPCIÓN DE LA IMAGEN:
${imageDescription}

El usuario ha enviado una imagen sin comentarios adicionales. Proporciona un resumen claro y útil de lo que muestra la imagen basándote en la descripción.`;

    const analysisResponse = await MODELS.DUO_2.client.chat.completions.create({
      model: MODELS.DUO_2.model,
      messages: [
        {
          role: 'system',
          content: MODELS.DUO_2.systemPrompt
        },
        {
          role: 'user',
          content: finalPrompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4096
    });

    const finalResponse = analysisResponse.choices[0].message.content;
    console.log('✅ Respuesta final generada');
    
    return {
      success: true,
      description: imageDescription,
      response: finalResponse
    };
    
  } catch (error) {
    console.error('❌ Error en LLaMA Duo 2:', error);
    throw new Error(`Error al procesar la solicitud: ${error.message}`);
  }
}

// ============================================
// HANDLER PRINCIPAL DE LA API
// ============================================

export default async function handler(req, res) {
  // ──── CORS ────
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
    return res.status(405).json({ 
      success: false,
      error: 'Método no permitido' 
    });
  }

  // ──── RATE LIMITING ────
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
             req.headers['x-real-ip'] || 
             req.socket.remoteAddress || 
             'unknown';

  if (!checkRateLimit(ip)) {
    return res.status(429).json({ 
      success: false,
      error: 'Has excedido el límite de procesamiento de imágenes. Espera un minuto antes de enviar otra.' 
    });
  }

  // ──── PROCESAMIENTO ────
  try {
    const { imageBase64, prompt } = req.body;

    // Validar que se envió una imagen
    if (!imageBase64) {
      return res.status(400).json({ 
        success: false,
        error: 'No se recibió ninguna imagen' 
      });
    }

    // Validar formato y tamaño
    const validation = validateBase64Image(imageBase64);
    if (!validation.valid) {
      return res.status(400).json({ 
        success: false,
        error: validation.error 
      });
    }

    console.log(`📊 Imagen recibida: ${validation.imageType}, ${validation.size}MB`);
    console.log(`📝 Prompt del usuario: ${prompt || '(sin prompt)'}`);

    // Ejecutar LLaMA Duo
    const result = await processLlamaDuo(imageBase64, prompt || '');

    // Devolver respuesta exitosa
    return res.status(200).json({
      success: true,
      reply: result.response,
      // Opcionalmente, devolver la descripción para debugging
      // description: result.description 
    });

  } catch (error) {
    console.error('💥 Error en handler:', error);
    
    // Manejo especial para rate limit de Groq
    if (error.status === 429) {
      return res.status(429).json({ 
        success: false,
        error: 'El servicio está temporalmente saturado. Intenta en unos segundos.' 
      });
    }
    
    return res.status(500).json({ 
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
}
