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

    if (typeof facts !== "string" || !facts.trim()) {
      res.status(400).json({
        success: false,
        error: "Case facts are required.",
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

    const normalized = juris.trim().toUpperCase();

    const isUS = [
      "US",
      "USA",
      "UNITED STATES",
    ].includes(normalized);

    if (!isUS) {
      res.status(200).json({
        success: true,
        automatedSearchAvailable: false,
        jurisdiction: juris,
        matches: [],
        message:
          `Automated judgment retrieval is not yet connected for ${juris}. No unverified precedents have been generated.`,
      });
      return;
    }

    // STEP 1: Search CourtListener for actual case records.
    const retrievedCases = await searchCourtListener(
      facts.trim().slice(0, 500),
      20
    );

    // Only records with a real numeric cluster ID can be used
    // to retrieve their actual judgments.
    const uniqueCases = Array.from(
      new Map(
        retrievedCases
          .filter(
            (item) =>
              item.caseName &&
              item.citation &&
              item.sourceUrl &&
              item.sourceRecordId !== null &&
              /^\d+$/.test(String(item.sourceRecordId))
          )
          .map((item) => [
            String(item.sourceRecordId),
            item,
          ])
      ).values()
    );

    if (uniqueCases.length === 0) {
      res.status(200).json({
        success: true,
        automatedSearchAvailable: true,
        jurisdiction: juris,
        retrievedRecordCount: 0,
        resultCount: 0,
        matches: [],
        message:
          "No sufficiently complete CourtListener case records were retrieved.",
      });
      return;
    }

    // STEP 2: Retrieve actual judgment text.
    // Limit retrieval to 8 records to avoid excessive API requests.
    const casesWithJudgments: any[] = [];

    for (const item of uniqueCases.slice(0, 8)) {
      try {
        const opinions = await fetchCourtListenerJudgment(
          item.sourceRecordId as string | number
        );

        if (!opinions.length) {
          continue;
        }

        const judgmentText = opinions
          .map((opinion) => opinion.judgmentText)
          .filter(Boolean)
          .join("\n\n");

        if (!judgmentText.trim()) {
          continue;
        }

        casesWithJudgments.push({
          original: item,
          opinions,
          judgmentText,
        });
      } catch (error) {
        console.error(
          `Judgment retrieval failed for ${item.caseName}:`,
          error
        );
      }
    }

    if (casesWithJudgments.length === 0) {
      res.status(200).json({
        success: true,
        automatedSearchAvailable: true,
        jurisdiction: juris,
        retrievedRecordCount: uniqueCases.length,
        judgmentRetrievedCount: 0,
        resultCount: 0,
        matches: [],
        message:
          "Case records were found, but their actual judgment texts could not be retrieved. No AI precedent analysis was performed.",
      });
      return;
    }

    // STEP 3: Prepare judgment text for AI analysis.
    // The complete retrieved judgment is preserved for the response.
    // AI receives a limited text extract to control prompt size.
    const caseRecords = casesWithJudgments.map((entry) => ({
      sourceRecordId: String(entry.original.sourceRecordId),
      caseName: entry.original.caseName,
      court: entry.original.court,
      date: entry.original.date,
      citation: entry.original.citation,
      docketNumber: entry.original.docketNumber,
      opinionIds: entry.opinions.map(
        (opinion: any) => opinion.opinionId
      ),
      judgmentTextForAnalysis:
        entry.judgmentText.slice(0, 18000),
      analysisTextTruncated:
        entry.judgmentText.length > 18000,
    }));

    const systemPrompt = `
You are LawVise, a legal precedent analysis assistant.

You must analyse ONLY the actual judgment text supplied.

STRICT RULES:

1. Never introduce another case.
2. Never invent or modify case names, citations, courts or dates.
3. Never modify sourceRecordId.
4. Never invent a legal principle.
5. Base every legal principle on the supplied judgment text.
6. Explain the factual connection between the judgment and submitted facts.
7. If the supplied text does not support a relevant principle, exclude that case.
8. Do not rely on case titles or metadata alone.
9. A match score is an AI-estimated relevance percentage, not a verified legal finding.
10. Do not claim that the complete judgment was analysed when the supplied text says it was truncated.
11. Return at most 5 results.
12. Respond in ${lang}.
13. Return ONLY valid JSON.

Required format:

[
  {
    "sourceRecordId": "original record ID",
    "principle": "Principle supported by the supplied judgment text and its factual relevance",
    "matchScore": 85
  }
]

If no case is relevant, return [].
`;

    const userPrompt = `
JURISDICTION: United States

SUBMITTED CASE FACTS:
${facts.trim()}

RETRIEVED CASES AND ACTUAL JUDGMENT TEXT:
${JSON.stringify(caseRecords)}

Compare the submitted facts with the actual judgment text.
Return only valid JSON.
`;

    // STEP 4: Ask AI to analyse the retrieved judgment text.
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
        success: false,
        error: "Legal analysis service returned an empty response.",
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
      console.error(
        "Invalid Fact Matcher AI response:",
        aiResult
      );

      res.status(502).json({
        success: false,
        error: "Unable to process the legal analysis response.",
      });
      return;
    }

    const aiMatches = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.matches)
        ? parsed.matches
        : [];

    // STEP 5: Accept AI analysis only for records actually retrieved.
    // All original case metadata and judgment text come from CourtListener.
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
        const entry = casesWithJudgments.find(
          (item) =>
            String(item.original.sourceRecordId) ===
            String(match.sourceRecordId)
        );

        if (!entry) return null;

        const score = Number(match.matchScore);

        return {
          title: entry.original.caseName,
          citation: entry.original.citation,
          court: entry.original.court,
          date: entry.original.date,
          docketNumber: entry.original.docketNumber,

          caseUrl: entry.original.sourceUrl,
          source: entry.original.source,
          sourceRecordId: entry.original.sourceRecordId,

          opinionIds: entry.opinions.map(
            (opinion: any) => opinion.opinionId
          ),

          judgmentText: entry.judgmentText,
          judgmentTextStatus: "RETRIEVED_FROM_COURTLISTENER",

          principle: match.principle.trim(),

          matchScore:
            Number.isFinite(score) &&
            score >= 0 &&
            score <= 100
              ? score
              : null,

          matchScoreType: "AI_ESTIMATED",

          analysisTextTruncated:
            entry.judgmentText.length > 18000,

          retrievalStatus:
            "CASE_AND_JUDGMENT_TEXT_RETRIEVED",
        };
      })
      .filter(Boolean)
      .slice(0, 5);

    res.status(200).json({
      success: true,
      automatedSearchAvailable: true,
      jurisdiction: juris,

      retrievedRecordCount: uniqueCases.length,
      judgmentRetrievedCount: casesWithJudgments.length,

      resultCount: verifiedMatches.length,
      matches: verifiedMatches,

      message:
        verifiedMatches.length > 0
          ? "Precedent analysis is based on retrieved CourtListener judgment text. AI match scores are estimates. Verify the original judgments and subsequent treatment before relying on them."
          : "No relevant precedents were identified from the retrieved judgment texts.",
    });

  } catch (error: any) {
    console.error("Fact Matcher failed:", error);

    res.status(500).json({
      success: false,
      error:
        error?.message ||
        "Fact Matcher failed. Please try again.",
    });
  }
});

export default router;
