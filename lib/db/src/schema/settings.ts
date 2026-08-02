import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const userSettingsTable = pgTable("user_settings", {
  userId: text("user_id").primaryKey(),
  language: text("language").notNull().default("en"),
  jurisdiction: text("jurisdiction").notNull().default("India"),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(false),
  pushToken: text("push_token"),
  theme: text("theme"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type UserSettings = typeof userSettingsTable.$inferSelect;
