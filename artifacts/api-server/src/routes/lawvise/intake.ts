import { Router, Request, Response } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { callAI } from "../../lib/ai";

const router = Router();

const INTAKE_SYSTEM_PROMPT = `You are LawVise, an elite legal practice management and conflict-checking engine designed for senior advocates, barristers, and law firms.

CRITICAL INSTRUCTIONS:
1. Perform a thorough conflict-of-interest analysis based on the client name, opposing party details, and background notes provided.
2. Outline an executive intake summary, potential conflict flags, and structured next steps for the firm.
3. Ground all guidance under the specified jurisdiction's professional conduct and practice rules.`;

router.post("/intake", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { clientName, phone, caseType, notes, jurisdiction, language } = req.body;

    if (!clientName || !phone) {
      res.status(400).json({ error: "Client Full Name and Phone number are required." });
      return;
    }

    const lang = language ?? "English";
    const juris = jurisdiction ?? "India";

    const systemPrompt = `${INTAKE_SYSTEM_PROMPT}\n\nACTIVE JURISDICTION: ${juris}. Respond strictly in ${lang}.`;
    
    const userPrompt = `New Client Intake & Conflict Check Request:\n` +
      `- Client Full Name: ${clientName}\n` +
      `- Phone: ${phone}\n` +
      `- Case Type / Matter: ${caseType || 'General Consultation'}\n` +
      `- Intake Notes / Opposing Party / Background Facts: ${notes || 'None provided'}\n` +
      `- Jurisdiction: ${juris}\n\n` +
      `Provide a comprehensive conflict check and client intake assessment report.`;

    const report = await callAI(systemPrompt, userPrompt, juris);

    res.status(200).json({
      success: true,
      report,
      result: report,
    });
  } catch (err: any) {
    console.error("Client intake and conflict check failed:", err);
    res.status(500).json({ error: "Intake processing failed. Please try again." });
  }
});

export default router;
