import { Router, Request, Response } from "express";

import {
  normalizeLegalSource,
  normalizeLegalSources,
  type LegalSource,
} from "../../services/jurisdictions/sourceNormalizer";

const router: Router = Router();

/* |--------------------------------------------------------------------------
   LAWISE GLOBAL CASE-LAW ENGINE

   Automated connector:
   USA - CourtListener

   Individual judgment retrieval:
   UK - The National Archives Find Case Law API

   Official research sources:
   India, UK and UAE

   IMPORTANT:
   Never generate fictional case names, citations or judgments.
   Never represent a portal link as a retrieved judgment.
   UK bulk discovery and computational analysis remain disabled.
|--------------------------------------------------------------------------
*/

const COURTLISTENER_API =
  "https://www.courtlistener.com/api/rest/v4";

const COURTLISTENER_WEBSITE =
  "https://www.courtlistener.com";

const UK_CASELAW_API =
  "https://caselaw.nationalarchives.gov.uk";

const UK_CASELAW_API_DOCS =
  "https://nationalarchives.github.io/ds-find-caselaw-docs/public";

const UK_COMPUTATIONAL_ANALYSIS_ENABLED = false;

const REQUEST_TIMEOUT = 20000;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 20;

/* |--------------------------------------------------------------------------
   COURT SOURCE TYPE
|--------------------------------------------------------------------------
*/

interface CourtSource {
  code: string;
  name: string;
  court: string;
  source: string;
  website: string;
  automatedSearch: boolean;
  notes: string;
}

/* |--------------------------------------------------------------------------
   INDIA - OFFICIAL COURT SOURCES
|--------------------------------------------------------------------------
*/

const INDIA_COURT_SOURCES: CourtSource[] = [
  {
    code: "IN-SC",
    name: "Supreme Court of India",
    court: "Supreme Court",
    source: "Supreme Court e-SCR",
    website: "https://scr.sci.gov.in/scrsearch/",
    automatedSearch: false,
    notes:
      "Official Supreme Court Reports judgment-search portal.",
  },
  {
    code: "IN-HC",
    name: "High Courts of India",
    court: "All High Courts",
    source: "eCourts High Court Services",
    website:
      "https://hcservices.ecourts.gov.in/hcservices/main.php",
    automatedSearch: false,
    notes:
      "Official High Court services portal. Select the relevant High Court and bench.",
  },
  {
    code: "IN-JK",
    name: "High Court of Jammu & Kashmir and Ladakh",
    court: "Jammu, Srinagar and Ladakh",
    source: "High Court of Jammu & Kashmir and Ladakh",
    website: "https://www.jkhighcourt.nic.in/",
    automatedSearch: false,
    notes:
      "Official High Court website. Includes judgment-search and court services.",
  },
];

/* |--------------------------------------------------------------------------
   UNITED STATES - COURT SOURCES
|--------------------------------------------------------------------------
*/

const US_COURT_SOURCES: CourtSource[] = [
  {
    code: "US",
    name: "United States Courts",
    court: "Federal and State Courts",
    source: "CourtListener",
    website: COURTLISTENER_WEBSITE,
    automatedSearch: true,
    notes:
      "Automated opinion search through the CourtListener REST API. Coverage depends on indexed records.",
  },
];

/* |--------------------------------------------------------------------------
   UNITED KINGDOM - COURT SOURCES
|--------------------------------------------------------------------------
*/

