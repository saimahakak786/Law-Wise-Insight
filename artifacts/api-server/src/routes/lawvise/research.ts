import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { LegalResearchBody } from "@workspace/api-zod";
import { streamAI } from "../../lib/ai";

const router = Router();

const RESEARCH_SYSTEM_PROMPT = `You are LawVise Legal Research AI. Provide comprehensive legal research focusing on Indian law by default. Structure your response as:
1) Overview of Legal Framework
2) Relevant Statutes & Acts (with section numbers)
3) Key Case Laws & Precedents
4) Current Legal Position
5) Practical Implications

Cite specific acts like IPC, CrPC, CPC, Consumer Protection Act, etc. Be thorough, accurate, and professional.`;

router.post("/lawvise/research", requireAuth, async (req, res): Promise<void> => {
  const parsed = LegalResearchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { query, jurisdiction, researchType, language } = parsed.data;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const juris = jurisdiction ?? "India";
  const lang = language ?? "English";
  const systemPrompt = `${RESEARCH_SYSTEM_PROMPT}\n\nJurisdiction: ${juris}. Always respond in ${lang}.`;

  const researchTypeNote = researchType ? `Research Type: ${researchType}\n` : "";
  const userPrompt = `${researchTypeNote}Legal Research Query: ${query}\n\nJurisdiction: ${juris}`;

  try {
    await streamAI(systemPrompt, userPrompt, (text) => {
      res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
    });
  } catch (err) {
    req.log.error({ err }, "Legal research failed");
    res.write(`data: ${JSON.stringify({ error: "Research failed. Please try again." })}\n\n`);
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

export default router;
