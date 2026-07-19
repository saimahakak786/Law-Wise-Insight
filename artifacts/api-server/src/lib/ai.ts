import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "./logger";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const XAI_API_KEY = process.env.XAI_API_KEY;

let genAI: GoogleGenerativeAI | null = null;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
} else {
  logger.warn("GEMINI_API_KEY not set — Gemini provider disabled");
}

/**
 * Stream AI response through providers: Gemini → OpenRouter → xAI Grok (fallback chain)
 */
export async function streamAI(
  systemPrompt: string,
  userPrompt: string,
  onChunk: (text: string) => void
): Promise<string> {
  if (genAI) {
    try {
      return await streamGemini(systemPrompt, userPrompt, onChunk);
    } catch (err) {
      logger.warn({ err }, "Gemini stream failed, trying OpenRouter");
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
  throw new Error("No AI provider available. Set GEMINI_API_KEY, OPENROUTER_API_KEY, or XAI_API_KEY.");
}

/** Non-streaming call — collects all chunks and returns full text */
export async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const chunks: string[] = [];
  await streamAI(systemPrompt, userPrompt, (c) => chunks.push(c));
  return chunks.join("");
}

// ─── Gemini (Primary) ────────────────────────────────────────────────────────

async function streamGemini(
  systemPrompt: string,
  userPrompt: string,
  onChunk: (text: string) => void
): Promise<string> {
  const model = genAI!.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
    generationConfig: { maxOutputTokens: 8192 },
  });
  const result = await model.generateContentStream(userPrompt);
  let fullText = "";
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      fullText += text;
      onChunk(text);
    }
  }
  return fullText;
}

// ─── OpenRouter (Secondary) ──────────────────────────────────────────────────

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
      "HTTP-Referer": "https://lawvise.app",
      "X-Title": "LawVise",
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

// ─── xAI Grok (Tertiary) ─────────────────────────────────────────────────────

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
