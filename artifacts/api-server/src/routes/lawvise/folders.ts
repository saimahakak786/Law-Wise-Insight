import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../../middlewares/requireAuth";
import { CreateFolderBody, UpdateFolderBody } from "@workspace/api-zod";
import { db, documentFoldersTable, legalDocumentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

function parseId(raw: string): number | null {
  const n = parseInt(raw, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

router.get("/lawvise/folders", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const folders = await db
    .select()
    .from(documentFoldersTable)
    .where(eq(documentFoldersTable.userId, userId));
  res.json(folders);
});

router.post("/lawvise/folders", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const parsed = CreateFolderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [folder] = await db
    .insert(documentFoldersTable)
    .values({ ...parsed.data, userId })
    .returning();
  res.status(201).json(folder);
});

router.patch("/lawvise/folders/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid folder ID" });
    return;
  }

  const parsed = UpdateFolderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db
    .update(documentFoldersTable)
    .set(parsed.data)
    .where(and(eq(documentFoldersTable.id, id), eq(documentFoldersTable.userId, userId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Folder not found" });
    return;
  }
  res.json(updated);
});

router.delete("/lawvise/folders/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid folder ID" });
    return;
  }

  // Set folderId=null on documents in this folder first
  await db
    .update(legalDocumentsTable)
    .set({ folderId: null })
    .where(and(eq(legalDocumentsTable.folderId, id), eq(legalDocumentsTable.userId, userId)));

  const [deleted] = await db
    .delete(documentFoldersTable)
    .where(and(eq(documentFoldersTable.id, id), eq(documentFoldersTable.userId, userId)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Folder not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
