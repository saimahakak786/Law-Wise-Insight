export type JurisdictionCode = "INDIA" | "UK" | "USA" | "UAE";

export type LegalSourceType =
  | "CASE"
  | "LEGISLATION"
  | "REGULATION";

export interface JurisdictionConfig {
  code: JurisdictionCode;
  name: string;
  currency: string;
  legalSystem: string;

  capabilities: {
    caseSearch: boolean;
    judgmentRetrieval: boolean;
    legislationSearch: boolean;
    citationVerification: boolean;
    aiDocumentAnalysis: boolean;
  };

  sources: string[];
}

export const JURISDICTION_REGISTRY: Record<
  JurisdictionCode,
  JurisdictionConfig
> = {
  INDIA: {
    code: "INDIA",
    name: "India",
    currency: "INR",
    legalSystem: "Common Law",
    capabilities: {
      caseSearch: false,
      judgmentRetrieval: false,
      legislationSearch: false,
      citationVerification: false,
      aiDocumentAnalysis: true,
    },
    sources: [
      "Supreme Court e-SCR",
      "Supreme Court of India",
      "High Court websites",
      "Jammu and Kashmir High Court",
      "eCourts Services",
    ],
  },

  UK: {
    code: "UK",
    name: "United Kingdom",
    currency: "GBP",
    legalSystem: "Common Law",
    capabilities: {
      caseSearch: false,
      judgmentRetrieval: true,
      legislationSearch: false,
      citationVerification: false,
      aiDocumentAnalysis: false,
    },
    sources: [
      "National Archives Find Case Law",
      "UK legislation",
    ],
  },

  USA: {
    code: "USA",
    name: "United States",
    currency: "USD",
    legalSystem: "Common Law",
    capabilities: {
      caseSearch: true,
      judgmentRetrieval: true,
      legislationSearch: false,
      citationVerification: false,
      aiDocumentAnalysis: true,
    },
    sources: [
      "CourtListener",
      "Official US court websites",
    ],
  },

  UAE: {
    code: "UAE",
    name: "United Arab Emirates",
    currency: "AED",
    legalSystem: "Civil Law",
    capabilities: {
      caseSearch: false,
      judgmentRetrieval: false,
      legislationSearch: false,
      citationVerification: false,
      aiDocumentAnalysis: true,
    },
    sources: [
      "UAE Federal Legislation Portal",
      "Official UAE judicial portals",
    ],
  },
};

export function getJurisdiction(
  code: JurisdictionCode
): JurisdictionConfig {
  return JURISDICTION_REGISTRY[code];
}

export function isSupportedJurisdiction(
  code: string
): code is JurisdictionCode {
  return Object.prototype.hasOwnProperty.call(
    JURISDICTION_REGISTRY,
    code
  );
}

export function getAllJurisdictions(): JurisdictionConfig[] {
  return Object.values(JURISDICTION_REGISTRY);
}
