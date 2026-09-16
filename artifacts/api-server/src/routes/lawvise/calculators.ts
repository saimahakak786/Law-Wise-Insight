import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { CalculateLimitationBody, CalculateCourtFeeBody } from "@workspace/api-zod";
import { callAI } from "../../lib/ai";

const router = Router();

// ==========================================
// 1. LIMITATION PERIOD ROUTE (100% Untouched)
// ==========================================
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

// ==========================================
// 2. PURE MATH COURT FEE CALCULATION HELPER
// ==========================================
function calculateCourtFeePureMath(
  courtType: string,
  caseType: string,
  jurisdiction: string,
  claimAmount?: number
) {
  const cType = (courtType || "").toLowerCase();
  const caseT = (caseType || "").toLowerCase();
  const val = Number(claimAmount) || 0;

  let baseFee = 0;
  let additionalFees: Array<{ name: string; amount: number }> = [];
  let description = "";

  // A. Family, Custody, Matrimonial, Maintenance & Domestic Matters (Flat Nominal Rates)
  if (
    caseT.includes("custody") || 
    caseT.includes("matrimonial") || 
    caseT.includes("divorce") || 
    caseT.includes("marriage") ||
    caseT.includes("family") ||
    caseT.includes("maintenance") ||
    caseT.includes("restitution") ||
    caseT.includes("guardianship") ||
    caseT.includes("domestic violence") ||
    caseT.includes("dv act")
  ) {
    baseFee = 25; // Flat nominal fee matching real-world family filings (~₹25)
    additionalFees = [
      { name: "Wakalatnama Stamp", amount: 10 },
      { name: "Process Fee & Affidavit Attestation", amount: 15 }
    ];
    description = `Fixed nominal statutory court fee for family, matrimonial, and custody matters under Indian procedural standards. Approximate estimate only; verify with court registry.`;
  }
  // B. Consumer Forum Tiers
  else if (cType.includes("consumer")) {
    if (val <= 500000) baseFee = 200;
    else if (val <= 2000000) baseFee = 400;
    else if (val <= 5000000) baseFee = 1000;
    else baseFee = 5000;

    additionalFees = [
      { name: "Process Fee & Welfare Stamps", amount: 100 }
    ];
    description = `Statutory fee under the Consumer Protection Rules, 2020. Approximate estimate only; verify with local consumer commission registry.`;
  } 
  // C. Civil Suits / Compensation / Recovery Slabs (Capped practically)
  else {
    if (val <= 100000) baseFee = 500;
    else if (val <= 1000000) baseFee = 1500;
    else if (val <= 5000000) baseFee = 3000; // Aligns with ₹3,000 for ₹30L compensation
    else baseFee = 5000;

    additionalFees = [
      { name: "Process Fee & Advocate Welfare Stamp", amount: 500 },
      { name: "Court Vakalatnama & Miscellaneous Stamps", amount: 250 }
    ];
    description = `Estimated civil court fee based on practical statutory slabs and state caps under Indian law. Approximate estimate only; verify with local court registry.`;
  }

  const totalFee = baseFee + additionalFees.reduce((acc, curr) => acc + curr.amount, 0);

  return {
    baseFee,
    additionalFees,
    totalFee,
    description,
  };
}

// ==========================================
// 3. COURT FEE ROUTE (Hybrid: Instant Math + Optional AI polish)
// ==========================================
router.post("/lawwise/calculator/court-fee", requireAuth, async (req, res): Promise<void> => {
  const parsed = CalculateCourtFeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { courtType, caseType, jurisdiction, claimAmount } = parsed.data;

  try {
    const mathResult = calculateCourtFeePureMath(courtType, caseType, jurisdiction, claimAmount);
    let finalDescription = mathResult.description;

    try {
      // Hardcoded Indian context to prevent any foreign AI hallucination (like Indiana)
      const systemPrompt = `You are Lawwise, an expert in Indian court filing fees and civil procedure rules. Given a court fee calculation result, provide a clean, professional 1-sentence legal note strictly referencing Indian statutory frameworks (e.g. Court Fees Act). Respond with plain text only.`;
      const userPrompt = `Court: ${courtType}, Case: ${caseType}, Jurisdiction: India, Calculated Total Fee: ${mathResult.totalFee}`;
      
      const aiResult = await callAI(systemPrompt, userPrompt);
      if (aiResult && aiResult.length > 10) {
        // Clean up text and ensure it reads professionally
        const cleanedAiText = aiResult.replace(/indiana/gi, "Indian").trim();
        finalDescription = `${cleanedAiText} (Approximate estimate only; verify with local court registry).`;
      }
    } catch (aiErr) {
      // Graceful fallback to pure math description if API fails
    }

    res.json({
      baseFee: mathResult.baseFee,
      additionalFees: mathResult.additionalFees,
      totalFee: mathResult.totalFee,
      description: finalDescription,
    });

  } catch (err) {
    req.log.error({ err }, "Court fee calculation failed");
    res.status(500).json({ error: "Calculation failed. Please try again." });
  }
});

export default router;
