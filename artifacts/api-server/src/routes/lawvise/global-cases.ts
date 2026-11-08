import { Router, Request, Response } from "express";

const router: Router = Router();

/*
|--------------------------------------------------------------------------
| LAWISE GLOBAL CASE-LAW ENGINE
|--------------------------------------------------------------------------
| Purpose:
| Search and retrieve genuine judicial decisions.
|
| Automated connector:
| CourtListener REST API.
|
| Other jurisdictions:
| Official source directory, ready for additional connectors.
|
| IMPORTANT:
| Never generate fictional case names, citations or judgments.
|--------------------------------------------------------------------------
*/

const COURTLISTENER_API =
  "https://www.courtlistener.com/api/rest/v4";

const COURTLISTENER_WEBSITE =
  "https://www.courtlistener.com";

const REQUEST_TIMEOUT = 20000;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 20;

/*
|--------------------------------------------------------------------------
| JURISDICTION DIRECTORY
|--------------------------------------------------------------------------
*/

interface JurisdictionSource {
  code: string;
  name: string;
  courts: string[];
  source: string;
  website: string;
  automatedSearch: boolean;
  notes: string;
}

const JURISDICTIONS: JurisdictionSource[] = [
  {
    code: "IN",
    name: "India",
    courts: [
      "Supreme Court of India",
      "All High Courts",
      "District Courts",
    ],
    source: "Supreme Court of India / eCourts",
    website: "https://judgments.ecourts.gov.in/",
    automatedSearch: false,
    notes:
      "Official judgment portals are available. Automated retrieval requires a verified permitted access method; some searches use CAPTCHA.",
  },
  {
    code: "US",
    name: "United States",
    courts: [
      "Federal Courts",
      "State Courts",
      "Supreme Court",
      "Appellate Courts",
    ],
    source: "CourtListener",
    website: COURTLISTENER_WEBSITE,
    automatedSearch: true,
    notes:
      "Automated opinion search through the CourtListener REST API. Coverage depends on its indexed records.",
  },
  {
    code: "UK",
    name: "United Kingdom",
    courts: [
      "UK Supreme Court",
      "Court of Appeal",
      "High Court",
      "Selected Tribunals",
    ],
    source: "The National Archives - Find Case Law",
    website: "https://caselaw.nationalarchives.gov.uk/",
    automatedSearch: false,
    notes:
      "Public case-law service. Computational analysis requires the relevant licence.",
  },
  {
    code: "EU",
    name: "European Union",
    courts: [
      "Court of Justice of the European Union",
      "General Court",
    ],
    source: "CURIA",
    website: "https://curia.europa.eu/",
    automatedSearch: false,
    notes:
      "Official EU court judgment repository. Automated connector not yet configured.",
  },
  {
    code: "UAE",
    name: "United Arab Emirates",
    courts: [
      "Federal Courts",
      "Local Courts",
      "DIFC Courts",
      "ADGM Courts",
    ],
    source: "Official UAE judicial portals",
    website: "https://www.moj.gov.ae/",
    automatedSearch: false,
    notes:
      "Coverage and public access vary by court and emirate. Automated connector not yet configured.",
  },
  {
    code: "CA",
    name: "Canada",
    courts: [
      "Supreme Court of Canada",
      "Federal Courts",
      "Provincial Courts",
    ],
    source: "Supreme Court of Canada / CanLII",
    website: "https://www.canlii.org/",
    automatedSearch: false,
    notes:
      "Public legal research sources. Automated access requires a verified permitted integration.",
  },
  {
    code: "AU",
    name: "Australia",
    courts: [
      "High Court",
      "Federal Courts",
      "State and Territory Courts",
    ],
    source: "AustLII / Australian Courts",
    website: "https://www.austlii.edu.au/",
    automatedSearch: false,
    notes:
      "Public legal information repositories. Automated connector not yet configured.",
  },
];

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

