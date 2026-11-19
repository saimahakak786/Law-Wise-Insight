import {
  isSupportedJurisdiction,
  type JurisdictionCode,
  type LegalSourceType,
} from "./jurisdictionRegistry";

export type VerificationStatus =
  | "VERIFIED"
  | "PARTIAL"
  | "UNVERIFIED"
  | "NOT_FOUND";

export interface LegalSource {
  id: string;
  jurisdiction: JurisdictionCode;
  sourceType: LegalSourceType;
  title: string;
  citation?: string;
  court?: string;
  decisionDate?: string;
  sourceUrl: string;
  fullText?: string;
  verificationStatus: VerificationStatus;
  retrievedAt: string;
  metadata?: Record<string, unknown>;
}

const VALID_SOURCE_TYPES: LegalSourceType[] = [
  "CASE",
  "LEGISLATION",
  "REGULATION",
];

const VALID_STATUSES: VerificationStatus[] = [
  "VERIFIED",
  "PARTIAL",
  "UNVERIFIED",
  "NOT_FOUND",
];

export function normalizeLegalSource(
  source: LegalSource
): LegalSource {
  if (!source || typeof source !== "object") {
    throw new Error("Invalid legal source.");
  }

  const id = source.id?.trim();
  const title = source.title?.trim();
  const sourceUrl = source.sourceUrl?.trim();

  if (!id) {
    throw new Error("Legal source ID is required.");
  }

  if (!title) {
    throw new Error("Legal source title is required.");
  }

  if (!isSupportedJurisdiction(source.jurisdiction)) {
    throw new Error("Unsupported jurisdiction.");
  }

  if (!VALID_SOURCE_TYPES.includes(source.sourceType)) {
    throw new Error("Invalid legal source type.");
  }

  if (!VALID_STATUSES.includes(source.verificationStatus)) {
    throw new Error("Invalid verification status.");
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(sourceUrl);
  } catch {
    throw new Error("Invalid legal source URL.");
  }

  if (
    parsedUrl.protocol !== "https:" &&
    parsedUrl.protocol !== "http:"
  ) {
    throw new Error("Unsupported legal source URL protocol.");
  }

  const retrievedAt =
    source.retrievedAt || new Date().toISOString();

  if (Number.isNaN(Date.parse(retrievedAt))) {
    throw new Error("Invalid retrieval date.");
  }

  return {
    ...source,
    id,
    title,
    sourceUrl: parsedUrl.toString(),
    citation: source.citation?.trim() || undefined,
    court: source.court?.trim() || undefined,
    fullText: source.fullText?.trim() || undefined,
    retrievedAt,
  };
}

export function normalizeLegalSources(
  sources: LegalSource[]
): LegalSource[] {
  const seen = new Set<string>();
  const normalized: LegalSource[] = [];

  for (const item of sources) {
    const source = normalizeLegalSource(item);

    const key = [
      source.jurisdiction,
      source.sourceType,
      source.id,
    ].join(":");

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(source);
  }

  return normalized;
}
