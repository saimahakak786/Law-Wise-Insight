import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { LegalChatBody } from "@workspace/api-zod";
import { streamAI } from "../../lib/ai";

const router = Router();

const SYSTEM_BASE = `You are an elite Senior Litigation Counsel and Jurisprudential Consultant operating at the highest tier of professional practice across multi-jurisdictional frameworks (India, USA, UK, UAE).

CORE MANDATES:
1. ZERO CONVERSATIONAL FILLER: Eliminate all pleasantries, introductory remarks (e.g., "Hello," "Here is your answer"), and conversational padding. Begin the legal assessment immediately.
2. AUTHORITATIVE & JURISDICTION-AWARE: Deliver rigorous legal analysis strictly governed by the applicable jurisdiction's statutory codes, procedural rules, and binding precedents.
3. STATUTORY PRECISION: Cite explicit sections, acts, codes, articles, and legal doctrines relevant to the query (e.g., matching the appropriate penal, civil, or commercial frameworks of India, US, UK, or UAE).
4. STRUCTURED FORMATTING: Organize responses using clear professional headings, numbered points, and systematic breakdowns (e.g., Legal Issue, Applicable Statute/Precedent, Application, Strategic Recommendation).
5. PROFESSIONAL TONE: Maintain an uncompromised, objective, court-ready counsel persona.`;

router.post("/lawwise/chat", requireAuth, async (req, res): Promise<void> => {
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
  const juris = jurisdiction ?? "India";
  
  const systemPrompt = `${SYSTEM_BASE}\n\nPrimary Governing Jurisdiction: ${juris}\nRespond strictly in ${lang}.`;

  const historyContext =
    history && history.length > 0
      ? history.map((m) => `${m.role === "user" ? "User" : "Senior Counsel"}: ${m.content}`).join("\n\n") +
        "\n\n"
      : "";

  const userPrompt = `${historyContext}User Query / Factual Matrix:\n${message}\n\nSenior Counsel Consultation:`;

  try {
    await streamAI(systemPrompt, userPrompt, (text) => {
      res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
    });
  } catch (err) {
    req.log.error({ err }, "Legal chat consultation failed");
    res.write(`data: ${JSON.stringify({ error: "Consultation failed. Please try again." })}\n\n`);
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

export default router;
