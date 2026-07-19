import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { LegalChatBody } from "@workspace/api-zod";
import { streamAI } from "../../lib/ai";

const router = Router();

const SYSTEM_BASE = `You are LawVise, an expert AI legal assistant with comprehensive knowledge of laws worldwide, with particular expertise in Indian law (IPC, CrPC, CPC, Constitution of India, and all major Indian statutes).

Guidelines:
- Provide accurate, helpful legal information in clear, plain language
- Always note that your responses are for informational purposes and not formal legal advice for important decisions
- Reference specific laws, sections, acts, or legal principles when relevant
- Structure complex answers with numbered points or clear headings
- For serious matters (criminal charges, major disputes, family law), recommend consulting a qualified lawyer
- Be empathetic, professional, and solution-oriented
- For Indian legal queries, cite relevant sections (e.g., "Section 302 IPC", "Order 7 Rule 1 CPC")`;

router.post("/lawvise/chat", requireAuth, async (req, res): Promise<void> => {
  const parsed = LegalChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { message, history, jurisdiction, language } = parsed.data;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const lang = language ?? "English";
  const juris = jurisdiction ? `The user is in ${jurisdiction}. Apply relevant laws and legal principles for that jurisdiction.` : "";
  const systemPrompt = `${SYSTEM_BASE}\n\n${juris}\nAlways respond in ${lang}.`;

  const historyContext =
    history && history.length > 0
      ? history.map((m) => `${m.role === "user" ? "User" : "LawVise"}: ${m.content}`).join("\n\n") +
        "\n\n"
      : "";

  const userPrompt = `${historyContext}User: ${message}\n\nLawVise:`;

  try {
    await streamAI(systemPrompt, userPrompt, (text) => {
      res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
    });
  } catch (err) {
    req.log.error({ err }, "Legal chat failed");
    res.write(`data: ${JSON.stringify({ error: "Unable to respond. Please try again." })}\n\n`);
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

export default router;
