import { Router, Request, Response } from "express";

const router: Router = Router();

const NYAYKOSH_API =
  "https://lawascode.negd.in/laac-api/v1/laws";

const NYAYKOSH_WEBSITE =
  "https://lawascode.negd.in";

const INDIA_CODE =
  "https://www.indiacode.nic.in/";

const REQUEST_TIMEOUT = 15000;

interface LawRecord {
  id: string;
  title: string;
  year: number;
  category: string;
  jurisdiction: string;
  source: string;
  sourceUrl: string;
}

/*
|--------------------------------------------------------------------------
| KNOWN STRUCTURED NYAYKOSH LAWS
|--------------------------------------------------------------------------
| This is a starter catalogue, not a complete Indian law catalogue.
|--------------------------------------------------------------------------
*/

const NYAYKOSH_LAWS: LawRecord[] = [
  {
    id: "the-digital-personal-data-protection-act-2023",
    title: "Digital Personal Data Protection Act, 2023",
    year: 2023,
    category: "Central Act",
    jurisdiction: "India",
    source: "Nyaykosh",
    sourceUrl:
      `${NYAYKOSH_WEBSITE}/laws/the-digital-personal-data-protection-act-2023`,
  },
  {
    id:
      "the-aadhaar-targeted-delivery-of-financial-and-other-subsidies-benefits-and-services-act-2016",
    title: "Aadhaar Act, 2016",
    year: 2016,
    category: "Central Act",
    jurisdiction: "India",
    source: "Nyaykosh",
    sourceUrl:
      `${NYAYKOSH_WEBSITE}/laws/the-aadhaar-targeted-delivery-of-financial-and-other-subsidies-benefits-and-services-act-2016`,
  },
  {
    id: "the-promotion-and-regulation-of-online-gaming-act-2025",
    title: "Promotion and Regulation of Online Gaming Act, 2025",
    year: 2025,
    category: "Central Act",
    jurisdiction: "India",
    source: "Nyaykosh",
    sourceUrl:
      `${NYAYKOSH_WEBSITE}/laws/the-promotion-and-regulation-of-online-gaming-act-2025`,
  },
];

/*
|--------------------------------------------------------------------------
| REQUEST HELPER
|--------------------------------------------------------------------------
*/

