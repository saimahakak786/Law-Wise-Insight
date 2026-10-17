import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { AnalyzeDocumentBody } from "@workspace/api-zod";
import { callAI } from "../../lib/ai";

const router = Router();

const ANALYZE_SYSTEM_PROMPT = `You are LawVise Legal Document Auditor and Risk Assessment Engine designed for senior advocates.

CRITICAL RULES:
1. Eliminate all pleasantries, introductory remarks, and conversational padding.
2. Provide a meticulous clause-by-clause legal risk analysis, highlighting liabilities, statutory non-compliance, and missing protective covenants.
3. Organize the audit report under clear legal headings:
   - 1. EXECUTIVE SUMMARY & DOCUMENT PURPOSE
   - 2. CRITICAL RISK & LIABILITY CLAUSES
   - 3. STATUTORY COMPLIANCE & GOVERNING LAW
   - 4. RECOMMENDED AMENDMENTS & PROTECTIVE COVENANTS`;

router.post(["/analyze", "/lawwise/analyze"], requireAuth, async (req, res): Promise<void> => {
  const parsed = AnalyzeDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { text, documentType, jurisdiction, language } = parsed.data;

  const lang = language ?? "English";
  const juris = jurisdiction ?? "India";

  const systemPrompt = `${ANALYZE_SYSTEM_PROMPT}\n\nGoverning Jurisdiction: ${juris}\nRespond strictly in ${lang}.`;
  const userPrompt = `Document Type: ${documentType || "Legal Instrument"}\n\nDocument Text to Audit:\n${text}`;

  try {
    const analysis = await callAI(systemPrompt, userPrompt);

    res.status(200).json({
      success: true,
      analysis,
      result: analysis,
    });
  } catch (err) {
    req.log.error({ err }, "Document analysis failed");
    res.status(500).json({ error: "Document analysis failed. Please try again." });
  }
});

export default router;
