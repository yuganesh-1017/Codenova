// verify_all_problems.js
// Automated comprehensive validation suite to check all 36 seeded problems
// and verify dynamic creations (Admin and User) in JS, Python, and Java.

const http = require('http');

const PORT = 3000;
const ADMIN_TOKEN = "codenova_admin_secure_token";

function getRequest(path, headers = {}) {
  return new Promise((resolve, reject) => {
    http.get({
      hostname: 'localhost',
      port: PORT,
      path: path,
      headers: headers
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error(`Failed to parse response from ${path}: ${body}`));
        }
      });
    }).on('error', reject);
  });
}

function postRequest(path, payload, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...headers
      }
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error(`Failed to parse response from ${path}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function verifyAll() {
  console.log("======================================================================");
  console.log("🚀 Starting Comprehensive Language & Problem Verification Suite");
  console.log("======================================================================\n");

  let allPassed = true;

  try {
    // 1. Fetch all problems list
    console.log("Step 1: Fetching catalog of problems from /api/problems...");
    const catalog = await getRequest('/api/problems');
    console.log(`✅ Loaded catalog containing ${catalog.length} problems.\n`);

    // 2. Loop through all problems and test JS, Python, Java, C++
    console.log("Step 2: Testing execution of all catalog problem templates...");
    const languages = ['javascript', 'python', 'java', 'cpp'];
    
    for (const item of catalog) {
      const problemId = item.id;
      
      // Skip test verification for dynamically created problems from previous runs
      if (parseInt(problemId) > 36) {
        continue;
      }
      
      // Fetch full details of the problem (to get templates)
      const fullProblem = await getRequest(`/api/problems/${problemId}`);
      if (!fullProblem || !fullProblem.templates) {
        console.error(`❌ Problem ${problemId} (${item.title}) details could not be loaded.`);
        allPassed = false;
        continue;
      }

      console.log(`\n--- Testing Problem ${problemId}: "${fullProblem.title}" ---`);
      
      for (const lang of languages) {
        const codeTemplate = fullProblem.templates[lang];
        if (!codeTemplate) {
          console.warn(`⚠️ Warning: Template not found for language ${lang} in problem ${problemId}.`);
          continue;
        }

        // Run the template
        const runRes = await postRequest('/api/run', {
          problemId: problemId,
          language: lang,
          code: codeTemplate
        });

        if (runRes.status === 'success') {
          const testResults = runRes.results || [];
          const passedCount = testResults.filter(r => r.passed).length;
          const totalCount = testResults.length;
          if (passedCount === totalCount && totalCount > 0) {
            console.log(`  ✅ [${lang.toUpperCase()}] Execution Success! All ${passedCount}/${totalCount} test cases passed.`);
          } else {
            console.error(`  ❌ [${lang.toUpperCase()}] Execution Failure! Passed ${passedCount}/${totalCount} cases. Details:`, runRes);
            allPassed = false;
          }
        } else {
          console.error(`  ❌ [${lang.toUpperCase()}] Execution Status Error! Details:`, runRes);
          allPassed = false;
        }
      }
    }

    // 3. Testing Dynamic Admin creation & execution
    console.log("\n======================================================================");
    console.log("Step 3: Creating a brand new global problem as Admin (POST /api/admin/problems)...");
    const adminProblemRes = await postRequest('/api/admin/problems', {
      title: "Dynamic Admin Test Challenge",
      difficulty: "easy",
      category: "math",
      description: "<p>Calculate product of a and b.</p>",
      funcName: "findProduct",
      params: ["num1", "num2"],
      argTypes: ["int", "int"],
      retType: "int",
      sampleTestCases: [{ args: [7, 8], expected: 56 }]
    }, {
      'Authorization': `Bearer ${ADMIN_TOKEN}`
    });

    if (adminProblemRes.success && adminProblemRes.problem) {
      const adminProblemId = adminProblemRes.problem.id;
      console.log(`✅ Admin challenge created successfully! ID: ${adminProblemId}`);
      
      const adminTemplates = {
        javascript: `function findProduct(num1, num2) {\n  return num1 * num2;\n}`,
        python: `def findProduct(num1: int, num2: int) -> int:\n    return num1 * num2`,
        java: `class Solution {\n    public int findProduct(int num1, int num2) {\n        return num1 * num2;\n    }\n}`,
        cpp: `int findProduct(int num1, int num2) {\n    return num1 * num2;\n}`
      };

      for (const lang of languages) {
        console.log(`  Running dynamic Admin challenge in [${lang.toUpperCase()}]...`);
        const runRes = await postRequest('/api/run', {
          problemId: adminProblemId,
          language: lang,
          code: adminTemplates[lang]
        });

        if (runRes.status === 'success' && runRes.results && runRes.results.every(r => r.passed)) {
          console.log(`  ✅ [${lang.toUpperCase()}] Dynamic execution passed!`);
        } else {
          console.error(`  ❌ [${lang.toUpperCase()}] Dynamic execution failed! Details:`, runRes);
          allPassed = false;
        }
      }
    } else {
      console.error("❌ Failed to create dynamic Admin challenge:", adminProblemRes);
      allPassed = false;
    }

    // 4. Testing Dynamic User creation & execution
    console.log("\n======================================================================");
    console.log("Step 4: Creating a brand new custom problem as User (POST /api/custom-problems)...");
    const userProblemRes = await postRequest('/api/custom-problems', {
      title: "Dynamic User Test Challenge",
      difficulty: "medium",
      category: "strings",
      description: "<p>Concatenate s1 and s2.</p>",
      funcName: "concatStrings",
      params: ["s1", "s2"],
      argTypes: ["string", "string"],
      retType: "string",
      sampleTestCases: [{ args: ["Hello", "World"], expected: "HelloWorld" }]
    });

    if (userProblemRes.success && userProblemRes.problem) {
      const userProblemId = userProblemRes.problem.id;
      console.log(`✅ Custom user challenge created successfully! ID: ${userProblemId}`);

      const userTemplates = {
        javascript: `function concatStrings(s1, s2) {\n  return s1 + s2;\n}`,
        python: `def concatStrings(s1: str, s2: str) -> str:\n    return s1 + s2`,
        java: `class Solution {\n    public String concatStrings(String s1, String s2) {\n        return s1 + s2;\n    }\n}`,
        cpp: `#include <string>\nstd::string concatStrings(std::string s1, std::string s2) {\n    return s1 + s2;\n}`
      };

      for (const lang of languages) {
        console.log(`  Running dynamic Custom challenge in [${lang.toUpperCase()}]...`);
        const runRes = await postRequest('/api/run', {
          problemId: userProblemId,
          language: lang,
          code: userTemplates[lang]
        });

        if (runRes.status === 'success' && runRes.results && runRes.results.every(r => r.passed)) {
          console.log(`  ✅ [${lang.toUpperCase()}] Dynamic execution passed!`);
        } else {
          console.error(`  ❌ [${lang.toUpperCase()}] Dynamic execution failed! Details:`, runRes);
          allPassed = false;
        }
      }
    } else {
      console.error("❌ Failed to create dynamic Custom user challenge:", userProblemRes);
      allPassed = false;
    }

  } catch (error) {
    console.error("❌ Test verification suite failed with an exception:", error);
    allPassed = false;
  }

  console.log("\n======================================================================");
  if (allPassed) {
    console.log("🎉 ALL PROGRAM TEMPLATES AND DYNAMIC CREATIONS COMPILED AND PASSED!");
  } else {
    console.error("❌ VERIFICATION SUITE ENCOUNTERED FAILURES!");
  }
  console.log("======================================================================");

  process.exit(allPassed ? 0 : 1);
}

verifyAll();
