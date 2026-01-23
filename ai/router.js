import { askOffline } from "./tinyllama.js";

export async function askAI(prompt) {
  // 🟢 ONLINE → Groq (backend)
  if (navigator.onLine) {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });

    const data = await res.json();
    return data.reply;
  }

  // 🔴 OFFLINE → TinyLlama local
  return await askOffline(prompt);
}
