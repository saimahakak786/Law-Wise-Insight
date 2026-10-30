import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { CalculateLimitationBody, CalculateCourtFeeBody } from "@workspace/api-zod";
import { callAI } from "../../lib/ai";

const router = Router();

function getCurrencySymbol(jurisdiction: string): string {
  const j = (jurisdiction || "").toLowerCase();
  if (j.includes("usa") || j.includes("united states") || j.includes("us")) return "$";
  if (j.includes("uk") || j.includes("united kingdom") || j.includes("england")) return "£";
  if (j.includes("uae") || j.includes("dubai") || j.includes("emirates")) return "AED ";
  return "₹";
}

// 1. LIMITATION PERIOD ROUTE
router.post("/lawwise/calculator/limitation", requireAuth, async (req, res): Promise<void> => {
  const parsed = CalculateLimitationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { caseType, jurisdiction, eventDate } = parsed.data;
  const juris = jurisdiction ?? "India";

  const systemPrompt = `You are Lawwise, an elite cross-border legal limitation expert specializing in ${juris} jurisprudence. Provide accurate limitation period information based on local statutory acts and procedural rules. 
CRITICAL RULE: Respond with ONLY a valid JSON object — absolutely no markdown blocks (\`\`\`json), no extra text. 
JSON format strictly: { "periodYears": number, "description": string, "deadline": string_or_null, "notes": string }`;

  const userPrompt = `Case type: ${caseType}\nJurisdiction: ${juris}\n${eventDate ? `Date of cause of action: ${eventDate}` : "Event date not provided"}\n\nCalculate the limitation period and deadline.`;

  try {
    const result = await callAI(systemPrompt, userPrompt);
    const cleanedResult = result.replace(/```json/g, "").replace(/```/g, "").trim();
    const jsonMatch = cleanedResult.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const data = JSON.parse(jsonMatch[0]);
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Limitation calculation failed");
    res.status(500).json({ error: "Calculation failed. Please try again." });
  }
});

// 2. COURT FEE ROUTE (Powered by Legal AI for Exact Statutory Accuracy)
router.post("/lawwise/calculator/court-fee", requireAuth, async (req, res): Promise<void> => {
  const parsed = CalculateCourtFeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { courtType, caseType, jurisdiction, claimAmount } = parsed.data;
  const juris = jurisdiction ?? "India";
  const currency = getCurrencySymbol(juris);

  const systemPrompt = `You are Lawwise, an expert senior judicial accountant and legal pre-scrutiny officer specializing in exact statutory court-fee acts and rules for ${juris} (including ad valorem percentage schedules, fixed petition fees, and registry charges).
CRITICAL RULE: Respond with ONLY a valid JSON object — absolutely no markdown blocks (\`\`\`json), no extra text.
JSON format strictly: 
{
  "baseFee": number,
  "additionalFees": [{ "name": string, "amount": number }],
  "totalFee": number,
  "description": string
}`;

  const userPrompt = `Calculate the exact statutory court fee for:
- Court Type: ${courtType}
- Case Classification: ${caseType}
- Jurisdiction: ${juris}
- Claim / Suit Valuation Amount: ${claimAmount ? `${currency}${claimAmount}` : "Not applicable / Non-monetary"}

Apply the exact applicable ad valorem percentages, statutory slabs, or fixed court fee schedules for ${juris}. Ensure numbers are accurate.`;

  try {
    const result = await callAI(systemPrompt, userPrompt);
    const cleanedResult = result.replace(/```json/g, "").replace(/```/g, "").trim();
    const jsonMatch = cleanedResult.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const data = JSON.parse(jsonMatch[0]);
    
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Court fee calculation failed");
    res.status(500).json({ error: "Calculation failed. Please try again." });
  }
});

export default router;
