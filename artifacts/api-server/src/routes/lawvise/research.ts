import { Router } from "express";
import { requireAuth, AuthenticatedRequest } from "../../middlewares/requireAuth";
import { LegalResearchBody } from "@workspace/api-zod";
import { callAI } from "../../lib/ai";
import {
  reserveAIUsage,
  completeAIUsage,
  refundAIUsage,
} from "../../lib/aiUsage";

const router = Router();

const RESEARCH_SYSTEM_PROMPT = `You are LawVise, an elite global judicial research and precedent-analysis engine designed for senior advocates, barristers, attorneys, and judges.

CRITICAL INSTRUCTION: You must output your response STRICTLY as a valid JSON object (and nothing else). Do not include markdown code blocks like \`\`\`json or any conversational filler.

Use this exact JSON structure:
{
  "overview": "Concise summary of the legal research query and framework.",
  "cases": [
    {
      "title": "Full Case Name / Cause Title",
      "citation": "Authentic Citation",
      "court": "Court Name",
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

  const userId = (req as AuthenticatedRequest).userId;

  let reservationId: string | undefined;

  try {
    // Reserve one research trial before calling AI.
    const trial = await reserveAIUsage(userId, "research");

    if (!trial.allowed) {
      res.status(403).json({
        success: false,
        error: "FREE_TRIAL_EXHAUSTED",
        feature: "research",
        message:
          "You have used all 7 free Legal Research searches. Upgrade to LawVise Pro to continue.",
        remaining: 0,
      });
      return;
    }

    reservationId = trial.reservationId;

    const { query, jurisdiction, researchType, language } = parsed.data;

    const juris = jurisdiction ?? "India";
    const lang = language ?? "English";

    const systemPrompt = `${RESEARCH_SYSTEM_PROMPT}

ACTIVE JURISDICTION: ${juris}. Always respond strictly in ${lang} and ground all legal analysis strictly within the laws of ${juris}.`;

    const researchTypeNote = researchType
      ? `Research Type: ${researchType}\n`
      : "";

    const userPrompt = `${researchTypeNote}Legal Research Query / Case Facts: ${query}

Jurisdiction: ${juris}`;

    const fullOutput = await callAI(systemPrompt, userPrompt, juris);

    let cleanedOutput = fullOutput.trim();

    if (cleanedOutput.startsWith("```json")) {
      cleanedOutput = cleanedOutput
        .replace(/^```json/, "")
        .replace(/```$/, "")
        .trim();
    } else if (cleanedOutput.startsWith("```")) {
      cleanedOutput = cleanedOutput
        .replace(/^```/, "")
        .replace(/```$/, "")
        .trim();
    }

    let parsedJson;

    try {
      parsedJson = JSON.parse(cleanedOutput);
    } catch {
      parsedJson = {
        overview: cleanedOutput,
        cases: [],
      };
    }

    // Mark the reserved trial as completed.
    await completeAIUsage(reservationId);

    res.status(200).json({
      success: true,
      result: parsedJson,
      remaining: trial.remaining,
      isTester: trial.isTester,
    });
  } catch (err) {
    // Refund the reserved trial if the research request fails.
    if (reservationId) {
      try {
        await refundAIUsage(reservationId);
      } catch (refundError) {
        req.log.error(
          { err: refundError },
          "Failed to refund Legal Research trial"
        );
      }
    }

    req.log.error({ err }, "Legal research failed");

    res.status(500).json({
      success: false,
      error: "Research failed. Please try again. Your trial credit has been refunded if the request failed.",
    });
  }
});

export default router;
