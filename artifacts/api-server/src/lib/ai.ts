import { logger } from "./logger";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY || "";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const XAI_API_KEY = process.env.XAI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

/**
 * Stream AI response through providers: Gemini → Groq → OpenRouter → xAI Grok (fallback chain)
 */
export async function streamAI(
  systemPrompt: string,
  userPrompt: string,
  onChunk: (text: string) => void
): Promise<string> {
  if (GEMINI_API_KEY) {
    try {
      return await streamGemini(systemPrompt, userPrompt, onChunk);
    } catch (err: any) {
      logger.error({ err: err.message || err }, "Gemini API call failed");
      console.error("Gemini Error Details:", err);
    }
  }
  if (GROQ_API_KEY) {
    try {
      return await streamGroq(systemPrompt, userPrompt, onChunk);
    } catch (err) {
      logger.warn({ err }, "Groq failed, trying OpenRouter...");
    }
  }
  if (OPENROUTER_API_KEY) {
    try {
      return await streamOpenRouter(systemPrompt, userPrompt, onChunk);
    } catch (err) {
      logger.warn({ err }, "OpenRouter failed, trying xAI Grok");
    }
  }
  if (XAI_API_KEY) {
    return await streamXAI(systemPrompt, userPrompt, onChunk);
  }
  throw new Error("No AI provider available. Set GEMINI_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY, or XAI_API_KEY.");
}

/** Non-streaming call — collects all chunks and returns full text */
export async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const chunks: string[] = [];
  await streamAI(systemPrompt, userPrompt, (c) => chunks.push(c));
  return chunks.join("");
}

// ─── Gemini (Optimized for new AQ. auth keys) ────────────────────────────────

async function streamGemini(
  systemPrompt: string,
  userPrompt: string,
  onChunk: (text: string) => void
): Promise<string> {
  const models = ["gemini-2.0-flash", "gemini-1.5-flash"];
  let lastError: any = null;

  const combinedPrompt = `[Instructions / System Context]\n${systemPrompt}\n\n[User Query / Case Facts]\n${userPrompt}`;

  for (const model of models) {
    // IMPORTANT: Only pass ?alt=sse in URL. The AQ. key goes EXCLUSIVELY in the header to prevent "Multiple credentials" error.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;
    
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: combinedPrompt }]
            }
          ],
          generationConfig: {
            maxOutputTokens: 8192,
            temperature: 0.3
          }
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
            /* skip malformed chunks */
          }
        }
      }

      if (fullText.trim()) {
        return fullText; // Success!
      }
    } catch (err) {
      lastError = err;
      console.warn(`Model ${model} failed, trying next...`, err);
    }
  }

  throw lastError || new Error("All Gemini models failed to return content.");
}

// ─── Groq (Secondary) ───────────────────────────────────────────────────────

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
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: true,
      max_tokens: 8192,
    }),
  });
  return parseSseStream(resp, onChunk);
}

// ─── OpenRouter (Tertiary) ──────────────────────────────────────────────────

async function streamOpenRouter(
  systemPrompt: string,
  userPrompt: string,
  onChunk: (text: string) => void
): Promise<string> {
  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://lawwise.app",
      "X-Title": "Lawwise",
    },
    body: JSON.stringify({
      model: "meta-llama/llama-3.3-70b-instruct",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: true,
      max_tokens: 8192,
    }),
  });
  return parseSseStream(resp, onChunk);
}

// ─── xAI Grok (Quaternary) ───────────────────────────────────────────────────

async function streamXAI(
  systemPrompt: string,
  userPrompt: string,
  onChunk: (text: string) => void
): Promise<string> {
  const resp = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${XAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-3-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: true,
      max_tokens: 8192,
    }),
  });
  return parseSseStream(resp, onChunk);
}

// ─── SSE stream parser (OpenAI-compatible format) ────────────────────────────

async function parseSseStream(
  resp: Response,
  onChunk: (text: string) => void
): Promise<string> {
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${body}`);
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
        /* skip malformed chunks */
      }
    }
  }
  return fullText;
}
