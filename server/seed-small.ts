import { db } from "./db";
import { problems } from "../shared/schema";
import { sql } from "drizzle-orm";

async function seedProblems() {
  console.log("Creating seed problems...");

  try {
    // Get a list of authors (users) from the database
    const users = await db.query.users.findMany();
    
    if (users.length === 0) {
      console.error("No users found in the database. Please create users first.");
      process.exit(1);
    }

    // Create algebra problems
    for (let i = 0; i < 10; i++) {
      const a = Math.floor(Math.random() * 10) + 1;
      const b = Math.floor(Math.random() * 10) + 1;
      const result = a * b;
      
      const insertQuery = `
        INSERT INTO problems (
          author_id, type, text, options, correct_answer, difficulty, solve_count, created_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?
        )
      `;
      
      db.run(sql.raw(insertQuery), [
        users[0].id,
        "multiple-choice",
        `Solve for x: ${a}x = ${result}`,
        `${b},${b+1},${b-1},${b*2},${Math.floor(b/2)}`,
        String(b),
        "medium",
        Math.floor(Math.random() * 50),
        Math.floor(Date.now() / 1000)
      ]);

      console.log(`Created problem ${i+1}`);
    }

    // Create geometry problems
    for (let i = 0; i < 10; i++) {
      const radius = Math.floor(Math.random() * 10) + 1;
      const area = Math.PI * radius * radius;
      const roundedArea = Math.round(area);
      
      const insertQuery = `
        INSERT INTO problems (
          author_id, type, text, correct_answer, difficulty, solve_count, created_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?
        )
      `;
      
      db.run(sql.raw(insertQuery), [
        users[0].id,
        "short-answer",
        `Find the area of a circle with radius ${radius} units (round to the nearest whole number).`,
        String(roundedArea),
        "hard",
        Math.floor(Math.random() * 30),
        Math.floor(Date.now() / 1000)
      ]);

      console.log(`Created problem ${i+11}`);
    }
    
    console.log("Successfully created 20 problems!");
  } catch (error) {
    console.error("Error seeding problems:", error);
    console.log(error);
  }

  process.exit(0);
}

seedProblems();