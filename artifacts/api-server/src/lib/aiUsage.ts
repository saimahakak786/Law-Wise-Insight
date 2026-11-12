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

/**
 * Reserves one trial use atomically.
 * Concurrent requests cannot exceed the feature limit.
 */
export async function reserveAIUsage(
  userId: string,
  feature: AIFeature
): Promise<{
  allowed: boolean;
  remaining: number | null;
  isTester: boolean;
}> {
  if (isTestingUser(userId)) {
    return {
      allowed: true,
      remaining: null,
      isTester: true,
    };
  }

  const limit = TRIAL_LIMITS[feature];

  const result = await pool.query(
    `INSERT INTO ai_trial_usage
       (user_id, feature, used_count, created_at, updated_at)
     VALUES ($1, $2, 1, NOW(), NOW())
     ON CONFLICT (user_id, feature)
     DO UPDATE SET
       used_count = ai_trial_usage.used_count + 1,
       updated_at = NOW()
     WHERE ai_trial_usage.used_count < $3
     RETURNING used_count`,
    [userId, feature, limit]
  );

  if (result.rowCount === 0) {
    return {
      allowed: false,
      remaining: 0,
      isTester: false,
    };
  }

  const used = Number(result.rows[0].used_count);

  return {
    allowed: true,
    remaining: Math.max(0, limit - used),
    isTester: false,
  };
}

/**
 * Refunds a reserved trial if the AI operation fails.
 */
export async function refundAIUsage(
  userId: string,
  feature: AIFeature
): Promise<void> {
  if (isTestingUser(userId)) return;

  await pool.query(
    `UPDATE ai_trial_usage
     SET used_count = GREATEST(used_count - 1, 0),
         updated_at = NOW()
     WHERE user_id = $1 AND feature = $2`,
    [userId, feature]
  );
}
