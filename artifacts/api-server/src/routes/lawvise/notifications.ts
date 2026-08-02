import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../../middlewares/requireAuth";
import { RegisterPushTokenBody } from "@workspace/api-zod";
import { db, userSettingsTable } from "@workspace/db";

const router = Router();

router.post("/lawvise/notifications/register", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const parsed = RegisterPushTokenBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { token } = parsed.data;

  await db
    .insert(userSettingsTable)
    .values({ userId, pushToken: token, notificationsEnabled: true })
    .onConflictDoUpdate({
      target: userSettingsTable.userId,
      set: { pushToken: token, notificationsEnabled: true, updatedAt: new Date() },
    });

  res.json({ success: true });
});

export default router;
