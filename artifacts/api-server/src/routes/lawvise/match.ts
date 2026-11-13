import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { callAI } from "../../lib/ai";
import { Router } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { callAI } from "../../lib/ai";
import {
  searchCourtListener,
  fetchCourtListenerJudgment,
} from "./global-cases";

const router = Router();

router.post("/match", requireAuth, async (req, res): Promise<void> => {
  try {
    const { facts, jurisdiction, language } = req.body;

    if (
      typeof facts !== "string" ||
      !facts.trim()
    ) {
      res.status(400).json({
        error: "Case facts are required."
      });
      return;
    }

    const juris =
      typeof jurisdiction === "string" && jurisdiction.trim()
        ? jurisdiction.trim()
        : "India";

    const lang =
      typeof language === "string" && language.trim()
        ? language.trim()
        : "English";

    // Normalize the selected jurisdiction.
    const normalized = juris.trim().toUpperCase();

    // CourtListener is currently the only automated connector.
    const isUS =
      normalized === "US" ||
      normalized === "USA" ||
      normalized === "UNITED STATES";

    if (!isUS) {
      res.status(200).json({
        success: true,
        automatedSearchAvailable: false,
        jurisdiction: juris,
        matches: [],
        message:
          `Automated judgment retrieval is not yet connected for ${juris}. No unverified precedents have been generated.`
      });
      return;
    }

    // Search the real legal database first.
    const retrievedCases = await searchCourtListener(
      facts.trim().slice(0, 500),
      20
    );

    // Keep only records with identifiable source details.
    const uniqueCases = Array.from(
      new Map(
        retrievedCases
          .filter(
            (item) =>
              item.caseName &&
              item.citation &&
              item.sourceUrl &&
              item.sourceRecordId
          )
          .map((item) => [
            String(item.sourceRecordId),
            item
          ])
      ).values()
    );

    if (uniqueCases.length === 0) {
      res.status(200).json({
        success: true,
        automatedSearchAvailable: true,
        jurisdiction: juris,
        matches: [],
        message:
          "No sufficiently complete case records were retrieved. No precedents have been invented."
      });
      return;
    }

    // Only retrieved records are provided to AI.
    const caseRecords = uniqueCases.map((item) => ({
      sourceRecordId: String(item.sourceRecordId),
      caseName: item.caseName,
      court: item.court,
      date: item.date,
      citation: item.citation,
      docketNumber: item.docketNumber
    }));

    const systemPrompt = `
You are LawVise, a legal precedent analysis assistant.

Analyse ONLY the case records supplied to you.

STRICT RULES:

1. Never introduce another case.
2. Never invent case names, citations, courts or dates.
3. Do not modify sourceRecordId.
4. Do not create missing legal principles.
5. If a case is not relevant, exclude it.
6. Explain the actual relevance of each selected case.
7. Do not describe an estimated relevance score as a verified fact.
8. Return ONLY valid JSON.
9. Return at most 5 results.
10. Respond in ${lang}.

Required JSON format:

[
  {
    "sourceRecordId": "original record ID",
    "principle": "Relevant legal principle and factual connection",
    "matchScore": "Estimated relevance percentage"
  }
]

If no supplied case is relevant, return [].
`;

    const userPrompt = `
JURISDICTION: United States

SUBMITTED CASE FACTS:
${facts.trim()}

RETRIEVED COURT RECORDS:
${JSON.stringify(caseRecords)}

Analyse these records against the submitted facts.
Return only valid JSON.
`;

    const aiResult = await callAI(
      systemPrompt,
      userPrompt,
      "US"
    );

    if (
      typeof aiResult !== "string" ||
      !aiResult.trim()
    ) {
      res.status(502).json({
        error: "Legal analysis service returned an empty response."
      });
      return;
    }

    const cleaned = aiResult
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    let parsed: any;

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Invalid Fact Matcher AI response:", aiResult);

      res.status(502).json({
        error: "Unable to process the legal analysis response."
      });
      return;
    }

    const aiMatches = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.matches)
        ? parsed.matches
        : [];

    // AI may select records, but cannot supply case metadata.
    const verifiedMatches = aiMatches
      .filter(
        (match: any) =>
          match &&
          typeof match === "object" &&
          match.sourceRecordId !== undefined &&
          typeof match.principle === "string" &&
          match.principle.trim()
      )
      .map((match: any) => {
        const original = uniqueCases.find(
          (item) =>
            String(item.sourceRecordId) ===
            String(match.sourceRecordId)
        );

        if (!original) return null;

        return {
          title: original.caseName,
          citation: original.citation,
          court: original.court,
          date: original.date,
          docketNumber: original.docketNumber,
          principle: match.principle.trim(),
          matchScore:
            typeof match.matchScore === "string"
              ? match.matchScore
              : "Not provided",
          source: original.source,
          sourceUrl: original.sourceUrl,
          sourceRecordId: original.sourceRecordId,
          retrievalStatus: original.retrievalStatus
        };
      })
      .filter(Boolean)
      .slice(0, 5);

    res.status(200).json({
      success: true,
      automatedSearchAvailable: true,
      jurisdiction: juris,
      retrievedRecordCount: uniqueCases.length,
      resultCount: verifiedMatches.length,
      matches: verifiedMatches,
      message:
        verifiedMatches.length > 0
          ? "Analysis is based on retrieved CourtListener records. Verify the original judgments before relying on them."
          : "No relevant matching precedents were identified among the retrieved records."
    });

  } catch (error: any) {
    console.error("Fact Matcher failed:", error);

    res.status(500).json({
      error:
        error?.message ||
        "Fact Matcher failed. Please try again."
    });
  }
});

