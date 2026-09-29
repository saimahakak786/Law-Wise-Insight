import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../../middlewares/requireAuth";
import { UpdateSettingsBody } from "@workspace/api-zod";
import { db, userSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/lawwise/settings", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;

  try {
    let [settings] = await db
      .select()
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userId, userId));

    if (!settings) {
      // Create default settings
      [settings] = await db
        .insert(userSettingsTable)
        .values({ userId })
        .returning();
    }

    res.json(settings);
  } catch (err) {
    req.log.error({ err, userId }, "Failed to fetch user settings");
    res.status(500).json({ error: "Failed to retrieve settings. Please try again." });
  }
});

router.put("/lawwise/settings", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const [settings] = await db
      .insert(userSettingsTable)
      .values({ userId, ...parsed.data })
      .onConflictDoUpdate({
        target: userSettingsTable.userId,
        set: { ...parsed.data, updatedAt: new Date() },
      })
      .returning();

    res.json(settings);
  } catch (err) {
    req.log.error({ err, userId }, "Failed to update user settings");
    res.status(500).json({ error: "Failed to update settings. Please try again." });
  }
});

export default router;
