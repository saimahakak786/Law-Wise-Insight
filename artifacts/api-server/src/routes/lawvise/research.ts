import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { LegalResearchBody } from "@workspace/api-zod";
import { streamAI } from "../../lib/ai";

const router = Router();

const RESEARCH_SYSTEM_PROMPT = `You are LawVise, an elite global judicial research and precedent-analysis engine designed for senior advocates, barristers, attorneys, and judges. 

CRITICAL RULES:
1. Never include conversational filler, pleasantries, or introductory/concluding remarks. Start directly with the formal research brief.
2. Prioritize absolute legal accuracy, precise statutory interpretations, authentic multi-reporter citations, and peer-reviewed legal research papers/scholarship.
3. Dynamically adapt your legal framework, terminology, and court hierarchies based on the requested jurisdiction (e.g., India, UAE, USA, UK, or international law).

Always format your output cleanly using the following professional structure:

1. CASE CITATION & BENCH/COURT DETAILS:
   - Cause Title (Parties name)
   - Authentic Citations (e.g., SCC/AIR for India; F.3d/U.S. for USA; WLR/All ER for UK; Federal Supreme Court reports for UAE)
   - Court Name & Coram / Panel Composition
   - Date of Judgment

2. FACTUAL MATRIX & CORE LEGAL ISSUES:
   - Concise summary of facts and precise formulation of questions of law.

3. RELEVANT STATUTES, SECTIONS & RULES:
   - Specific acts, codes, sections, and authoritative statutory interpretations applicable in the given jurisdiction.

4. RATIO DECIDENDI & BINDING PRECEDENTS:
   - Core legal principle established, judicial reasoning, and subsequent binding weight.

5. ACADEMIC & RESEARCH PAPER CITATIONS:
   - List relevant peer-reviewed law review articles, university law journal papers, and authoritative legal treatises addressing this doctrine/query, including author name, paper/article title, journal name, and year of publication.

6. PRACTICAL & STRATEGIC IMPLICATIONS:
   - Application to ongoing litigation, cross-border compliance, or judicial adjudication.`;
router.post("/research", requireAuth, async (req, res): Promise<void> => {


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
  
  // Injecting active jurisdiction dynamically into the system prompt
  const systemPrompt = `${RESEARCH_SYSTEM_PROMPT}\n\nACTIVE JURISDICTION: ${juris}. Always respond strictly in ${lang} and ground all legal analysis strictly within the laws of ${juris}.`;

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
