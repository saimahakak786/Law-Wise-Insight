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

router.get("/lawwise/cases", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const cases = await db
      .select()
      .from(legalCasesTable)
      .where(eq(legalCasesTable.userId, userId))
      .orderBy(desc(legalCasesTable.createdAt));
    res.json(cases);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch legal cases");
    res.status(500).json({ error: "Failed to retrieve cases. Please try again." });
  }
});

router.post("/lawwise/cases", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const parsed = CreateCaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const [legalCase] = await db
      .insert(legalCasesTable)
      .values({ ...parsed.data, userId })
      .returning();
    res.status(201).json(legalCase);
  } catch (err) {
    req.log.error({ err }, "Failed to create legal case");
    res.status(500).json({ error: "Failed to create case. Please try again." });
  }
});

router.patch("/lawwise/cases/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid case ID" });
    return;
  }

  const parsed = UpdateCaseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
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
  } catch (err) {
    req.log.error({ err, caseId: id }, "Failed to update legal case");
    res.status(500).json({ error: "Failed to update case. Please try again." });
  }
});

router.delete("/lawwise/cases/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid case ID" });
    return;
  }

  try {
    const [deleted] = await db
      .delete(legalCasesTable)
      .where(and(eq(legalCasesTable.id, id), eq(legalCasesTable.userId, userId)))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Case not found" });
      return;
    }
    res.sendStatus(204);
  } catch (err) {
    req.log.error({ err, caseId: id }, "Failed to delete legal case");
    res.status(500).json({ error: "Failed to delete case. Please try again." });
  }
});

export default router;
