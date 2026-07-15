const axios = require('axios');

const API_URL = 'http://localhost:3001/api';
const ADMIN_TOKEN = 'codenova_admin_secure_token'; // Ensure server is running

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log("===========================================");
  console.log("   CodeNova Full Verification Suite");
  console.log("===========================================\n");

  // 1. Create a dynamic custom problem via Admin API
  console.log("[1/2] Creating a dynamic custom problem...");
  let dynamicProblemId = 'custom_test_' + Date.now();
  
  const customProblemData = {
    id: dynamicProblemId,
    title: "Dynamic Verification Test",
    difficulty: "hard",
    difficultyText: "Hard",
    category: "Arrays",
    acceptance: "100.0%",
    description: "Given an integer multiplier and an array of integers, return the sum of the array multiplied by the multiplier.",
    funcName: "multiplySum",
    params: ["multiplier", "nums"],
    argTypes: ["int", "vector<int>"],
    retType: "int",
    examples: [
      { input: "multiplier = 2, nums = [1, 2, 3]", output: "12", explanation: "(1+2+3)*2 = 12" }
    ],
    constraints: [],
    templates: {
      javascript: "function multiplySum(multiplier, nums) {\n    \n}",
      python: "from typing import List\n\ndef multiplySum(multiplier: int, nums: List[int]) -> int:\n    pass",
      cpp: "#include <vector>\nusing namespace std;\n\nint multiplySum(int multiplier, vector<int>& nums) {\n    \n}",
      java: "class Solution {\n    public int multiplySum(int multiplier, int[] nums) {\n        \n    }\n}"
    },
    sampleTestCases: [
      { args: [2, [1, 2, 3]], expected: 12 },
      { args: [10, [5, 5]], expected: 100 }
    ],
    systemTestCases: [
      { args: [2, [1, 2, 3]], expected: 12 },
      { args: [10, [5, 5]], expected: 100 },
      { args: [-1, [10, 20]], expected: -30 }
    ]
  };


  try {
    const createRes = await axios.post(`${API_URL}/admin/problems`, customProblemData, {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    if (createRes.data.success) {
      dynamicProblemId = createRes.data.problem.id;
      console.log(`✅ Custom problem '${dynamicProblemId}' successfully created.\n`);
    } else {
      throw new Error(JSON.stringify(createRes.data));
    }
  } catch (err) {
    console.error("❌ Failed to create custom problem. Is the server running?");
    console.error(err.response ? err.response.data : err.message);
    process.exit(1);
  }

  // Allow Firebase sync delay
  await sleep(1000);

  // 2. Test Solutions in all 4 languages
  const solutions = {
    javascript: `
function multiplySum(multiplier, nums) {
    let sum = 0;
    for (let num of nums) sum += num;
    return sum * multiplier;
}
    `,
    python: `
from typing import List
def multiplySum(multiplier: int, nums: List[int]) -> int:
    return sum(nums) * multiplier
    `,
    cpp: `
#include <vector>
using namespace std;
int multiplySum(int multiplier, vector<int>& nums) {
    int sum = 0;
    for (int num : nums) sum += num;
    return sum * multiplier;
}
    `,
    java: `
class Solution {
    public int multiplySum(int multiplier, int[] nums) {
        int sum = 0;
        for (int num : nums) sum += num;
        return sum * multiplier;
    }
}
    `
  };

  console.log("[2/2] Running Sandbox Compilation & Tests...");

  let allPassed = true;

  for (const [lang, code] of Object.entries(solutions)) {
    console.log(`\n▶ Testing Language: ${lang.toUpperCase()}`);
    try {
      const payload = {
        problemId: dynamicProblemId,
        language: lang,
        code: code
      };
      
      const res = await axios.post(`${API_URL}/submit`, payload);
      const data = res.data;

      if (data.status === 'success' && data.results) {
        const passedAll = data.results.every(r => r.passed);
        if (passedAll) {
          console.log(`  ✅ Success! All ${data.results.length} test cases passed.`);
        } else {
          console.error(`  ❌ Failed! Some test cases failed in ${lang}.`);
          console.error(JSON.stringify(data.results, null, 2));
          allPassed = false;
        }
      } else {
        console.error(`  ❌ Error during execution:`);
        console.error(data.error || JSON.stringify(data));
        allPassed = false;
      }
    } catch (err) {
      console.error(`  ❌ HTTP Error during execution for ${lang}:`);
      console.error(err.response ? err.response.data : err.message);
      allPassed = false;
    }
  }

  console.log("\n===========================================");
  if (allPassed) {
    console.log(" 🎉 ALL TESTS PASSED! PLATFORM IS STABLE. ");
  } else {
    console.log(" ⚠️ SOME TESTS FAILED. CHECK LOGS ABOVE. ");
  }
  console.log("===========================================");
}

runTests();
