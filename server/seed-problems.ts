import { db } from "./db";
import { generateUniqueId, problems } from "../shared/schema";
import { faker } from "@faker-js/faker";

const PROBLEM_COUNT = 100;

// Different types of mathematical problems to generate
const problemTemplates = [
  // Algebra problems
  {
    generateQuestion: () => {
      const a = Math.floor(Math.random() * 10) + 1;
      const b = Math.floor(Math.random() * 10) + 1;
      const result = a * b;
      return {
        text: `Solve for x: ${a}x = ${result}`,
        type: "multiple-choice" as const,
        options: [
          String(b),
          String(b + 1),
          String(b - 1),
          String(b * 2),
          String(Math.floor(b / 2)),
        ],
        correctAnswer: String(b),
        difficulty: faker.helpers.arrayElement(["easy", "medium", "hard"]),
      };
    },
  },
  {
    generateQuestion: () => {
      const a = Math.floor(Math.random() * 10) + 1;
      const b = Math.floor(Math.random() * 20) + 1;
      const c = Math.floor(Math.random() * 10) + 1;
      const result = a * b + c;
      return {
        text: `Solve for x: ${a}x + ${c} = ${result}`,
        type: "multiple-choice" as const,
        options: [
          String(b),
          String(b + 2),
          String(b - 1),
          String(Math.floor(b / 2)),
          String(b + 5),
        ],
        correctAnswer: String(b),
        difficulty: faker.helpers.arrayElement(["easy", "medium", "hard"]),
      };
    },
  },
  // Geometry problems
  {
    generateQuestion: () => {
      const radius = Math.floor(Math.random() * 10) + 1;
      const area = Math.PI * radius * radius;
      const roundedArea = Math.round(area);
      return {
        text: `Find the area of a circle with radius ${radius} units (round to the nearest whole number).`,
        type: "short-answer" as const,
        correctAnswer: String(roundedArea),
        difficulty: faker.helpers.arrayElement(["easy", "medium", "hard"]),
      };
    },
  },
  {
    generateQuestion: () => {
      const length = Math.floor(Math.random() * 10) + 1;
      const width = Math.floor(Math.random() * 10) + 1;
      const perimeter = 2 * (length + width);
      return {
        text: `Find the perimeter of a rectangle with length ${length} units and width ${width} units.`,
        type: "short-answer" as const,
        correctAnswer: String(perimeter),
        difficulty: faker.helpers.arrayElement(["easy", "medium", "hard"]),
      };
    },
  },
  // Calculus problems
  {
    generateQuestion: () => {
      const a = Math.floor(Math.random() * 5) + 1;
      const b = Math.floor(Math.random() * 5) + 1;
      const derivative = a * b;
      return {
        text: `Find the derivative of f(x) = ${a}x^${b} at x = 1.`,
        type: "multiple-choice" as const,
        options: [
          String(derivative),
          String(a),
          String(b),
          String(a + b),
          String(derivative + 1),
        ],
        correctAnswer: String(derivative),
        difficulty: "hard",
      };
    },
  },
  // Statistics problems
  {
    generateQuestion: () => {
      const numbers = Array.from({ length: 5 }, () => Math.floor(Math.random() * 10) + 1);
      const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
      const roundedMean = Math.round(mean * 10) / 10;
      return {
        text: `Find the mean of the following numbers: ${numbers.join(", ")}.`,
        type: "multiple-choice" as const,
        options: [
          String(roundedMean),
          String(Math.round((mean + 1) * 10) / 10),
          String(Math.round((mean - 1) * 10) / 10),
          String(Math.round((mean + 0.5) * 10) / 10),
          String(Math.round((mean - 0.5) * 10) / 10),
        ],
        correctAnswer: String(roundedMean),
        difficulty: faker.helpers.arrayElement(["easy", "medium"]),
      };
    },
  },
  // Number theory problems
  {
    generateQuestion: () => {
      const a = Math.floor(Math.random() * 100) + 1;
      const factors = [];
      for (let i = 1; i <= a; i++) {
        if (a % i === 0) {
          factors.push(i);
        }
      }
      return {
        text: `How many factors does ${a} have?`,
        type: "short-answer" as const,
        correctAnswer: String(factors.length),
        difficulty: faker.helpers.arrayElement(["medium", "hard"]),
      };
    },
  },
];

async function seedProblems() {
  console.log("Creating seed problems...");

  // Clear existing problems (if any)
  await db.delete(problems).execute();

  // Get a list of authors (users) from the database
  const authors = await db.query.users.findMany();
  
  if (authors.length === 0) {
    console.error("No users found in the database. Please create users first.");
    process.exit(1);
  }

  const problemsToInsert = Array.from({ length: PROBLEM_COUNT }, () => {
    const template = faker.helpers.arrayElement(problemTemplates);
    const problem = template.generateQuestion();
    
    return {
      id: generateUniqueId(),
      text: problem.text,
      type: problem.type,
      authorId: faker.helpers.arrayElement(authors).id,
      options: problem.type === "multiple-choice" ? problem.options!.join(",") : null,
      correctAnswer: problem.correctAnswer,
      difficulty: problem.difficulty,
      tags: null,
      solveCount: Math.floor(Math.random() * 50),
      createdAt: faker.date.recent({ days: 30 }), // Date object for timestamp
      image: null,
    };
  });

  try {
    await db.insert(problems).values(problemsToInsert).execute();
    console.log(`Successfully created ${PROBLEM_COUNT} problems!`);
  } catch (error) {
    console.error("Error seeding problems:", error);
  }

  process.exit(0);
}

seedProblems();