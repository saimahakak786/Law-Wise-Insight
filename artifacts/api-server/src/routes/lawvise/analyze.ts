import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../../middlewares/requireAuth";
import { AnalyzeDocumentBody } from "@workspace/api-zod";
import { streamAI } from "../../lib/ai";

const router = Router();

function buildAnalysisSystemPrompt(
  analysisType: string,
  documentType: string,
  jurisdiction: string | null | undefined,
  language: string | null | undefined
): string {
  const lang = language ?? "English";
  const juris = jurisdiction ? `The document is governed by ${jurisdiction} law.` : "";
  const base = `You are LawVise, an expert AI legal analyst. ${juris} Always respond in ${lang}. Use clear headings and structured formatting.`;

  switch (analysisType) {
    case "summarize":
      return `${base} Summarize the provided ${documentType} in plain, simple language that any non-lawyer can understand. Structure: 1) Overview, 2) Key Parties, 3) Main Rights & Obligations, 4) Important Dates/Deadlines, 5) Key Takeaways.`;
    case "clause_analysis":
      return `${base} Perform a detailed clause-by-clause analysis of the ${documentType}. For each clause: identify it by name/number, explain what it means in plain language, and flag important implications. Use clear section headings.`;
    case "risk_analysis":
      return `${base} Perform a comprehensive risk analysis of the ${documentType}. Categorize findings as: ⚠️ HIGH RISK, ⚡ MEDIUM RISK, ✅ LOW RISK. Include: 1) Risk summary, 2) Detailed risk findings, 3) Missing standard protections, 4) Recommended amendments.`;
    case "interpretation":
      return `${base} Interpret this ${documentType} (which may be a court judgment, FIR, court order, bail application, or similar legal document). Provide: 1) Plain-language interpretation, 2) What it means for each party, 3) Key findings/orders/charges, 4) Legal implications and next steps.`;
    case "key_points":
      return `${base} Extract and list the top 10-15 key points from the ${documentType}. Number each point clearly. Focus on the most important facts, obligations, rights, dates, and terms.`;
    case "legal_issues":
      return `${base} Identify all legal issues, problems, and areas of concern in the ${documentType}. For each issue: name it, explain the problem, cite applicable law, and suggest remedies or precautions.`;
    case "relevant_sections":
      return `${base} Identify which sections of Indian/relevant law apply to this ${documentType}. Cite specific acts, sections, and rules (e.g., "Section 17 of the Indian Contract Act, 1872", "Order 7 Rule 1 CPC"). Explain how each cited provision is relevant.`;
    case "case_citations":
      return `${base} Find and list all case citations, precedents, and relevant judgments that apply to this type of ${documentType}. Include: case name, court, year, citation, and a brief note on its relevance.`;
    case "full_analysis":
    default:
      return `${base} Perform a comprehensive analysis of this ${documentType}. Provide: 1) Executive Summary, 2) Parties & Roles, 3) Clause-by-Clause Breakdown, 4) Risk Assessment (HIGH/MEDIUM/LOW), 5) Missing Protections, 6) Key Dates & Deadlines, 7) Recommendations. Be thorough and professional.`;
  }
}

router.post("/lawvise/analyze", requireAuth, async (req, res): Promise<void> => {
  const parsed = AnalyzeDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { content, analysisType, documentType, jurisdiction, language } = parsed.data;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const systemPrompt = buildAnalysisSystemPrompt(analysisType, documentType, jurisdiction, language);
  const userPrompt = `Document Type: ${documentType}\n\n--- DOCUMENT CONTENT ---\n${content}\n--- END ---`;

  try {
    await streamAI(systemPrompt, userPrompt, (text) => {
      res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
    });
  } catch (err) {
    req.log.error({ err }, "Document analysis failed");
    res.write(`data: ${JSON.stringify({ error: "Analysis failed. Please try again." })}\n\n`);
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

export default router;
