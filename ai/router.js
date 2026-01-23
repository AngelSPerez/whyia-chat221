import { askOffline } from "./tinyllama.js";

export async function askAI(prompt) {
  // 🟢 NETWORK FIRST → Intentar Groq (backend) primero
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
      signal: AbortSignal.timeout(10000) // Timeout de 10 segundos
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const data = await res.json();
    return data.reply;
    
  } catch (error) {
    // 🔴 FALLBACK → Si falla el backend, usar TinyLlama local
    console.warn("Backend falló, usando modo offline:", error.message);
    return await askOffline(prompt);
  }
}