const UK_COURT_SOURCES: CourtSource[] = [
  {
    code: "UK-SC",
    name: "UK Supreme Court",
    court: "Supreme Court",
    source: "The National Archives - Find Case Law",
    website: UK_CASELAW_API,
    automatedSearch: false,
    notes:
      "Official UK Supreme Court case-law source. Individual judgment retrieval is available using a known National Archives Document URI.",
  },
  {
    code: "UK-CA",
    name: "England and Wales Court of Appeal",
    court: "Court of Appeal",
    source: "The National Archives - Find Case Law",
    website: UK_CASELAW_API,
    automatedSearch: false,
    notes:
      "Official Court of Appeal case-law source. Individual judgment retrieval is available using a known National Archives Document URI.",
  },
  {
    code: "UK-HC",
    name: "England and Wales High Court",
    court: "High Court",
    source: "The National Archives - Find Case Law",
    website: UK_CASELAW_API,
    automatedSearch: false,
    notes:
      "Official High Court case-law source. Individual judgment retrieval is available using a known National Archives Document URI.",
  },
  {
    code: "UK-SCOT",
    name: "Scottish Courts",
    court: "Scottish Courts",
    source: "Scottish Courts and Tribunals",
    website: "https://www.scotcourts.gov.uk/",
    automatedSearch: false,
    notes:
      "Official Scottish Courts website. Separate case-law integration is pending.",
  },
];

/* |--------------------------------------------------------------------------
   UAE - COURT SOURCES
|--------------------------------------------------------------------------
*/

const UAE_COURT_SOURCES: CourtSource[] = [
  {
    code: "UAE-FED",
    name: "UAE Federal Courts",
    court: "Federal Courts",
    source: "UAE Ministry of Justice",
    website:
      "https://www.moj.gov.ae/en/laws-and-legislation/court-judgments.aspx",
    automatedSearch: false,
    notes:
      "Official federal court judgment-search destination.",
  },
  {
    code: "UAE-DXB",
    name: "Dubai Courts",
    court: "Dubai Courts",
    source: "Dubai Courts",
    website: "https://www.dc.gov.ae/",
    automatedSearch: false,
    notes:
      "Official Dubai Courts website. Automated judgment retrieval is not configured.",
  },
  {
    code: "UAE-AD",
    name: "Abu Dhabi Judicial Department",
    court: "Abu Dhabi Courts",
    source: "Abu Dhabi Judicial Department",
    website: "https://www.adjd.gov.ae/",
    automatedSearch: false,
    notes: "Official Abu Dhabi judicial portal.",
  },
  {
    code: "UAE-DIFC",
    name: "DIFC Courts",
    court: "DIFC Courts",
    source: "DIFC Courts",
    website:
      "https://www.difccourts.ae/rules-decisions/judgments-orders",
    automatedSearch: false,
    notes: "Publicly available DIFC judgments and orders.",
  },
  {
    code: "UAE-ADGM",
    name: "ADGM Courts",
    court: "ADGM Courts",
    source: "ADGM Courts",
    website: "https://www.adgm.com/",
    automatedSearch: false,
    notes:
      "Official ADGM website. Dedicated judgment retrieval is not configured.",
  },
];

/* |--------------------------------------------------------------------------
   ALL COURT SOURCES
|--------------------------------------------------------------------------
*/

const ALL_COURT_SOURCES: CourtSource[] = [
  ...INDIA_COURT_SOURCES,
  ...US_COURT_SOURCES,
  ...UK_COURT_SOURCES,
  ...UAE_COURT_SOURCES,
];

/* |--------------------------------------------------------------------------
   JURISDICTION DIRECTORY
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
      "High Court of Jammu & Kashmir and Ladakh",
      "District Courts",
    ],
    source: "Supreme Court of India / eCourts",
    website: "https://judgments.ecourts.gov.in/",
    automatedSearch: false,
    notes:
      "Official judgment portals identified. Automated retrieval is pending.",
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
      "Automated opinion search through CourtListener. Coverage depends on indexed records.",
  },
  {
    code: "UK",
    name: "United Kingdom",
    courts: [
      "UK Supreme Court",
      "Court of Appeal",
      "High Court",
      "Scottish Courts",
      "Selected Tribunals",
    ],
    source: "The National Archives / Scottish Courts",
    website: UK_CASELAW_API,
    automatedSearch: false,
    notes:
      "Individual judgment retrieval is supported through the National Archives API using a known Document URI. Bulk discovery and computational analysis are disabled.",
  },
  {
    code: "UAE",
    name: "United Arab Emirates",
    courts: [
      "Federal Courts",
      "Dubai Courts",
      "Abu Dhabi Courts",
      "DIFC Courts",
      "ADGM Courts",
    ],
    source: "Official UAE judicial portals",
    website: "https://www.moj.gov.ae/",
    automatedSearch: false,
    notes:
      "Multiple judicial systems. Automated retrieval is pending.",
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
    notes: "Automated connector not yet configured.",
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
    notes: "Automated connector not yet configured.",
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
    notes: "Automated connector not yet configured.",
  },
];

/* |--------------------------------------------------------------------------
   CASE SEARCH RESULT TYPE
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

/* |--------------------------------------------------------------------------
   REQUEST HELPER
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

      const retryAfter =
        response.headers.get("Retry-After");

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

/* |--------------------------------------------------------------------------
   COURTLISTENER AUTOMATED CONNECTOR
|--------------------------------------------------------------------------
*/

