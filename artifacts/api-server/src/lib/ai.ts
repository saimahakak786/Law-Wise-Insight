import { logger } from "./logger";

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY || process.env.API_KEY || "";

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-3.8-flash";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

const ENABLE_GROQ_FALLBACK =
  process.env.ENABLE_GROQ_FALLBACK === "true";

const GROQ_MODEL =
  process.env.GROQ_MODEL || "openai/gpt-oss-120b";

const REQUEST_TIMEOUT = 30000;
const GEMINI_MAX_RETRIES = 2;

function getJurisdictionContext(jurisdiction?: string): string {
  switch (jurisdiction?.toUpperCase()) {
    case "INDIA":
    case "IN":
      return `
Apply Indian law.
Consider the Supreme Court of India, relevant High Courts,
applicable central and state legislation, and binding precedents.
Distinguish current legislation from repealed or transitional laws.
Never invent statutory sections or case citations.
`;

    case "USA":
    case "US":
      return `
Apply United States law.
Identify whether federal or state law applies.
Distinguish Supreme Court, federal appellate, district and state decisions.
Never invent case citations or statutory provisions.
`;

    case "UK":
      return `
Apply the law of the relevant UK jurisdiction.
Distinguish England and Wales, Scotland, and Northern Ireland.
Use appropriate UK legislation and court authorities.
Never invent neutral citations or judgments.
`;

    case "UAE":
      return `
Apply UAE law.
Distinguish federal law, individual Emirate law,
DIFC law and ADGM law where relevant.
Never invent legal provisions or judicial authorities.
`;

    default:
      return `
Apply the jurisdiction selected by the user.
If the jurisdiction is unclear, request clarification.
Do not assume that one country's laws apply globally.
Never invent legal authorities.
`;
  }
}

function buildSystemPrompt(
  systemPrompt: string,
  jurisdiction?: string
): string {
  return `
${systemPrompt}

JURISDICTION:
${getJurisdictionContext(jurisdiction)}

MANDATORY LEGAL ACCURACY RULES:

1. Never fabricate a case name, citation, court, judge or judgment.
2. Never invent statutory sections or legal provisions.
3. Never describe an AI-generated case suggestion as verified.
4. Clearly distinguish established law from legal interpretation.
5. If information cannot be verified, explicitly say so.
6. Do not claim to have searched a legal database unless an actual
   search and retrieval operation has taken place.
7. Do not manufacture match percentages or confidence scores.
8. If you lack sufficient information, acknowledge the limitation.
`;
}

function isTemporaryError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : String(error);

  return (
    /HTTP (429|500|502|503|504)/.test(message) ||
    /timeout|aborted|network|fetch failed/i.test(message)
  );
}

async function callGemini(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key is not configured.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT
  );

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: userPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      logger.error(
        {
          status: response.status,
          error: errorText.slice(0, 500),
        },
        "Gemini API request failed"
      );

      throw new Error(`Gemini returned HTTP ${response.status}.`);
    }

    const data = await response.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const result = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();

    if (!result) {
      throw new Error("Gemini returned an empty response.");
    }

    return result;
  } finally {
    clearTimeout(timeout);
  }
}

async function callGeminiWithRetry(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  for (let attempt = 0; attempt <= GEMINI_MAX_RETRIES; attempt++) {
    try {
      return await callGemini(systemPrompt, userPrompt);
    } catch (error) {
      if (
        attempt === GEMINI_MAX_RETRIES ||
        !isTemporaryError(error)
      ) {
        throw error;
      }

      const delay = 1000 * Math.pow(2, attempt);

      logger.warn(
        { attempt: attempt + 1, delay },
        "Temporary Gemini failure. Retrying."
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("Gemini retries exhausted.");
}

async function callGroq(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error("Groq API key is not configured.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT
  );

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.2,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      logger.error(
        {
          status: response.status,
          error: errorText.slice(0, 500),
        },
        "Groq API request failed"
      );

      throw new Error(`Groq returned HTTP ${response.status}.`);
    }

    const data = await response.json() as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

    const result =
      data.choices?.[0]?.message?.content?.trim();

    if (!result) {
      throw new Error("Groq returned an empty response.");
    }

    return result;
  } finally {
    clearTimeout(timeout);
  }
}

export async function callAI(
  systemPrompt: string,
  userPrompt: string,
  jurisdiction?: string
): Promise<string> {
  const enhancedPrompt = buildSystemPrompt(
    systemPrompt,
    jurisdiction
  );

  try {
    return await callGeminiWithRetry(
      enhancedPrompt,
      userPrompt
    );
  } catch (geminiError) {
    logger.warn(
      { error: geminiError },
      "Gemini unavailable after retries."
    );
  }

  if (ENABLE_GROQ_FALLBACK && GROQ_API_KEY) {
    try {
      logger.info("Attempting Groq fallback.");

      return await callGroq(
        enhancedPrompt,
        userPrompt
      );
    } catch (groqError) {
      logger.error(
  {
    message: groqError instanceof Error
      ? groqError.message
      : String(groqError),
    stack: groqError instanceof Error
      ? groqError.stack
      : undefined,
  },
  "Groq fallback failed."
);
    }
  }

  throw new Error(
    "AI services are currently unavailable. Please try again later."
  );
}

export async function streamAI(
  systemPrompt: string,
  userPrompt: string,
  onChunk: (text: string) => void,
  jurisdiction?: string
): Promise<string> {
  const result = await callAI(
    systemPrompt,
    userPrompt,
    jurisdiction
  );

  onChunk(result);

  return result;
}
