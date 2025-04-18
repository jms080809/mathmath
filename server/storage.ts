import {
  users,
  type User,
  type InsertUser,
  type UpdateUser,
  problems,
  type Problem,
  type InsertProblem,
  solvedProblems,
  type SolvedProblem,
  type InsertSolvedProblem,
  savedProblems,
  type SavedProblem,
  type InsertSavedProblem,
  generateUniqueId,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { admin_username, admin_password } from "../init_admin.json";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, update: UpdateUser): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  deleteUser(id: number): Promise<boolean>;

  // Problem methods
  getProblem(id: number): Promise<Problem | undefined>;
  createProblem(problem: InsertProblem): Promise<Problem>;
  getAllProblems(): Promise<Problem[]>;
  getPaginatedProblems(limit: number, offset: number): Promise<Problem[]>;
  getRandomUnsolvedProblems(userId: number, limit: number): Promise<Problem[]>;
  getUserProblems(userId: number): Promise<Problem[]>;
  incrementSolveCount(problemId: number): Promise<Problem | undefined>;
  deleteProblem(id: number): Promise<boolean>;

  // Solved problems methods
  solveProblem(solvedProblem: InsertSolvedProblem): Promise<SolvedProblem>;
  getUserSolvedProblems(userId: number): Promise<SolvedProblem[]>;
  checkIfProblemSolved(userId: number, problemId: number): Promise<boolean>;

  // Saved problems methods
  saveProblem(savedProblem: InsertSavedProblem): Promise<SavedProblem>;
  unsaveProblem(userId: number, problemId: number): Promise<boolean>;
  getUserSavedProblems(userId: number): Promise<SavedProblem[]>;
  checkIfProblemSaved(userId: number, problemId: number): Promise<boolean>;
}

