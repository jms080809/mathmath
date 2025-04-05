import { 
  users, type User, type InsertUser, type UpdateUser,
  problems, type Problem, type InsertProblem, 
  solvedProblems, type SolvedProblem, type InsertSolvedProblem,
  savedProblems, type SavedProblem, type InsertSavedProblem 
} from "@shared/schema";

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
      username: "admin", 
      password: "admin123" 
    }).then(user => {
      this.users.set(user.id, { ...user, isAdmin: true });
    });
    
    // Add demo user
    this.createUser({ 
      username: "mathwizard", 
      password: "password123" 
    });
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
      isAdmin: false
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
    const id = this.problemIdCounter++;
    const problem: Problem = {
      ...insertProblem,
      id,
      solveCount: 0,
      createdAt: new Date()
    };
    this.problems.set(id, problem);
    
    // Update user's problemsCreated count
    const user = await this.getUser(insertProblem.authorId);
    if (user) {
      await this.updateUser(user.id, { 
        problemsCreated: user.problemsCreated + 1 
      });
    }
    
    return problem;
  }

  async getAllProblems(): Promise<Problem[]> {
    return Array.from(this.problems.values())
      .sort((a, b) => {
        if (b.createdAt instanceof Date && a.createdAt instanceof Date) {
          return b.createdAt.getTime() - a.createdAt.getTime();
        } else {
          return 0;
        }
      });
  }

  async getUserProblems(userId: number): Promise<Problem[]> {
    return Array.from(this.problems.values())
      .filter(problem => problem.authorId === userId)
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
      solveCount: problem.solveCount + 1 
    };
    
    this.problems.set(problemId, updatedProblem);
    return updatedProblem;
  }

  async deleteProblem(id: number): Promise<boolean> {
    return this.problems.delete(id);
  }

  // Solved problems methods
  async solveProblem(insertSolvedProblem: InsertSolvedProblem): Promise<SolvedProblem> {
    const id = this.solvedProblemIdCounter++;
    const solvedProblem: SolvedProblem = {
      ...insertSolvedProblem,
      id,
      solvedAt: new Date()
    };
    this.solvedProblems.set(id, solvedProblem);
    
    // Update problem solve count
    await this.incrementSolveCount(insertSolvedProblem.problemId);
    
    // Update user stats
    const user = await this.getUser(insertSolvedProblem.userId);
    if (user) {
      await this.updateUser(user.id, { 
        points: user.points + insertSolvedProblem.pointsEarned,
        problemsSolved: user.problemsSolved + 1 
      });
    }
    
    return solvedProblem;
  }

  async getUserSolvedProblems(userId: number): Promise<SolvedProblem[]> {
    return Array.from(this.solvedProblems.values())
      .filter(solved => solved.userId === userId);
  }

  async checkIfProblemSolved(userId: number, problemId: number): Promise<boolean> {
    return Array.from(this.solvedProblems.values())
      .some(solved => solved.userId === userId && solved.problemId === problemId);
  }

  // Saved problems methods
  async saveProblem(insertSavedProblem: InsertSavedProblem): Promise<SavedProblem> {
    // Check if already saved
    const alreadySaved = await this.checkIfProblemSaved(
      insertSavedProblem.userId,
      insertSavedProblem.problemId
    );
    
    if (alreadySaved) {
      // Return the existing saved problem
      const existing = Array.from(this.savedProblems.values())
        .find(saved => 
          saved.userId === insertSavedProblem.userId && 
          saved.problemId === insertSavedProblem.problemId
        );
      
      if (existing) return existing;
    }
    
    const id = this.savedProblemIdCounter++;
    const savedProblem: SavedProblem = {
      ...insertSavedProblem,
      id,
      savedAt: new Date()
    };
    this.savedProblems.set(id, savedProblem);
    return savedProblem;
  }

  async unsaveProblem(userId: number, problemId: number): Promise<boolean> {
    const savedProblemToRemove = Array.from(this.savedProblems.values())
      .find(saved => saved.userId === userId && saved.problemId === problemId);
    
    if (!savedProblemToRemove) return false;
    
    return this.savedProblems.delete(savedProblemToRemove.id);
  }

  async getUserSavedProblems(userId: number): Promise<SavedProblem[]> {
    return Array.from(this.savedProblems.values())
      .filter(saved => saved.userId === userId);
  }

  async checkIfProblemSaved(userId: number, problemId: number): Promise<boolean> {
    return Array.from(this.savedProblems.values())
      .some(saved => saved.userId === userId && saved.problemId === problemId);
  }
}

export const storage = new MemStorage();
