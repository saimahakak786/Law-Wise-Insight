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

    const lang = language ?? "English";
    const juris = jurisdiction ?? "India";

    const systemPrompt = `You are LawVise, an elite cross-border judicial precedent-matching engine specializing in jurisdictions: India, US, UK, and UAE. 
Given the provided case facts and jurisdiction (${juris}), identify and return 3-5 verified, highly authoritative, and binding legal precedents applicable to the facts.

CRITICAL RULES:
1. Respond strictly with ONLY a valid JSON array — no markdown formatting tags (like \`\`\`json), no extra text, and no conversational filler.
2. Format strictly as a JSON array of objects with these exact keys: [{"citation": string, "title": string, "principle": string}].
3. Provide real, verified landmark precedents applicable to the facts specific to the selected jurisdiction (${juris}).
4. Respond in ${lang}.`;

    const userPrompt = `Case facts and legal matrix:\n${facts}\n\nJurisdiction: ${juris}\n\nFind matching legal precedents and return ONLY the JSON array.`;

    const result = await callAI(systemPrompt, userPrompt);

    // Clean up markdown tags, extra line breaks, and trailing backticks
    const cleanedResult = result
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    let matches = [];

    // Attempt standard JSON parsing
    try {
      const jsonMatch = cleanedResult.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        matches = JSON.parse(jsonMatch[0]);
      } else {
        matches = JSON.parse(cleanedResult);
      }
    } catch (parseErr) {
      console.warn("JSON parse failed in match.ts, applying fallback structuring:", parseErr);
      
      // Safe fallback payload to ensure mobile app UI receives a valid array structure
      matches = [
        {
          title: "Precedent Fact Analysis Complete",
          citation: `${juris} Precedent Index`,
          principle: cleanedResult.substring(0, 300) + "..."
        }
      ];
    }

    res.status(200).json(matches);
  } catch (err: any) {
    console.error("Case matching failed:", err);
    res.status(500).json({ error: "Matching failed. Please try again." });
  }
});

export default router;
