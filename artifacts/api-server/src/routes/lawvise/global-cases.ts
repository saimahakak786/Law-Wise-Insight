import { Router, Request, Response } from "express";

const router: Router = Router();

/* ==========================================================================
LAWISE GLOBAL CASE-LAW ENGINE

USA  - CourtListener API
UK   - National Archives Find Case Law API
INDIA - Official court source directory
UAE  - Official court source directory

IMPORTANT:

- Never invent case names, citations, or judgments.
- India and UAE are source directories only.
- UK bulk computational/AI analysis remains disabled pending permission.
  ========================================================================== */

/* --------------------------------------------------------------------------
API CONFIGURATION
-------------------------------------------------------------------------- */

const COURTLISTENER_API =
"https://www.courtlistener.com/api/rest/v4";

const COURTLISTENER_WEBSITE =
"https://www.courtlistener.com";

const UK_CASELAW_API =
"https://caselaw.nationalarchives.gov.uk";

const UK_CASELAW_DOCUMENTATION =
"https://nationalarchives.github.io/ds-caselaw-docs/";

const UK_COMPUTATIONAL_ANALYSIS_ENABLED = false;

const REQUEST_TIMEOUT_MS = 20000;

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 20;

/* --------------------------------------------------------------------------
TYPES
-------------------------------------------------------------------------- */

interface CourtSource {
name: string;
country: string;
description: string;
url: string;
type: "official" | "public_database";
automatedSearch: boolean;
judgmentRetrieval: boolean;
notes?: string;
}

interface JurisdictionSource {
code: string;
name: string;
country: string;
caseSearch: boolean;
judgmentRetrieval: boolean;
computationalAnalysis: boolean;
sources: CourtSource[];
}

interface CaseSearchResult {
id: string;
caseName: string;
court: string;
date: string | null;
citation: string | null;
docketNumber: string | null;
source: string;
sourceUrl: string;
judgmentUrl: string | null;
jurisdiction: string;
}

interface CourtListenerOpinion {
id?: number;
cluster_id?: number;
caseName?: string;
case_name?: string;
court?: string;
dateFiled?: string;
date_filed?: string;
citation?: string[];
docketNumber?: string;
docket_number?: string;
absolute_url?: string;
snippet?: string;
plain_text?: string;
html?: string;
html_with_citations?: string;
html_lawbox?: string;
xml_harvard?: string;
[key: string]: unknown;
}

interface CourtListenerSearchResponse {
count?: number;
next?: string | null;
previous?: string | null;
results?: CourtListenerOpinion[];
}

interface NormalizedCourtListenerOpinion {
opinionId: string;
judgmentText: string;
sourceUrl: string | null;
}

interface UKSearchResult {
id: string;
title: string;
date: string | null;
uri: string;
sourceUrl: string;
jurisdiction: string;
}

interface UKJudgmentDocument {
title: string;
uri: string;
contentType: string;
xml: string;
source: string;
jurisdiction: string;
}

/* --------------------------------------------------------------------------
OFFICIAL SOURCE DIRECTORIES
-------------------------------------------------------------------------- */

const INDIA_SOURCES: CourtSource[] = [
{
name: "Supreme Court of India - e-SCR",
country: "India",
description:
"Official Supreme Court judgments and case-law search portal.",
url: "https://scr.sci.gov.in/scrsearch/",
type: "official",
automatedSearch: false,
judgmentRetrieval: false,
notes:
"Use the official portal. Automated extraction is not enabled."
},
{
name: "eCourts High Court Services",
country: "India",
description:
"Official High Court case information and services.",
url: "https://hcservices.ecourts.gov.in/hcservices/main.php",
type: "official",
automatedSearch: false,
judgmentRetrieval: false,
notes:
"Official portal access only. No automated scraping is enabled."
},
{
name: "eCourts Judgments Portal",
country: "India",
description:
"Official judgments portal of the Indian eCourts system.",
url: "https://judgments.ecourts.gov.in/",
type: "official",
automatedSearch: false,
judgmentRetrieval: false,
notes:
"Use the official portal for judgment searches."
}
];

