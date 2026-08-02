import { pgTable, serial, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const documentFoldersTable = pgTable("document_folders", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  color: text("color"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const legalDocumentsTable = pgTable("legal_documents", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  documentType: text("document_type").notNull(),
  content: text("content"),
  analysisType: text("analysis_type"),
  analysisResult: text("analysis_result"),
  fileUrl: text("file_url"),
  folderId: integer("folder_id"),
  isFavorite: boolean("is_favorite").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type LegalDocument = typeof legalDocumentsTable.$inferSelect;
export type DocumentFolder = typeof documentFoldersTable.$inferSelect;
