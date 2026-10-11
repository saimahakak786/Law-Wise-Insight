  // 🏛️ ZERO-FLUFF, ULTRA-RIGOROUS SENIOR ADVOCATE CHAMBER ENGINE
  const generateAdvocateChamberDraft = (type: string, userPrompt: string, jur: string, tone: string) => {
    const cleanType = type.toUpperCase();
    const currentDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    const instructionBody = userPrompt.trim();
    const isLitigation = tone === 'Aggressive / Litigious';
    const jurisdictionUpper = jur.toUpperCase();

    // 🇮🇳 INDIA SUPREME / HIGH / DISTRICT COURT CHAMBER FORMAT
    if (jurisdictionUpper === 'INDIA') {
      if (cleanType.includes('LEGAL NOTICE')) {
        return `CHAMBERS OF LEGAL COUNSEL & ADVOCATES
NEW DELHI / PRINCIPAL BENCH | REF: LV/CHAMBER/2026/SEC-41
DATE: ${currentDate}

BY SPEED POST / REGISTERED AD / ELECTRONIC TRANSMISSION

TO,
1. THE NOTICEE / PRINCIPAL DEFAULTER
2. ALLIED STAKEHOLDERS / MANAGEMENT

SUBJECT: STATUTORY LEGAL NOTICE UNDER SECTION 143 OF THE NEGOTIABLE INSTRUMENTS ACT / SECTION 52 OF THE BHARATIYA NYAYA SANHITA (BNS) / CODE OF CIVIL PROCEDURE (CPC), 1908 FOR FRAUDULENT DEFAULT, BREACH OF FIDUCIARY DUTY, AND UNCONDITIONAL DEMAND FOR LIQUIDATED DAMAGES WITH 18% PENDENTE LITE INTEREST.

DEAR SIR / MADAM,

Under express, specific instructions from and on behalf of my client, [Client Name], acting through these chambers, I serve upon you this formal statutory legal notice under the substantive and procedural laws of India:

1. FACTUAL MATRIX & ANTECEDENTS:
   That the answering client states and underscores that ${instructionBody}

2. MATERIAL BREACH & CULPABILITY:
   That your acts, omissions, intentional misrepresentations, and subsequent failure to honor financial or contractual commitments constitute a grave, actionable breach of legal obligations, resulting in severe commercial detriment, loss of standing, and injury remediable under Indian jurisprudence.

3. STATUTORY LIABILITY & FINANCIAL QUANTUM:
   That in light of the aforesaid defaults, you are jointly and severally liable to make good the complete financial loss incurred by our client, alongside accrued statutory interest calculated at 18% per annum from the date when liability crystallized until full realization.

4. FINAL CHAMBER WARNING & TIMELINE:
   That through this notice, you are called upon to unconditionally cure the aforesaid breach and remit the entire outstanding liquidated sum within **15 (fifteen) days** from the receipt hereof. ${isLitigation ? 'Take explicit, unreserved notice that failure or neglect to comply shall compel our client to initiate uncompromising summary suits, civil execution proceedings, and criminal prosecution under the Bharatiya Nagarik Suraksha Sanhita (BNSS) without any further reference or notice, holding you entirely liable for all ensuing costs, legal fees, and commercial consequences.' : 'Your prompt, unreserved compliance is expected to avoid unnecessary judicial escalation.'}

A copy of this notice is retained in chambers for records and onward presentation before the competent court of law.

ADVOCATE FOR THE CLIENT
[CHAMBER ENROLLMENT / BAR COUNCIL REF]`;
      }

      if (cleanType.includes('BAIL') || cleanType.includes('CRIMINAL')) {
        return `IN THE COURT OF THE SESSIONS JUDGE / SPECIAL JUDGE, __________ (INDIA)
BAIL APPLICATION NO. __________ OF 2026

IN THE MATTER OF:
APPLICANT / ACCUSED ... PETITIONER
VERSUS
STATE (GOVERNMENT OF NCT / STATE OF __________) ... RESPONDENT

FIR NO: _____ | POLICE STATION: _____
UNDER SECTIONS: _____ OF THE BHARATIYA NYAYA SANHITA (BNS), 2023

APPLICATION UNDER SECTION 483 / 482 OF THE BHARATIYA NAGARIK SURAKSHA SANHITA (BNSS), 2023 FOR GRANT OF REGULAR BAIL IN FAVOR OF THE APPLICANT.

MOST RESPECTFULLY SHOWETH:

1. That the applicant has been falsely, maliciously, and wrongfully implicated in the above-noted FIR due to ulterior motives, personal vendetta, and professional rivalry. The accurate factual backdrop substantiating the defense is as follows:
   ${instructionBody}

2. GROUNDS FOR ENLARGEMENT ON BAIL:
   A. That custodial interrogation of the applicant is neither warranted nor required under law, as all material investigation, documentation, and alleged recoveries stand fully concluded.
   B. That the applicant commands deep roots in society, maintains an unblemished antecedents record, and undertakes to abide by all stringent terms, conditions, and bond requirements imposed by this Hon'ble Court without tampering with prosecution evidence or absconding.
   C. That the fundamental principle of criminal jurisprudence—*bail is the rule and jail is the exception*—fully applies to the present case.

PRAYER:
In light of the facts, circumstances, and legal submissions stated above, it is most respectfully prayed that this Hon'ble Court may be pleased to:
i) Enlarge the applicant on regular bail in FIR No. _____ under Section _____ of the BNS; and
ii) Pass any such further order(s) as this Hon'ble Court may deem fit and proper in the interest of justice, equity, and good conscience.

PLACE: INDIA
DATE: ${currentDate}

COUNSEL FOR THE APPLICANT`;
      }

      return `IN THE COURT OF COMPETENT JURISDICTION / HIGH COURT AT __________, INDIA
MEMORANDUM OF ${cleanType}
SUIT / PETITION NO. __________ OF 2026

IN THE MATTER OF:
PETITIONER / PLAINTIFF ... APPLICANT
VERSUS
RESPONDENT / DEFENDANT ... OPPOSITE PARTY

MEMORANDUM OF ${cleanType} FILED UNDER THE RELEVANT PROVISIONS OF THE CODE OF CIVIL PROCEDURE (CPC), 1908 / CONSTITUTION OF INDIA / BNSS, 2023.

MOST RESPECTFULLY SHOWETH:

1. FACTUAL MATRIX & CAUSE OF ACTION:
   ${instructionBody}

2. GROUNDS & SUBMISSIONS ON LAW:
   A. That the impugned actions, omissions, and orders of the opposing side are patently arbitrary, ultra vires, and violative of settled statutory mandates and principles of natural justice.
   B. That the balance of convenience heavily tilts in favor of the applicant, and irreparable loss and injury shall ensue if judicial protection or execution is denied.
   C. That there is no concealment of material facts, and the applicant has approached this Hon'ble Forum with clean hands.

PRAYER:
In view of the facts and legal grounds detailed hereinabove, it is most respectfully prayed that this Hon'ble Court/Forum may be pleased to:
i) Allow the instant ${cleanType.toLowerCase()} and grant the reliefs sought;
ii) Grant interim protection/stay during the pendency of these proceedings; and
iii) Award costs of litigation in favor of the applicant.

PLACE: INDIA
DATE: ${currentDate}

COUNSEL ON RECORD / ADVOCATE`;
    }

    // 🇺🇸 UNITED STATES FEDERAL / STATE COURT FORMAT
    if (jurisdictionUpper === 'US' || jurisdictionUpper === 'USA') {
      return `IN THE DISTRICT COURT OF THE UNITED STATES / SUPERIOR COURT
JURISDICTION: UNITED STATES (${jurisdictionUpper})
CIVIL ACTION FILE NO. __________-CV-2026

PLAINTIFF: [Client Name]
v.
DEFENDANT: [Opposite Party]

VERIFIED COMPLAINT AND DEMAND FOR JURY TRIAL FOR ${cleanType}

COMES NOW the Plaintiff, [Client Name], by and through retained counsel, and files this verified complaint against Defendant, alleging as follows:

I. PRELIMINARY STATEMENT & JURISDICTION:
   1.1. This civil action arises from material breaches of contract and statutory duties. The foundational facts are set forth as follows:
   ${instructionBody}
   1.2. Subject matter jurisdiction and venue are proper before this Honorable Court pursuant to applicable federal and state provisions.

II. CAUSES OF ACTION & ALLEGATIONS OF LIABILITY:
   2.1. Defendant’s conduct constitutes an unexcused material breach, causing direct, ascertainable economic losses exceeding jurisdictional minimums.

III. PRAYER FOR RELIEF:
   WHEREFORE, Plaintiff respectfully prays for judgment against Defendant granting:
   A) Compensatory and consequential damages in an amount to be proven at trial;
   B) Pre-judgment and post-judgment interest at the maximum legal rate;
   C) Reasonable attorney's fees and litigation costs; and
   D) Such other and further relief as this Court deems just and equitable.

DATED: ${currentDate}
RESPECTFULLY SUBMITTED,
COUNSEL FOR PLAINTIFF`;
    }

    // 🇬🇧 UNITED KINGDOM HIGH COURT FORMAT (CPR)
    if (jurisdictionUpper === 'UK' || jurisdictionUpper === 'UNITED KINGDOM') {
      return `IN THE HIGH COURT OF JUSTICE / COUNTY COURT
BUSINESS & PROPERTY COURTS OF ENGLAND & WALES
JURISDICTION: UNITED KINGDOM (ENGLAND & WALES)
CLAIM NO: 2026-OM-_____

BETWEEN:
CLAIMANT: [Client Name]
-and-
DEFENDANT: [Opposite Party]

PARTICULARS OF CLAIM / ${cleanType} PURSUANT TO THE CIVIL PROCEDURE RULES (CPR)

1. FACTUAL BACKGROUND & MATERIAL FACTS:
   The Claimant contends, maintains, and avers as follows:
   ${instructionBody}

2. LEGAL BASIS & BREACH OF OBLIGATION:
   By reason of the matters aforesaid, the Defendant is in direct breach of express contractual terms and common law duties, causing actionable loss and damage to the Claimant.

3. RELIEF SOUGHT:
   AND the Claimant claims:
   (1) Damages for breach of contract / statutory duty;
   (2) Interest pursuant to Section 35A of the Senior Courts Act 1981;
   (3) Legal costs.

STATEMENT OF TRUTH:
The Claimant believes that the facts stated in these particulars of claim are true.

DATED: ${currentDate}
COUNSEL / SOLICITORS FOR THE CLAIMANT`;
    }

    // 🇦🇪 UAE COURT OF FIRST INSTANCE FORMAT
    if (jurisdictionUpper === 'UAE') {
      return `BEFORE THE COURT OF FIRST INSTANCE / DISPUTE RESOLUTION COMMITTEE
JURISDICTION: UNITED ARAB EMIRATES (UAE)
SUIT / CLAIM NO: _____ / 2026

PLAINTIFF / CLAIMANT: [Client Name]
VERSUS
DEFENDANT / RESPONDENT: [Opposite Party]

MEMORANDUM OF LEGAL SUBMISSIONS & STATEMENT OF CLAIM FOR ${cleanType}

RESPECTED JUDGES OF THE BENCH,

The Claimant respectfully submits this statement of claim under the Civil Transactions Law and applicable commercial regulations of the UAE:

1. FACTUAL BACKGROUND & CONTRACTUAL MATRIX:
   That the Claimant states and establishes that:
   ${instructionBody}

2. LEGAL GROUNDS & CIVIL LIABILITY:
   That the respondent has failed to discharge legal and contractual obligations, causing direct financial harm and actionable injury, thereby triggering liability for compensation under UAE law.

3. PRAYER:
   It is respectfully requested that the Honorable Court order the respondent to fulfill all contractual obligations, pay due compensation with legal interest, and bear all litigation expenses and advocate fees.

DATED: ${currentDate}
LEGAL COUNSEL / ADVOCATE IN UAE`;
    }

    // Generic Professional Legal Fallback
    return `BEFORE THE COMPETENT JUDICIAL AUTHORITY / FORUM (${jurisdictionUpper})
MEMORANDUM OF ${cleanType}
FILE REF: 2026/LV/CHAMBER-DR

1. FACTUAL NARRATIVE & INSTRUCTIONS:
   ${instructionBody}

2. LEGAL FRAMEWORK & SUBMISSIONS:
   The rights, duties, and liabilities of the contesting parties stand strictly governed by the substantive and procedural laws of ${jurisdictionUpper}, alongside binding judicial precedents.

3. PRAYER & OPERATIVE RELIEF SOUGHT:
   In light of the aforesaid facts, legal submissions, and injury sustained, appropriate judicial and executive orders are solicited to secure the ends of justice.

DATE: ${currentDate}
ADVOCATE ON RECORD / CHAMBER COUNSEL`;
  };
