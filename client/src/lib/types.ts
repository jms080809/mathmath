export interface User {
  id: number;
  username: string;
  points: number;
  profilePicture?: string;
  problemsSolved: number;
  problemsCreated: number;
  streak: number;
  isAdmin: boolean;
}

export interface Problem {
  id: string; // Changed to string for timestamp-based IDs
  text: string;
  type: "multiple-choice" | "short-answer";
  options?: string[];
  image?: string;
  difficulty: "easy" | "medium" | "hard";
  solveCount: number;
  createdAt: string;
}

export interface Author {
  id: number;
  username: string;
  profilePicture?: string;
}

export interface ProblemWithAuthor {
  problem: Problem;
  author: Author;
  isSolved?: boolean;
  isSaved?: boolean;
}

export interface CheckAnswerResponse {
  correct: boolean;
  message: string;
  pointsEarned?: number;
}

export interface ApiError {
  message: string;
}
