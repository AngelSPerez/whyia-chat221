import { askOffline } from "./tinyllama.js"; // O el nombre que uses

export async function askAI(prompt, history = []) {
  // 🟢 NETWORK FIRST → Intentar backend primero
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, history }),
      signal: AbortSignal.timeout(10000)
    });
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const data = await res.json();
    return data.reply;
    
  } catch (error) {
    console.warn("⚠️ Backend no disponible, usando modo offline:", error.message);
    return await askOffline(prompt, history);
  }
}
