---
name: LawVise zod direct imports in api-server
description: Cannot import zod directly in api-server routes — esbuild can't resolve it.
---

## Rule
Never `import { z } from "zod"` or `import { z } from "zod/v4"` in `artifacts/api-server/src/` files.

**Why:** The api-server esbuild config does not list `zod` as an external and `zod` is not a direct dependency of the api-server package. Both `"zod"` and `"zod/v4"` fail to resolve during bundling.

## How to apply
- For simple ID validation in routes, use a plain `parseId()` helper:
  ```typescript
  function parseId(raw: string): number | null {
    const n = parseInt(raw, 10);
    return Number.isInteger(n) && n > 0 ? n : null;
  }
  ```
- For request body validation, use the Zod schemas from `@workspace/api-zod` (already bundled correctly as an external lib).
- If you need zod directly, add it explicitly to `artifacts/api-server/package.json` dependencies first.
