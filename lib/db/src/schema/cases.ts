import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const legalCasesTable = pgTable("legal_cases", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  caseNumber: text("case_number"),
  court: text("court"),
  status: text("status").notNull().default("active"),
  description: text("description"),
  hearingDate: text("hearing_date"),
  nextAction: text("next_action"),
  priority: text("priority"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type LegalCase = typeof legalCasesTable.$inferSelect;
