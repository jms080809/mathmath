import { db } from "./db";
import { problems } from "../shared/schema";
import { eq } from "drizzle-orm";

// Utility to generate simple problems
function generateMathProblem(index: number, authorId: number) {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  const operation = ["addition", "subtraction", "multiplication", "division"][index % 4];
  
  let text = "";
  let correctAnswer = "";
  let options = null;
  
  switch (operation) {
    case "addition":
      text = `What is ${a} + ${b}?`;
      correctAnswer = String(a + b);
      break;
    case "subtraction":
      // Ensure a > b to avoid negative answers for simplicity
      text = `What is ${Math.max(a, b)} - ${Math.min(a, b)}?`;
      correctAnswer = String(Math.max(a, b) - Math.min(a, b));
      break;
    case "multiplication":
      text = `What is ${a} × ${b}?`;
      correctAnswer = String(a * b);
      break;
    case "division":
      // Ensure division results in an integer
      const product = a * b;
      text = `What is ${product} ÷ ${a}?`;
      correctAnswer = String(b);
      break;
  }
  
  // For multiple choice questions, generate options
  if (index % 2 === 0) {
    const answer = parseInt(correctAnswer);
    const wrongOptions = [
      answer + 1,
      answer - 1,
      answer + 2,
      answer * 2
    ].filter(opt => opt !== answer && opt > 0);
    
    const allOptions = [answer, ...wrongOptions.slice(0, 4)];
    // Shuffle options
    allOptions.sort(() => Math.random() - 0.5);
    
    options = allOptions.join(",");
  }
  
  return {
    id: index + 1, // Use sequential IDs for simplicity
    authorId,
    type: index % 2 === 0 ? "multiple-choice" : "short-answer",
    text,
    options,
    correctAnswer,
    difficulty: ["easy", "medium", "hard"][index % 3],
    tags: null,
    solveCount: Math.floor(Math.random() * 30),
    createdAt: new Date(),
    image: null
  };
}

async function seedDatabase() {
  console.log("Starting database seeding...");
  
  try {
    // Get a user to be the author
    const users = await db.query.users.findMany();
    
    if (users.length === 0) {
      console.error("No users found. Please create a user first.");
      process.exit(1);
    }
    
    const authorId = users[0].id;
    
    // Clear existing problems
    await db.delete(problems);
    console.log("Cleared existing problems");
    
    // Generate 100 problems
    const problemsToCreate = [];
    for (let i = 0; i < 100; i++) {
      problemsToCreate.push(generateMathProblem(i, authorId));
    }
    
    // Insert problems in batches to avoid potential issues
    const BATCH_SIZE = 10;
    for (let i = 0; i < problemsToCreate.length; i += BATCH_SIZE) {
      const batch = problemsToCreate.slice(i, i + BATCH_SIZE);
      
      // Insert each problem individually to avoid type issues
      for (const problem of batch) {
        await db.insert(problems).values({
          id: problem.id,
          authorId: problem.authorId,
          type: problem.type,
          text: problem.text,
          options: problem.options,
          correctAnswer: problem.correctAnswer,
          difficulty: problem.difficulty,
          tags: problem.tags,
          solveCount: problem.solveCount,
          createdAt: problem.createdAt,
          image: problem.image
        });
      }
      
      console.log(`Inserted problems ${i + 1} to ${Math.min(i + BATCH_SIZE, problemsToCreate.length)}`);
    }
    
    console.log("Database seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
  
  process.exit(0);
}

seedDatabase();