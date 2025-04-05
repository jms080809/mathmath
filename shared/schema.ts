import { sqliteTable, text, integer, blob } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  points: integer("points").default(0).notNull(),
  profilePicture: text("profile_picture"),
  problemsSolved: integer("problems_solved").default(0).notNull(),
  problemsCreated: integer("problems_created").default(0).notNull(),
  streak: integer("streak").default(0).notNull(),
  isAdmin: integer("is_admin").default(0).notNull(),
});

export const problems = sqliteTable("problems", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  authorId: integer("author_id").notNull(),
  type: text("type").notNull(), // "multiple-choice" or "short-answer"
  text: text("text").notNull(),
  image: text("image"),
  options: text("options"), // Will store JSON as string
  correctAnswer: text("correct_answer").notNull(),
  difficulty: text("difficulty").default("medium").notNull(), // "easy", "medium", or "hard"
  tags: text("tags"), // Will store JSON as string
  solveCount: integer("solve_count").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const solvedProblems = sqliteTable("solved_problems", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  problemId: integer("problem_id").notNull(),
  solvedAt: integer("solved_at", { mode: "timestamp" }).notNull(),
  pointsEarned: integer("points_earned").notNull(),
});

export const savedProblems = sqliteTable("saved_problems", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  problemId: integer("problem_id").notNull(),
  savedAt: integer("saved_at", { mode: "timestamp" }).notNull(),
});

// Insert Schemas
export const insertUserSchema = createInsertSchema(users)
  .omit({ id: true, points: true, problemsSolved: true, problemsCreated: true, streak: true, isAdmin: true });

export const insertProblemSchema = createInsertSchema(problems)
  .omit({ id: true, solveCount: true, createdAt: true })
  .extend({
    options: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional()
  });

export const insertSolvedProblemSchema = createInsertSchema(solvedProblems)
  .omit({ id: true, solvedAt: true });

export const insertSavedProblemSchema = createInsertSchema(savedProblems)
  .omit({ id: true, savedAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Problem = typeof problems.$inferSelect;
export type InsertProblem = z.infer<typeof insertProblemSchema>;

export type SolvedProblem = typeof solvedProblems.$inferSelect;
export type InsertSolvedProblem = z.infer<typeof insertSolvedProblemSchema>;

export type SavedProblem = typeof savedProblems.$inferSelect;
export type InsertSavedProblem = z.infer<typeof insertSavedProblemSchema>;

// View Schema Extensions
export const problemWithAuthorSchema = z.object({
  problem: z.object({
    id: z.number(),
    text: z.string(),
    type: z.enum(["multiple-choice", "short-answer"]),
    options: z.array(z.string()).optional(),
    image: z.string().optional(),
    difficulty: z.enum(["easy", "medium", "hard"]),
    solveCount: z.number(),
    createdAt: z.string(),
  }),
  author: z.object({
    id: z.number(),
    username: z.string(),
    profilePicture: z.string().optional(),
  }),
  isSolved: z.boolean().optional(),
  isSaved: z.boolean().optional(),
});

export type ProblemWithAuthor = z.infer<typeof problemWithAuthorSchema>;

export const validateAnswerSchema = z.object({
  problemId: z.number(),
  answer: z.string(),
});

export const updateUserSchema = createInsertSchema(users)
  .omit({ id: true, password: true, points: true, problemsSolved: true, problemsCreated: true, streak: true, isAdmin: true })
  .partial();

export type UpdateUser = z.infer<typeof updateUserSchema>;
