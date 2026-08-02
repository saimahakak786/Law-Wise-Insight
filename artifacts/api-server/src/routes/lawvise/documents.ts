import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../../middlewares/requireAuth";
import { SaveDocumentBody, UpdateDocumentBody } from "@workspace/api-zod";
import { db, legalDocumentsTable } from "@workspace/db";
import { eq, and, desc, ilike } from "drizzle-orm";

const router = Router();

function parseId(raw: string): number | null {
  const n = parseInt(raw, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

router.get("/lawvise/documents", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const { folderId, search } = req.query;

  const conditions = [eq(legalDocumentsTable.userId, userId)];

  if (folderId !== undefined && folderId !== null && folderId !== "") {
    const folderIdNum = parseInt(folderId as string, 10);
    if (Number.isInteger(folderIdNum) && folderIdNum > 0) {
      conditions.push(eq(legalDocumentsTable.folderId, folderIdNum));
    }
  }

  if (search && typeof search === "string" && search.trim() !== "") {
    conditions.push(ilike(legalDocumentsTable.title, `%${search.trim()}%`));
  }

  const docs = await db
    .select()
    .from(legalDocumentsTable)
    .where(and(...conditions))
    .orderBy(desc(legalDocumentsTable.createdAt));
  res.json(docs);
});

router.post("/lawvise/documents", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const parsed = SaveDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [doc] = await db
    .insert(legalDocumentsTable)
    .values({ ...parsed.data, userId })
    .returning();
  res.status(201).json(doc);
});

router.patch("/lawvise/documents/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid document ID" });
    return;
  }

  const parsed = UpdateDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db
    .update(legalDocumentsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(legalDocumentsTable.id, id), eq(legalDocumentsTable.userId, userId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  res.json(updated);
});

router.delete("/lawvise/documents/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid document ID" });
    return;
  }

  const [deleted] = await db
    .delete(legalDocumentsTable)
    .where(and(eq(legalDocumentsTable.id, id), eq(legalDocumentsTable.userId, userId)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
