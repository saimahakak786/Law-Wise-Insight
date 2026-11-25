import { Router, Request, Response } from "express";

const router: Router = Router();

/* --------------------------------------------------------------------------
LAWISE GLOBAL CASE-LAW ENGINE

Automated search and judgment retrieval:
USA - CourtListener

User-driven case search and individual judgment retrieval:
UK - The National Archives Find Case Law API

Official research destinations:
India and UAE

IMPORTANT:

- Never generate fictional cases or citations.
- Never represent a portal link as a retrieved judgment.
- UK bulk discovery and computational analysis remain disabled.
  -------------------------------------------------------------------------- */

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

/* --------------------------------------------------------------------------
TYPES
-------------------------------------------------------------------------- */

interface CourtSource {
code: string;
name: string;
court: string;
source: string;
website: string;
automatedSearch: boolean;
notes: string;
}

interface JurisdictionSource {
code: string;
name: string;
courts: string[];
source: string;
website: string;
automatedSearch: boolean;
notes: string;
}

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

export interface CourtListenerOpinion {
opinionId: number;
opinionType: string | null;
judgmentText: string;
}

export interface UKJudgmentDocument {
documentUri: string;
source: string;
sourceUrl: string;
contentType: string;
format: string;
xml: string;
}

interface UKSearchResult {
caseName: string;
court: string;
date: string | null;
citation: string | null;
documentUri: string | null;
source: string;
sourceUrl: string | null;
excerpt: string | null;
jurisdiction: string;
retrievalStatus: string;
}

/* --------------------------------------------------------------------------
INDIA - OFFICIAL COURT SOURCES
-------------------------------------------------------------------------- */

const INDIA_COURT_SOURCES: CourtSource[] = [
{
code: "IN-SC",
name: "Supreme Court of India",
court: "Supreme Court",
source: "Supreme Court e-SCR",
website: "https://scr.sci.gov.in/scrsearch/",
automatedSearch: false,
notes: "Official Supreme Court Reports judgment-search portal.",
},
{
code: "IN-HC",
name: "High Courts of India",
court: "All High Courts",
source: "eCourts High Court Services",
website: "https://hcservices.ecourts.gov.in/hcservices/main.php",
automatedSearch: false,
notes: "Select the relevant High Court and bench on the official portal.",
},
{
code: "IN-JK",
name: "High Court of Jammu & Kashmir and Ladakh",
court: "Jammu, Srinagar and Ladakh",
source: "High Court of Jammu & Kashmir and Ladakh",
website: "https://www.jkhighcourt.nic.in/",
automatedSearch: false,
notes: "Official High Court website and court services.",
},
];

/* --------------------------------------------------------------------------
USA - COURT SOURCES
-------------------------------------------------------------------------- */

const US_COURT_SOURCES: CourtSource[] = [
{
code: "US",
name: "United States Courts",
court: "Federal and State Courts",
source: "CourtListener",
website: COURTLISTENER_WEBSITE,
automatedSearch: true,
notes: "Automated opinion search through CourtListener REST API. Coverage depends on indexed records.",
},
];

/* --------------------------------------------------------------------------
UK - COURT SOURCES
-------------------------------------------------------------------------- */

const UK_COURT_SOURCES: CourtSource[] = [
{
code: "UK-SC",
name: "UK Supreme Court",
court: "Supreme Court",
source: "The National Archives - Find Case Law",
website: UK_CASELAW_API,
automatedSearch: true,
notes: "User-driven search and individual judgment retrieval through the National Archives public API.",
},
{
code: "UK-CA",
name: "England and Wales Court of Appeal",
court: "Court of Appeal",
source: "The National Archives - Find Case Law",
website: UK_CASELAW_API,
automatedSearch: true,
notes: "User-driven search and individual judgment retrieval.",
},
{
code: "UK-HC",
name: "England and Wales High Court",
court: "High Court",
source: "The National Archives - Find Case Law",
website: UK_CASELAW_API,
automatedSearch: true,
notes: "User-driven search and individual judgment retrieval.",
},
{
code: "UK-SCOT",
name: "Scottish Courts",
court: "Scottish Courts",
source: "Scottish Courts and Tribunals",
website: "https://www.scotcourts.gov.uk/",
automatedSearch: false,
notes: "Official Scottish Courts website. Separate integration is pending.",
},
];

