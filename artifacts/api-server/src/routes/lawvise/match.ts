import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { callAI } from "../../lib/ai";

const router = Router();

router.post("/match", requireAuth, async (req, res): Promise<void> => {
  try {
    const { facts, jurisdiction, language } = req.body;

    if (!facts || typeof facts !== "string" || !facts.trim()) {
      res.status(400).json({ error: "Case facts are required" });
      return;
    }

    const lang =
      typeof language === "string" && language.trim()
        ? language.trim()
        : "English";

    const juris =
      typeof jurisdiction === "string" && jurisdiction.trim()
        ? jurisdiction.trim()
        : "India";

    const systemPrompt = `
You are LawVise, a legal precedent research assistant.

ACTIVE JURISDICTION: ${juris}

IMPORTANT INSTRUCTIONS:

1. Identify potentially relevant judicial precedents for the submitted facts.
2. Do not invent case names, citations, courts, dates or legal principles.
3. If you are uncertain about a case or citation, clearly state that it requires verification.
4. Do not claim that a case or citation has been independently verified.
5. Explain the legal principle and its relevance to the submitted facts.
6. Return ONLY a valid JSON array.
7. Every object must contain these fields:

{
  "title": "Case name",
  "citation": "Case citation",
  "principle": "Legal principle and relevance",
  "matchScore": "Estimated relevance percentage"
}

8. Provide up to 5 relevant results.
9. If you cannot identify reliable relevant precedents, return an empty array.
10. Respond strictly in ${lang}.
`;

    const userPrompt = `
CASE FACTS:

${facts}

JURISDICTION: ${juris}

Identify potentially relevant judicial precedents.
Return only a valid JSON array.
`;

    const result = await callAI(systemPrompt, userPrompt, juris);

    if (typeof result !== "string" || !result.trim()) {
      res.status(502).json({
        error: "The AI service returned an empty response. Please try again."
      });
      return;
    }

    let cleaned = result.trim();

    // Remove Markdown code fences, if present.
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    let parsed: any;

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Invalid JSON received from AI:", result);

      res.status(502).json({
        error: "The AI returned an invalid response. Please try again."
      });
      return;
    }

    // Support either a direct array or an object containing matches/cases.
    let matches: any[] = [];

    if (Array.isArray(parsed)) {
      matches = parsed;
    } else if (parsed && typeof parsed === "object") {
      if (Array.isArray(parsed.matches)) {
        matches = parsed.matches;
      } else if (Array.isArray(parsed.cases)) {
        matches = parsed.cases;
      }
    }

    if (!Array.isArray(matches)) {
      res.status(502).json({
        error: "The AI response did not contain valid case results."
      });
      return;
    }

    // Validate each result before sending it to the mobile app.
    const validMatches = matches
      .filter((item: any) =>
        item &&
        typeof item === "object" &&
        typeof item.title === "string" &&
        item.title.trim() &&
        typeof item.citation === "string" &&
        item.citation.trim() &&
        typeof item.principle === "string" &&
        item.principle.trim()
      )
      .slice(0, 5)
      .map((item: any) => ({
        title: item.title.trim(),
        citation: item.citation.trim(),
        principle: item.principle.trim(),
        matchScore:
          typeof item.matchScore === "string"
            ? item.matchScore
            : "Not provided"
      }));

    if (validMatches.length === 0) {
      res.status(200).json([]);
      return;
    }

    res.status(200).json(validMatches);

  } catch (err: any) {
    console.error("Case matching failed:", err);

    res.status(500).json({
      error: "Matching failed. Please try again."
    });
  }
});

export default router;
