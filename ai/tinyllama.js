import { pipeline } from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1";

let generator = null;

export async function loadLLM() {
  if (generator) return;
  
  try {
    generator = await pipeline(
      "text-generation",
      "Xenova/distilgpt2",
      {
        quantized: true,
        progress_callback: p => {
          if (p.status === 'progress') {
            console.log(`Descargando: ${p.file} - ${Math.round(p.progress)}%`);
          }
        }
      }
    );
    console.log("✅ Modelo cargado correctamente");
  } catch (error) {
    console.error("❌ Error cargando modelo:", error);
    throw error;
  }
}

export async function askOffline(prompt, history = []) {
  await loadLLM();
  
  // Construir contexto conversacional
  let context = "The following is a conversation with an AI assistant.\n\n";
  const recentHistory = history.slice(-4);
  
  for (const msg of recentHistory) {
    if (msg.role === "user") {
      context += `Human: ${msg.text}\n`;
    } else if (msg.role === "ia") {
      context += `AI: ${msg.text}\n`;
    }
  }
  
  context += `Human: ${prompt}\nAI:`;
  
  const out = await generator(context, {
    max_new_tokens: 120,
    temperature: 0.8,
    do_sample: true,
    top_k: 50,
    top_p: 0.95,
    repetition_penalty: 1.2
  });
  
  let reply = out[0].generated_text;
  
  // Extraer solo la última respuesta del AI
  if (reply.includes("AI:")) {
    const aiParts = reply.split("AI:");
    reply = aiParts[aiParts.length - 1].trim();
  }
  
  // Limpiar respuesta (cortar en saltos de línea múltiples o "Human:")
  reply = reply.split("\n\n")[0].split("Human:")[0].trim();
  
  return reply || "Lo siento, no pude generar una respuesta.";
}
