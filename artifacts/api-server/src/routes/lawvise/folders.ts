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

router.get("/lawwise/folders", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  try {
    const folders = await db
      .select()
      .from(documentFoldersTable)
      .where(eq(documentFoldersTable.userId, userId));
    res.json(folders);
  } catch (err) {
    req.log.error({ err, userId }, "Failed to fetch document folders");
    res.status(500).json({ error: "Failed to retrieve folders. Please try again." });
  }
});

router.post("/lawwise/folders", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const parsed = CreateFolderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const [folder] = await db
      .insert(documentFoldersTable)
      .values({ ...parsed.data, userId })
      .returning();
    res.status(201).json(folder);
  } catch (err) {
    req.log.error({ err, userId }, "Failed to create document folder");
    res.status(500).json({ error: "Failed to create folder. Please try again." });
  }
});

router.patch("/lawwise/folders/:id", requireAuth, async (req, res): Promise<void> => {
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

  try {
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
  } catch (err) {
    req.log.error({ err, folderId: id }, "Failed to update document folder");
    res.status(500).json({ error: "Failed to update folder. Please try again." });
  }
});

router.delete("/lawwise/folders/:id", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid folder ID" });
    return;
  }

  try {
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
  } catch (err) {
    req.log.error({ err, folderId: id }, "Failed to delete document folder");
    res.status(500).json({ error: "Failed to delete folder. Please try again." });
  }
});

export default router;