export async function searchCourtListener(
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

      excerpt: item.snippet || null,

      sourceRecordId: item.cluster_id || null,

      jurisdiction: "US",

      retrievalStatus: "SOURCE_RECORD_RETRIEVED",
    };
  });
}

/* |--------------------------------------------------------------------------
   COURTLISTENER JUDGMENT RETRIEVAL
|--------------------------------------------------------------------------
*/

export interface CourtListenerOpinion {
  opinionId: number;
  opinionType: string | null;
  judgmentText: string;
}

export async function fetchCourtListenerJudgment(
  clusterId: string | number
): Promise<CourtListenerOpinion[]> {
  const token = process.env.COURTLISTENER_API_TOKEN;

  if (!token) {
    throw new Error(
      "CourtListener API token is not configured."
    );
  }

  const id = String(clusterId).trim();

  if (!/^\d+$/.test(id)) {
    throw new Error("Invalid CourtListener cluster ID.");
  }

  const headers = {
    Authorization: `Token ${token}`,
  };

  const cluster = await fetchJson(
    `${COURTLISTENER_API}/clusters/${id}/`,
    headers
  );

  const opinionLinks = Array.isArray(cluster.sub_opinions)
    ? cluster.sub_opinions
    : [];

  if (opinionLinks.length === 0) {
    return [];
  }

  const opinions = await Promise.all(
    opinionLinks.slice(0, 10).map(async (link: unknown) => {
      if (typeof link !== "string") {
        return null;
      }

      const match = link.match(/\/opinions\/(\d+)\/?/);

      if (!match) {
        return null;
      }

      const opinionId = Number(match[1]);

      try {
        const opinion = await fetchJson(
          `${COURTLISTENER_API}/opinions/${opinionId}/`,
          headers
        );

        const html =
          typeof opinion.html_with_citations === "string"
            ? opinion.html_with_citations
            : typeof opinion.html === "string"
              ? opinion.html
              : "";

        const plainText =
          typeof opinion.plain_text === "string"
            ? opinion.plain_text
            : "";

        const judgmentText = (html || plainText)
          .replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/gi, " ")
          .replace(/&amp;/gi, "&")
          .replace(/&quot;/gi, '"')
          .replace(/&#39;|&apos;/gi, "'")
          .replace(/&lt;/gi, "<")
          .replace(/&gt;/gi, ">")
          .replace(/\s+/g, " ")
          .trim();

        if (!judgmentText) {
          return null;
        }

        return {
          opinionId,
          opinionType:
            typeof opinion.type === "string"
              ? opinion.type
              : null,
          judgmentText,
        };
      } catch (error) {
        console.error(
          `CourtListener opinion ${opinionId} retrieval failed:`,
          error
        );

        return null;
      }
    })
  );

  return opinions.filter(
    (item): item is CourtListenerOpinion =>
      item !== null
  );
}

/* |--------------------------------------------------------------------------
   UK NATIONAL ARCHIVES - INDIVIDUAL JUDGMENT RETRIEVAL

   This endpoint retrieves a judgment when its Document URI
   is already known.

   It does not perform bulk discovery or computational analysis.
|--------------------------------------------------------------------------
*/

