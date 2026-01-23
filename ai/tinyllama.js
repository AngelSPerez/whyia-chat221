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

export async function askOffline(prompt) {
  await loadLLM();

  const out = await generator(prompt, {
    max_new_tokens: 80,
    temperature: 0.7
  });

  return out[0].generated_text;
}
