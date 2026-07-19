import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../../middlewares/requireAuth";
import { CreateCaseBody, UpdateCaseBody } from "@workspace/api-zod";
import { db, legalCasesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

function parseId(raw: string): number | null {
  const n = parseInt(raw, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

router.get("/lawvise/cases", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const cases = await db
    .select()
    .from(legalCasesTable)
    .where(eq(legalCasesTable.userId, userId))
    .orderBy(desc(legalCasesTable.createdAt));
  res.json(cases);
});

router.post("/lawvise/cases", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const parsed = CreateCaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [legalCase] = await db
    .insert(legalCasesTable)
    .values({ ...parsed.data, userId })
    .returning();
  res.status(201).json(legalCase);
});

router.patch("/lawvise/cases/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid case ID" });
    return;
  }

  const parsed = LegalCaseUpdate.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db
    .update(legalCasesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(legalCasesTable.id, id), eq(legalCasesTable.userId, userId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Case not found" });
    return;
  }
  res.json(updated);
});

router.delete("/lawvise/cases/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid case ID" });
    return;
  }

  const [deleted] = await db
    .delete(legalCasesTable)
    .where(and(eq(legalCasesTable.id, id), eq(legalCasesTable.userId, userId)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Case not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