/* --------------------------------------------------------------------------
UAE - COURT SOURCES
-------------------------------------------------------------------------- */

const UAE_COURT_SOURCES: CourtSource[] = [
{
code: "UAE-FED",
name: "UAE Federal Courts",
court: "Federal Courts",
source: "UAE Ministry of Justice",
website:
"https://www.moj.gov.ae/en/laws-and-legislation/court-judgments.aspx",
automatedSearch: false,
notes: "Official federal court judgment-search destination.",
},
{
code: "UAE-DXB",
name: "Dubai Courts",
court: "Dubai Courts",
source: "Dubai Courts",
website: "https://www.dc.gov.ae/",
automatedSearch: false,
notes: "Official Dubai Courts website.",
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
notes: "Official DIFC judgments and orders portal.",
},
{
code: "UAE-ADGM",
name: "ADGM Courts",
court: "ADGM Courts",
source: "ADGM Courts",
website: "https://www.adgm.com/",
automatedSearch: false,
notes: "Official ADGM website. Dedicated judgment retrieval is not configured.",
},
];

/* --------------------------------------------------------------------------
ALL SOURCES
-------------------------------------------------------------------------- */

const ALL_COURT_SOURCES: CourtSource[] = [
...INDIA_COURT_SOURCES,
...US_COURT_SOURCES,
...UK_COURT_SOURCES,
...UAE_COURT_SOURCES,
];

/* --------------------------------------------------------------------------
JURISDICTION DIRECTORY
-------------------------------------------------------------------------- */

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
notes: "Official judgment portals. Automated retrieval is not configured.",
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
notes: "Automated opinion search through CourtListener.",
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
automatedSearch: true,
notes: "User-driven public API search and individual judgment retrieval. Bulk computational analysis remains disabled.",
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
notes: "Official judicial portals. Automated retrieval is not configured.",
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
notes: "Automated connector is not configured.",
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
notes: "Automated connector is not configured.",
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
notes: "Automated connector is not configured.",
},
];

/* --------------------------------------------------------------------------
COMMON HELPERS
-------------------------------------------------------------------------- */

function getErrorStatus(error: unknown): number {
const status = (error as any)?.status;

if (typeof status === "number" && status >= 400 && status <= 599) {
return status;
}

return 500;
}

function getErrorMessage(error: unknown): string {
if (error instanceof Error) {
return error.message;
}

return "An unexpected legal-source error occurred.";
}

async function fetchJson<T = any>(
url: string,
headers: Record<string, string> = {}
): Promise<T> {
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
    `Source returned HTTP ${response.status}.`
  );

  error.status = response.status;
  error.retryAfter = response.headers.get("Retry-After");

  throw error;
}

return (await response.json()) as T;

} finally {
clearTimeout(timeout);
}
}

function validatePagination(
pageValue: unknown,
pageSizeValue: unknown
) {
const page = Math.max(
1,
Math.floor(Number(pageValue) || 1)
);

const requestedSize = Math.floor(
Number(pageSizeValue) || DEFAULT_PAGE_SIZE
);

const pageSize = Math.min(
MAX_PAGE_SIZE,
Math.max(1, requestedSize)
);

return { page, pageSize };
}

function decodeXml(value: string): string {
return value
.replace(/&/g, "&")
.replace(/"/g, '"')
.replace(/'|'/g, "'")
.replace(/</g, "<")
.replace(/>/g, ">")
.replace(/&#(\d+);/g, (_match, code) =>
String.fromCharCode(Number(code))
)
.replace(/&#x([0-9a-f]+);/gi, (_match, code) =>
String.fromCharCode(parseInt(code, 16))
);
}

function getXmlTag(
xml: string,
tagName: string
): string | null {
const escaped = tagName.replace(/[.*+?^${}()|[]\]/g, "\$&");

const expression = new RegExp(
"<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>",
"i"
);

const match = xml.match(expression);

if (!match) return null;

return decodeXml(
match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
);
}

function getXmlAttribute(
xml: string,
attribute: string
): string | null {
const escaped = attribute.replace(/[.*+?^${}()|[]\]/g, "\$&");

const match = xml.match(
new RegExp("${escaped}=["']([^"']+)["']", "i")
);

return match ? decodeXml(match[1]) : null;
}

/* --------------------------------------------------------------------------
SOURCE DIRECTORY HELPER
-------------------------------------------------------------------------- */

