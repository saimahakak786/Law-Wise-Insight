import {
  pgTable,
  serial,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const judgmentsTable = pgTable(
  "judgments",
  {
    id: serial("id").primaryKey(),

    caseName: text("case_name").notNull(),
    citation: text("citation"),
    court: text("court").notNull(),
    jurisdiction: text("jurisdiction").notNull(),

    caseNumber: text("case_number"),
    judgmentDate: text("judgment_date"),

    source: text("source").notNull(),
    sourceUrl: text("source_url").notNull(),
    sourceRecordId: text("source_record_id"),

    fullText: text("full_text"),
    summary: text("summary"),

    retrievalStatus: text("retrieval_status")
      .notNull()
      .default("metadata_only"),

    createdAt: timestamp("created_at")
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("judgments_jurisdiction_idx").on(table.jurisdiction),
    index("judgments_court_idx").on(table.court),
    index("judgments_source_record_idx").on(table.sourceRecordId),
  ],
);

export type Judgment = typeof judgmentsTable.$inferSelect;
export type NewJudgment = typeof judgmentsTable.$inferInsert;