export default router;


const router = Router();

router.post("/match", requireAuth, async (req, res): Promise<void> => {
  try {
    const { facts, jurisdiction, language } = req.body;

    if (
      typeof facts !== "string" ||
      !facts.trim()
    ) {
      res.status(400).json({
        error: "Case facts are required."
      });
      return;
    }

    const juris =
      typeof jurisdiction === "string" && jurisdiction.trim()
        ? jurisdiction.trim()
        : "India";

    const lang =
      typeof language === "string" && language.trim()
        ? language.trim()
        : "English";

    // Normalize the selected jurisdiction.
    const normalized = juris.trim().toUpperCase();

    // CourtListener is currently the only automated connector.
    const isUS =
      normalized === "US" ||
      normalized === "USA" ||
      normalized === "UNITED STATES";

    if (!isUS) {
      res.status(200).json({
        success: true,
        automatedSearchAvailable: false,
        jurisdiction: juris,
        matches: [],
        message:
          `Automated judgment retrieval is not yet connected for ${juris}. No unverified precedents have been generated.`
      });
      return;
    }

    // Search the real legal database first.
    const retrievedCases = await searchCourtListener(
      facts.trim().slice(0, 500),
      20
    );

    // Keep only records with identifiable source details.
    const uniqueCases = Array.from(
      new Map(
        retrievedCases
          .filter(
            (item) =>
              item.caseName &&
              item.citation &&
              item.sourceUrl &&
              item.sourceRecordId
          )
          .map((item) => [
            String(item.sourceRecordId),
            item
          ])
      ).values()
    );

    if (uniqueCases.length === 0) {
      res.status(200).json({
        success: true,
        automatedSearchAvailable: true,
        jurisdiction: juris,
        matches: [],
        message:
          "No sufficiently complete case records were retrieved. No precedents have been invented."
      });
      return;
    }

    // Only retrieved records are provided to AI.
    const caseRecords = uniqueCases.map((item) => ({
      sourceRecordId: String(item.sourceRecordId),
      caseName: item.caseName,
      court: item.court,
      date: item.date,
      citation: item.citation,
      docketNumber: item.docketNumber
    }));

    const systemPrompt = `
You are LawVise, a legal precedent analysis assistant.

Analyse ONLY the case records supplied to you.

STRICT RULES:

1. Never introduce another case.
2. Never invent case names, citations, courts or dates.
3. Do not modify sourceRecordId.
4. Do not create missing legal principles.
5. If a case is not relevant, exclude it.
6. Explain the actual relevance of each selected case.
7. Do not describe an estimated relevance score as a verified fact.
8. Return ONLY valid JSON.
9. Return at most 5 results.
10. Respond in ${lang}.

Required JSON format:

[
  {
    "sourceRecordId": "original record ID",
    "principle": "Relevant legal principle and factual connection",
    "matchScore": "Estimated relevance percentage"
  }
]

If no supplied case is relevant, return [].
`;

    const userPrompt = `
JURISDICTION: United States

SUBMITTED CASE FACTS:
${facts.trim()}

RETRIEVED COURT RECORDS:
${JSON.stringify(caseRecords)}

Analyse these records against the submitted facts.
Return only valid JSON.
`;

    const aiResult = await callAI(
      systemPrompt,
      userPrompt,
      "US"
    );

    if (
      typeof aiResult !== "string" ||
      !aiResult.trim()
    ) {
      res.status(502).json({
        error: "Legal analysis service returned an empty response."
      });
      return;
    }

    const cleaned = aiResult
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    let parsed: any;

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Invalid Fact Matcher AI response:", aiResult);

      res.status(502).json({
        error: "Unable to process the legal analysis response."
      });
      return;
    }

    const aiMatches = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.matches)
        ? parsed.matches
        : [];

    // AI may select records, but cannot supply case metadata.
    const verifiedMatches = aiMatches
      .filter(
        (match: any) =>
          match &&
          typeof match === "object" &&
          match.sourceRecordId !== undefined &&
          typeof match.principle === "string" &&
          match.principle.trim()
      )
      .map((match: any) => {
        const original = uniqueCases.find(
          (item) =>
            String(item.sourceRecordId) ===
            String(match.sourceRecordId)
        );

        if (!original) return null;

        return {
          title: original.caseName,
          citation: original.citation,
          court: original.court,
          date: original.date,
          docketNumber: original.docketNumber,
          principle: match.principle.trim(),
          matchScore:
            typeof match.matchScore === "string"
              ? match.matchScore
              : "Not provided",
          source: original.source,
          sourceUrl: original.sourceUrl,
          sourceRecordId: original.sourceRecordId,
          retrievalStatus: original.retrievalStatus
        };
      })
      .filter(Boolean)
      .slice(0, 5);

    res.status(200).json({
      success: true,
      automatedSearchAvailable: true,
      jurisdiction: juris,
      retrievedRecordCount: uniqueCases.length,
      resultCount: verifiedMatches.length,
      matches: verifiedMatches,
      message:
        verifiedMatches.length > 0
          ? "Analysis is based on retrieved CourtListener records. Verify the original judgments before relying on them."
          : "No relevant matching precedents were identified among the retrieved records."
    });

  } catch (error: any) {
    console.error("Fact Matcher failed:", error);

    res.status(500).json({
      error:
        error?.message ||
        "Fact Matcher failed. Please try again."
    });
  }
});

export default router;
