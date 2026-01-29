import OpenAI from 'openai';

// ============================================
// CONFIGURACIÓN
// ============================================

const ALLOWED_ORIGINS = [
  'https://angelsperez.github.io',
  'https://whyia-chat221.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:5500'
];

// Rate limiting
const requestLog = new Map();
const MAX_REQUESTS = 5;
const TIME_WINDOW = 60000;

// ============================================
// CLIENTES GROQ
// ============================================

function getVisionClient() {
  if (!process.env.GROQ_API_KEY_2) {
    throw new Error('GROQ_API_KEY_2 no configurada');
  }
  
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY_2,
    baseURL: 'https://api.groq.com/openai/v1',
  });
}

function getTextClient() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY no configurada');
  }
  
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  });
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

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

function validateBase64Image(base64String) {
  try {
    if (!base64String || typeof base64String !== 'string') {
      return { valid: false, error: 'No se recibió imagen válida' };
    }

    const matches = base64String.match(/^data:image\/(png|jpg|jpeg|gif|webp);base64,(.+)$/);
    if (!matches) {
      return { valid: false, error: 'Formato de imagen inválido. Usa PNG, JPG, GIF o WEBP' };
    }

    const imageType = matches[1];
    const base64Data = matches[2];

    const sizeInBytes = (base64Data.length * 3) / 4;
    const sizeInMB = sizeInBytes / (1024 * 1024);

    if (sizeInMB > 5) {
      return { 
        valid: false, 
        error: `Imagen demasiado grande (${sizeInMB.toFixed(2)}MB). Máximo: 5MB` 
      };
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
// PROCESAMIENTO LLAMA DUO
// ============================================

async function processLlamaDuo(imageBase64, userPrompt) {
  const visionClient = getVisionClient();
  const textClient = getTextClient();
  
  // ──────────────────────────────────────────
  // PASO 1: DESCRIPCIÓN DE IMAGEN CON LLAMA-4-SCOUT
  // ──────────────────────────────────────────
  console.log('📸 LLaMA Duo 1 (Scout): Generando descripción...');
  
  try {
    const descriptionResponse = await visionClient.chat.completions.create({
      model: 'llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'system',
          content: 'Eres un asistente experto en análisis visual. Describe imágenes de forma extremadamente detallada. Incluye: personas, objetos, acciones, escenarios, colores, expresiones, contexto. Sé específico. NO hagas análisis ni interpretaciones. SOLO describe objetivamente.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Describe con máximo detalle todos los elementos visibles en esta imagen.'
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
      temperature: 0.3,
      max_tokens: 2000
    });

    const imageDescription = descriptionResponse.choices[0].message.content;
    console.log('✅ Descripción generada:', imageDescription.substring(0, 100) + '...');
    
    // ──────────────────────────────────────────
    // PASO 2: ANÁLISIS CON LLAMA-3.3-70B
    // ──────────────────────────────────────────
    console.log('🧠 LLaMA Duo 2 (70B): Procesando solicitud...');
    
    const finalPrompt = userPrompt 
      ? `DESCRIPCIÓN DE LA IMAGEN:
${imageDescription}

SOLICITUD DEL USUARIO:
${userPrompt}

Responde a la solicitud del usuario basándote ÚNICAMENTE en la descripción de la imagen.`
      : `DESCRIPCIÓN DE LA IMAGEN:
${imageDescription}

El usuario ha enviado una imagen sin comentarios. Proporciona un resumen claro de lo que muestra la imagen.`;

    const analysisResponse = await textClient.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'Eres un asistente que analiza descripciones detalladas de imágenes. Responde de forma precisa y útil basándote únicamente en la descripción proporcionada.'
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
    console.error('❌ Error en procesamiento:', error);
    
    // Manejar errores específicos de Groq
    if (error.status === 429) {
      throw new Error('El servicio está saturado. Intenta en unos segundos.');
    }
    
    if (error.status === 401) {
      throw new Error('Error de autenticación con el servicio.');
    }
    
    if (error.message?.includes('vision') || error.message?.includes('scout')) {
      throw new Error('El modelo de visión no está disponible temporalmente.');
    }
    
    throw new Error(`Error al procesar: ${error.message || 'Error desconocido'}`);
  }
}

// ============================================
// HANDLER PRINCIPAL
// ============================================

export default async function handler(req, res) {
  // CORS
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
      error: 'Método no permitido. Usa POST.' 
    });
  }

  // Rate Limiting
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || 
             req.headers['x-real-ip'] || 
             req.socket?.remoteAddress || 
             'unknown';

  if (!checkRateLimit(ip)) {
    return res.status(429).json({ 
      success: false,
      error: 'Demasiadas peticiones. Espera un minuto antes de enviar otra imagen.' 
    });
  }

  // Procesamiento
  try {
    console.log('🔄 Nueva petición de imagen desde:', ip);
    
    const { imageBase64, prompt } = req.body;

    // Validar que se envió imagen
    if (!imageBase64) {
      return res.status(400).json({ 
        success: false,
        error: 'No se recibió ninguna imagen. Incluye "imageBase64" en el body.' 
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

    console.log(`📊 Imagen válida: ${validation.imageType}, ${validation.size}MB`);
    console.log(`📝 Prompt: ${prompt || '(sin prompt)'}`);

    // Verificar API keys
    if (!process.env.GROQ_API_KEY_2) {
      console.error('❌ GROQ_API_KEY_2 no configurada (modelo de visión)');
      return res.status(500).json({ 
        success: false,
        error: 'Servicio de visión no configurado correctamente.' 
      });
    }

    if (!process.env.GROQ_API_KEY) {
      console.error('❌ GROQ_API_KEY no configurada (modelo de texto)');
      return res.status(500).json({ 
        success: false,
        error: 'Servicio de análisis no configurado correctamente.' 
      });
    }

    // Ejecutar LLaMA Duo
    const result = await processLlamaDuo(imageBase64, prompt || '');

    // Respuesta exitosa
    return res.status(200).json({
      success: true,
      reply: result.response
    });

  } catch (error) {
    console.error('💥 Error en handler:', error);
    
    // Respuestas específicas por tipo de error
    if (error.message?.includes('saturado') || error.message?.includes('429')) {
      return res.status(429).json({ 
        success: false,
        error: 'El servicio está saturado. Intenta de nuevo en unos segundos.' 
      });
    }
    
    if (error.message?.includes('autenticación')) {
      return res.status(500).json({ 
        success: false,
        error: 'Error de configuración del servicio.' 
      });
    }
    
    // Error genérico
    return res.status(500).json({ 
      success: false,
      error: error.message || 'Error al procesar la imagen. Inténtalo de nuevo.' 
    });
  }
}
