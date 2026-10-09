import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { CalculateLimitationBody, CalculateCourtFeeBody } from "@workspace/api-zod";
import { callAI } from "../../lib/ai";

const router = Router();

// ==========================================
// HELPER: Jurisdiction-Aware Currency Symbol
// ==========================================
function getCurrencySymbol(jurisdiction: string): string {
  const j = (jurisdiction || "").toLowerCase();
  if (j.includes("usa") || j.includes("united states") || j.includes("us")) return "$";
  if (j.includes("uk") || j.includes("united kingdom") || j.includes("england")) return "£";
  if (j.includes("uae") || j.includes("dubai") || j.includes("emirates")) return "AED ";
  return "₹"; // Default India
}

// ==========================================
// 1. LIMITATION PERIOD ROUTE
// ==========================================
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
  const juris = jurisdiction || "India";
  const val = Number(claimAmount) || 0;
  const currency = getCurrencySymbol(juris);

  let baseFee = 0;
  let additionalFees: Array<{ name: string; amount: number }> = [];
  let description = "";

  // A. Family, Custody, Matrimonial, Maintenance & Domestic Matters
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
    baseFee = juris.includes("India") ? 25 : 150; 
    additionalFees = [
      { name: "Filing / Stamp Duty", amount: juris.includes("India") ? 10 : 50 },
      { name: "Process Fee & Affidavit Attestation", amount: juris.includes("India") ? 15 : 75 }
    ];
    description = `Fixed statutory court fee for family, matrimonial, and custody matters under ${juris} procedural standards. Approximate estimate only; verify with local court registry.`;
  }
  // B. Consumer Forum Tiers
  else if (cType.includes("consumer")) {
    if (val <= 500000) baseFee = 200;
    else if (val <= 2000000) baseFee = 400;
    else if (val <= 5000000) baseFee = 1000;
    else baseFee = 5000;

    additionalFees = [
      { name: "Process Fee & Administrative Charges", amount: 100 }
    ];
    description = `Statutory fee under Consumer Protection regulations applicable in ${juris}. Approximate estimate only; verify with local commission registry.`;
  } 
  // C. Civil Suits / Compensation / Recovery Slabs
  else {
    if (val <= 100000) baseFee = 500;
    else if (val <= 1000000) baseFee = 1500;
    else if (val <= 5000000) baseFee = 3000;
    else baseFee = 5000;

    additionalFees = [
      { name: "Process Fee & Administrative Stamps", amount: 500 },
      { name: "Vakalatnama & Miscellaneous Costs", amount: 250 }
    ];
    description = `Estimated civil court fee based on statutory slabs and court rules in ${juris}. Approximate estimate only; verify with local court registry.`;
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
// 3. COURT FEE ROUTE (Hybrid: Instant Math + AI polish)
// ==========================================
router.post("/lawwise/calculator/court-fee", requireAuth, async (req, res): Promise<void> => {
  const parsed = CalculateCourtFeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { courtType, caseType, jurisdiction, claimAmount } = parsed.data;
  const juris = jurisdiction ?? "India";

  try {
    const mathResult = calculateCourtFeePureMath(courtType, caseType, juris, claimAmount);
    let finalDescription = mathResult.description;

    try {
      const systemPrompt = `You are Lawwise, an expert in court filing fees and civil procedure rules for ${juris}. Given a court fee calculation result, provide a clean, professional 1-sentence legal note strictly referencing ${juris} statutory frameworks. Respond with plain text only.`;
      const userPrompt = `Court: ${courtType}, Case: ${caseType}, Jurisdiction: ${juris}, Calculated Total Fee: ${mathResult.totalFee}`;
      
      const aiResult = await callAI(systemPrompt, userPrompt);
      if (aiResult && aiResult.length > 10) {
        finalDescription = `${aiResult.trim()} (Approximate estimate only; verify with local court registry).`;
      }
    } catch (aiErr) {
      // Graceful fallback to pure math description if AI fails
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
