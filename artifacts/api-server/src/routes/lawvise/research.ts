import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { LegalResearchBody } from "@workspace/api-zod";
import { callAI } from "../../lib/ai";

const router = Router();

const RESEARCH_SYSTEM_PROMPT = `You are LawVise, an elite global judicial research and precedent-analysis engine designed for senior advocates, barristers, attorneys, and judges.

CRITICAL INSTRUCTION: You must output your response STRICTLY as a valid JSON object (and nothing else). Do not include markdown code blocks like \`\`\`json or any conversational filler. 

Use this exact JSON structure:
{
  "overview": "Concise summary of the legal research query and framework.",
  "cases": [
    {
      "title": "Full Case Name / Cause Title (e.g. State of Maharashtra v. XYZ)",
      "citation": "Authentic Citation (e.g. 2024 SCC 123 or AIR 2024 SC 45)",
      "court": "Court Name (e.g. Supreme Court of India)",
      "coram": "Bench / Panel Composition",
      "date": "Judgment Date",
      "matchPercentage": 95,
      "category": "Supreme Court Precedent",
      "facts": "Concise summary of facts",
      "statutes": "Applicable sections and statutes",
      "ratio": "Ratio decidendi and binding legal principle",
      "implications": "Practical and strategic litigation implications"
    }
  ]
}

RULES:
1. Find and return 3 to 5 highly relevant, authentic real-world case law precedents for the given query and jurisdiction.
2. NEVER invent or hallucinate fictional case names or citations.
3. Ensure the output is 100% valid JSON parsable by JSON.parse().`;

router.post("/research", requireAuth, async (req, res): Promise<void> => {
  const parsed = LegalResearchBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { query, jurisdiction, researchType, language } = parsed.data;

  const juris = jurisdiction ?? "India";
  const lang = language ?? "English";
  
  const systemPrompt = `${RESEARCH_SYSTEM_PROMPT}\n\nACTIVE JURISDICTION: ${juris}. Always respond strictly in ${lang} and ground all legal analysis strictly within the laws of ${juris}.`;

  const researchTypeNote = researchType ? `Research Type: ${researchType}\n` : "";
  const userPrompt = `${researchTypeNote}Legal Research Query / Case Facts: ${query}\n\nJurisdiction: ${juris}`;

  try {
    const fullOutput = await callAI(systemPrompt, userPrompt);

    // Clean up any accidental markdown code blocks if the AI included them
    let cleanedOutput = fullOutput.trim();
    if (cleanedOutput.startsWith("```json")) {
      cleanedOutput = cleanedOutput.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (cleanedOutput.startsWith("```")) {
      cleanedOutput = cleanedOutput.replace(/^```/, "").replace(/```$/, "").trim();
    }

    // Validate that it's valid JSON, or pass it through
    let parsedJson;
    try {
      parsedJson = JSON.parse(cleanedOutput);
    } catch (e) {
      // Fallback: wrap raw text in a JSON structure if parsing fails
      parsedJson = {
        overview: cleanedOutput,
        cases: []
      };
    }

    res.status(200).json({
      success: true,
      result: JSON.stringify(parsedJson), // Send structured JSON string to frontend
    });
  } catch (err) {
    req.log.error({ err }, "Legal research failed");
    res.status(500).json({ error: "Research failed. Please try again." });
  }
});

export default router;
