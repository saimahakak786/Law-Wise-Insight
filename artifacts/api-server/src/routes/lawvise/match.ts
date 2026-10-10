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
1. Respond with ONLY a valid JSON array — absolutely no markdown formatting tags (like \`\`\`json), no extra text, and no explanations.
2. Format strictly as a JSON array of objects with these exact keys: [{"citation": string, "title": string, "principle": string}].
3. Provide real, verified landmark precedents applicable to the facts specific to the selected jurisdiction (${juris}).
4. Respond in ${lang}.`;

    const userPrompt = `Case facts and legal matrix:\n${facts}\n\nJurisdiction: ${juris}\n\nFind matching legal precedents and return ONLY the JSON array.`;

    const result = await callAI(systemPrompt, userPrompt);

    // Clean up potential markdown code blocks if the model includes them
    const cleanedResult = result.replace(/```json/g, "").replace(/```/g, "").trim();
    const jsonMatch = cleanedResult.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      throw new Error("No valid JSON array found in AI response");
    }

    const matches = JSON.parse(jsonMatch[0]);
    res.json(matches);
  } catch (err: any) {
    console.error("Case matching failed:", err);
    res.status(500).json({ error: "Matching failed. Please try again." });
  }
});

export default router;
