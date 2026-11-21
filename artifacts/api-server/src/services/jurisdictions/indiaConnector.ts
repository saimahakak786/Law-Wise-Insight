import {
  normalizeLegalSource,
  type LegalSource,
} from "./sourceNormalizer";

/**
 * LAWISE INDIA LEGAL CONNECTOR
 *
 * Provides official Indian legal research destinations
 * and normalises manually supplied official case records.
 *
 * IMPORTANT:
 * This connector does not pretend to provide automated
 * case-law search where an official API is unavailable.
 */

export interface IndiaLegalPortal {
  id: string;
  name: string;
  category: "CASE_LAW" | "LEGISLATION";
  website: string;
  accessMode: "PUBLIC_PORTAL";
  automatedSearch: boolean;
  description: string;
}

export interface IndiaCaseInput {
  id: string;
  title: string;
  court: string;
  citation?: string;
  decisionDate?: string;
  sourceUrl: string;
  fullText?: string;
  excerpt?: string;
}

export interface IndiaConnectorResult {
  success: boolean;
  jurisdiction: "INDIA";
  source: string;
  automatedSearch: false;
  message: string;
  portals: IndiaLegalPortal[];
}

const INDIA_PORTALS: IndiaLegalPortal[] = [
  {
    id: "INDIA-SC-ESCR",
    name: "Supreme Court of India e-SCR",
    category: "CASE_LAW",
    website: "https://scr.sci.gov.in/",
    accessMode: "PUBLIC_PORTAL",
    automatedSearch: false,
    description:
      "Official Supreme Court Reports judgment research portal.",
  },
  {
    id: "INDIA-ECOURTS",
    name: "eCourts Judgment Services",
    category: "CASE_LAW",
    website: "https://judgments.ecourts.gov.in/",
    accessMode: "PUBLIC_PORTAL",
    automatedSearch: false,
    description:
      "Official judgment search services for Indian courts.",
  },
  {
    id: "INDIA-HIGH-COURTS",
    name: "High Court Services",
    category: "CASE_LAW",
    website: "https://hcservices.ecourts.gov.in/",
    accessMode: "PUBLIC_PORTAL",
    automatedSearch: false,
    description:
      "Official High Court case and judgment services.",
  },
  {
    id: "INDIA-CODE",
    name: "India Code",
    category: "LEGISLATION",
    website: "https://www.indiacode.nic.in/",
    accessMode: "PUBLIC_PORTAL",
    automatedSearch: false,
    description:
      "Official repository of Central Acts and legislation.",
  },
];

function validateHttpUrl(value: string): string {
  const url = new URL(value);

  if (url.protocol !== "https:") {
    throw new Error("Only HTTPS legal source URLs are accepted.");
  }

  return url.toString();
}

/**
 * Returns official Indian legal research portals.
 */
export function getIndiaLegalPortals(): IndiaLegalPortal[] {
  return INDIA_PORTALS.map((portal) => ({ ...portal }));
}

/**
 * Returns connector status for the LawVise dashboard.
 */
export function getIndiaConnectorStatus(): IndiaConnectorResult {
  return {
    success: true,
    jurisdiction: "INDIA",
    source: "Official Indian legal research portals",
    automatedSearch: false,
    message:
      "Official research destinations are available. Automated case-law retrieval is not yet configured.",
    portals: getIndiaLegalPortals(),
  };
}

/**
 * Normalises a case record obtained from an authorised
 * official source or manually supplied by the user.
 *
 * This function does not independently verify the judgment.
 */
export function normalizeIndiaCase(
  input: IndiaCaseInput
): LegalSource {
  if (!input.id?.trim()) {
    throw new Error("Case record ID is required.");
  }

  if (!input.title?.trim()) {
    throw new Error("Case title is required.");
  }

  if (!input.court?.trim()) {
    throw new Error("Court name is required.");
  }

  const sourceUrl = validateHttpUrl(input.sourceUrl);

  return normalizeLegalSource({
    id: input.id.trim(),
    jurisdiction: "INDIA",
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
      source: "India legal research connector",
      excerpt: input.excerpt || null,
      automatedRetrieval: false,
      verificationNote:
        "Record normalised; independent source verification remains necessary.",
    },
  });
}

/**
 * Normalises multiple Indian case records.
 */
export function normalizeIndiaCases(
  cases: IndiaCaseInput[]
): LegalSource[] {
  return cases.map(normalizeIndiaCase);
}
