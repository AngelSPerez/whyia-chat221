import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1";

env.allowLocalModels = false;
env.allowRemoteModels = true;

let generator = null;

export async function loadLLM() {
  if (generator) return;
  
  try {
    // Lista de modelos en orden de preferencia
    const models = [
      "Xenova/LaMini-Flan-T5-783M",      // ✅ Chat, multilingüe
      "Xenova/gpt2",                      // ✅ Fallback confiable
      "Xenova/distilgpt2"                 // ✅ Último recurso
    ];
    
    for (const modelName of models) {
      try {
        console.log(`🔄 Intentando cargar ${modelName}...`);
        generator = await pipeline(
          "text2text-generation",  // Mejor para chat que text-generation
          modelName,
          {
            quantized: true,
            progress_callback: p => {
              if (p.status === 'progress' && p.progress) {
                console.log(`📥 ${p.file}: ${Math.round(p.progress)}%`);
              }
            }
          }
        );
        console.log(`✅ Modelo ${modelName} cargado exitosamente`);
        break;
      } catch (err) {
        console.warn(`⚠️ ${modelName} falló, probando siguiente...`);
        continue;
      }
    }
    
    if (!generator) throw new Error("No se pudo cargar ningún modelo");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    throw error;
  }
}

export async function askOffline(prompt, history = []) {
  await loadLLM();
  
  // Construir contexto conversacional
  let context = "Eres WhyAI, un asistente amigable creado por Angel Salinas Perez de WhyStore. Responde de forma breve y concisa.\n\n";
  
  const recentHistory = history.slice(-4);
  for (const msg of recentHistory) {
    if (msg.role === "user") {
      context += `Usuario: ${msg.text}\n`;
    } else if (msg.role === "ia") {
      context += `Asistente: ${msg.text}\n`;
    }
  }
  
  context += `Usuario: ${prompt}\nAsistente:`;
  
  try {
    const out = await generator(context, {
      max_length: 200,
      temperature: 0.7,
      top_k: 50,
      top_p: 0.9,
      do_sample: true
    });
    
    let reply = out[0].generated_text || out[0].translation_text || "";
    
    // Limpiar respuesta
    reply = reply.replace(context, "").trim();
    reply = reply.split("Usuario:")[0].split("\n\n")[0].trim();
    
    return reply || "Lo siento, no pude generar una respuesta.";
    
  } catch (error) {
    console.error("Error generando:", error);
    return "Error en modo offline.";
  }
}
