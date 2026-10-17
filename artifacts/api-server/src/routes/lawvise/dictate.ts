import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import OpenAI from "openai";
import multer from "multer";
import fs from "fs";

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Use multer to handle incoming audio file uploads temporarily
const upload = multer({ dest: "/tmp" });

router.post("/dictate", requireAuth, upload.single("audio"), async (req, res): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No audio file provided." });
      return;
    }

    // Step 1: Call OpenAI Whisper API for speech-to-text
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
      model: "whisper-1",
    });

    // Clean up temporary audio file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    const rawSpeechText = transcription.text;

    if (!rawSpeechText || !rawSpeechText.trim()) {
      res.status(400).json({ error: "Speech could not be parsed into clear text." });
      return;
    }

    // Step 2: Pass raw transcription through AI Legal Brief Reasoning Engine
    const systemPrompt = `
You are LawVise AI, an elite legal assistant and chamber briefing engine for practicing advocates.

CRITICAL RULES:
1. NEVER output generic plain text like "Counsel noted", "Appearance noted", or simple raw echo notes.
2. NEVER invent fake case titles or hallucinate legal names (e.g., Do NOT invent "Re: Arifa").
3. Analyze the spoken facts and construct a formal legal briefing note.

Output Structure Required:
⚖️ [LEGAL DICTATION & CHAMBER BRIEF]

• Matter Type: [Extract specific legal category, e.g., Guardianship / Interim Injunction / Criminal Bail]
• Fact Matrix Summary: [Structured bullet points of facts spoken by advocate]
• Statutory Provisions & Applicable Laws: [Cite exact statutory sections and acts]
• Strategic Next Steps & Chamber Action Pathways:
  1. [Actionable Step 1]
  2. [Actionable Step 2]
  3. [Actionable Step 3]
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Advocate Dictation:\n"${rawSpeechText}"` },
      ],
      temperature: 0.2,
    });

    const structuredBrief = completion.choices[0]?.message?.content || rawSpeechText;

    // Step 3: Return structured legal brief back to client
    res.status(200).json({
      success: true,
      text: structuredBrief,
      rawTranscription: rawSpeechText,
      transcription: structuredBrief,
    });
  } catch (err: any) {
    console.error("Dictation transcription error:", err);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: "Failed to process voice dictation." });
  }
});

export default router;
