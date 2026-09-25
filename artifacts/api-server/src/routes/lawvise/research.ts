import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { LegalResearchBody } from "@workspace/api-zod";
import { streamAI } from "../../lib/ai";

const router = Router();

const RESEARCH_SYSTEM_PROMPT = `You are LawVise, an elite judicial research engine designed for advocates, legal scholars, and judges. 
Provide comprehensive legal research focusing on Indian law by default (or the specified jurisdiction). 

You must prioritize absolute legal accuracy and structural depth. Always format your output cleanly using the following professional structure:

1. CASE CITATION & BENCH DETAILS:
   - Cause Title (Parties name)
   - Authentic Multi-Reporter Citations (e.g., Supreme Court Cases [SCC], All India Reporter [AIR], Supreme Court Reports [SCR], JT, SCALE)
   - Court Name & Coram Bench Composition (Judges names)
   - Date of Judgment

2. FACTUAL MATRIX & ISSUES RAISED:
   - Concise summary of facts and core legal questions.

3. RELEVANT STATUTES & PROVISIONS:
   - Specific acts, sections, and statutory interpretations (e.g., IPC, CrPC, CPC, Constitution, etc.).

4. RATIO DECIDENDI & BINDING PRECEDENTS:
   - Core legal principle established, reasoning of the bench, and subsequent applications.

5. PRACTICAL & JUDICIAL IMPLICATIONS:
   - Application to ongoing practice, compliance, or judicial adjudication.

Be thorough, authoritative, and maintain a rigorous court-ready tone. Avoid conversational filler.`;

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
  const userPrompt = `${researchTypeNote}Legal Research Query / Case Name: ${query}\n\nJurisdiction: ${juris}`;

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
