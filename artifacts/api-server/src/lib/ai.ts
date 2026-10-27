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
  // 1. Try Gemini first (Free Google AI Studio Tier)
  if (GEMINI_API_KEY) {
    try {
      return await streamGemini(systemPrompt, userPrompt, onChunk);
    } catch (err: any) {
      logger.warn({ err: err.message || err }, "Gemini failed, trying Groq...");
    }
  }

  // 2. Fallback to Groq
  if (GROQ_API_KEY) {
    try {
      return await streamGroq(systemPrompt, userPrompt, onChunk);
    } catch (err: any) {
      logger.warn({ err: err.message || err }, "Groq failed.");
    }
  }
  
  throw new Error("No free AI provider available. Please set GEMINI_API_KEY in Render.");
}

export async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const chunks: string[] = [];
  await streamAI(systemPrompt, userPrompt, (c) => chunks.push(c));
  return chunks.join("");
}

// ─── Gemini (Free Tier) ───────────────────────────────────────────────────────

async function streamGemini(
  systemPrompt: string,
  userPrompt: string,
  onChunk: (text: string) => void
): Promise<string> {
  const models = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-1.5-flash"];
  let lastError: any = null;

  const combinedPrompt = `[Instructions / System Context]\n${systemPrompt}\n\n[User Query / Case Facts]\n${userPrompt}`;

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: combinedPrompt }] }],
          generationConfig: { maxOutputTokens: 8192, temperature: 0.3 }
        }),
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(`Gemini API (${model}) HTTP ${resp.status}: ${errorText}`);
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error(`No response body from Gemini (${model})`);

      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (!data) continue;
          try {
            const parsed = JSON.parse(data);
            const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
            if (text) {
              fullText += text;
              onChunk(text);
            }
          } catch {
            /* skip */
          }
        }
      }

      if (fullText.trim()) return fullText;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("All Gemini models failed.");
}

// ─── Groq ────────────────────────────────────────────────────────────────────

async function streamGroq(
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
      stream: true,
      max_tokens: 8192,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Groq HTTP ${resp.status}: ${body}`);
  }
  
  const reader = resp.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") return fullText;
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content ?? "";
        if (content) {
          fullText += content;
          onChunk(content);
        }
      } catch {
        /* skip */
      }
    }
  }
  return fullText;
}