function getSourcesForJurisdiction(
jurisdiction: string
): CourtSource[] {
switch (jurisdiction.toUpperCase()) {
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

/* --------------------------------------------------------------------------
USA - COURTLISTENER SEARCH
-------------------------------------------------------------------------- */

export async function searchCourtListener(
query: string,
pageSize: number,
page = 1
): Promise<CaseSearchResult[]> {
const token = process.env.COURTLISTENER_API_TOKEN;

if (!token) {
throw new Error(
"CourtListener API token is not configured on the backend."
);
}

const cleanQuery = String(query || "").trim();

if (!cleanQuery) {
throw new Error("A case-search query is required.");
}

const params = new URLSearchParams();

params.set("q", cleanQuery);
params.set("type", "o");
params.set("page_size", String(pageSize));
params.set("page", String(page));

const url = "${COURTLISTENER_API}/search/?${params.toString()}";

const data = await fetchJson<any>(url, {
Authorization: "Token ${token}",
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

  citation: Array.isArray(item.citation)
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
    null,

  jurisdiction: "US",

  retrievalStatus: "SOURCE_RECORD_RETRIEVED",
};

});
}

/* --------------------------------------------------------------------------
USA - COURTLISTENER JUDGMENT RETRIEVAL
-------------------------------------------------------------------------- */

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
Authorization: "Token ${token}",
};

