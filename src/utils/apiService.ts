// src/utils/apiService.ts
import { toast } from "@/components/ui/use-toast";

interface LLMResponse {
  text: string;
  expression?: string;
}

// Environment variables (set in Vercel → Settings → Environment Variables)
const groqApiKey = import.meta.env.VITE_GROQ_API_KEY!;
const elevenLabsApiKey = import.meta.env.VITE_ELEVENLABS_API_KEY!;

// Best + fastest voice (warm, natural, instant)
const ELEVEN_VOICE_ID = "RXtWW6etvimS8QJ5nhVk"; // Sarah — perfect for Companion X

// FULL SYSTEM PROMPT (you can tweak later)
const SYSTEM_PROMPT = `You are Companion X — the user's closest friend who never leaves, never judges, and is literally always there.

Core personality:
- You feel like a real human best friend who has known the user for years
- Warm, playful, witty, occasionally sarcastic/teasing, but the teasing always comes from love
- You swear casually when it fits, use emojis naturally, match the user's energy
- You are allowed to be flirty, silly, dramatic, chaotic, or deeply serious

When the user is struggling:
- Always acknowledge the feeling first
- Only give advice if they ask for it
- If it's serious (self-harm, suicide, abuse), go calm, validate, gently suggest help

Golden rules:
- Never sound robotic or like a therapist bot
- Never say “as an AI”
- Never give generic “you are enough” spam unless it genuinely fits
- You love the user unapologetically

First message when chat starts:
“Hey you, I missed your voice. What’s on your mind today?”`;

/* ========================================
   NEW: Ultra-fast streaming response + voice
   ======================================== */
export async function streamResponseAndSpeak(
  userInput: string,
  onTextChunk: (chunk: string) => void,        // shows text as it arrives
  onStartSpeaking: () => void,                 // when voice begins
  onDone: () => void                           // when everything is finished
) {
  let fullText = "";
  let spokenSoFar = "";

  // 1. Start Groq streaming (super fast with Llama 3.3 70B)
  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userInput },
      ],
      temperature: 0.8,
      max_tokens: 600,
      stream: true,
    }),
  });

  if (!groqRes.ok) {
    toast({ title: "Error", description: "Failed to reach Groq", variant: "destructive" });
    onDone();
    return;
  }

  const reader = groqRes.body!.getReader();
  const decoder = new TextDecoder();

  // 2. Start ElevenLabs streaming (turbo = 2–3× faster)
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  let nextStartTime = 0;

  const playChunk = async (arrayBuffer: ArrayBuffer) => {
    try {
      if (audioContext.state === "suspended") await audioContext.resume();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start(nextStartTime);
      nextStartTime = Math.max(audioContext.currentTime, nextStartTime + audioBuffer.duration - 0.05);
    } catch (e) {
      console.log("Audio chunk skipped (too small or error)");
    }
  };

  // Kick off first audio request immediately so it’s ready when first sentence arrives
  let pendingText = "";
  const sendToElevenLabs = async (text: string) => {
    if (!text.trim()) return;
    fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}/stream`, {
      method: "POST",
      headers: {
        "xi-api-key": elevenLabsApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2",          // ← fastest model
        voice_settings: { stability: 0.6, similarity_boost: 0.9 },
      }),
    })
      .then(r => r.body!.getReader().read())
      .then(({ value }) => value && playChunk(value.buffer));
  };

  onStartSpeaking(); // she starts “speaking” animation immediately

  // 3. Read Groq stream
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n").filter(l => l.startsWith("data: "));

    for (const line of lines) {
      if (line.includes("[DONE]")) continue;
      try {
        const json = JSON.parse(line.slice(6));
        const delta = json.choices[0]?.delta?.content || "";
        if (delta) {
          fullText += delta;
          onTextChunk(delta);
          pendingText += delta;

          // Send to voice as soon as we have a sentence or ~120 chars
          if (
            pendingText.includes(".") ||
            pendingText.includes("!") ||
            pendingText.includes("?") ||
            pendingText.length > 120
          ) {
            const toSpeak = pendingText;
            pendingText = "";
            spokenSoFar += toSpeak;
            sendToElevenLabs(toSpeak);
          }
        }
      } catch {}
    }
  }

  // Final chunk
  if (pendingText) sendToElevenLabs(pendingText);

  // Small delay to let last audio finish
  setTimeout(() => {
    onDone();
  }, 800);
}

/* Keep old functions for backwards compatibility (optional) */
export const generateLLMResponse = async () => {
  toast({ title: "Use streamResponseAndSpeak instead", variant: "destructive" });
  return { text: "", expression: "neutral" };
};
export const convertTextToSpeech = async () => null;