interface CaseSearchResult {
  caseName: string;
  court: string;
  date: string | null;
  citation: string | null;
  docketNumber: string | null;
  source: string;
  sourceUrl: string | null;
  excerpt: string | null;
  sourceRecordId: string | number | null;
  jurisdiction: string;
  retrievalStatus: string;
}

/*
|--------------------------------------------------------------------------
| REQUEST HELPER
|--------------------------------------------------------------------------
*/

async function fetchJson(
  url: string,
  headers: Record<string, string> = {}
): Promise<any> {
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT
  );

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "LawVise-Legal-Research/1.0",
        ...headers,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const error: any = new Error(
        `Source returned HTTP ${response.status}`
      );

      error.status = response.status;

      const retryAfter = response.headers.get("Retry-After");

      if (retryAfter) {
        error.retryAfter = retryAfter;
      }

      throw error;
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

/*
|--------------------------------------------------------------------------
| COURTLISTENER CONNECTOR
|--------------------------------------------------------------------------
*/

async function searchCourtListener(
  query: string,
  pageSize: number
): Promise<CaseSearchResult[]> {
  const token = process.env.COURTLISTENER_API_TOKEN;

  if (!token) {
    throw new Error(
      "CourtListener API token is not configured."
    );
  }

  const params = new URLSearchParams();

  params.set("q", query);
  params.set("type", "o");
  params.set("page_size", String(pageSize));

  const url =
    `${COURTLISTENER_API}/search/?${params.toString()}`;

  const data = await fetchJson(url, {
    Authorization: `Token ${token}`,
  });

  const records = Array.isArray(data.results)
    ? data.results
    : [];

  return records.map((item: any): CaseSearchResult => {
    const absoluteUrl =
      typeof item.absolute_url === "string"
        ? item.absolute_url
        : null;

    return {
      caseName:
        item.caseName ||
        item.case_name ||
        "Case name not supplied by source",

      court:
        item.court ||
        item.court_name ||
        "Court not supplied by source",

      date:
        item.dateFiled ||
        item.date_filed ||
        null,

      citation:
        Array.isArray(item.citation)
          ? item.citation.join("; ")
          : item.citation || null,

      docketNumber:
        item.docketNumber ||
        item.docket_number ||
        null,

      source: "CourtListener",

      sourceUrl: absoluteUrl
        ? `${COURTLISTENER_WEBSITE}${absoluteUrl}`
        : null,

      excerpt:
        item.snippet ||
        null,

      sourceRecordId:
        item.cluster_id ||
        item.id ||
        null,

      jurisdiction: "US",

      retrievalStatus: "SOURCE_RECORD_RETRIEVED",
    };
  });
}

/*
|--------------------------------------------------------------------------
| SOURCE COVERAGE
|--------------------------------------------------------------------------
*/

router.get(
  "/sources",
  (_req: Request, res: Response) => {
    return res.json({
      success: true,
      engine: "LawVise Global Case-Law Engine",

      jurisdictions: JURISDICTIONS,

      automatedConnectors: [
        {
          name: "CourtListener",
          jurisdiction: "US",
          enabled: Boolean(
            process.env.COURTLISTENER_API_TOKEN
          ),
        },
      ],

      coverageNotice:
        "Not every court or country is connected yet. Automated retrieval is available only through configured connectors. Other sources are provided as official research destinations.",
    });
  }
);

/*
|--------------------------------------------------------------------------
| LIST SUPPORTED JURISDICTIONS
|--------------------------------------------------------------------------
*/

router.get(
  "/jurisdictions",
  (_req: Request, res: Response) => {
    return res.json({
      success: true,
      count: JURISDICTIONS.length,
      jurisdictions: JURISDICTIONS,
    });
  }
);

/*
|--------------------------------------------------------------------------
| GLOBAL CASE-LAW SEARCH
|--------------------------------------------------------------------------
|
| GET /global-cases/search?q=contract+breach
|
| Optional:
| jurisdiction=US
| limit=10
|
| jurisdiction=ALL searches configured connectors only.
|--------------------------------------------------------------------------
*/

