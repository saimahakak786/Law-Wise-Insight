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
  const juris = jurisdiction ?? "India";
  
  // 🏛️ GLOBAL SENIOR COUNSEL AUDIT ENGINE BASE PROMPT
  const base = `You are an elite Senior Litigation Counsel and Cross-Border Legal Auditor. 
ACTIVE JURISDICTION: ${juris}. 

CRITICAL RULES:
1. Never include conversational filler, pleasantries, or introductory/concluding remarks. Start directly with the formal analysis.
2. Dynamically adapt your statutory frameworks, liability standards, and legal interpretations strictly based on the active jurisdiction (${juris}). For example, apply UAE Federal Law if UAE is selected, US Federal/State codes if USA, English common law/statutes if UK, and Indian statutes if India.
3. Respond strictly in ${lang} using rigorous, authoritative, court-ready legal language with precise statutory provisions and structural formatting.`;

  switch (analysisType) {
    case "summarize":
      return `${base} Provide an executive chamber briefing note of the provided ${documentType} under ${juris} law. Structure with formal headings: 1) Executive Overview & Core Purpose, 2) Key Stakeholders & Roles, 3) Core Rights, Duties & Obligations, 4) Critical Timelines, Deadlines & Vesting Dates, 5) Strategic Takeaways.`;
    
    case "clause_analysis":
      return `${base} Perform a rigorous clause-by-clause legal audit of the ${documentType} under the laws of ${juris}. For each clause: identify by exact heading/number, provide a strict legal interpretation of its implications, and flag latent ambiguities or enforcement vulnerabilities. Use clean formal section headings.`;
    
    case "risk_analysis":
      return `${base} Perform a comprehensive legal risk and exposure analysis of the ${documentType} governed by ${juris} regulations. Categorize findings strictly as: ⚠️ HIGH EXPOSURE (Critical Breach Risk), ⚡ MEDIUM EXPOSURE (Compliance Vulnerability), ✅ SECURED CLAUSE (Low Risk). Include: 1) Executive Risk Summary, 2) Detailed Liability Findings, 3) Missing Statutory & Contractual Protections under ${juris} law, 4) Recommended Redlining & Amendments.`;
    
    case "interpretation":
      return `${base} Provide a senior-counsel-level judicial interpretation of this ${documentType} (whether court judgment, FIR, order, or petition) within the legal framework of ${juris}. Provide: 1) Plain-Legal Interpretation, 2) Operative Impact on Respective Parties, 3) Key Findings, Ratios, or Charges, 4) Immediate Procedural Implications and Mandatory Next Steps under local court rules.`;
    
    case "key_points":
      return `${base} Extract and itemize the top 10-15 crucial legal points, covenants, or factual assertions from the ${documentType} in accordance with ${juris} standards. Number each point clearly. Focus strictly on enforceable rights, monetary considerations, liability triggers, and restrictive covenants.`;
    
    case "legal_issues":
      return `${base} Identify all substantive and procedural legal issues, liabilities, and statutory infractions present in the ${documentType} under ${juris} jurisdiction. For each issue: designate the core legal question, explain the exact nature of default, cite applicable local statutory codes and sections, and recommend concrete remedial measures.`;
    
    case "relevant_sections":
      return `${base} Identify all governing statutory provisions, codes, and procedural rules applicable to this ${documentType} specifically under ${juris} law (e.g., local civil codes, commercial companies laws, federal statutes, or procedural codes relevant to ${juris}). Cite exact acts, section numbers, and explain the legal test or application for each provision.`;
    
    case "case_citations":
      return `${base} Identify and list all binding judicial precedents, landmark court judgments, and ratio decidendi relevant to this ${documentType} within ${juris}. Format with: Case Title, Citation, Court, Year, and a concise statement of its binding legal principle and application.`;
    
    case "full_analysis":
    default:
      return `${base} Perform a comprehensive, chamber-grade legal audit of this ${documentType} governed by ${juris} law. Structure with precise formal headings: 1) Executive Summary & Legal Standing, 2) Parties, Competency & Roles, 3) Clause-by-Clause Legal Breakdown, 4) Comprehensive Risk & Exposure Assessment (High/Medium/Low), 5) Omissions & Missing Statutory Protections, 6) Critical Timelines & Obligations, 7) Strategic Counsel Recommendations. Be exhaustive, uncompromising, and professional.`;
  }
}

router.post("/lawwise/analyze", requireAuth, async (req, res): Promise<void> => {
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
  const userPrompt = `Document Type: ${documentType}\nJurisdiction: ${jurisdiction ?? "India"}\n\n--- DOCUMENT CONTENT ---\n${content}\n--- END ---`;

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
