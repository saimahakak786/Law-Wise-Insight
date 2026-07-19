import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { DraftDocumentBody } from "@workspace/api-zod";
import { streamAI } from "../../lib/ai";

const router = Router();

router.post("/lawvise/draft", requireAuth, async (req, res): Promise<void> => {
  const parsed = DraftDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { documentType, jurisdiction, details, language } = parsed.data;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const lang = language ?? "English";
  const systemPrompt = `You are LawVise, an expert AI legal document drafter with deep knowledge of ${jurisdiction} law. Draft professional, legally sound, and comprehensive documents. Use precise legal language, include all standard clauses, protective provisions, and compliance requirements. Use [PARTY NAME], [DATE], [AMOUNT] as placeholders where specific information is not provided. Respond in ${lang}.`;

  const userPrompt = `Draft a professional ${documentType} governed by ${jurisdiction} law.\n\n${
    details
      ? `Details and requirements:\n${details}`
      : "Include all standard clauses, terms, and provisions typically found in this type of document. Make it comprehensive and enforceable."
  }\n\nProvide the complete, formatted document ready for use.`;

  try {
    await streamAI(systemPrompt, userPrompt, (text) => {
      res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
    });
  } catch (err) {
    req.log.error({ err }, "Document drafting failed");
    res.write(`data: ${JSON.stringify({ error: "Drafting failed. Please try again." })}\n\n`);
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

export default router;