const cluster = await fetchJson<any>(
"${COURTLISTENER_API}/clusters/${id}/",
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

  if (!match) return null;

  const opinionId = Number(match[1]);

  try {
    const opinion = await fetchJson<any>(
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

    const judgmentText = (plainText || html)
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

    if (!judgmentText) return null;

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
(item): item is CourtListenerOpinion => item !== null
);
}

/* --------------------------------------------------------------------------
UK - NATIONAL ARCHIVES SEARCH

Uses the public Atom feed for a user-submitted search query.

This is not bulk indexing, bulk extraction, or computational analysis.
UK computational analysis remains disabled.
-------------------------------------------------------------------------- */

export async function searchUKCaseLaw(
query: string,
page: number,
pageSize: number
): Promise<UKSearchResult[]> {
if (UK_COMPUTATIONAL_ANALYSIS_ENABLED) {
throw new Error(
"UK computational analysis is not enabled."
);
}

const cleanQuery = String(query || "").trim();

if (!cleanQuery) {
throw new Error("A UK case-search query is required.");
}

const params = new URLSearchParams();

params.set("query", cleanQuery);
params.set("page", String(page));
params.set("per_page", String(pageSize));
params.set("minimum_availability", "full-text");
params.set("order", "-date");

const url = "${UK_CASELAW_API}/atom.xml?${params.toString()}";

const controller = new AbortController();

const timeout = setTimeout(
() => controller.abort(),
REQUEST_TIMEOUT
);

try {
const response = await fetch(url, {
method: "GET",
headers: {
Accept: "application/atom+xml, application/xml, text/xml",
"User-Agent": "LawVise-Legal-Research/1.0",
},
signal: controller.signal,
});

if (!response.ok) {
  const error: any = new Error(
    `National Archives returned HTTP ${response.status}.`
  );

  error.status = response.status;
  error.retryAfter = response.headers.get("Retry-After");

  throw error;
}

const xml = await response.text();

const entries =
  xml.match(/<entry(?:\s[^>]*)?>[\s\S]*?<\/entry>/gi) || [];

return entries.map((entry): UKSearchResult => {
  const title =
    getXmlTag(entry, "title") ||
    "Case name not supplied by source";

  const documentUri =
    getXmlTag(entry, "tna:uri") ||
    getXmlTag(entry, "uri");

  const published =
    getXmlTag(entry, "published") ||
    getXmlTag(entry, "updated");

  const summary =
    getXmlTag(entry, "summary") ||
    getXmlTag(entry, "content");

  const identifierMatch = entry.match(
    /<tna:identifier\b[^>]*>([\s\S]*?)<\/tna:identifier>/i
  );

  const citation = identifierMatch
    ? decodeXml(
        identifierMatch[1]
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
      )
    : null;

  const linkMatches = [
    ...entry.matchAll(/<link\b([^>]*)\/?>/gi),
  ];

  let sourceUrl: string | null = null;

  for (const linkMatch of linkMatches) {
    const attributes = linkMatch[1];

    const href = getXmlAttribute(
      attributes,
      "href"
    );

    const rel = getXmlAttribute(
      attributes,
      "rel"
    );

    const type = getXmlAttribute(
      attributes,
      "type"
    );

    if (
      href &&
      rel === "alternate" &&
      (!type || type.includes("html"))
    ) {
      sourceUrl = href;
      break;
    }
  }

  if (!sourceUrl && documentUri) {
    sourceUrl = `${UK_CASELAW_API}/${documentUri}`;
  }

  return {
    caseName: title,
    court:
      getXmlTag(entry, "tna:court") ||
      "Court details not supplied by source",
    date: published,
    citation,
    documentUri: documentUri || null,
    source: "The National Archives - Find Case Law",
    sourceUrl,
    excerpt: summary,
    jurisdiction: "UK",
    retrievalStatus: "SOURCE_RECORD_RETRIEVED",
  };
});

} finally {
clearTimeout(timeout);
}
}

/* --------------------------------------------------------------------------
UK - INDIVIDUAL JUDGMENT RETRIEVAL

Requires an already-known National Archives Document URI.
-------------------------------------------------------------------------- */

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

const url = "${UK_CASELAW_API}/${uri}/data.xml";

const controller = new AbortController();

const timeout = setTimeout(
() => controller.abort(),
REQUEST_TIMEOUT
);

try {
const response = await fetch(url, {
method: "GET",
headers: {
Accept: "application/akn+xml, application/xml",
"User-Agent": "LawVise-Legal-Research/1.0",
},
signal: controller.signal,
});

if (!response.ok) {
  const error: any = new Error(
    `National Archives returned HTTP ${response.status}.`
  );

  error.status = response.status;
  error.retryAfter = response.headers.get("Retry-After");

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

/* --------------------------------------------------------------------------
ROUTE ERROR HANDLER
-------------------------------------------------------------------------- */

function sendRouteError(
res: Response,
error: unknown
) {
const status = getErrorStatus(error);

return res.status(status).json({
success: false,
error: getErrorMessage(error),
retryAfter: (error as any)?.retryAfter || null,
});
}

/* --------------------------------------------------------------------------
INDIA - SOURCE DIRECTORY
-------------------------------------------------------------------------- */

router.get(
"/india/sources",
(_req: Request, res: Response) => {
return res.json({
success: true,
jurisdiction: "India",
sources: INDIA_COURT_SOURCES,
automatedSearch: false,
notice:
"Official research destinations only. Automated Indian judgment retrieval is not configured.",
});
}
);

/* --------------------------------------------------------------------------
USA - SOURCE DIRECTORY
-------------------------------------------------------------------------- */

router.get(
"/usa/sources",
(_req: Request, res: Response) => {
return res.json({
success: true,
jurisdiction: "United States",
sources: US_COURT_SOURCES,
automatedSearch: true,
});
}
);

/* --------------------------------------------------------------------------
USA - CASE SEARCH ROUTE

GET /usa/search?q=contract&page=1&pageSize=10
-------------------------------------------------------------------------- */

router.get(
"/usa/search",
async (req: Request, res: Response) => {
try {
const query = String(req.query.q || "").trim();

  const { page, pageSize } = validatePagination(
    req.query.page,
    req.query.pageSize
  );

  if (!query) {
    return res.status(400).json({
      success: false,
      error: "Search query parameter q is required.",
    });
  }

  const results = await searchCourtListener(
    query,
    pageSize,
    page
  );

  return res.json({
    success: true,
    jurisdiction: "US",
    query,
    page,
    pageSize,
    count: results.length,
    source: "CourtListener",
    results,
  });
} catch (error) {
  return sendRouteError(res, error);
}

}
);

/* --------------------------------------------------------------------------
USA - INDIVIDUAL JUDGMENT ROUTE

GET /usa/judgment/CLUSTER_ID
-------------------------------------------------------------------------- */

router.get(
"/usa/judgment/:clusterId",
async (req: Request, res: Response) => {
try {
const clusterId = String(req.params.clusterId);

  const opinions = await fetchCourtListenerJudgment(
    clusterId
  );

  return res.json({
    success: true,
    jurisdiction: "US",
    clusterId,
    source: "CourtListener",
    count: opinions.length,
    retrievalStatus:
      opinions.length > 0
        ? "JUDGMENT_RETRIEVED"
        : "NO_OPINIONS_RETURNED",
    opinions,
  });
} catch (error) {
  return sendRouteError(res, error);
}

}
);

/* --------------------------------------------------------------------------
UK - SOURCE DIRECTORY
-------------------------------------------------------------------------- */

router.get(
"/uk/sources",
(_req: Request, res: Response) => {
return res.json({
success: true,
jurisdiction: "United Kingdom",
sources: UK_COURT_SOURCES,
individualJudgmentRetrieval: true,
userDrivenSearch: true,
bulkDiscovery: false,
computationalAnalysis:
UK_COMPUTATIONAL_ANALYSIS_ENABLED,
documentation: UK_CASELAW_API_DOCS,
notice:
"User-driven case search and individual judgment retrieval are available through the National Archives public API. Bulk discovery, external indexing and computational analysis remain disabled.",
});
}
);

/* --------------------------------------------------------------------------
UK - CASE SEARCH ROUTE

GET /uk/search?q=negligence&page=1&pageSize=10
-------------------------------------------------------------------------- */

router.get(
"/uk/search",
async (req: Request, res: Response) => {
try {
const query = String(req.query.q || "").trim();

  const { page, pageSize } = validatePagination(
    req.query.page,
    req.query.pageSize
  );

  if (!query) {
    return res.status(400).json({
      success: false,
      error: "Search query parameter q is required.",
    });
  }

  const results = await searchUKCaseLaw(
    query,
    page,
    pageSize
  );

  return res.json({
    success: true,
    jurisdiction: "UK",
    query,
    page,
    pageSize,
    count: results.length,
    source: "The National Archives - Find Case Law",
    computationalAnalysis: false,
    results,
  });
} catch (error) {
  return sendRouteError(res, error);
}

}
);

/* --------------------------------------------------------------------------
UK - INDIVIDUAL JUDGMENT ROUTE

GET /uk/judgment?uri=uksc/2024/123
-------------------------------------------------------------------------- */

router.get(
"/uk/judgment",
async (req: Request, res: Response) => {
try {
const documentUri = String(
req.query.uri || ""
).trim();

  if (!documentUri) {
    return res.status(400).json({
      success: false,
      error: "Document URI parameter uri is required.",
    });
  }

  const judgment = await fetchUKJudgment(
    documentUri
  );

  return res.json({
    success: true,
    jurisdiction: "UK",
    retrievalStatus: "JUDGMENT_RETRIEVED",
    judgment,
  });
} catch (error) {
  return sendRouteError(res, error);
}

}
);

/* --------------------------------------------------------------------------
UAE - SOURCE DIRECTORY
-------------------------------------------------------------------------- */

router.get(
"/uae/sources",
(_req: Request, res: Response) => {
return res.json({
success: true,
jurisdiction: "United Arab Emirates",
sources: UAE_COURT_SOURCES,
automatedSearch: false,
notice:
"Official judicial portals are provided. Automated judgment retrieval is not configured.",
});
}
);

/* --------------------------------------------------------------------------
ALL SOURCES
-------------------------------------------------------------------------- */

router.get(
"/sources",
(_req: Request, res: Response) => {
return res.json({
success: true,
jurisdictions: JURISDICTIONS,
sources: ALL_COURT_SOURCES,
});
}
);

/* --------------------------------------------------------------------------
GLOBAL CASE-LAW ENGINE STATUS
-------------------------------------------------------------------------- */

router.get(
"/status",
(_req: Request, res: Response) => {
return res.json({
success: true,
service: "LawVise Global Case-Law Engine",
status: "operational",
jurisdictions: {
IN: {
name: "India",
sourceDirectory: true,
automatedSearch: false,
},
US: {
name: "United States",
sourceDirectory: true,
automatedSearch: true,
judgmentRetrieval: true,
tokenConfigured: Boolean(
process.env.COURTLISTENER_API_TOKEN
),
},
UK: {
name: "United Kingdom",
sourceDirectory: true,
userDrivenSearch: true,
individualJudgmentRetrieval: true,
bulkDiscovery: false,
computationalAnalysis:
UK_COMPUTATIONAL_ANALYSIS_ENABLED,
},
UAE: {
name: "United Arab Emirates",
sourceDirectory: true,
automatedSearch: false,
},
},
additionalJurisdictions: [
"EU",
"CA",
"AU",
],
timestamp: new Date().toISOString(),
});
}
);

/* --------------------------------------------------------------------------
EXPORT
-------------------------------------------------------------------------- */

export default router;
