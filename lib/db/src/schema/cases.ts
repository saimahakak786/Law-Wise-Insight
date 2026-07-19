import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const legalCasesTable = pgTable("legal_cases", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  caseNumber: text("case_number"),
  court: text("court"),
  status: text("status").notNull().default("active"),
  description: text("description"),
  hearingDate: text("hearing_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertLegalCaseSchema = createInsertSchema(legalCasesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertLegalCase = z.infer<typeof insertLegalCaseSchema>;
export type LegalCase = typeof legalCasesTable.$inferSelect;
