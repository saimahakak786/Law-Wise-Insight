import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import OpenAI from "openai";
import multer from "multer";
import fs from "fs";

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Use multer to handle incoming audio file uploads temporarily
const upload = multer({ dest: "/tmp" });

router.post("/lawwise/dictate", requireAuth, upload.single("audio"), async (req, res): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No audio file provided." });
      return;
    }

    // Call OpenAI Whisper API for transcription & multi-language translation to English
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
      model: "whisper-1",
      // Optional: prompt or language settings if needed
    });

    // Clean up temporary file
    fs.unlinkSync(req.file.path);

    res.json({ transcription: transcription.text });
  } catch (err: any) {
    console.error("Dictation transcription error:", err);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: "Failed to transcribe audio recording." });
  }
});

export default router;