const USA_SOURCES: CourtSource[] = [
{
name: "CourtListener",
country: "United States",
description:
"Public legal research database providing case-law search and judgment information through its API.",
url: COURTLISTENER_WEBSITE,
type: "public_database",
automatedSearch: true,
judgmentRetrieval: true,
notes:
"API access requires a valid COURTLISTENER_API_TOKEN."
}
];

const UK_SOURCES: CourtSource[] = [
{
name: "The National Archives - Find Case Law",
country: "United Kingdom",
description:
"Official service providing published judgments and case-law documents.",
url: UK_CASELAW_API,
type: "official",
automatedSearch: true,
judgmentRetrieval: true,
notes:
"Individual search and retrieval are supported. Bulk computational analysis and AI processing remain disabled pending written licence approval."
},
{
name: "National Archives API Documentation",
country: "United Kingdom",
description:
"Technical documentation for the Find Case Law service.",
url: UK_CASELAW_DOCUMENTATION,
type: "official",
automatedSearch: false,
judgmentRetrieval: false
}
];

const UAE_SOURCES: CourtSource[] = [
{
name: "UAE Ministry of Justice - Court Judgments",
country: "United Arab Emirates",
description:
"Official Ministry of Justice court judgments information.",
url:
"https://www.moj.gov.ae/en/laws-and-legislation/court-judgments.aspx",
type: "official",
automatedSearch: false,
judgmentRetrieval: false,
notes:
"Official portal access only. No automated scraping or republication is enabled."
},
{
name: "Abu Dhabi Judicial Department",
country: "United Arab Emirates",
description:
"Official Abu Dhabi Judicial Department portal.",
url: "https://www.adjd.gov.ae/",
type: "official",
automatedSearch: false,
judgmentRetrieval: false,
notes:
"Check applicable permissions before extracting or republishing judgment content."
}
];

const JURISDICTION_DIRECTORY: JurisdictionSource[] = [
{
code: "INDIA",
name: "India",
country: "India",
caseSearch: false,
judgmentRetrieval: false,
computationalAnalysis: false,
sources: INDIA_SOURCES
},
{
code: "USA",
name: "United States",
country: "United States",
caseSearch: true,
judgmentRetrieval: true,
computationalAnalysis: true,
sources: USA_SOURCES
},
{
code: "UK",
name: "United Kingdom",
country: "United Kingdom",
caseSearch: true,
judgmentRetrieval: true,
computationalAnalysis:
UK_COMPUTATIONAL_ANALYSIS_ENABLED,
sources: UK_SOURCES
},
{
code: "UAE",
name: "United Arab Emirates",
country: "United Arab Emirates",
caseSearch: false,
judgmentRetrieval: false,
computationalAnalysis: false,
sources: UAE_SOURCES
}
];

/* --------------------------------------------------------------------------
GENERAL HELPERS
-------------------------------------------------------------------------- */

function getErrorStatus(error: unknown): number {
if (
typeof error === "object" &&
error !== null &&
"status" in error
) {
const status = Number(
(error as { status?: unknown }).status
);

if (
  Number.isInteger(status) &&
  status >= 400 &&
  status <= 599
) {
  return status;
}

}

return 500;
}

function getErrorMessage(error: unknown): string {
if (error instanceof Error) {
return error.message;
}

return "An unexpected error occurred.";
}

async function fetchJson<T>(
url: string,
headers: Record<string, string> = {}
): Promise<T> {
const controller = new AbortController();

const timeout = setTimeout(
() => controller.abort(),
REQUEST_TIMEOUT_MS
);

try {
const response = await fetch(url, {
method: "GET",
headers,
signal: controller.signal
});

if (!response.ok) {
  const error = new Error(
    `External service returned HTTP ${response.status}.`
  );

  (error as Error & { status?: number }).status =
    response.status;

  throw error;
}

return (await response.json()) as T;

} finally {
clearTimeout(timeout);
}
}

