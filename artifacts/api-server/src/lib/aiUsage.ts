import { randomUUID } from "crypto";
import { pool } from "@workspace/db";

export type AIFeature =
  | "research"
  | "analysis"
  | "drafting"
  | "fact_matcher"
  | "document_analysis"
  | "legal_chat";

export const TRIAL_LIMITS: Record<AIFeature, number> = {
  research: 7,
  analysis: 7,
  drafting: 7,
  fact_matcher: 7,
  document_analysis: 7,
  legal_chat: 8,
};

function isTestingUser(userId: string): boolean {
  const testerIds = (process.env.LAWVISE_TESTER_USER_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  return testerIds.includes(userId);
}

export async function reserveAIUsage(
  userId: string,
  feature: AIFeature
): Promise<{
  allowed: boolean;
  remaining: number | null;
  isTester: boolean;
  reservationId?: string;
}> {
  if (isTestingUser(userId)) {
    return {
      allowed: true,
      remaining: null,
      isTester: true,
    };
  }

  const client = await pool.connect();
  const reservationId = randomUUID();
  const limit = TRIAL_LIMITS[feature];

  try {
    await client.query("BEGIN");

    const usage = await client.query(
      `INSERT INTO ai_trial_usage
         (user_id, feature, used_count, created_at, updated_at)
       VALUES ($1, $2, 0, NOW(), NOW())
       ON CONFLICT (user_id, feature)
       DO NOTHING`,
      [userId, feature]
    );

    const current = await client.query(
      `SELECT used_count
       FROM ai_trial_usage
       WHERE user_id = $1 AND feature = $2
       FOR UPDATE`,
      [userId, feature]
    );

    const used = Number(current.rows[0].used_count);

    if (used >= limit) {
      await client.query("ROLLBACK");

      return {
        allowed: false,
        remaining: 0,
        isTester: false,
      };
    }

    await client.query(
      `UPDATE ai_trial_usage
       SET used_count = used_count + 1,
           updated_at = NOW()
       WHERE user_id = $1 AND feature = $2`,
      [userId, feature]
    );

    await client.query(
      `INSERT INTO ai_trial_reservations
         (id, user_id, feature, status, created_at, updated_at)
       VALUES ($1, $2, $3, 'pending', NOW(), NOW())`,
      [reservationId, userId, feature]
    );

    await client.query("COMMIT");

    return {
      allowed: true,
      remaining: limit - used - 1,
      isTester: false,
      reservationId,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function completeAIUsage(
  reservationId?: string
): Promise<void> {
  if (!reservationId) return;

  await pool.query(
    `UPDATE ai_trial_reservations
     SET status = 'completed',
         updated_at = NOW()
     WHERE id = $1 AND status = 'pending'`,
    [reservationId]
  );
}

export async function refundAIUsage(
  reservationId?: string
): Promise<void> {
  if (!reservationId) return;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const reservation = await client.query(
      `UPDATE ai_trial_reservations
       SET status = 'refunded',
           updated_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING user_id, feature`,
      [reservationId]
    );

    if (reservation.rowCount === 0) {
      await client.query("COMMIT");
      return;
    }

    const { user_id, feature } = reservation.rows[0];

    await client.query(
      `UPDATE ai_trial_usage
       SET used_count = GREATEST(used_count - 1, 0),
           updated_at = NOW()
       WHERE user_id = $1 AND feature = $2`,
      [user_id, feature]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
