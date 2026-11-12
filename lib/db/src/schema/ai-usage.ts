import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const aiTrialUsageTable = pgTable(
  "ai_trial_usage",
  {
    id: serial("id").primaryKey(),

    // Clerk authenticated user ID
    userId: text("user_id").notNull(),

    // Feature name: research, analysis, drafting, matcher, etc.
    feature: text("feature").notNull(),

    // Number of successfully completed free uses
    usedCount: integer("used_count").notNull().default(0),

    createdAt: timestamp("created_at")
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userFeatureUnique: uniqueIndex(
      "ai_trial_usage_user_feature_unique"
    ).on(table.userId, table.feature),
  })
);

export type AiTrialUsage = typeof aiTrialUsageTable.$inferSelect;
export type NewAiTrialUsage = typeof aiTrialUsageTable.$inferInsert;
