---
name: LawVise API schema names (Orval codegen)
description: The api-zod package uses operation-based naming, not component schema names.
---

## Rule
When importing from `@workspace/api-zod`, use **operation-based** names, not the OpenAPI component schema names.

**Why:** Orval generates Zod schemas named after the HTTP operation (e.g. `AnalyzeDocumentBody`), not the `$ref` component name (e.g. `DocumentAnalysisInput`). This caught us off guard and caused 9 build errors.

## Mapping (LawVise routes)
| What you might expect | Actual export from @workspace/api-zod |
|---|---|
| `DocumentAnalysisInput` | `AnalyzeDocumentBody` |
| `LegalChatInput` | `LegalChatBody` |
| `DocumentDraftInput` | `DraftDocumentBody` |
| `LimitationInput` | `CalculateLimitationBody` |
| `CourtFeeInput` | `CalculateCourtFeeBody` |
| `LegalDocumentInput` | `SaveDocumentBody` |
| `LegalCaseInput` | `CreateCaseBody` |
| `LegalCaseUpdate` | `UpdateCaseBody` |
| `HealthStatus` | `HealthCheckResponse` |

## How to apply
Before writing any server route that imports from `@workspace/api-zod`, run:
```bash
grep "^export" lib/api-zod/src/generated/api.ts
```
to see actual exported names.
