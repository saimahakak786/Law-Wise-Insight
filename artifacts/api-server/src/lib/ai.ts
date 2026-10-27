import { logger } from "./logger";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY || "";
const GROQ_API_KEY = process.env.GROQ_API_KEY;

/**
 * Stream AI response: Prioritizing Gemini (Free Tier) first, then Groq
 */
export async function streamAI(
  systemPrompt: string,
  userPrompt: string,
  onChunk: (text: string) => void
): Promise<string> {
  // 1. Try Gemini first (Free Google AI Studio Tier via non-streaming v1beta endpoint)
  if (GEMINI_API_KEY) {
    try {
      return await callGeminiNonStreaming(systemPrompt, userPrompt, onChunk);
    } catch (err: any) {
      logger.warn({ err: err.message || err }, "Gemini failed, trying Groq...");
    }
  }

  // 2. Fallback to Groq
  if (GROQ_API_KEY) {
    try {
      return await callGroqNonStreaming(systemPrompt, userPrompt, onChunk);
    } catch (err: any) {
      logger.warn({ err: err.message || err }, "Groq failed.");
    }
  }
  
  throw new Error("No free AI provider available. Please set GEMINI_API_KEY in Render environment variables.");
}

export async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const chunks: string[] = [];
  await streamAI(systemPrompt, userPrompt, (c) => chunks.push(c));
  return chunks.join("");
}

// ─── Gemini (Free Tier - Non-Streaming v1beta) ───────────────────────────────

async function callGeminiNonStreaming(
  systemPrompt: string,
  userPrompt: string,
  onChunk: (text: string) => void
): Promise<string> {
  const models = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
  let lastError: any = null;

  const combinedPrompt = `${systemPrompt}\n\n[User Request / Case Facts]\n${userPrompt}`;

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: combinedPrompt }] }],
          generationConfig: { maxOutputTokens: 8192, temperature: 0.3 }
        }),
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(`Gemini API (${model}) HTTP ${resp.status}: ${errorText}`);
      }

      const data = await resp.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (text) {
        onChunk(text); // Deliver the full response text cleanly
        return text;
      }
      throw new Error(`Empty response from Gemini (${model})`);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("All Gemini models failed.");
}

// ─── Groq (Non-Streaming Fallback) ───────────────────────────────────────────

async function callGroqNonStreaming(
  systemPrompt: string,
  userPrompt: string,
  onChunk: (text: string) => void
): Promise<string> {
  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: false,
      max_tokens: 8192,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Groq HTTP ${resp.status}: ${body}`);
  }
  
  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  if (content) {
    onChunk(content);
    return content;
  }
  throw new Error("Empty response from Groq");
}
