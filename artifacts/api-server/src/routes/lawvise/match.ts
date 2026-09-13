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
  const systemPrompt = `You are LawVise, an expert legal precedent matcher for ${juris} law. Given case facts, find the most relevant real case law precedents. Respond with ONLY a valid JSON array — no markdown, no extra text, no code blocks. Format: [{"citation": string, "title": string, "principle": string, "relevance": string}]. Provide 3-5 real, accurate precedents relevant to the facts given. Respond in ${lang}.`;

  const userPrompt = `Case facts:\n${facts}\n\nFind matching legal precedents.`;

  try {
    const result = await callAI(systemPrompt, userPrompt);
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array in response");
    const matches = JSON.parse(jsonMatch[0]);
    res.json({ matches });
  } catch (err) {
    req.log.error({ err }, "Case matching failed");
    res.status(500).json({ error: "Matching failed. Please try again." });
  }
});

export default router;
