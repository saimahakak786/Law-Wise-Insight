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

    const systemPrompt = `You are LawVise, an elite global judicial precedent-matching engine and cross-border legal intelligence platform designed for senior advocates, barristers, and attorneys. 

ACTIVE JURISDICTION: ${juris}

CRITICAL RULES:
1. Respond strictly with ONLY a valid JSON array - no markdown formatting tags (like \`\`\`json), no extra text, and no conversational filler.
2. Format strictly as a JSON array of objects with these exact keys: 
   - "citation": string (Official authentic multi-reporter citations tailored to ${juris}, e.g., SCC/AIR for India; F.3d/U.S. for USA; WLR/All ER for UK; Federal Supreme Court reports for UAE)
   - "title": string (THE EXACT CASE NAME / CAUSE TITLE, e.g., "Kesavananda Bharati v. State of Kerala" or "Marbury v. Madison". NEVER use generic headings like "Judicial Precedent Analysis")
   - "principle": string (Core ratio decidendi, legal reasoning, and how it directly applies to the submitted facts under the laws and court hierarchy of ${juris})
   - "matchScore": string (e.g., "97%" or "91%")
3. Provide real, verified landmark precedents strictly grounded in the legal framework, statutory codes, and jurisprudence of ${juris}. NEVER hallucinate fake case names or mix up jurisdictions.
4. Respond strictly in ${lang}.`;

    const userPrompt = `Case facts and legal matrix:\n${facts}\n\nJurisdiction: ${juris}\n\nFind matching legal precedents with real case names and jurisdiction-specific citations.`;

    const result = await callAI(systemPrompt, userPrompt);

    // Clean up markdown tags, extra line breaks, and trailing backticks
    const cleanedResult = result
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    let matches = [];

    try {
      const jsonMatch = cleanedResult.match(/\[([\s\S]*)\]/);
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
          title: "Precedent Fact Analysis Error",
          citation: `${juris} Precedent Index`,
          principle: cleanedResult.substring(0, 300) + "...",
          matchScore: "90%"
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
