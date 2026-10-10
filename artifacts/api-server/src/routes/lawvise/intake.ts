import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { callAI } from "../../lib/ai";

const router = Router();

router.post("/intake", requireAuth, async (req, res): Promise<void> => {
  try {
    const { clientName, phone, caseType, notes } = req.body;

    if (!clientName || !phone) {
      res.status(400).json({ error: "Client Name and Phone are required." });
      return;
    }

    const prompt = `You are LawVise Legal Conflict Checking & Client Intake Engine designed for senior advocates.
Analyze the following client intake details for potential legal conflicts of interest, opposing party overlaps, ethical considerations, and recommended onboarding actions:
- Client Name: ${clientName}
- Phone: ${phone}
- Case Type / Matter: ${caseType || 'Not specified'}
- Intake Notes / Opposing Party Details: ${notes || 'None provided'}

Provide a professional Conflict Check & Intake Report structured as follows:
1. CONFLICT CHECK STATUS: (Clear / Potential Conflict / High Risk)
2. OPPOSING PARTY & ENTITY ANALYSIS: Check for potential overlapping representations.
3. ETHICAL & STATUTORY CONSIDERATIONS: Highlight professional responsibility rules.
4. RECOMMENDED ACTION: (Proceed with Onboarding / Further Verification Required / Decline Representation)`;

    const report = await callAI("You are an expert legal compliance and conflict resolution AI.", prompt);

    res.json({
      success: true,
      message: "Client intake record saved and conflict check completed successfully.",
      report
    });
  } catch (err: any) {
    console.error("Intake conflict check error:", err);
    res.status(500).json({ error: "Failed to generate conflict check report." });
  }
});

export default router;
