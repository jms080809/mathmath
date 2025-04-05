import express, { type Express, type Request, type Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { validateAnswerSchema, insertProblemSchema, insertUserSchema, updateUserSchema, insertSavedProblemSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import session from "express-session";
import MemoryStore from "memorystore";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage: storage_multer,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed"));
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Session setup
  const SessionStore = MemoryStore(session);
  
  app.use(session({
    secret: process.env.SESSION_SECRET || "math-solve-secret-key",
    resave: false,
    saveUninitialized: false,
    store: new SessionStore({
      checkPeriod: 86400000 // 24 hours
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Configure static file serving for uploads
  app.use("/uploads", express.static(uploadDir));

  // Auth Middleware
  const requireAuth = (req: Request, res: Response, next: () => void) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  const requireAdmin = async (req: Request, res: Response, next: () => void) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const user = await storage.getUser(req.session.userId);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    next();
  };

  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }
      
      // Create user
      const user = await storage.createUser(userData);
      
      // Set session
      req.session.userId = user.id;
      
      // Return user data without password
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Error creating user" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }
      
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Set session
      req.session.userId = user.id;
      
      // Return user data without password
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Error logging in" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return user data without password
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Error retrieving user" });
    }
  });

  // User Routes
  app.put("/api/users/me", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const updateData = updateUserSchema.parse(req.body);
      
      const updatedUser = await storage.updateUser(userId, updateData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return user data without password
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Error updating user" });
    }
  });

  app.post("/api/users/me/profile-picture", requireAuth, upload.single("profilePicture"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const userId = req.session.userId!;
      const filePath = `/uploads/${req.file.filename}`;
      
      const updatedUser = await storage.updateUser(userId, { profilePicture: filePath });
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return user data without password
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Error uploading profile picture" });
    }
  });

  // Problem Routes
  app.get("/api/problems", async (req, res) => {
    try {
      // 페이지네이션 파라미터 가져오기
      const page = req.query.page ? parseInt(req.query.page as string) : 0;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const offset = page * limit;
      
      // 페이지네이션된 문제 가져오기
      const problems = await storage.getPaginatedProblems(limit, offset);
      
      const problemsWithAuthor = await Promise.all(
        problems.map(async (problem) => {
          const author = await storage.getUser(problem.authorId);
          
          if (!author) {
            return null;
          }
          
          // If user is logged in, check if they've solved or saved this problem
          let isSolved = false;
          let isSaved = false;
          
          if (req.session.userId) {
            isSolved = await storage.checkIfProblemSolved(req.session.userId, problem.id);
            isSaved = await storage.checkIfProblemSaved(req.session.userId, problem.id);
          }
          
          return {
            problem: {
              id: problem.id,
              text: problem.text,
              type: problem.type,
              options: problem.options,
              image: problem.image,
              difficulty: problem.difficulty,
              solveCount: problem.solveCount,
              createdAt: problem.createdAt instanceof Date 
                ? problem.createdAt.toISOString() 
                : String(problem.createdAt),
            },
            author: {
              id: author.id,
              username: author.username,
              profilePicture: author.profilePicture,
            },
            isSolved,
            isSaved,
          };
        })
      );
      
      // Filter out nulls
      const validProblems = problemsWithAuthor.filter(
        (problem): problem is NonNullable<typeof problem> => problem !== null
      );
      
      res.json(validProblems);
    } catch (error) {
      res.status(500).json({ message: "Error getting problems" });
    }
  });
  
  // Recommendation endpoint for getting random unsolved problems
  app.get("/api/problems/recommend", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      // 가져올 랜덤 문제 수 (기본값: 1)
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 1;
      
      // 최적화된 랜덤 미해결 문제 가져오기
      const randomProblems = await storage.getRandomUnsolvedProblems(userId, limit);
      
      // 문제가 없으면 빈 배열 반환
      if (randomProblems.length === 0) {
        return res.json([]);
      }
      
      // 작성자 정보와 저장 상태 가져오기
      const problemsWithAuthor = await Promise.all(
        randomProblems.map(async (problem) => {
          const author = await storage.getUser(problem.authorId);
          
          if (!author) {
            return null;
          }
          
          // 저장 상태 확인
          const isSaved = await storage.checkIfProblemSaved(userId, problem.id);
          
          return {
            problem: {
              id: problem.id,
              text: problem.text,
              type: problem.type,
              options: problem.options,
              image: problem.image,
              difficulty: problem.difficulty,
              solveCount: problem.solveCount,
              createdAt: problem.createdAt instanceof Date 
                ? problem.createdAt.toISOString() 
                : String(problem.createdAt),
            },
            author: {
              id: author.id,
              username: author.username,
              profilePicture: author.profilePicture,
            },
            isSolved: false, // 이미 필터링했으므로 항상 false
            isSaved,
          };
        })
      );
      
      // null 필터링
      const validProblems = problemsWithAuthor.filter(
        (problem): problem is NonNullable<typeof problem> => problem !== null
      );
      
      res.json(validProblems);
    } catch (error) {
      console.error("Error getting recommended problems:", error);
      res.status(500).json({ message: "Error getting recommended problems" });
    }
  });

  app.post("/api/problems", requireAuth, upload.single("image"), async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // Process form data
      let problemData: any = {
        ...req.body,
        authorId: userId,
      };
      
      // Handle options for multiple-choice
      if (problemData.type === "multiple-choice" && problemData.options) {
        try {
          // Parse JSON string to array and then stringify for database storage
          const parsedOptions = JSON.parse(problemData.options);
          // For insertProblemSchema validation, we keep it as string
          problemData.options = parsedOptions;
        } catch (e) {
          // If parsing fails, assume it's already a string array
          if (typeof problemData.options === "string") {
            problemData.options = problemData.options.split(",").map((opt: string) => opt.trim());
          }
        }
      }
      
      // Handle tags
      if (problemData.tags) {
        try {
          // Parse JSON string to array and then stringify for database storage
          const parsedTags = JSON.parse(problemData.tags);
          // For insertProblemSchema validation, we keep it as string
          problemData.tags = parsedTags;
        } catch (e) {
          // If parsing fails, assume it's a comma-separated string
          if (typeof problemData.tags === "string") {
            problemData.tags = problemData.tags.split(",").map((tag: string) => tag.trim());
          }
        }
      }
      
      // Add image path if uploaded
      if (req.file) {
        problemData.image = `/uploads/${req.file.filename}`;
      }
      
      // Use the extended schema from shared/schema.ts
      const validatedData = insertProblemSchema.parse(problemData);
      const problem = await storage.createProblem(validatedData);
      
      res.status(201).json(problem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error(error);
      res.status(500).json({ message: "Error creating problem" });
    }
  });

  app.get("/api/problems/:id", async (req, res) => {
    try {
      const problemId = parseInt(req.params.id);
      if (isNaN(problemId)) {
        return res.status(400).json({ message: "Invalid problem ID" });
      }
      
      const problem = await storage.getProblem(problemId);
      if (!problem) {
        return res.status(404).json({ message: "Problem not found" });
      }
      
      const author = await storage.getUser(problem.authorId);
      if (!author) {
        return res.status(404).json({ message: "Author not found" });
      }
      
      // If user is logged in, check if they've solved or saved this problem
      let isSolved = false;
      let isSaved = false;
      
      if (req.session.userId) {
        isSolved = await storage.checkIfProblemSolved(req.session.userId, problem.id);
        isSaved = await storage.checkIfProblemSaved(req.session.userId, problem.id);
      }
      
      res.json({
        problem: {
          id: problem.id,
          text: problem.text,
          type: problem.type,
          options: problem.options,
          image: problem.image,
          difficulty: problem.difficulty,
          solveCount: problem.solveCount,
          createdAt: problem.createdAt instanceof Date 
            ? problem.createdAt.toISOString() 
            : String(problem.createdAt),
        },
        author: {
          id: author.id,
          username: author.username,
          profilePicture: author.profilePicture,
        },
        isSolved,
        isSaved,
      });
    } catch (error) {
      res.status(500).json({ message: "Error getting problem" });
    }
  });

  app.post("/api/problems/:id/check-answer", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const problemId = parseInt(req.params.id, 10);
      
      // Convert problemId to number 
      const { answer } = validateAnswerSchema.parse({
        problemId,
        answer: req.body.answer
      });
      
      // Check if already solved
      const alreadySolved = await storage.checkIfProblemSolved(userId, problemId);
      if (alreadySolved) {
        return res.status(400).json({ message: "Problem already solved", correct: false });
      }
      
      // Get problem
      const problem = await storage.getProblem(problemId);
      if (!problem) {
        return res.status(404).json({ message: "Problem not found" });
      }
      
      // 사용자가 올린 문제인지 확인 (자신이 올린 문제는 풀 수 없음)
      if (problem.authorId === userId) {
        return res.status(400).json({ 
          message: "You cannot solve your own problem", 
          correct: false 
        });
      }
      
      // Check answer
      const isCorrect = problem.correctAnswer === answer;
      
      // If correct, record it and award points
      if (isCorrect) {
        // Points based on difficulty
        let pointsEarned = 0;
        switch (problem.difficulty) {
          case "easy":
            pointsEarned = 5;
            break;
          case "medium":
            pointsEarned = 10;
            break;
          case "hard":
            pointsEarned = 15;
            break;
          default:
            pointsEarned = 5;
        }
        
        await storage.solveProblem({
          userId,
          problemId,
          pointsEarned
        });
        
        return res.json({ 
          correct: true, 
          message: "Correct answer!", 
          pointsEarned 
        });
      }
      
      // Wrong answer
      res.json({ 
        correct: false, 
        message: "Incorrect answer. Try again!" 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Error checking answer" });
    }
  });

  app.post("/api/problems/:id/save", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const problemId = parseInt(req.params.id, 10);
      
      // Check if problem exists
      const problem = await storage.getProblem(problemId);
      if (!problem) {
        return res.status(404).json({ message: "Problem not found" });
      }
      
      // Save problem
      await storage.saveProblem({
        userId,
        problemId
      });
      
      res.json({ message: "Problem saved successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error saving problem" });
    }
  });

  app.delete("/api/problems/:id/save", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const problemId = parseInt(req.params.id, 10);
      
      // Unsave problem
      const result = await storage.unsaveProblem(userId, problemId);
      if (!result) {
        return res.status(404).json({ message: "Saved problem not found" });
      }
      
      res.json({ message: "Problem unsaved successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error unsaving problem" });
    }
  });

  app.get("/api/users/me/problems", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const problems = await storage.getUserProblems(userId);
      
      res.json(problems);
    } catch (error) {
      res.status(500).json({ message: "Error getting user problems" });
    }
  });

  app.get("/api/users/me/solved", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const solvedProblems = await storage.getUserSolvedProblems(userId);
      
      // Get full problem details for each solved problem
      const problems = await Promise.all(
        solvedProblems.map(async (solved) => {
          const problem = await storage.getProblem(solved.problemId);
          return { 
            solved,
            problem
          };
        })
      );
      
      res.json(problems);
    } catch (error) {
      res.status(500).json({ message: "Error getting solved problems" });
    }
  });

  app.get("/api/users/me/saved", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const savedProblems = await storage.getUserSavedProblems(userId);
      
      // Get full problem details for each saved problem
      const problems = await Promise.all(
        savedProblems.map(async (saved) => {
          const problem = await storage.getProblem(saved.problemId);
          return { 
            saved,
            problem
          };
        })
      );
      
      res.json(problems);
    } catch (error) {
      res.status(500).json({ message: "Error getting saved problems" });
    }
  });

  // Admin Routes
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      
      // Return users without passwords
      const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: "Error getting users" });
    }
  });
  
  // Special endpoint to grant admin privileges - FOR DEVELOPMENT ONLY
  // This would be removed or properly secured in production
  app.post("/api/grant-admin", async (req, res) => {
    try {
      const { username } = req.body;
      
      if (!username) {
        return res.status(400).json({ message: "Username is required" });
      }
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Grant admin privileges
      const updatedUser = await storage.updateUser(user.id, { 
        isAdmin: 1 // Using 1 for true since SQLite uses integers
      });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update user" });
      }
      
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.json({ 
        message: "Admin privileges granted successfully",
        user: userWithoutPassword
      });
    } catch (error) {
      res.status(500).json({ message: "Error granting admin privileges" });
    }
  });

  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Don't allow deleting self
      if (userId === req.session.userId) {
        return res.status(400).json({ message: "Cannot delete yourself" });
      }
      
      const success = await storage.deleteUser(userId);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting user" });
    }
  });

  app.delete("/api/admin/problems/:id", requireAdmin, async (req, res) => {
    try {
      const problemId = parseInt(req.params.id);
      
      if (isNaN(problemId)) {
        return res.status(400).json({ message: "Invalid problem ID" });
      }
      
      const success = await storage.deleteProblem(problemId);
      if (!success) {
        return res.status(404).json({ message: "Problem not found" });
      }
      
      res.json({ message: "Problem deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting problem" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
