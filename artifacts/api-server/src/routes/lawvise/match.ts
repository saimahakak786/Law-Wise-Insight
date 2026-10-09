import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { callAI } from "../../lib/ai";

const router = Router();

router.post("/lawwise/match", requireAuth, async (req, res): Promise<void> => {
  const { facts, jurisdiction, language } = req.body;

  if (!facts || typeof facts !== "string" || !facts.trim()) {
    res.status(400).json({ error: "Case facts are required" });
    return;
  }

  const lang = language ?? "English";
  const juris = jurisdiction ?? "India";
  
  // 🏛️ GLOBAL SENIOR COUNSEL PRECEDENT MATCHING ENGINE
  const systemPrompt = `You are LawVise, an elite cross-border judicial precedent-matching engine specializing in ${juris} jurisprudence. 
Given the provided case facts, identify and return the most applicable, authoritative, and binding legal precedents within ${juris}. 

CRITICAL RULES:
1. Respond with ONLY a valid JSON array — absolutely no markdown formatting tags (like \`\`\`json), no extra text, and no conversational filler.
2. Format strictly as a JSON array of objects with these exact keys: [{"citation": string, "title": string, "principle": string, "relevance": string}].
3. Provide 3-5 verified, highly relevant precedents applicable to the facts.
4. Respond in ${lang}.`;

  const userPrompt = `Case facts and legal matrix:\n${facts}\n\nJurisdiction: ${juris}\n\nFind matching legal precedents.`;

  try {
    const result = await callAI(systemPrompt, userPrompt);
    
    // Clean up potential markdown code blocks if the model accidentally includes them despite instructions
    const cleanedResult = result.replace(/```json/g, "").replace(/```/g, "").trim();
    const jsonMatch = cleanedResult.match(/\[[\s\S]*\]/);
    
    if (!jsonMatch) {
      throw new Error("No valid JSON array found in AI response");
    }
    
    const matches = JSON.parse(jsonMatch[0]);
    res.json({ matches });
  } catch (err) {
    req.log.error({ err }, "Case matching failed");
    res.status(500).json({ error: "Matching failed. Please try again." });
  }
});

export default router;
