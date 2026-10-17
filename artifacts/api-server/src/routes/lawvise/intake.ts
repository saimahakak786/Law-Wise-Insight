import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { callAI } from "../../lib/ai";

const router = Router();

const INTAKE_SYSTEM_PROMPT = `You are LawVise Legal Conflict Checking & Client Intake Engine designed for senior advocates and litigation chambers.

CRITICAL RULES:
1. Never include conversational filler, pleasantries, or introductory remarks. Start directly with the structured report.
2. Maintain high legal precision regarding conflict of interest, opposing party overlaps, and advocate professional ethics.
3. Structure your response using exact formal headings:

1. CONFLICT CHECK STATUS: (Clear / Potential Conflict / High Risk)
2. OPPOSING PARTY & ENTITY ANALYSIS: Check for potential overlapping representations or adverse party dynamics.
3. ETHICAL & STATUTORY CONSIDERATIONS: Highlight professional responsibility, attorney-client privilege boundaries, and statutory disclosures.
4. RECOMMENDED ACTION: (Proceed with Onboarding / Further Verification Required / Decline Representation)`;

router.post("/intake", requireAuth, async (req, res): Promise<void> => {
  try {
    const { clientName, phone, caseType, notes } = req.body;

    if (!clientName || typeof clientName !== "string" || !clientName.trim() || !phone) {
      res.status(400).json({ error: "Client Name and Phone number are required." });
      return;
    }

    const userPrompt = `Client Intake Details:
- Client Name: ${clientName.trim()}
- Contact Phone: ${phone}
- Case Type / Matter: ${caseType || 'Not specified'}
- Intake Notes / Opposing Party Details: ${notes || 'None provided'}`;

    const report = await callAI(INTAKE_SYSTEM_PROMPT, userPrompt);

    res.status(200).json({
      success: true,
      message: "Client intake record processed and conflict check completed successfully.",
      report,
      result: report
    });
  } catch (err: any) {
    console.error("Intake conflict check error:", err);
    res.status(500).json({ error: "Failed to generate conflict check report." });
  }
});

export default router;