async function fetchText(
url: string,
headers: Record<string, string> = {}
): Promise<string> {
const controller = new AbortController();

const timeout = setTimeout(
() => controller.abort(),
REQUEST_TIMEOUT_MS
);

try {
const response = await fetch(url, {
method: "GET",
headers,
signal: controller.signal
});

if (!response.ok) {
  const error = new Error(
    `External service returned HTTP ${response.status}.`
  );

  (error as Error & { status?: number }).status =
    response.status;

  throw error;
}

return await response.text();

} finally {
clearTimeout(timeout);
}
}

function validatePagination(
pageValue: unknown,
pageSizeValue: unknown
): {
page: number;
pageSize: number;
} {
const page = Math.max(
1,
Number.parseInt(String(pageValue ?? "1"), 10) || 1
);

const requestedSize =
Number.parseInt(
String(pageSizeValue ?? DEFAULT_PAGE_SIZE),
10
) || DEFAULT_PAGE_SIZE;

const pageSize = Math.min(
MAX_PAGE_SIZE,
Math.max(1, requestedSize)
);

return {
page,
pageSize
};
}

function cleanString(value: unknown): string {
if (typeof value !== "string") {
return "";
}

return value.trim();
}

function normalizeOpinionHtml(value: string): string {
  return value
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
}

/* --------------------------------------------------------------------------
XML HELPERS - UK NATIONAL ARCHIVES
-------------------------------------------------------------------------- */

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
const escaped = tagName.replace(
/[.*+?^${}()|[]\]/g,
"\$&"
);

const expression = new RegExp(
"<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>",
"i"
);

const match = xml.match(expression);

if (!match) {
return null;
}

return decodeXml(
match[1]
.replace(/<[^>]+>/g, " ")
.replace(/\s+/g, " ")
.trim()
);
}

function getXmlAttribute(
xml: string,
attribute: string
): string | null {
const escaped = attribute.replace(
/[.*+?^${}()|[]\]/g,
"\$&"
);

const match = xml.match(
new RegExp("${escaped}=["']([^"']+)["']", "i")
);

return match ? decodeXml(match[1]) : null;
}

function extractXmlEntries(xml: string): string[] {
return (
xml.match(
/<entry(?:\s[^>])?>[\s\S]?</entry>/gi
) || []
);
}

function extractAtomLink(entry: string): string | null {
const links = entry.match(/<link\b[^>]*>/gi) || [];

for (const link of links) {
const rel = getXmlAttribute(link, "rel");
const href = getXmlAttribute(link, "href");

if (href && (!rel || rel === "alternate")) {
  return href;
}

}

return null;
}

/* --------------------------------------------------------------------------
COURTLISTENER - USA CASE SEARCH
-------------------------------------------------------------------------- */

export async function searchCourtListener(
query: string,
pageSize: number,
page: number
): Promise<{
count: number;
next: string | null;
results: CaseSearchResult[];
}> {
const token = process.env.COURTLISTENER_API_TOKEN;

if (!token) {
throw new Error(
"CourtListener API token is not configured. Add COURTLISTENER_API_TOKEN to the Render environment variables."
);
}

const params = new URLSearchParams();

params.set("q", query);
params.set("type", "o");
params.set("order_by", "dateFiled desc");
params.set("page", String(page));
params.set("page_size", String(pageSize));

const url =
"${COURTLISTENER_API}/search/?${params.toString()}";

const data =
await fetchJson<CourtListenerSearchResponse>(
url,
{
Authorization: "Token ${token}",
Accept: "application/json"
}
);

const results = (data.results || []).map((item) => {
const clusterId =
item.cluster_id ??
item.id ??
0;

const relativeUrl = cleanString(item.absolute_url);

const sourceUrl = relativeUrl
  ? new URL(
      relativeUrl,
      COURTLISTENER_WEBSITE
    ).toString()
  : `${COURTLISTENER_WEBSITE}/`;

const citations = Array.isArray(item.citation)
  ? item.citation.join("; ")
  : null;

return {
  id: String(clusterId),
  caseName:
    cleanString(item.caseName) ||
    cleanString(item.case_name) ||
    "Case name not provided",
  court:
    cleanString(item.court) ||
    "Court not specified",
  date:
    cleanString(item.dateFiled) ||
    cleanString(item.date_filed) ||
    null,
  citation: citations,
  docketNumber:
    cleanString(item.docketNumber) ||
    cleanString(item.docket_number) ||
    null,
  source: "CourtListener",
  sourceUrl,
  judgmentUrl: clusterId
    ? `/usa/judgment/${clusterId}`
    : null,
  jurisdiction: "USA"
};

});

return {
count: data.count || results.length,
next: data.next || null,
results
};
}

