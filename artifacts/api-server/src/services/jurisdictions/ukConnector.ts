import {
normalizeLegalSource,
type LegalSource,
} from "./sourceNormalizer";

/**

* LAWISE UK LEGAL CONNECTOR
* 
* National Archives live case-law search and judgment retrieval
* are handled by global-cases.ts.
* 
* This connector manages source information and case normalisation.
  */

export interface UKLegalPortal {
id: string;
name: string;
category: "CASE_LAW" | "LEGISLATION";
website: string;
accessMode: "PUBLIC_API" | "PUBLIC_PORTAL";
automatedSearch: boolean;
description: string;
}

export interface UKCaseInput {
id: string;
title: string;
court: string;
citation?: string;
decisionDate?: string;
sourceUrl: string;
fullText?: string;
excerpt?: string;
sourceName?: string;
}

export interface UKConnectorResult {
success: boolean;
jurisdiction: "UK";
source: string;
automatedSearch: boolean;
message: string;
portals: UKLegalPortal[];
}

const UK_PORTALS: UKLegalPortal[] = [
{
id: "UK-NATIONAL-ARCHIVES",
name: "The National Archives - Find Case Law",
category: "CASE_LAW",
website: "https://caselaw.nationalarchives.gov.uk/",
accessMode: "PUBLIC_API",
automatedSearch: true,
description:
"Public API for searching published judgments and retrieving individual judgment documents. Coverage includes England and Wales and selected tribunals.",
},
{
id: "UK-BAILII",
name: "British and Irish Legal Information Institute",
category: "CASE_LAW",
website: "https://www.bailii.org/",
accessMode: "PUBLIC_PORTAL",
automatedSearch: false,
description:
"Supplementary repository of British and Irish case law. No unrestricted public search API is assumed.",
},
{
id: "UK-SUPREME-COURT",
name: "UK Supreme Court",
category: "CASE_LAW",
website: "https://www.supremecourt.uk/",
accessMode: "PUBLIC_PORTAL",
automatedSearch: false,
description:
"Official Supreme Court judgments and decisions.",
},
{
id: "UK-SCOTLAND",
name: "Scottish Courts and Tribunals",
category: "CASE_LAW",
website: "https://www.scotcourts.gov.uk/",
accessMode: "PUBLIC_PORTAL",
automatedSearch: false,
description:
"Official Scottish court judgments and decisions. Automated retrieval is not yet implemented.",
},
{
id: "UK-NORTHERN-IRELAND",
name: "Northern Ireland Judiciary",
category: "CASE_LAW",
website: "https://www.judiciaryni.uk/",
accessMode: "PUBLIC_PORTAL",
automatedSearch: false,
description:
"Official Northern Ireland judicial information and judgments. Automated retrieval is not yet implemented.",
},
{
id: "UK-LEGISLATION",
name: "UK Legislation",
category: "LEGISLATION",
website: "https://www.legislation.gov.uk/",
accessMode: "PUBLIC_PORTAL",
automatedSearch: false,
description:
"Official UK Acts and statutory instruments. Automated legislation search is a separate integration task.",
},
];

function validateHttpsUrl(value: string): string {
let url: URL;

try {
url = new URL(value);
} catch {
throw new Error("Invalid UK legal source URL.");
}

if (url.protocol !== "https:") {
throw new Error("Only HTTPS legal source URLs are accepted.");
}

return url.toString();
}

/**

* Returns UK legal research portals.
  */
  export function getUKLegalPortals(): UKLegalPortal[] {
  return UK_PORTALS.map((portal) => ({ ...portal }));
  }

/**

* Returns UK connector status.
* 
* Live National Archives search is implemented separately
* in global-cases.ts.
  */
  export function getUKConnectorStatus(): UKConnectorResult {
  return {
  success: true,
  jurisdiction: "UK",
  source: "National Archives Find Case Law and UK legal portals",
  automatedSearch: true,
  message:
  "National Archives public API search and individual judgment retrieval are handled by the global case-law engine. Other UK portal integrations remain separate tasks.",
  portals: getUKLegalPortals(),
  };
  }

/**

* Normalises an independently obtained UK case record.
* 
* Normalisation does not independently verify the judgment.
  */
  export function normalizeUKCase(
  input: UKCaseInput
  ): LegalSource {
  if (!input.id?.trim()) {
  throw new Error("UK case record ID is required.");
  }

if (!input.title?.trim()) {
throw new Error("UK case title is required.");
}

if (!input.court?.trim()) {
throw new Error("UK court name is required.");
}

const sourceUrl = validateHttpsUrl(input.sourceUrl);

return normalizeLegalSource({
id: input.id.trim(),
jurisdiction: "UK",
sourceType: "CASE",
title: input.title.trim(),
citation: input.citation?.trim() || undefined,
court: input.court.trim(),
decisionDate: input.decisionDate || undefined,
fullText: input.fullText || undefined,
sourceUrl,
verificationStatus: "UNVERIFIED",
retrievedAt: new Date().toISOString(),
metadata: {
source: input.sourceName || "UK legal research connector",
excerpt: input.excerpt || null,
automatedRetrieval: false,
verificationNote:
"Record normalised; independent source verification remains necessary.",
},
});
}

/**

* Normalises multiple UK case records.
  */
  export function normalizeUKCases(
  cases: UKCaseInput[]
  ): LegalSource[] {
  return cases.map(normalizeUKCase);
  }