router.get(
  "/search",
  async (req: Request, res: Response) => {
    const query = String(
      req.query.q || ""
    ).trim();

    const jurisdiction = String(
      req.query.jurisdiction || "ALL"
    ).trim().toUpperCase();

    const requestedLimit = Number(
      req.query.limit || DEFAULT_PAGE_SIZE
    );

    const limit = Number.isFinite(requestedLimit)
      ? Math.min(
          Math.max(requestedLimit, 1),
          MAX_PAGE_SIZE
        )
      : DEFAULT_PAGE_SIZE;

    if (!query) {
      return res.status(400).json({
        success: false,
        message:
          "Enter a legal issue, case name, citation or search phrase.",
      });
    }

    if (query.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Search query is too long.",
      });
    }

    const selected = JURISDICTIONS.find(
      (item) => item.code === jurisdiction
    );

    if (jurisdiction !== "ALL" && !selected) {
      return res.status(400).json({
        success: false,
        message: "Unsupported jurisdiction code.",
        supportedJurisdictions:
          JURISDICTIONS.map((item) => item.code),
      });
    }

    const results: CaseSearchResult[] = [];

    const connectorStatus: any[] = [];

    /*
     * CourtListener is the only automated connector
     * currently configured in this first version.
     */

    const shouldSearchCourtListener =
      jurisdiction === "US" ||
      jurisdiction === "ALL";

    if (shouldSearchCourtListener) {
      if (!process.env.COURTLISTENER_API_TOKEN) {
        connectorStatus.push({
          source: "CourtListener",
          jurisdiction: "US",
          status: "NOT_CONFIGURED",
          message:
            "Add COURTLISTENER_API_TOKEN to the backend environment.",
        });
      } else {
        try {
          const cases = await searchCourtListener(
            query,
            limit
          );

          results.push(...cases);

          connectorStatus.push({
            source: "CourtListener",
            jurisdiction: "US",
            status: "SUCCESS",
            resultCount: cases.length,
          });
        } catch (error: any) {
          connectorStatus.push({
            source: "CourtListener",
            jurisdiction: "US",
            status: "FAILED",
            message:
              error?.message ||
              "Case-law source unavailable.",
            httpStatus: error?.status || null,
            retryAfter: error?.retryAfter || null,
          });
        }
      }
    }

    /*
     * Other jurisdictions are not falsely represented
     * as automated searches.
     */

    const unavailableSources =
      JURISDICTIONS.filter((item) => {
        if (jurisdiction === "ALL") {
          return !item.automatedSearch;
        }

        return (
          item.code === jurisdiction &&
          !item.automatedSearch
        );
      });

    for (const source of unavailableSources) {
      connectorStatus.push({
        source: source.source,
        jurisdiction: source.code,
        status: "OFFICIAL_SOURCE_AVAILABLE",
        automatedSearch: false,
        website: source.website,
        message:
          "This official source is identified, but automated retrieval has not yet been integrated.",
      });
    }

    return res.json({
      success: true,

      query,

      requestedJurisdiction: jurisdiction,

      resultCount: results.length,

      results,

      connectors: connectorStatus,

      coverage: {
        automatedJurisdictions:
          connectorStatus
            .filter(
              (item) => item.status === "SUCCESS"
            )
            .map((item) => item.jurisdiction),

        notAutomated:
          unavailableSources.map(
            (item) => item.code
          ),
      },

      legalNotice:
        "Results are records retrieved from identified legal sources. A source record is not a substitute for reading and verifying the complete original judgment. Search coverage is not exhaustive.",
    });
  }
);

/*
|--------------------------------------------------------------------------
| CASE-LAW ENGINE HEALTH
|--------------------------------------------------------------------------
*/

router.get(
  "/health",
  (_req: Request, res: Response) => {
    return res.json({
      success: true,

      engine: "Global Case-Law Engine",

      status: "operational",

      connectors: {
        courtListener: {
          configured: Boolean(
            process.env.COURTLISTENER_API_TOKEN
          ),
        },
      },

      supportedJurisdictions:
        JURISDICTIONS.map((item) => item.code),
    });
  }
);

export default router;
