import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { UploadDocumentBody, UploadDocumentResponse } from "@workspace/api-zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import mammoth from "mammoth";

const router = Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function extractTextWithGemini(fileBase64: string, mimeType: string, prompt: string): Promise<string> {
  // Fixed model name to gemini-2.5-flash
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent([
    { inlineData: { mimeType, data: fileBase64 } },
    prompt,
  ]);
  return result.response.text();
}

router.post(["/upload", "/lawwise/upload"], requireAuth, async (req, res): Promise<void> => {
  const parsed = UploadDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { fileBase64, mimeType, fileName } = parsed.data;

  if (fileBase64.length > 13_000_000) {
    res.status(400).json({ error: "File too large. Maximum size is 10MB." });
    return;
  }

  let extractedText = "";

  try {
    if (mimeType === "application/pdf") {
      extractedText = await extractTextWithGemini(
        fileBase64,
        mimeType,
        "Extract all text meticulously from this legal PDF document. Preserve structure and formatting."
      );
    } else if (mimeType.includes("wordprocessingml") || mimeType.includes("msword")) {
      const buffer = Buffer.from(fileBase64, "base64");
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else if (mimeType.startsWith("image/")) {
      extractedText = await extractTextWithGemini(
        fileBase64,
        mimeType,
        "Perform high-precision legal OCR on this image. Extract all readable text accurately."
      );
    } else {
      res.status(400).json({ error: `Unsupported file type: ${mimeType}` });
      return;
    }
  } catch (err) {
    req.log.error({ err }, "Document text extraction failed");
    res.status(500).json({ error: "Failed to extract text from document." });
    return;
  }

  res.json(
    UploadDocumentResponse.parse({
      extractedText,
      fileName,
      mimeType,
      pageCount: null,
    })
  );
});

export default router;