/* --------------------------------------------------------------------------
COURTLISTENER - USA JUDGMENT RETRIEVAL
-------------------------------------------------------------------------- */

export async function fetchCourtListenerJudgment(
clusterId: string
): Promise<{
jurisdiction: string;
source: string;
cluster: Record<string, unknown>;
opinions: NormalizedCourtListenerOpinion[];
sourceUrl: string;
}> {
const token = process.env.COURTLISTENER_API_TOKEN;

if (!token) {
throw new Error(
"CourtListener API token is not configured."
);
}

if (!/^\d+$/.test(clusterId)) {
throw new Error("Invalid CourtListener cluster ID.");
}

const headers = {
Authorization: "Token ${token}",
Accept: "application/json"
};

const cluster =
await fetchJson<Record<string, unknown>>(
"${COURTLISTENER_API}/clusters/${clusterId}/",
headers
);

const subOpinions = Array.isArray(cluster.sub_opinions)
? cluster.sub_opinions
: [];

const opinions: NormalizedCourtListenerOpinion[] = [];

for (const opinionValue of subOpinions) {
try {
let opinion: CourtListenerOpinion;

  if (
    typeof opinionValue === "object" &&
    opinionValue !== null
  ) {
    opinion =
      opinionValue as CourtListenerOpinion;
  } else {
    const reference = String(opinionValue);

    let opinionUrl: string;

    if (reference.startsWith("http")) {
      opinionUrl = reference;
    } else if (reference.startsWith("/")) {
      opinionUrl = new URL(
        reference,
        COURTLISTENER_WEBSITE
      ).toString();
    } else {
      opinionUrl =
        `${COURTLISTENER_API}/opinions/${reference}/`;
    }

    opinion =
      await fetchJson<CourtListenerOpinion>(
        opinionUrl,
        headers
      );
  }

  const plainText = cleanString(opinion.plain_text);

  const htmlText =
    cleanString(opinion.html_with_citations) ||
    cleanString(opinion.html_lawbox) ||
    cleanString(opinion.html) ||
    cleanString(opinion.xml_harvard);

  const judgmentText =
    plainText || normalizeOpinionHtml(htmlText);

  if (!judgmentText) {
    continue;
  }

  let sourceUrl: string | null = null;

  if (opinion.absolute_url) {
    sourceUrl = new URL(
      String(opinion.absolute_url),
      COURTLISTENER_WEBSITE
    ).toString();
  }

  opinions.push({
    opinionId: String(opinion.id ?? ""),
    judgmentText,
    sourceUrl
  });
} catch (error) {
  console.error(
    `Could not retrieve a CourtListener opinion for cluster ${clusterId}:`,
    error
  );

  continue;
}

}

return {
jurisdiction: "USA",
source: "CourtListener",
cluster,
opinions,
sourceUrl:
"${COURTLISTENER_WEBSITE}/?type=o&cluster_id=${clusterId}"
};
}

/* --------------------------------------------------------------------------
UK NATIONAL ARCHIVES - CASE SEARCH
-------------------------------------------------------------------------- */

