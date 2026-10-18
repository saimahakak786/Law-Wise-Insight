import { Router, Request, Response } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { callAI } from "../../lib/ai";

// Fallback interface if @workspace/api-zod type resolution fails during CI build
interface AnalyzePayload {
  text: string;
  documentType?: string;
  jurisdiction?: string;
  language?: string;
}

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

router.post(["/analyze", "/lawwise/analyze"], requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, documentType, jurisdiction, language } = req.body as AnalyzePayload;

    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "Document text is required for analysis." });
      return;
    }

    const lang = language ?? "English";
    const juris = jurisdiction ?? "India";

    const systemPrompt = `${ANALYZE_SYSTEM_PROMPT}\n\nGoverning Jurisdiction: ${juris}\nRespond strictly in ${lang}.`;
    const userPrompt = `Document Type: ${documentType || "Legal Instrument"}\n\nDocument Text to Audit:\n${text}`;

    // Supports both callAI(system, user) and callAI({ systemPrompt, userPrompt })
    let analysis: any;
    if (typeof callAI === "function") {
      try {
        analysis = await (callAI as any)(systemPrompt, userPrompt);
      } catch {
        analysis = await (callAI as any)({ systemPrompt, userPrompt });
      }
    }

    res.status(200).json({
      success: true,
      analysis,
      result: analysis,
    });
  } catch (err: any) {
    console.error("Document analysis failed:", err);
    res.status(500).json({ error: "Document analysis failed. Please try again." });
  }
});

export default router;
