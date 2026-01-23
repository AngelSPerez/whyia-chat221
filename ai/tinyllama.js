import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1";

// Configurar para descargar desde HuggingFace
env.allowLocalModels = false;
env.allowRemoteModels = true;

let generator = null;

export async function loadLLM() {
  if (generator) return;
  
  try {
    generator = await pipeline(
      "text-generation",
      "onnx-community/Qwen2.5-0.5B-Instruct", // ✅ ESTE MODELO SÍ FUNCIONA
      {
        quantized: true,
        progress_callback: p => {
          if (p.status === 'progress') {
            console.log(`📥 Descargando ${p.file}: ${Math.round(p.progress || 0)}%`);
          } else if (p.status === 'done') {
            console.log(`✅ ${p.file} listo`);
          } else {
            console.log("📦 Iniciando descarga:", p.file);
          }
        }
      }
    );
    console.log("🎉 Modelo DistilGPT-2 cargado correctamente");
  } catch (error) {
    console.error("❌ Error cargando modelo:", error);
    throw error;
  }
}

export async function askOffline(prompt, history = []) {
  await loadLLM();
  
  // Construir contexto
  let context = "";
  const recentHistory = history.slice(-4); // Últimos 2 intercambios
  
  for (const msg of recentHistory) {
    if (msg.role === "user") {
      context += `Q: ${msg.text}\n`;
    } else if (msg.role === "ia") {
      context += `A: ${msg.text}\n`;
    }
  }
  
  context += `Q: ${prompt}\nA:`;
  
  try {
    const out = await generator(context, {
      max_new_tokens: 100,
      temperature: 0.7,
      do_sample: true,
      top_k: 50,
      top_p: 0.9,
      repetition_penalty: 1.1
    });
    
    let reply = out[0].generated_text;
    
    // Extraer solo la respuesta
    if (reply.includes("A:")) {
      const parts = reply.split("A:");
      reply = parts[parts.length - 1].trim();
    }
    
    // Limpiar
    reply = reply.split("\n")[0].split("Q:")[0].trim();
    
    return reply || "No pude generar una respuesta.";
  } catch (error) {
    console.error("Error generando respuesta:", error);
    return "Error en modo offline.";
  }
}
