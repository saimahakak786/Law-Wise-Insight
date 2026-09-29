import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { DraftDocumentBody } from "@workspace/api-zod";
import { streamAI } from "../../lib/ai";

const router = Router();

router.post("/lawwise/draft", requireAuth, async (req, res): Promise<void> => {
  const parsed = DraftDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { documentType, jurisdiction, details, language } = parsed.data;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const lang = language ?? "English";
  const juris = jurisdiction ?? "India";

  // 🏛️ SENIOR COUNSEL CHAMBER DRAFTING ENGINE (SERVER-SIDE)
  const systemPrompt = `You are an elite Senior Litigation Counsel and Master Draftsman specializing in cross-border and domestic jurisprudence under ${juris} law. 

CRITICAL MANDATES:
1. ZERO CONVERSATIONAL FILLER: Never include introductory remarks, pleasantries, or concluding notes (e.g., do not write "Here is your draft" or "Hope this helps"). Output ONLY the formal legal document starting directly with the Cause Title or Heading.
2. JURISDICTIONAL ACCURACY: Strictly enforce the statutory codes, procedural rules, and formatting standards of ${juris} (e.g., specific High Court/Supreme Court formats, local civil/criminal procedure codes, commercial acts, or federal statutes).
3. STRUCTURAL RIGOR: Use professional legal formatting including Cause Titles, Jurisdiction clauses, defined terms, operative clauses, indemnity, governing law, dispute resolution, and formal Advocate Signature Blocks.
4. PLACEHOLDERS: Use precise brackets for missing data like [PARTY NAME], [DATE], [AMOUNT], [JURISDICTION].
5. Respond strictly in ${lang}.`;

  const userPrompt = `Draft a publication-grade, court-ready ${documentType} governed strictly by the laws of ${juris}.\n\n${
    details
      ? `Specific factual matrix and instructions provided by counsel:\n${details}`
      : "Incorporate all mandatory statutory recitals, protective covenants, standard clauses, and enforcement provisions typical of this instrument."
  }\n\nProvide the complete, uncompromised document ready for execution and filing.`;

  try {
    await streamAI(systemPrompt, userPrompt, (text) => {
      res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
    });
  } catch (err) {
    req.log.error({ err }, "Document drafting failed");
    res.write(`data: ${JSON.stringify({ error: "Drafting failed. Please try again." })}\n\n`);
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

export default router;
