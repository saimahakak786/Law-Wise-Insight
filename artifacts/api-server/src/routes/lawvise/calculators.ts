import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { CalculateLimitationBody, CalculateCourtFeeBody } from "@workspace/api-zod";
import { callAI } from "../../lib/ai";

const router = Router();

router.post("/lawvise/calculate/limitation", requireAuth, async (req, res): Promise<void> => {
  const parsed = CalculateLimitationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { caseType, jurisdiction, eventDate } = parsed.data;

  const systemPrompt = `You are LawVise, an expert in limitation periods under ${jurisdiction} law. Provide accurate limitation period information based on the Limitation Act and relevant statutes. Respond with ONLY a valid JSON object — no markdown, no code blocks, no extra text. JSON format: { "periodYears": number, "description": string, "deadline": string_or_null, "notes": string }`;

  const userPrompt = `Case type: ${caseType}\nJurisdiction: ${jurisdiction}\n${eventDate ? `Date of cause of action: ${eventDate}` : "Event date not provided"}\n\nWhat is the limitation period? Calculate deadline if date provided.`;

  try {
    const result = await callAI(systemPrompt, userPrompt);
    const jsonMatch = result.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const data = JSON.parse(jsonMatch[0]);
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Limitation calculation failed");
    res.status(500).json({ error: "Calculation failed. Please try again." });
  }
});

router.post("/lawvise/calculate/court-fee", requireAuth, async (req, res): Promise<void> => {
  const parsed = CalculateCourtFeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { courtType, caseType, jurisdiction, claimAmount } = parsed.data;

  const systemPrompt = `You are LawVise, an expert in court fees and legal costs under ${jurisdiction} law. Provide accurate court fee estimates based on the Court Fees Act and relevant rules. Respond with ONLY a valid JSON object — no markdown, no code blocks, no extra text. JSON format: { "baseFee": number, "additionalFees": [{"name": string, "amount": number}], "totalFee": number, "description": string }. All amounts in INR or local currency.`;

  const userPrompt = `Court type: ${courtType}\nCase type: ${caseType}\nJurisdiction: ${jurisdiction}\n${claimAmount != null ? `Claim/suit value: ₹${claimAmount}` : "Claim amount not specified"}\n\nCalculate the applicable court fees.`;

  try {
    const result = await callAI(systemPrompt, userPrompt);
    const jsonMatch = result.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const data = JSON.parse(jsonMatch[0]);
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Court fee calculation failed");
    res.status(500).json({ error: "Calculation failed. Please try again." });
  }
});

export default router;
