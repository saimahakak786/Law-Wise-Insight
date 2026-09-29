import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../../middlewares/requireAuth";
import { RegisterPushTokenBody } from "@workspace/api-zod";
import { db, userSettingsTable } from "@workspace/db";

const router = Router();

router.post("/lawwise/notifications/register", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthenticatedRequest).userId;
  const parsed = RegisterPushTokenBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { token } = parsed.data;

  try {
    await db
      .insert(userSettingsTable)
      .values({ userId, pushToken: token, notificationsEnabled: true })
      .onConflictDoUpdate({
        target: userSettingsTable.userId,
        set: { pushToken: token, notificationsEnabled: true, updatedAt: new Date() },
      });

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err, userId }, "Failed to register push notification token");
    res.status(500).json({ error: "Failed to register notification token. Please try again." });
  }
});

export default router;
