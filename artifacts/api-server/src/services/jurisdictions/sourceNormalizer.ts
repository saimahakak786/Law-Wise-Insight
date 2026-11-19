import type {
  JurisdictionCode,
  LegalSourceType,
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

export function normalizeLegalSource(
  source: LegalSource
): LegalSource {
  return {
    ...source,

    id: source.id.trim(),

    title: source.title.trim(),

    citation: source.citation?.trim(),

    court: source.court?.trim(),

    sourceUrl: source.sourceUrl.trim(),

    retrievedAt:
      source.retrievedAt || new Date().toISOString(),
  };
}

export function normalizeLegalSources(
  sources: LegalSource[]
): LegalSource[] {
  const seen = new Set<string>();

  return sources
    .map(normalizeLegalSource)
    .filter((source) => {
      const key = [
        source.jurisdiction,
        source.sourceType,
        source.id,
      ].join(":");

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}
