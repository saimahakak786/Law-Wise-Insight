import { Router, Request, Response } from "express";

const router: Router = Router();

/*
|--------------------------------------------------------------------------
| LAWISE GLOBAL CASE-LAW ENGINE
|--------------------------------------------------------------------------
| Automated connector:
| USA - CourtListener
|
| Official research sources:
| India, UK and UAE
|
| IMPORTANT:
| Never generate fictional case names, citations or judgments.
| Never represent a portal link as a retrieved judgment.
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
| COURT SOURCE TYPE
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

/*
|--------------------------------------------------------------------------
| INDIA - OFFICIAL COURT SOURCES
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

/*
|--------------------------------------------------------------------------
| UNITED STATES - COURT SOURCES
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

/*
|--------------------------------------------------------------------------
| UNITED KINGDOM - COURT SOURCES
|--------------------------------------------------------------------------
*/

const UK_COURT_SOURCES: CourtSource[] = [
  {
    code: "UK-SC",
    name: "UK Supreme Court",
    court: "Supreme Court",
    source: "The National Archives - Find Case Law",
    website: "https://caselaw.nationalarchives.gov.uk/",
    automatedSearch: false,
    notes:
      "Official UK Supreme Court case-law search destination.",
  },
  {
    code: "UK-CA",
    name: "England and Wales Court of Appeal",
    court: "Court of Appeal",
    source: "The National Archives - Find Case Law",
    website: "https://caselaw.nationalarchives.gov.uk/",
    automatedSearch: false,
    notes:
      "Official Court of Appeal case-law search destination.",
  },
  {
    code: "UK-HC",
    name: "England and Wales High Court",
    court: "High Court",
    source: "The National Archives - Find Case Law",
    website: "https://caselaw.nationalarchives.gov.uk/",
    automatedSearch: false,
    notes:
      "Official High Court case-law search destination.",
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

/*
|--------------------------------------------------------------------------
| UAE - COURT SOURCES
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
    notes:
      "Official Abu Dhabi judicial portal.",
  },
  {
    code: "UAE-DIFC",
    name: "DIFC Courts",
    court: "DIFC Courts",
    source: "DIFC Courts",
    website:
      "https://www.difccourts.ae/rules-decisions/judgments-orders",
    automatedSearch: false,
    notes:
      "Publicly available DIFC judgments and orders.",
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

/*
|--------------------------------------------------------------------------
| ALL COURT SOURCES
|--------------------------------------------------------------------------
*/

const ALL_COURT_SOURCES: CourtSource[] = [
  ...INDIA_COURT_SOURCES,
  ...US_COURT_SOURCES,
  ...UK_COURT_SOURCES,
  ...UAE_COURT_SOURCES,
];

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
    website: "https://caselaw.nationalarchives.gov.uk/",
    automatedSearch: false,
    notes:
      "Official case-law sources identified. Automated retrieval and licensing checks are pending.",
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

/*
|--------------------------------------------------------------------------
| CASE SEARCH RESULT TYPE
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

/*
|--------------------------------------------------------------------------
| COURTLISTENER AUTOMATED CONNECTOR
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

      excerpt: item.snippet || null,

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
| SOURCE DIRECTORY HELPER
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

/*
|--------------------------------------------------------------------------
| ALL INDIAN COURT SOURCES
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

/*
|--------------------------------------------------------------------------
| UK COURT SOURCES
|--------------------------------------------------------------------------
*/

router.get(
  "/uk/sources",
  (_req: Request, res: Response) => {
    return res.json({
      success: true,
      jurisdiction: "United Kingdom",
      sources: UK_COURT_SOURCES,
      notice:
        "Official research destinations. Check the applicable licence before computational analysis or automated reuse of judgments.",
    });
  }
);

/*
|--------------------------------------------------------------------------
| UAE COURT SOURCES
|--------------------------------------------------------------------------
*/

router.get(
  "/uae/sources",
  (_req: Request, res: Response) => {
    return res.json({
      success: true,
      jurisdiction: "United Arab Emirates",
      sources: UAE_COURT_SOURCES,
      notice:
        "Official court research destinations. Automated judgment retrieval is not yet configured.",
    });
  }
);

/*
|--------------------------------------------------------------------------
| GLOBAL SOURCE DIRECTORY
|--------------------------------------------------------------------------
*/

router.get(
  "/sources",
  (_req: Request, res: Response) => {
    return res.json({
      success: true,
      engine: "LawVise Global Case-Law Engine",

      jurisdictions: JURISDICTIONS,

      courtSources: ALL_COURT_SOURCES,

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
        "CourtListener is currently the only automated case-law connector. Other jurisdictions provide official research destinations, not automatically retrieved judgments.",
    });
  }
);

/*
|--------------------------------------------------------------------------
| SUPPORTED JURISDICTIONS
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
| Examples:
|
| /search?q=contract+breach&jurisdiction=IN
| /search?q=contract+breach&jurisdiction=IN&court=IN-JK
| /search?q=negligence&jurisdiction=UK&court=UK-SC
| /search?q=contract&jurisdiction=UAE&court=UAE-DIFC
| /search?q=negligence&jurisdiction=US
| /search?q=contract&jurisdiction=ALL
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

    const court = String(
      req.query.court || ""
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

    const selectedJurisdiction =
      JURISDICTIONS.find(
        (item) => item.code === jurisdiction
      );

    if (
      jurisdiction !== "ALL" &&
      !selectedJurisdiction
    ) {
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
     * OFFICIAL COURT SEARCH DESTINATIONS
     */

    const availableSources =
      getSourcesForJurisdiction(jurisdiction);

    let selectedSources = availableSources;

    if (court) {
      selectedSources = availableSources.filter(
        (item) => item.code === court
      );

      if (selectedSources.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            "Court selection does not belong to the selected jurisdiction.",
          availableCourts:
            availableSources.map((item) => ({
              code: item.code,
              name: item.name,
            })),
        });
      }
    }

    for (const source of selectedSources) {
      if (source.automatedSearch) {
        continue;
      }

      connectorStatus.push({
        source: source.source,
        jurisdiction:
          source.code.split("-")[0],
        courtCode: source.code,
        court: source.name,
        status: "OFFICIAL_SEARCH_AVAILABLE",
        automatedSearch: false,
        website: source.website,
        searchQuery: query,
        message:
          "Open the official portal and enter the search phrase. LawVise has not retrieved judgment records from this portal.",
      });
    }

    /*
     * AUTOMATED US SEARCH
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
     * OTHER JURISDICTIONS WITHOUT CONNECTORS
     */

    const otherUnavailableSources =
      jurisdiction === "ALL"
        ? JURISDICTIONS.filter(
            (item) =>
              !["IN", "US", "UK", "UAE"].includes(
                item.code
              )
          )
        : jurisdiction === "EU" ||
            jurisdiction === "CA" ||
            jurisdiction === "AU"
          ? [selectedJurisdiction!]
          : [];

    for (const source of otherUnavailableSources) {
      connectorStatus.push({
        source: source.source,
        jurisdiction: source.code,
        status: "OFFICIAL_SOURCE_AVAILABLE",
        automatedSearch: false,
        website: source.website,
        message:
          "Official source identified, but automated retrieval is not yet integrated.",
      });
    }

    return res.json({
      success: true,

      query,

      requestedJurisdiction: jurisdiction,

      selectedCourt: court || null,

      resultCount: results.length,

      results,

      connectors: connectorStatus,

      legalNotice:
        "Only records actually retrieved from an integrated source appear in results. Official search destinations are listed separately. Always verify the complete original judgment, citation and subsequent treatment.",
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

      engine: "LawVise Global Case-Law Engine",

      status: "operational",

      connectors: {
        courtListener: {
          configured: Boolean(
            process.env.COURTLISTENER_API_TOKEN
          ),
        },

        india: {
          configured: false,
          officialSources:
            INDIA_COURT_SOURCES.length,
        },

        uk: {
          configured: false,
          officialSources:
            UK_COURT_SOURCES.length,
        },

        uae: {
          configured: false,
          officialSources:
            UAE_COURT_SOURCES.length,
        },
      },

      supportedJurisdictions:
        JURISDICTIONS.map((item) => item.code),
    });
  }
);

export default router;
