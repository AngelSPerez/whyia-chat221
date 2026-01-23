import { pipeline } from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1";

let generator = null;

export async function loadLLM() {
  if (generator) return;
  generator = await pipeline(
    "text-generation",
    "Xenova/tinyllama-1.1b-chat",
    {
      quantized: true,
      progress_callback: p => {
        console.log("Descargando modelo TinyLlama:", p);
      }
    }
  );
}

export async function askOffline(prompt, history = []) {
  await loadLLM();
  
  // Construir contexto con historial (últimos 3 mensajes para no saturar)
  let context = "";
  const recentHistory = history.slice(-6); // Últimos 3 intercambios (user + ia)
  
  for (const msg of recentHistory) {
    if (msg.role === "user") {
      context += `Usuario: ${msg.text}\n`;
    } else if (msg.role === "ia") {
      context += `Asistente: ${msg.text}\n`;
    }
  }
  
  context += `Usuario: ${prompt}\nAsistente:`;
  
  const out = await generator(context, {
    max_new_tokens: 150, // Aumentado para respuestas más completas
    temperature: 0.7,
    do_sample: true,
    top_k: 50,
    top_p: 0.9
  });
  
  // Extraer solo la respuesta del asistente
  let reply = out[0].generated_text;
  
  // Limpiar la respuesta (quitar el contexto que devuelve)
  if (reply.includes("Asistente:")) {
    reply = reply.split("Asistente:").pop().trim();
  }
  
  return reply;
}