// WARNING: This class is kept for reference only and is no longer used
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private problems: Map<number, Problem>;
  private solvedProblems: Map<number, SolvedProblem>;
  private savedProblems: Map<number, SavedProblem>;

  private userIdCounter: number;
  private problemIdCounter: number;
  private solvedProblemIdCounter: number;
  private savedProblemIdCounter: number;

  constructor() {
    this.users = new Map();
    this.problems = new Map();
    this.solvedProblems = new Map();
    this.savedProblems = new Map();

    this.userIdCounter = 1;
    this.problemIdCounter = 1;
    this.solvedProblemIdCounter = 1;
    this.savedProblemIdCounter = 1;

    // Add admin user
    this.createUser({
      username: admin_username,
      password: admin_password,
    }).then((user) => {
      if (user) {
        const adminUser = { ...user };
        // @ts-ignore - we know this is valid
        adminUser.isAdmin = 1;
        this.users.set(user.id, adminUser);
      }
    });

    // Add demo user
    // this.createUser({
    //   username: "mathwizard",
    //   password: "password123"
    // });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = {
      ...insertUser,
      id,
      points: 0,
      profilePicture: undefined,
      problemsSolved: 0,
      problemsCreated: 0,
      streak: 0,
      isAdmin: false,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, update: UpdateUser): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...update };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  // Problem methods
  async getProblem(id: number): Promise<Problem | undefined> {
    return this.problems.get(id);
  }

  async createProblem(insertProblem: InsertProblem): Promise<Problem> {
    const id = generateUniqueId(); // Using time-based ID from schema.ts
    const problem: Problem = {
      ...insertProblem,
      id,
      solveCount: 0,
      createdAt: new Date(),
    };
    this.problems.set(id, problem);

    // Update user's problemsCreated count
    const user = await this.getUser(insertProblem.authorId);
    if (user) {
      await this.updateUser(user.id, {
        problemsCreated: user.problemsCreated + 1,
      });
    }

    return problem;
  }

  async getAllProblems(): Promise<Problem[]> {
    return Array.from(this.problems.values()).sort((a, b) => {
      if (b.createdAt instanceof Date && a.createdAt instanceof Date) {
        return b.createdAt.getTime() - a.createdAt.getTime();
      } else {
        return 0;
      }
    });
  }

  async getPaginatedProblems(
    limit: number,
    offset: number
  ): Promise<Problem[]> {
    return Array.from(this.problems.values())
      .sort((a, b) => {
        if (b.createdAt instanceof Date && a.createdAt instanceof Date) {
          return b.createdAt.getTime() - a.createdAt.getTime();
        } else {
          return 0;
        }
      })
      .slice(offset, offset + limit);
  }

  async getRandomUnsolvedProblems(
    userId: number,
    limit: number
  ): Promise<Problem[]> {
    // 사용자가 푼 문제 ID 가져오기
    const solvedProblems = await this.getUserSolvedProblems(userId);
    const solvedProblemIds = solvedProblems.map((sp) => sp.problemId);

    // 풀지 않은 문제 필터링
    const unsolvedProblems = Array.from(this.problems.values()).filter(
      (p) => !solvedProblemIds.includes(p.id)
    );

    // 문제가 없으면 빈 배열 반환
    if (unsolvedProblems.length === 0) {
      return [];
    }

    // 랜덤으로 limit개 만큼 선택
    const randomProblems: Problem[] = [];
    const totalProblems = unsolvedProblems.length;

    // 요청한 수보다 적은 문제가 있는 경우 모두 반환
    if (totalProblems <= limit) {
      return unsolvedProblems;
    }

    // 랜덤 인덱스 생성을 위한 집합 (중복 방지)
    const selectedIndices = new Set<number>();

    while (
      randomProblems.length < limit &&
      selectedIndices.size < totalProblems
    ) {
      const randomIndex = Math.floor(Math.random() * totalProblems);

      if (!selectedIndices.has(randomIndex)) {
        selectedIndices.add(randomIndex);
        randomProblems.push(unsolvedProblems[randomIndex]);
      }
    }

    return randomProblems;
  }

  async getUserProblems(userId: number): Promise<Problem[]> {
    return Array.from(this.problems.values())
      .filter((problem) => problem.authorId === userId)
      .sort((a, b) => {
        if (b.createdAt instanceof Date && a.createdAt instanceof Date) {
          return b.createdAt.getTime() - a.createdAt.getTime();
        } else {
          return 0;
        }
      });
  }

  async incrementSolveCount(problemId: number): Promise<Problem | undefined> {
    const problem = await this.getProblem(problemId);
    if (!problem) return undefined;

    const updatedProblem = {
      ...problem,
      solveCount: problem.solveCount + 1,
    };

    this.problems.set(problemId, updatedProblem);
    return updatedProblem;
  }

  async deleteProblem(id: number): Promise<boolean> {
    return this.problems.delete(id);
  }

  // Solved problems methods
  async solveProblem(
    insertSolvedProblem: InsertSolvedProblem
  ): Promise<SolvedProblem> {
    const id = this.solvedProblemIdCounter++;
    const solvedProblem: SolvedProblem = {
      ...insertSolvedProblem,
      id,
      solvedAt: new Date(),
    };
    this.solvedProblems.set(id, solvedProblem);

    // Update problem solve count
    await this.incrementSolveCount(insertSolvedProblem.problemId);

    // Update user stats
    const user = await this.getUser(insertSolvedProblem.userId);
    if (user) {
      await this.updateUser(user.id, {
        points: user.points + insertSolvedProblem.pointsEarned,
        problemsSolved: user.problemsSolved + 1,
      });
    }

    return solvedProblem;
  }

  async getUserSolvedProblems(userId: number): Promise<SolvedProblem[]> {
    return Array.from(this.solvedProblems.values()).filter(
      (solved) => solved.userId === userId
    );
  }

  async checkIfProblemSolved(
    userId: number,
    problemId: number
  ): Promise<boolean> {
    return Array.from(this.solvedProblems.values()).some(
      (solved) => solved.userId === userId && solved.problemId === problemId
    );
  }

  // Saved problems methods
  async saveProblem(
    insertSavedProblem: InsertSavedProblem
  ): Promise<SavedProblem> {
    // Check if already saved
    const alreadySaved = await this.checkIfProblemSaved(
      insertSavedProblem.userId,
      insertSavedProblem.problemId
    );

    if (alreadySaved) {
      // Return the existing saved problem
      const existing = Array.from(this.savedProblems.values()).find(
        (saved) =>
          saved.userId === insertSavedProblem.userId &&
          saved.problemId === insertSavedProblem.problemId
      );

      if (existing) return existing;
    }

    const id = this.savedProblemIdCounter++;
    const savedProblem: SavedProblem = {
      ...insertSavedProblem,
      id,
      savedAt: new Date(),
    };
    this.savedProblems.set(id, savedProblem);
    return savedProblem;
  }

  async unsaveProblem(userId: number, problemId: number): Promise<boolean> {
    const savedProblemToRemove = Array.from(this.savedProblems.values()).find(
      (saved) => saved.userId === userId && saved.problemId === problemId
    );

    if (!savedProblemToRemove) return false;

    return this.savedProblems.delete(savedProblemToRemove.id);
  }

  async getUserSavedProblems(userId: number): Promise<SavedProblem[]> {
    return Array.from(this.savedProblems.values()).filter(
      (saved) => saved.userId === userId
    );
  }

  async checkIfProblemSaved(
    userId: number,
    problemId: number
  ): Promise<boolean> {
    return Array.from(this.savedProblems.values()).some(
      (saved) => saved.userId === userId && saved.problemId === problemId
    );
  }
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    try {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      return result.length ? result[0] : undefined;
    } catch (error) {
      console.error("Error getting user:", error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);
      return result.length ? result[0] : undefined;
    } catch (error) {
      console.error("Error getting user by username:", error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const defaultUser = {
        ...insertUser,
        points: 0,
        profilePicture: null,
        problemsSolved: 0,
        problemsCreated: 0,
        streak: 0,
        isAdmin: 0,
      };

      const result = await db.insert(users).values(defaultUser).returning();
      return result[0];
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  async updateUser(id: number, update: UpdateUser): Promise<User | undefined> {
    try {
      const result = await db
        .update(users)
        .set(update)
        .where(eq(users.id, id))
        .returning();
      return result.length ? result[0] : undefined;
    } catch (error) {
      console.error("Error updating user:", error);
      return undefined;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      return await db.select().from(users);
    } catch (error) {
      console.error("Error getting all users:", error);
      return [];
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      const result = await db.delete(users).where(eq(users.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  }

  // Problem methods
  async getProblem(id: number): Promise<Problem | undefined> {
    try {
      const result = await db
        .select()
        .from(problems)
        .where(eq(problems.id, id))
        .limit(1);

      if (result.length) {
        const problem = result[0];

        // Parse JSON strings if needed
        if (problem.options && typeof problem.options === "string") {
          try {
            problem.options = JSON.parse(problem.options);
          } catch (e) {
            console.warn("Error parsing options JSON:", e);
          }
        }

        if (problem.tags && typeof problem.tags === "string") {
          try {
            problem.tags = JSON.parse(problem.tags);
          } catch (e) {
            console.warn("Error parsing tags JSON:", e);
          }
        }

        return problem;
      }

      return undefined;
    } catch (error) {
      console.error("Error getting problem:", error);
      return undefined;
    }
  }

  async createProblem(insertProblem: InsertProblem): Promise<Problem> {
    try {
      // Prepare data for database storage - convert arrays to JSON strings
      const problemData = {
        ...insertProblem,
        options: insertProblem.options
          ? JSON.stringify(insertProblem.options)
          : null,
        tags: insertProblem.tags ? JSON.stringify(insertProblem.tags) : null,
        solveCount: 0,
        createdAt: new Date(), // Add current date for createdAt
      };

      const result = await db.insert(problems).values(problemData).returning();

      // Update the user's problemsCreated count
      const user = await this.getUser(insertProblem.authorId);
      if (user) {
        await this.updateUser(user.id, {
          problemsCreated: user.problemsCreated + 1,
        });
      }

      // Parse the options and tags back to arrays for the return value
      const problem = result[0];
      if (problem.options && typeof problem.options === "string") {
        try {
          problem.options = JSON.parse(problem.options);
        } catch (e) {
          console.warn("Error parsing options JSON:", e);
        }
      }

      if (problem.tags && typeof problem.tags === "string") {
        try {
          problem.tags = JSON.parse(problem.tags);
        } catch (e) {
          console.warn("Error parsing tags JSON:", e);
        }
      }

      return problem;
    } catch (error) {
      console.error("Error creating problem:", error);
      throw error;
    }
  }

  async getAllProblems(): Promise<Problem[]> {
    try {
      const allProblems = await db
        .select()
        .from(problems)
        .orderBy(desc(problems.createdAt));

      // Parse JSON strings
      return allProblems.map((problem) => {
        if (problem.options && typeof problem.options === "string") {
          try {
            problem.options = JSON.parse(problem.options);
          } catch (e) {
            // 파싱 실패 시 문자열 그대로 유지
            console.warn("Error parsing options JSON:", e);
          }
        }

        if (problem.tags && typeof problem.tags === "string") {
          try {
            problem.tags = JSON.parse(problem.tags);
          } catch (e) {
            // 파싱 실패 시 문자열 그대로 유지
            console.warn("Error parsing tags JSON:", e);
          }
        }

        return problem;
      });
    } catch (error) {
      console.error("Error getting all problems:", error);
      return [];
    }
  }

  async getPaginatedProblems(
    limit: number,
    offset: number
  ): Promise<Problem[]> {
    try {
      const paginatedProblems = await db
        .select()
        .from(problems)
        .orderBy(desc(problems.createdAt))
        .limit(limit)
        .offset(offset);

      // Parse JSON strings
      return paginatedProblems.map((problem) => {
        if (problem.options && typeof problem.options === "string") {
          try {
            problem.options = JSON.parse(problem.options);
          } catch (e) {
            console.warn("Error parsing options JSON:", e);
          }
        }

        if (problem.tags && typeof problem.tags === "string") {
          try {
            problem.tags = JSON.parse(problem.tags);
          } catch (e) {
            console.warn("Error parsing tags JSON:", e);
          }
        }

        return problem;
      });
    } catch (error) {
      console.error("Error getting paginated problems:", error);
      return [];
    }
  }

  async getRandomUnsolvedProblems(
    userId: number,
    limit: number
  ): Promise<Problem[]> {
    try {
      // 사용자가 푼 문제 ID 목록 가져오기
      const solvedProblems = await this.getUserSolvedProblems(userId);
      const solvedProblemIds = solvedProblems.map((sp) => sp.problemId);

      // 모든 문제 가져오기
      const allProblems = await this.getAllProblems();

      // 풀지 않은 문제 필터링
      const unsolvedProblems = allProblems.filter(
        (p) => !solvedProblemIds.includes(p.id)
      );

      // 문제가 없으면 빈 배열 반환
      if (unsolvedProblems.length === 0) {
        return [];
      }

      // 랜덤으로 limit개 만큼 선택
      const randomProblems: Problem[] = [];
      const totalProblems = unsolvedProblems.length;

      // 요청한 수보다 적은 문제가 있는 경우 모두 반환
      if (totalProblems <= limit) {
        return unsolvedProblems;
      }

      // 랜덤 인덱스 생성을 위한 집합 (중복 방지)
      const selectedIndices = new Set<number>();

      while (
        randomProblems.length < limit &&
        selectedIndices.size < totalProblems
      ) {
        const randomIndex = Math.floor(Math.random() * totalProblems);

        if (!selectedIndices.has(randomIndex)) {
          selectedIndices.add(randomIndex);
          randomProblems.push(unsolvedProblems[randomIndex]);
        }
      }

      return randomProblems;
    } catch (error) {
      console.error("Error getting random unsolved problems:", error);
      return [];
    }
  }

  async getUserProblems(userId: number): Promise<Problem[]> {
    try {
      const userProblems = await db
        .select()
        .from(problems)
        .where(eq(problems.authorId, userId))
        .orderBy(desc(problems.createdAt));

      // Parse JSON strings
      return userProblems.map((problem) => {
        if (problem.options && typeof problem.options === "string") {
          try {
            problem.options = JSON.parse(problem.options);
          } catch (e) {
            console.warn("Error parsing options JSON:", e);
          }
        }

        if (problem.tags && typeof problem.tags === "string") {
          try {
            problem.tags = JSON.parse(problem.tags);
          } catch (e) {
            console.warn("Error parsing tags JSON:", e);
          }
        }

        return problem;
      });
    } catch (error) {
      console.error("Error getting user problems:", error);
      return [];
    }
  }

  async incrementSolveCount(problemId: number): Promise<Problem | undefined> {
    try {
      const problem = await this.getProblem(problemId);
      if (!problem) return undefined;

      const result = await db
        .update(problems)
        .set({ solveCount: problem.solveCount + 1 })
        .where(eq(problems.id, problemId))
        .returning();

      if (result.length) {
        const updatedProblem = result[0];

        // Parse JSON strings
        if (
          updatedProblem.options &&
          typeof updatedProblem.options === "string"
        ) {
          try {
            updatedProblem.options = JSON.parse(updatedProblem.options);
          } catch (e) {
            console.warn("Error parsing options JSON:", e);
          }
        }

        if (updatedProblem.tags && typeof updatedProblem.tags === "string") {
          try {
            updatedProblem.tags = JSON.parse(updatedProblem.tags);
          } catch (e) {
            console.warn("Error parsing tags JSON:", e);
          }
        }

        return updatedProblem;
      }

      return undefined;
    } catch (error) {
      console.error("Error incrementing solve count:", error);
      return undefined;
    }
  }

  async deleteProblem(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(problems)
        .where(eq(problems.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting problem:", error);
      return false;
    }
  }

  // Solved problems methods
  async solveProblem(
    insertSolvedProblem: InsertSolvedProblem
  ): Promise<SolvedProblem> {
    try {
      // Insert the solved problem with solvedAt timestamp
      const result = await db
        .insert(solvedProblems)
        .values({
          ...insertSolvedProblem,
          solvedAt: new Date(),
        })
        .returning();

      // Update the problem solve count
      await this.incrementSolveCount(insertSolvedProblem.problemId);

      // Update user stats
      const user = await this.getUser(insertSolvedProblem.userId);
      if (user) {
        await this.updateUser(user.id, {
          points: user.points + insertSolvedProblem.pointsEarned,
          problemsSolved: user.problemsSolved + 1,
        });
      }

      return result[0];
    } catch (error) {
      console.error("Error solving problem:", error);
      throw error;
    }
  }

  async getUserSolvedProblems(userId: number): Promise<SolvedProblem[]> {
    try {
      return await db
        .select()
        .from(solvedProblems)
        .where(eq(solvedProblems.userId, userId));
    } catch (error) {
      console.error("Error getting user solved problems:", error);
      return [];
    }
  }

  async checkIfProblemSolved(
    userId: number,
    problemId: number
  ): Promise<boolean> {
    try {
      const result = await db
        .select()
        .from(solvedProblems)
        .where(
          and(
            eq(solvedProblems.userId, userId),
            eq(solvedProblems.problemId, problemId)
          )
        )
        .limit(1);

      return result.length > 0;
    } catch (error) {
      console.error("Error checking if problem solved:", error);
      return false;
    }
  }

  // Saved problems methods
  async saveProblem(
    insertSavedProblem: InsertSavedProblem
  ): Promise<SavedProblem> {
    try {
      // Check if already saved
      const alreadySaved = await this.checkIfProblemSaved(
        insertSavedProblem.userId,
        insertSavedProblem.problemId
      );

      if (alreadySaved) {
        // Return the existing saved problem
        const existing = await db
          .select()
          .from(savedProblems)
          .where(
            and(
              eq(savedProblems.userId, insertSavedProblem.userId),
              eq(savedProblems.problemId, insertSavedProblem.problemId)
            )
          )
          .limit(1);

        if (existing.length) return existing[0];
      }

      // Insert new saved problem with timestamp
      const result = await db
        .insert(savedProblems)
        .values({
          ...insertSavedProblem,
          savedAt: new Date(),
        })
        .returning();
      return result[0];
    } catch (error) {
      console.error("Error saving problem:", error);
      throw error;
    }
  }

  async unsaveProblem(userId: number, problemId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(savedProblems)
        .where(
          and(
            eq(savedProblems.userId, userId),
            eq(savedProblems.problemId, problemId)
          )
        )
        .returning();

      return result.length > 0;
    } catch (error) {
      console.error("Error unsaving problem:", error);
      return false;
    }
  }

  async getUserSavedProblems(userId: number): Promise<SavedProblem[]> {
    try {
      return await db
        .select()
        .from(savedProblems)
        .where(eq(savedProblems.userId, userId));
    } catch (error) {
      console.error("Error getting user saved problems:", error);
      return [];
    }
  }

  async checkIfProblemSaved(
    userId: number,
    problemId: number
  ): Promise<boolean> {
    try {
      const result = await db
        .select()
        .from(savedProblems)
        .where(
          and(
            eq(savedProblems.userId, userId),
            eq(savedProblems.problemId, problemId)
          )
        )
        .limit(1);

      return result.length > 0;
    } catch (error) {
      console.error("Error checking if problem saved:", error);
      return false;
    }
  }
}

// Initialize the database with admin and demo user
async function setupInitialData() {
  const dbStorage = new DatabaseStorage();

  // Check if admin exists
  const existingAdmin = await dbStorage.getUserByUsername(admin_username);
  if (!existingAdmin) {
    await dbStorage.createUser({
      username: admin_username,
      password: admin_password,
    });

    // Set as admin
    const admin = await dbStorage.getUserByUsername(admin_username);
    if (admin) {
      await db.update(users).set({ isAdmin: 1 }).where(eq(users.id, admin.id));
    }
  }

  // Check if demo user exists
  // const existingDemo = await dbStorage.getUserByUsername("mathwizard");
  // if (!existingDemo) {
  //   await dbStorage.createUser({
  //     username: "mathwizard",
  //     password: "password123",
  //   });
  // }
}

// Create a database storage instance
export const storage = new DatabaseStorage();

// Set up initial data
setupInitialData().catch((err) => {
  console.error("Error setting up initial data:", err);
});