async function searchUKCaseLaw(
query: string,
page: number,
pageSize: number
): Promise<{
query: string;
page: number;
results: UKSearchResult[];
source: string;
computationalAnalysisEnabled: boolean;
}> {
const params = new URLSearchParams();

params.set("q", query);
params.set("page", String(page));

const url =
"${UK_CASELAW_API}/atom.xml?${params.toString()}";

const xml = await fetchText(url, {
Accept:
"application/atom+xml, application/xml, text/xml"
});

const entries = extractAtomEntries(xml);

const results: UKSearchResult[] = entries
.slice(0, pageSize)
.map((entry, index) => {
const title =
getXmlTag(entry, "title") ||
"Untitled judgment";

  const id =
    getXmlTag(entry, "id") ||
    "";

  const updated =
    getXmlTag(entry, "updated") ||
    getXmlTag(entry, "published");

  const link = extractAtomLink(entry);

  let uri = link || id;

  if (uri.startsWith(UK_CASELAW_API)) {
    uri = uri.substring(UK_CASELAW_API.length);
  } else if (uri.startsWith("http")) {
    try {
      uri = new URL(uri).pathname;
    } catch {
      uri = "";
    }
  }

  return {
    id: `${page}-${index + 1}`,
    title,
    date: updated || null,
    uri,
    sourceUrl: uri
      ? `${UK_CASELAW_API}${uri.startsWith("/") ? "" : "/"}${uri}`
      : UK_CASELAW_API,
    jurisdiction: "UK"
  };
})
.filter((item) => Boolean(item.uri));

return {
query,
page,
results,
source: "The National Archives - Find Case Law",
computationalAnalysisEnabled:
UK_COMPUTATIONAL_ANALYSIS_ENABLED
};
}

function extractAtomEntries(xml: string): string[] {
return extractXmlEntries(xml);
}

/* --------------------------------------------------------------------------
UK NATIONAL ARCHIVES - INDIVIDUAL JUDGMENT RETRIEVAL
-------------------------------------------------------------------------- */