async function fetchNyaykosh(
  path: string
): Promise<any> {
  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT
  );

  try {
    const response = await fetch(
      `${NYAYKOSH_API}/${path}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      throw new Error(
        `Nyaykosh HTTP ${response.status}`
      );
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

/*
|--------------------------------------------------------------------------
| SOURCE DIRECTORY
|--------------------------------------------------------------------------
*/

router.get(
  "/sources",
  (_req: Request, res: Response) => {
    return res.json({
      success: true,
      jurisdiction: "India",

      sources: [
        {
          name: "India Code",
          authority:
            "Legislative Department, Ministry of Law and Justice",
          type: "Official legislation repository",
          website: INDIA_CODE,
          automatedApi: false,
          coverage: [
            "Central Acts",
            "State Acts",
            "Union Territory legislation",
            "Rules",
            "Regulations",
            "Notifications",
            "Orders",
            "Ordinances",
            "Subordinate legislation",
          ],
        },
        {
          name: "Nyaykosh",
          authority: "National e-Governance Division",
          type: "Structured legislation API",
          website: NYAYKOSH_WEBSITE,
          api: NYAYKOSH_API,
          automatedApi: true,
          coverage:
            "Selected structured Indian laws and provisions",
        },
      ],

      notice:
        "India Code is the broader official repository. Automated structured retrieval through this version is limited to the Nyaykosh catalogue.",
    });
  }
);

/*
|--------------------------------------------------------------------------
| CATEGORIES
|--------------------------------------------------------------------------
*/

router.get(
  "/categories",
  (_req: Request, res: Response) => {
    return res.json({
      success: true,

      categories: [
        "Central Acts",
        "State Acts",
        "Union Territory Legislation",
        "Rules",
        "Regulations",
        "Notifications",
        "Orders",
        "Ordinances",
        "Statutes",
        "Circulars",
        "Subordinate Legislation",
        "Amendments",
        "Sections",
        "Schedules",
      ],
    });
  }
);

/*
|--------------------------------------------------------------------------
| LIST STRUCTURED LAWS
|--------------------------------------------------------------------------
|
| GET /laws
| GET /laws?search=privacy
| GET /laws?category=Central%20Act
|--------------------------------------------------------------------------
*/

router.get(
  "/laws",
  (req: Request, res: Response) => {
    const search = String(
      req.query.search || ""
    ).trim().toLowerCase();

    const category = String(
      req.query.category || ""
    ).trim().toLowerCase();

    const results = NYAYKOSH_LAWS.filter((law) => {
      const matchesSearch =
        !search ||
        law.title.toLowerCase().includes(search) ||
        law.id.toLowerCase().includes(search);

      const matchesCategory =
        !category ||
        law.category.toLowerCase().includes(category);

      return matchesSearch && matchesCategory;
    });

    return res.json({
      success: true,
      jurisdiction: "India",
      count: results.length,
      results,

      officialRepository: {
        name: "India Code",
        url: INDIA_CODE,
      },

      notice:
        "Results represent the structured Nyaykosh catalogue, not every Indian law.",
    });
  }
);

/*
|--------------------------------------------------------------------------
| SEARCH STRUCTURED LEGISLATION
|--------------------------------------------------------------------------
|
| GET /search?query=personal data
|--------------------------------------------------------------------------
*/

router.get(
  "/search",
  (req: Request, res: Response) => {
    const query = String(
      req.query.query || ""
    ).trim();

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Please enter a search query.",
      });
    }

    const results = NYAYKOSH_LAWS.filter((law) =>
      law.title.toLowerCase().includes(query.toLowerCase())
    );

    return res.json({
      success: true,
      query,
      count: results.length,
      results,

      additionalSearch: {
        name: "India Code",
        url: INDIA_CODE,
        message:
          "Search the official repository for legislation outside the structured catalogue.",
      },

      notice:
        "No structured result does not mean that the legislation does not exist.",
    });
  }
);

/*
|--------------------------------------------------------------------------
| RETRIEVE COMPLETE LAW
|--------------------------------------------------------------------------
|
| GET /laws/:slug
|--------------------------------------------------------------------------
*/

router.get(
  "/laws/:slug",
  async (req: Request, res: Response) => {
    const slug = String(req.params.slug);

    if (!/^[a-zA-Z0-9-]+$/.test(slug)) {
      return res.status(400).json({
        success: false,
        message: "Invalid law identifier.",
      });
    }

    try {
      const data = await fetchNyaykosh(
        encodeURIComponent(slug)
      );

      return res.json({
        success: true,
        jurisdiction: "India",
        source: "Nyaykosh",
        law: data,
        sourceUrl:
          `${NYAYKOSH_WEBSITE}/laws/${slug}`,
        retrievalStatus: "SOURCE_RETRIEVED",
      });
    } catch (error: any) {
      return res.status(404).json({
        success: false,
        message:
          "The law could not be retrieved from the Nyaykosh API.",
        lawId: slug,
        officialRepository: INDIA_CODE,
        details:
          error?.name === "AbortError"
            ? "The source request timed out."
            : error?.message || "Source unavailable.",
        retrievalStatus: "NOT_RETRIEVED",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| RETRIEVE INDIVIDUAL PROVISION
|--------------------------------------------------------------------------
|
| GET /laws/:slug/provisions/:number
|--------------------------------------------------------------------------
*/

router.get(
  "/laws/:slug/provisions/:number",
  async (req: Request, res: Response) => {
    const slug = String(req.params.slug);
    const number = String(req.params.number);

    if (
      !/^[a-zA-Z0-9-]+$/.test(slug) ||
      !/^[a-zA-Z0-9./()-]+$/.test(number)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid law or provision identifier.",
      });
    }

    try {
      const data = await fetchNyaykosh(
        `${encodeURIComponent(slug)}/provisions/${encodeURIComponent(number)}`
      );

      return res.json({
        success: true,
        jurisdiction: "India",
        source: "Nyaykosh",
        lawId: slug,
        provisionNumber: number,
        provision: data,
        retrievalStatus: "SOURCE_RETRIEVED",
      });
    } catch (error: any) {
      return res.status(404).json({
        success: false,
        message:
          "The requested provision is not available through the structured source.",
        lawId: slug,
        provisionNumber: number,
        officialRepository: INDIA_CODE,
        details:
          error?.message || "Source unavailable.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| RETRIEVE PENALTY INFORMATION
|--------------------------------------------------------------------------
|
| GET /laws/:slug/penalties
|--------------------------------------------------------------------------
*/

router.get(
  "/laws/:slug/penalties",
  async (req: Request, res: Response) => {
    const slug = String(req.params.slug);

    if (!/^[a-zA-Z0-9-]+$/.test(slug)) {
      return res.status(400).json({
        success: false,
        message: "Invalid law identifier.",
      });
    }

    try {
      const data = await fetchNyaykosh(
        `${encodeURIComponent(slug)}/penalties`
      );

      return res.json({
        success: true,
        jurisdiction: "India",
        source: "Nyaykosh",
        lawId: slug,
        penalties: data,
        retrievalStatus: "SOURCE_RETRIEVED",
      });
    } catch (error: any) {
      return res.status(404).json({
        success: false,
        message:
          "Structured penalty information is unavailable for this law.",
        lawId: slug,
        officialRepository: INDIA_CODE,
        details:
          error?.message || "Source unavailable.",
      });
    }
  }
);

export default router;
