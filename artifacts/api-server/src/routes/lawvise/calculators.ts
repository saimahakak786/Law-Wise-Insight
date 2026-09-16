import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { CalculateLimitationBody, CalculateCourtFeeBody } from "@workspace/api-zod";
import { callAI } from "../../lib/ai";

const router = Router();

router.post("/lawwise/calculator/limitation", requireAuth, async (req, res): Promise<void> => {
  const parsed = CalculateLimitationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { caseType, jurisdiction, eventDate } = parsed.data;

  const systemPrompt = `You are Lawwise, an expert in limitation periods under ${jurisdiction} law. Provide accurate limitation period information based on the Limitation Act and relevant statutes. Respond with ONLY a valid JSON object — no markdown, no code blocks, no extra text. JSON format: { "periodYears": number, "description": string, "deadline": string_or_null, "notes": string }`;

  const userPrompt = `Case type: ${caseType}\nJurisdiction: ${jurisdiction}\n${eventDate ? `Date of cause of action: ${eventDate}` : "Event date not provided"}\n\nWhat is the limitation period? Calculate deadline if date provided.`;

  try {
    const result = await callAI(systemPrompt, userPrompt);
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const data = JSON.parse(jsonMatch[0]);
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Limitation calculation failed");
    res.status(500).json({ error: "Calculation failed. Please try again." });
  }
});

router.post("/lawwise/calculator/court-fee", requireAuth, async (req, res): Promise<void> => {
  const parsed = CalculateCourtFeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { courtType, caseType, jurisdiction, claimAmount } = parsed.data;

  const systemPrompt = `You are Lawwise, an expert in court filing fees across multiple jurisdictions (India, UK, USA, UAE). Court fees vary significantly by country, and within countries by state/emirate/county — there is no single universal formula. Do NOT invent a generic percentage formula.

For the given jurisdiction (${jurisdiction}):
- If India: cite the specific state's Court Fees Act where possible
- If UK: reference HMCTS fee schedules (in GBP)
- If USA: note that fees vary by state and county court — give a typical range if unsure, and name which state/court you're estimating for
- If UAE: reference the relevant Emirate's court fee schedule (in AED) — note Dubai and Abu Dhabi differ

For family/custody/matrimonial matters, note that these often carry nominal fixed fees rather than percentage-based fees in most jurisdictions.

ALWAYS state clearly in the description that this is an approximate estimate only, and the exact fee must be verified with the local court registry, court website, or a licensed local attorney before filing — since fees, especially in the USA, can vary by specific county/court.

Respond with ONLY a valid JSON object — no markdown, no code blocks, no extra text. JSON format: { "baseFee": number, "additionalFees": [{"name": string, "amount": number}], "totalFee": number, "description": string }. Use the correct currency symbol/code for the jurisdiction (₹ for India, £ for UK, $ for USA, AED for UAE).`;

  const userPrompt = `Court type: ${courtType}\nCase type: ${caseType}\nJurisdiction: ${jurisdiction}\n${claimAmount != null ? `Claim/suit value: ${claimAmount} (in local currency for ${jurisdiction})` : "Claim amount not specified"}\n\nCalculate the applicable court fees.`;

  try {
    const result = await callAI(systemPrompt, userPrompt);
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    const data = JSON.parse(jsonMatch[0]);
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Court fee calculation failed");
    res.status(500).json({ error: "Calculation failed. Please try again." });
  }
});

export default router;