async function fetchUKJudgment(
documentUri: string
): Promise<UKJudgmentDocument> {
if (
!documentUri ||
typeof documentUri !== "string"
) {
throw new Error(
"A valid UK judgment URI is required."
);
}

let uri = documentUri.trim();

if (uri.startsWith(UK_CASELAW_API)) {
uri = uri.substring(UK_CASELAW_API.length);
} else if (uri.startsWith("http")) {
const parsed = new URL(uri);

if (
  parsed.hostname !==
  "caselaw.nationalarchives.gov.uk"
) {
  throw new Error(
    "The judgment URI must belong to the National Archives Find Case Law service."
  );
}

uri = parsed.pathname;

}

if (!uri.startsWith("/")) {
uri = "/${uri}";
}

if (
uri.includes("..") ||
uri.includes("\") ||
uri.includes("\0")
) {
throw new Error("Invalid judgment URI.");
}

const url =
"${UK_CASELAW_API}${uri}/data.xml";

const xml = await fetchText(url, {
Accept: "application/xml, text/xml"
});

const title =
getXmlTag(xml, "FRBRname") ||
getXmlTag(xml, "docTitle") ||
getXmlTag(xml, "title") ||
"UK judgment";

return {
title,
uri,
contentType: "application/xml",
xml,
source:
"The National Archives - Find Case Law",
jurisdiction: "UK"
};
}

/* ==========================================================================
API ROUTES
========================================================================== */

/* INDIA SOURCES */

router.get(
"/india/sources",
(_req: Request, res: Response) => {
return res.json({
success: true,
jurisdiction: "INDIA",
automatedSearch: false,
judgmentRetrieval: false,
sources: INDIA_SOURCES
});
}
);

/* USA SOURCES */

router.get(
"/usa/sources",
(_req: Request, res: Response) => {
return res.json({
success: true,
jurisdiction: "USA",
automatedSearch: true,
judgmentRetrieval: true,
tokenConfigured: Boolean(
process.env.COURTLISTENER_API_TOKEN
),
sources: USA_SOURCES
});
}
);

/* USA CASE SEARCH */

router.get(
"/usa/search",
async (req: Request, res: Response) => {
try {
const query = cleanString(req.query.q);

  if (!query) {
    return res.status(400).json({
      success: false,
      message: "A search query is required."
    });
  }

  const { page, pageSize } =
    validatePagination(
      req.query.page,
      req.query.pageSize
    );

  const data = await searchCourtListener(
    query,
    pageSize,
    page
  );

  return res.json({
    success: true,
    jurisdiction: "USA",
    query,
    ...data
  });
} catch (error) {
  return res.status(getErrorStatus(error)).json({
    success: false,
    jurisdiction: "USA",
    message: getErrorMessage(error)
  });
}

}
);

/* USA JUDGMENT RETRIEVAL */

router.get(
"/usa/judgment/:clusterId",
async (req: Request, res: Response) => {
try {
const clusterId = cleanString(
req.params.clusterId
);

  const judgment =
    await fetchCourtListenerJudgment(clusterId);

  return res.json({
    success: true,
    jurisdiction: "USA",
    judgment
  });
} catch (error) {
  return res.status(getErrorStatus(error)).json({
    success: false,
    jurisdiction: "USA",
    message: getErrorMessage(error)
  });
}

}
);

/* UK SOURCES */

router.get(
"/uk/sources",
(_req: Request, res: Response) => {
return res.json({
success: true,
jurisdiction: "UK",
automatedSearch: true,
judgmentRetrieval: true,
computationalAnalysis:
UK_COMPUTATIONAL_ANALYSIS_ENABLED,
sources: UK_SOURCES,
licensingNotice:
"Individual case search and retrieval are supported. Bulk computational analysis and AI processing remain disabled pending written licence approval."
});
}
);

/* UK CASE SEARCH */

router.get(
"/uk/search",
async (req: Request, res: Response) => {
try {
const query = cleanString(req.query.q);

  if (!query) {
    return res.status(400).json({
      success: false,
      message: "A search query is required."
    });
  }

  const { page, pageSize } =
    validatePagination(
      req.query.page,
      req.query.pageSize
    );

  const data = await searchUKCaseLaw(
    query,
    page,
    pageSize
  );

  return res.json({
    success: true,
    jurisdiction: "UK",
    ...data
  });
} catch (error) {
  return res.status(getErrorStatus(error)).json({
    success: false,
    jurisdiction: "UK",
    message: getErrorMessage(error)
  });
}

}
);

/* UK INDIVIDUAL JUDGMENT */

router.get(
"/uk/judgment",
async (req: Request, res: Response) => {
try {
const uri = cleanString(req.query.uri);

  if (!uri) {
    return res.status(400).json({
      success: false,
      message: "A judgment URI is required."
    });
  }

  const judgment = await fetchUKJudgment(uri);

  return res.json({
    success: true,
    jurisdiction: "UK",
    judgment
  });
} catch (error) {
  return res.status(getErrorStatus(error)).json({
    success: false,
    jurisdiction: "UK",
    message: getErrorMessage(error)
  });
}

}
);

/* UAE SOURCES */

router.get(
"/uae/sources",
(_req: Request, res: Response) => {
return res.json({
success: true,
jurisdiction: "UAE",
automatedSearch: false,
judgmentRetrieval: false,
sources: UAE_SOURCES
});
}
);

/* ALL JURISDICTION SOURCES */

router.get(
"/sources",
(_req: Request, res: Response) => {
return res.json({
success: true,
jurisdictions: JURISDICTION_DIRECTORY
});
}
);

/* ENGINE STATUS */

router.get(
"/status",
(_req: Request, res: Response) => {
return res.json({
success: true,
engine: "LawVise Global Case-Law Engine",
version: "1.0.0",
status: "operational",
jurisdictions: {
INDIA: {
sourceDirectory: true,
automatedSearch: false,
judgmentRetrieval: false
},
USA: {
sourceDirectory: true,
automatedSearch: true,
judgmentRetrieval: true,
apiTokenConfigured: Boolean(
process.env.COURTLISTENER_API_TOKEN
)
},
UK: {
sourceDirectory: true,
automatedSearch: true,
judgmentRetrieval: true,
computationalAnalysis:
UK_COMPUTATIONAL_ANALYSIS_ENABLED
},
UAE: {
sourceDirectory: true,
automatedSearch: false,
judgmentRetrieval: false
}
},
timestamp: new Date().toISOString()
});
}
);

/* EXPORT ROUTER */

export default router;
