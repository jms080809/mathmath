import { db } from "./db";
import { problems } from "@shared/schema";
import { eq } from "drizzle-orm";

async function fixProblemOptions() {
  console.log("Fixing problem options format...");
  
  // 모든 문제 가져오기
  const allProblems = await db.select().from(problems);
  console.log(`Found ${allProblems.length} problems to check.`);
  
  let fixedCount = 0;
  
  for (const problem of allProblems) {
    if (problem.type === "multiple-choice") {
      try {
        let options: string[] = [];
        
        // 기존 options 데이터가 문자열이면 JSON으로 파싱 시도
        if (problem.options && typeof problem.options === 'string') {
          try {
            // JSON 파싱 시도
            const parsed = JSON.parse(problem.options);
            if (Array.isArray(parsed)) {
              options = parsed;
            } else {
              // JSON이지만 배열이 아닌 경우 새로운 배열 생성
              options = ["A", "B", "C", "D", "E"];
            }
          } catch (e) {
            // JSON 파싱 실패 시 기본 옵션 배열 사용
            options = ["A", "B", "C", "D", "E"];
          }
        } else if (Array.isArray(problem.options)) {
          // 이미 배열인 경우
          options = problem.options;
        } else {
          // options가 없거나 다른 형식인 경우 기본 옵션 배열 사용
          options = ["A", "B", "C", "D", "E"];
        }
        
        // 데이터베이스에 업데이트
        const optionsString = JSON.stringify(options);
        await db.update(problems)
          .set({ options: optionsString })
          .where(eq(problems.id, problem.id));
        
        fixedCount++;
        console.log(`Fixed problem #${problem.id}`);
      } catch (error) {
        console.error(`Error fixing problem #${problem.id}:`, error);
      }
    }
  }
  
  console.log(`Fixed ${fixedCount} problems with options.`);
}

// 스크립트 실행
fixProblemOptions()
  .then(() => {
    console.log("Finished fixing problem options.");
    process.exit(0);
  })
  .catch(err => {
    console.error("Error in fix script:", err);
    process.exit(1);
  });