export interface UKJudgmentDocument {
  documentUri: string;
  source: string;
  sourceUrl: string;
  contentType: string;
  format: string;
  xml: string;
}

export async function fetchUKJudgment(
  documentUri: string
): Promise<UKJudgmentDocument> {
  const uri = String(documentUri || "").trim();

  if (
    !uri ||
    uri.length > 200 ||
    uri.startsWith("/") ||
    uri.includes("..") ||
    !/^[a-z0-9/-]+$/i.test(uri)
  ) {
    throw new Error(
      "Invalid National Archives document URI."
    );
  }

  const url = `${UK_CASELAW_API}/${uri}/data.xml`;

  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT
  );

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/akn+xml",
        "User-Agent": "LawVise-Legal-Research/1.0",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const error: any = new Error(
        `National Archives returned HTTP ${response.status}.`
      );

      error.status = response.status;

      const retryAfter =
        response.headers.get("Retry-After");

      if (retryAfter) {
        error.retryAfter = retryAfter;
      }

      throw error;
    }

    const contentType =
      response.headers.get("Content-Type") || "";

    if (!contentType.toLowerCase().includes("xml")) {
      throw new Error(
        "Unexpected response format from National Archives."
      );
    }

    const xml = await response.text();

    if (!xml.trim()) {
      throw new Error(
        "National Archives returned an empty document."
      );
    }

    return {
      documentUri: uri,
      source: "The National Archives - Find Case Law",
      sourceUrl: `${UK_CASELAW_API}/${uri}`,
      contentType,
      format: "Akoma Ntoso XML",
      xml,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/* |--------------------------------------------------------------------------
   SOURCE DIRECTORY HELPER
|--------------------------------------------------------------------------
*/

function getSourcesForJurisdiction(
  jurisdiction: string
): CourtSource[] {
  switch (jurisdiction) {
    case "IN":
      return INDIA_COURT_SOURCES;

    case "UK":
      return UK_COURT_SOURCES;

    case "UAE":
      return UAE_COURT_SOURCES;

    case "US":
      return US_COURT_SOURCES;

    case "ALL":
      return ALL_COURT_SOURCES;

    default:
      return [];
  }
}

/* |--------------------------------------------------------------------------
   INDIA - ALL COURT SOURCES
|--------------------------------------------------------------------------
*/

router.get(
  "/india/sources",
  (_req: Request, res: Response) => {
    return res.json({
      success: true,
      jurisdiction: "India",
      sources: INDIA_COURT_SOURCES,
      notice:
        "Official research destinations only. Automated Indian judgment retrieval is not yet configured.",
    });
  }
);

/* |--------------------------------------------------------------------------
   UK COURT SOURCES
|--------------------------------------------------------------------------
*/

router.get("/uk/sources", (_req: Request, res: Response) => {
  return res.json({
    success: true,
    jurisdiction: "United Kingdom",
    sources: UK_COURT_SOURCES,
    individualJudgmentRetrieval: true,
    automatedDiscovery: false,
    computationalAnalysis: UK_COMPUTATIONAL_ANALYSIS_ENABLED,
    documentation: UK_CASELAW_API_DOCS,
    notice:
      "Individual judgment retrieval is available through the National Archives Find Case Law service. Bulk discovery and computational analysis remain disabled pending the required licence permissions.",
  });
});

router.get("/usa/sources", (_req: Request, res: Response) => {
  return res.json({
    success: true,
    jurisdiction: "United States",
    sources: US_COURT_SOURCES,
    automatedSearch: true,
  });
});

router.get("/uae/sources", (_req: Request, res: Response) => {
  return res.json({
    success: true,
    jurisdiction: "United Arab Emirates",
    sources: UAE_COURT_SOURCES,
    automatedSearch: false,
  });
});

router.get("/sources", (_req: Request, res: Response) => {
  return res.json({
    success: true,
    jurisdictions: JURISDICTIONS,
    sources: ALL_COURT_SOURCES,
  });
});

export default router;
